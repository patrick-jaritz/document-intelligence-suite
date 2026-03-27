import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, apikey, X-Request-Id",
};

type Metric = {
  name: string;
  value: number | string | boolean;
  unit?: string;
  ok?: boolean;
};

async function getCounts(supabase: any) {
  const counts: Record<string, number> = {};
  const tables = [
    "documents",
    "processing_jobs",
    "document_embeddings",
    "rag_sessions",
  ];

  for (const t of tables) {
    const { count, error } = await supabase.from(t).select("id", { count: "exact", head: true });
    counts[t] = error ? -1 : (count ?? 0);
  }
  return counts;
}

async function getRecentErrors(supabase: any) {
  try {
    const { data, error } = await supabase
      .from("processing_jobs")
      .select("id, error_message, updated_at")
      .neq("status", "completed")
      .order("updated_at", { ascending: false })
      .limit(10);
    if (error) return [];
    return data;
  } catch {
    return [];
  }
}

function estimateCosts(counts: Record<string, number>) {
  // Very rough estimates for visibility; replace with real billing exports later
  const embeddings = counts["document_embeddings"] || 0;
  const ragSessions = counts["rag_sessions"] || 0;
  const ocrJobs = counts["processing_jobs"] || 0;

  return {
    openai_embeddings_usd: +(embeddings * 0.00002).toFixed(4),
    llm_generation_usd: +(ragSessions * 0.002).toFixed(4),
    ocr_estimate_usd: +(ocrJobs * 0.001).toFixed(4),
    total_estimate_usd: +((embeddings * 0.00002) + (ragSessions * 0.002) + (ocrJobs * 0.001)).toFixed(4)
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // DB connectivity
    const { data: pingData, error: pingError } = await supabase.from("documents").select("id").limit(1);
    const dbOk = !pingError;

    const counts = await getCounts(supabase);
    const errors = await getRecentErrors(supabase);

    // External API env presence
    const providers = {
      OPENAI_API_KEY: !!Deno.env.get("OPENAI_API_KEY"),
      ANTHROPIC_API_KEY: !!Deno.env.get("ANTHROPIC_API_KEY"),
      MISTRAL_API_KEY: !!Deno.env.get("MISTRAL_API_KEY"),
      GOOGLE_VISION_API_KEY: !!Deno.env.get("GOOGLE_VISION_API_KEY"),
      OCR_SPACE_API_KEY: !!Deno.env.get("OCR_SPACE_API_KEY"),
    };

    const costs = estimateCosts(counts);

    return new Response(
      JSON.stringify({
        ok: true,
        dbOk,
        counts,
        providers,
        costs,
        recentErrors: errors,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


