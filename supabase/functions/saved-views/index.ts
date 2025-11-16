import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { getSecurityHeaders, mergeSecurityHeaders } from "../_shared/security-headers.ts";
import { requireAuth } from "../_shared/jwt-verification.ts";

type Visibility = "private" | "team" | "public";

interface SavedViewPayload {
  id?: string;
  name?: string;
  description?: string | null;
  visibility?: Visibility;
  teamId?: string | null;
  filterSnapshot?: unknown;
}

const VISIBILITY_VALUES: Visibility[] = ["private", "team", "public"];

const getSupabaseClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials are not configured");
  }

  return createClient(supabaseUrl, supabaseKey);
};

async function getTeamMemberships(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to load team memberships: ${error.message}`);
  }

  const memberships = data ?? [];
  const teamIds = memberships
    .map((membership) => membership.team_id)
    .filter((teamId): teamId is string => typeof teamId === "string" && teamId.length > 0);

  const roleByTeam = new Map<string, string>();
  memberships.forEach((membership) => {
    if (membership.team_id) {
      roleByTeam.set(membership.team_id, membership.role);
    }
  });

  return { teamIds, roleByTeam };
}

function validateUuid(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !/^[0-9a-fA-F-]{36}$/.test(value)) {
    throw new Error(`Invalid ${fieldName}: expected UUID string`);
  }
}

function validateVisibility(value: unknown): Visibility {
  const visibility = typeof value === "string" ? value.toLowerCase() : "private";
  if (!VISIBILITY_VALUES.includes(visibility as Visibility)) {
    throw new Error(`Invalid visibility: must be one of ${VISIBILITY_VALUES.join(", ")}`);
  }
  return visibility as Visibility;
}

function parseJsonBody(bodyText: string): SavedViewPayload {
  if (!bodyText) {
    throw new Error("Request body is required");
  }
  try {
    return JSON.parse(bodyText) as SavedViewPayload;
  } catch (error) {
    throw new Error(`Invalid JSON body: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) {
    return preflight;
  }

  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);
  const securityHeaders = getSecurityHeaders();
  const baseHeaders = mergeSecurityHeaders(corsHeaders, securityHeaders);

  try {
    const { userId } = await requireAuth(req);
    const supabase = getSupabaseClient();
    const { teamIds, roleByTeam } = await getTeamMemberships(supabase, userId);

    const method = req.method.toUpperCase();
    const url = new URL(req.url);

    if (method === "GET") {
      const includePublic = url.searchParams.get("includePublic") !== "false";
      const includeTeam = url.searchParams.get("includeTeam") !== "false";
      const teamIdFilter = url.searchParams.get("teamId");
      const visibilityFilter = url.searchParams.get("visibility");

      const orClauses: string[] = [`owner_id.eq.${userId}`];

      if (includePublic) {
        orClauses.push("visibility.eq.public");
      }

      if (includeTeam) {
        if (teamIdFilter) {
          if (teamIds.includes(teamIdFilter)) {
            orClauses.push(`team_id.eq.${teamIdFilter}`);
          }
        } else if (teamIds.length > 0) {
          orClauses.push(`team_id.in.(${teamIds.join(",")})`);
        }
      }

      if (visibilityFilter && VISIBILITY_VALUES.includes(visibilityFilter as Visibility)) {
        orClauses.push(`visibility.eq.${visibilityFilter}`);
      }

      // Ensure at least one clause exists to avoid invalid OR filter
      if (orClauses.length === 0) {
        orClauses.push(`owner_id.eq.${userId}`);
      }

      const query = supabase
        .from("saved_views")
        .select("*")
        .or(orClauses.join(","))
        .order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return new Response(
        JSON.stringify({ success: true, data: data ?? [] }),
        { status: 200, headers: { ...baseHeaders, "Content-Type": "application/json" } },
      );
    }

    const bodyText = await req.text();

    if (method === "POST") {
      const payload = parseJsonBody(bodyText);
      const name = payload.name?.trim();
      if (!name) {
        throw new Error("Name is required");
      }

      if (typeof payload.filterSnapshot !== "object" || payload.filterSnapshot === null) {
        throw new Error("filterSnapshot must be a JSON object");
      }

      const visibility = validateVisibility(payload.visibility ?? "private");
      let teamId: string | null = null;

      if (visibility === "team") {
        if (!payload.teamId) {
          throw new Error("teamId is required for team visibility");
        }
        validateUuid(payload.teamId, "teamId");
        const role = roleByTeam.get(payload.teamId);
        if (!role || !["owner", "editor"].includes(role)) {
          throw new Error("You do not have permission to share with this team");
        }
        teamId = payload.teamId;
      } else if (payload.teamId) {
        // Optional team association for public/private
        validateUuid(payload.teamId, "teamId");
        const role = roleByTeam.get(payload.teamId);
        if (!role || !["owner", "editor"].includes(role)) {
          throw new Error("You do not have permission to share with this team");
        }
        teamId = payload.teamId;
      }

      const { data, error } = await supabase
        .from("saved_views")
        .insert({
          owner_id: userId,
          team_id: teamId,
          name,
          description: payload.description ?? null,
          visibility,
          filter_snapshot: payload.filterSnapshot,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { status: 201, headers: { ...baseHeaders, "Content-Type": "application/json" } },
      );
    }

    if (method === "PUT") {
      const payload = parseJsonBody(bodyText);
      if (!payload.id) {
        throw new Error("id is required for update");
      }
      validateUuid(payload.id, "id");

      const { data: existing, error: fetchError } = await supabase
        .from("saved_views")
        .select("*")
        .eq("id", payload.id)
        .maybeSingle();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (!existing) {
        return new Response(
          JSON.stringify({ success: false, error: "Saved view not found" }),
          { status: 404, headers: { ...baseHeaders, "Content-Type": "application/json" } },
        );
      }

      const isOwner = existing.owner_id === userId;
      const teamRole = existing.team_id ? roleByTeam.get(existing.team_id) : null;
      const canModify = isOwner || (teamRole !== null && ["owner", "editor"].includes(teamRole));

      if (!canModify) {
        return new Response(
          JSON.stringify({ success: false, error: "You do not have permission to update this saved view" }),
          { status: 403, headers: { ...baseHeaders, "Content-Type": "application/json" } },
        );
      }

      const updates: Record<string, unknown> = {};

      if (payload.name !== undefined) {
        const trimmed = payload.name.trim();
        if (!trimmed) {
          throw new Error("Name cannot be empty");
        }
        updates.name = trimmed;
      }

      if (payload.description !== undefined) {
        updates.description = payload.description ?? null;
      }

      if (payload.filterSnapshot !== undefined) {
        if (typeof payload.filterSnapshot !== "object" || payload.filterSnapshot === null) {
          throw new Error("filterSnapshot must be a JSON object");
        }
        updates.filter_snapshot = payload.filterSnapshot;
      }

      if (payload.visibility !== undefined) {
        updates.visibility = validateVisibility(payload.visibility);
      }

      if (payload.teamId !== undefined) {
        if (payload.teamId === null) {
          updates.team_id = null;
        } else {
          validateUuid(payload.teamId, "teamId");
          const role = roleByTeam.get(payload.teamId);
          if (!role || !["owner", "editor"].includes(role)) {
            throw new Error("You do not have permission to share with this team");
          }
          updates.team_id = payload.teamId;
        }
      }

      if (Object.keys(updates).length === 0) {
        return new Response(
          JSON.stringify({ success: true, data: existing }),
          { status: 200, headers: { ...baseHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data, error } = await supabase
        .from("saved_views")
        .update(updates)
        .eq("id", payload.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { status: 200, headers: { ...baseHeaders, "Content-Type": "application/json" } },
      );
    }

    if (method === "DELETE") {
      const payload = parseJsonBody(bodyText);
      if (!payload.id) {
        throw new Error("id is required for delete");
      }
      validateUuid(payload.id, "id");

      const { data: existing, error: fetchError } = await supabase
        .from("saved_views")
        .select("owner_id, team_id")
        .eq("id", payload.id)
        .maybeSingle();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (!existing) {
        return new Response(
          JSON.stringify({ success: false, error: "Saved view not found" }),
          { status: 404, headers: { ...baseHeaders, "Content-Type": "application/json" } },
        );
      }

      const isOwner = existing.owner_id === userId;
      const teamRole = existing.team_id ? roleByTeam.get(existing.team_id) : null;
      const canDelete = isOwner || (teamRole !== null && teamRole === "owner");

      if (!canDelete) {
        return new Response(
          JSON.stringify({ success: false, error: "You do not have permission to delete this saved view" }),
          { status: 403, headers: { ...baseHeaders, "Content-Type": "application/json" } },
        );
      }

      const { error } = await supabase
        .from("saved_views")
        .delete()
        .eq("id", payload.id);

      if (error) {
        throw new Error(error.message);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...baseHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...baseHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("❌ saved-views error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permission") ? 403 : message.includes("Invalid") ? 400 : 500;
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status, headers: { ...baseHeaders, "Content-Type": "application/json" } },
    );
  }
});


