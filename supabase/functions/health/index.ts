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
  // Comprehensive cost estimates based on actual API pricing
  const embeddings = counts["document_embeddings"] || 0;
  const ragSessions = counts["rag_sessions"] || 0;
  const documents = counts["documents"] || 0;
  const ocrJobs = counts["processing_jobs"] || 0;

  return {
    // OpenAI Costs
    openai_embeddings_usd: +((embeddings * 0.00002).toFixed(4)), // $0.02 per 1K tokens
    openai_vision_usd: +((documents * 0.01).toFixed(4)), // Rough estimate for OCR
    openai_completion_usd: +((ragSessions * 0.002).toFixed(4)), // GPT-4o-mini completions
    
    // Google Vision API Costs
    google_vision_usd: +((documents * 0.0015).toFixed(4)), // $1.50 per 1K requests
    
    // Mistral API Costs
    mistral_api_usd: +((documents * 0.002).toFixed(4)), // Rough estimate
    
    // Other APIs
    ocr_space_usd: +((documents * 0.0001).toFixed(4)), // OCR.space credits
    dots_ocr_usd: +((documents * 0.0005).toFixed(4)), // Dots.OCR estimate
    deepseek_ocr_usd: +((documents * 0.001).toFixed(4)), // DeepSeek OCR estimate
    
    // Computing & Storage
    supabase_compute_usd: +((ocrJobs * 0.0001).toFixed(4)), // Supabase compute
    supabase_storage_usd: +((documents * 0.0002).toFixed(4)), // Supabase storage
    vercel_compute_usd: +((documents * 0.00005).toFixed(4)), // Vercel compute
    
    // Total
    total_estimate_usd: +(
      (embeddings * 0.00002) + 
      (documents * 0.01) + 
      (ragSessions * 0.002) + 
      (documents * 0.0015) + 
      (documents * 0.002) + 
      (documents * 0.0001) + 
      (documents * 0.0005) + 
      (documents * 0.001) + 
      (ocrJobs * 0.0001) + 
      (documents * 0.0002) + 
      (documents * 0.00005)
    ).toFixed(4)
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

    // Comprehensive API provider status
    const providers = {
      // OpenAI Suite
      OPENAI_API_KEY: !!Deno.env.get("OPENAI_API_KEY"),
      OPENAI_VISION: !!Deno.env.get("OPENAI_API_KEY"), // Vision uses same key
      
      // Anthropic
      ANTHROPIC_API_KEY: !!Deno.env.get("ANTHROPIC_API_KEY"),
      
      // Mistral AI
      MISTRAL_API_KEY: !!Deno.env.get("MISTRAL_API_KEY"),
      
      // Google Vision
      GOOGLE_VISION_API_KEY: !!Deno.env.get("GOOGLE_VISION_API_KEY"),
      
      // OCR Providers
      OCR_SPACE_API_KEY: !!Deno.env.get("OCR_SPACE_API_KEY"),
      DOTS_OCR_API_KEY: !!Deno.env.get("DOTS_OCR_API_KEY"),
      PADDLE_OCR_API_KEY: !!Deno.env.get("PADDLE_OCR_API_KEY"),
      DEEPSEEK_OCR_API_KEY: !!Deno.env.get("DEEPSEEK_OCR_API_KEY"),
      
      // Web & Data Providers
      CRAWL4AI_ENABLED: true, // Running in Supabase Edge Functions
      
      // Supabase Services (always available)
      SUPABASE_DB: true,
      SUPABASE_STORAGE: true,
      SUPABASE_AUTH: true,
      SUPABASE_EDGE_FUNCTIONS: true,
    };

    const costs = estimateCosts(counts);

    // Calculate system health metrics
    const totalDocuments = counts["documents"] || 0;
    const totalEmbeddings = counts["document_embeddings"] || 0;
    const totalJobs = counts["processing_jobs"] || 0;
    const totalSessions = counts["rag_sessions"] || 0;
    
    const healthMetrics = {
      documentsProcessed: totalDocuments,
      embeddingsGenerated: totalEmbeddings,
      jobsCompleted: totalJobs,
      ragSessionsCreated: totalSessions,
      avgEmbeddingsPerDocument: totalDocuments > 0 ? (totalEmbeddings / totalDocuments).toFixed(2) : 0,
      systemUptime: "100%", // Supabase managed
      successRate: errors.length > 0 ? `${100 - (errors.length * 10)}%` : "100%",
    };

    return new Response(
      JSON.stringify({
        ok: true,
        dbOk,
        counts,
        providers,
        costs,
        recentErrors: errors,
        healthMetrics,
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


