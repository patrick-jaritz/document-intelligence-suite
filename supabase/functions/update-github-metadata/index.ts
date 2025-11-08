import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { getSecurityHeaders, mergeSecurityHeaders } from "../_shared/security-headers.ts";

serve(async (req: Request) => {
  // SECURITY: Handle CORS preflight requests FIRST
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) {
    return preflightResponse;
  }

  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);
  const securityHeaders = getSecurityHeaders();
  const headers = mergeSecurityHeaders(corsHeaders, securityHeaders);

  // SECURITY: Limit request size
  const MAX_REQUEST_SIZE = 1 * 1024 * 1024; // 1MB
  let requestText = "";
  try {
    requestText = await req.text();
    if (requestText.length > MAX_REQUEST_SIZE) {
      return new Response(
        JSON.stringify({ error: "Request too large" }),
        {
          status: 413,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }
  } catch (_err) {
    return new Response(
      JSON.stringify({ error: "Failed to read request body" }),
      {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const body = JSON.parse(requestText);
    const {
      repository_url,
      tags,
      collections,
      notes,
      pinned,
      starred,
      metadata,
      last_viewed_at,
    } = body;

    if (!repository_url || typeof repository_url !== "string" || repository_url.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid required field: repository_url" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } },
      );
    }

    if (repository_url.length > 2048) {
      return new Response(
        JSON.stringify({ error: "Repository URL too long (max 2048 characters)" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } },
      );
    }

    const updatePayload: Record<string, unknown> = {};

    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        return new Response(
          JSON.stringify({ error: "Invalid field: tags must be an array of strings" }),
          { status: 400, headers: { ...headers, "Content-Type": "application/json" } },
        );
      }
      updatePayload.tags = tags
        .map((tag: unknown) => typeof tag === "string" ? tag.trim() : "")
        .filter((tag: string) => tag.length > 0);
    }

    if (collections !== undefined) {
      if (!Array.isArray(collections)) {
        return new Response(
          JSON.stringify({ error: "Invalid field: collections must be an array of strings" }),
          { status: 400, headers: { ...headers, "Content-Type": "application/json" } },
        );
      }
      updatePayload.collections = collections
        .map((collection: unknown) => typeof collection === "string" ? collection.trim() : "")
        .filter((collection: string) => collection.length > 0);
    }

    if (notes !== undefined) {
      if (notes !== null && typeof notes !== "string") {
        return new Response(
          JSON.stringify({ error: "Invalid field: notes must be a string or null" }),
          { status: 400, headers: { ...headers, "Content-Type": "application/json" } },
        );
      }
      updatePayload.notes = notes;
    }

    if (pinned !== undefined) {
      if (typeof pinned !== "boolean") {
        return new Response(
          JSON.stringify({ error: "Invalid field: pinned must be a boolean" }),
          { status: 400, headers: { ...headers, "Content-Type": "application/json" } },
        );
      }
      updatePayload.pinned = pinned;
    }

    if (starred !== undefined) {
      if (typeof starred !== "boolean") {
        return new Response(
          JSON.stringify({ error: "Invalid field: starred must be a boolean" }),
          { status: 400, headers: { ...headers, "Content-Type": "application/json" } },
        );
      }
      updatePayload.starred = starred;
    }

    if (metadata !== undefined) {
      if (metadata !== null && typeof metadata !== "object") {
        return new Response(
          JSON.stringify({ error: "Invalid field: metadata must be an object or null" }),
          { status: 400, headers: { ...headers, "Content-Type": "application/json" } },
        );
      }
      updatePayload.metadata = metadata;
    }

    if (last_viewed_at !== undefined) {
      const parsedDate = new Date(last_viewed_at);
      if (Number.isNaN(parsedDate.getTime())) {
        return new Response(
          JSON.stringify({ error: "Invalid field: last_viewed_at must be a valid date" }),
          { status: 400, headers: { ...headers, "Content-Type": "application/json" } },
        );
      }
      updatePayload.last_viewed_at = parsedDate.toISOString();
    }

    if (Object.keys(updatePayload).length === 0) {
      return new Response(
        JSON.stringify({ error: "No metadata fields provided for update" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("github_analyses")
      .update(updatePayload)
      .eq("repository_url", repository_url)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...headers, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("❌ update-github-metadata error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } },
    );
  }
});

