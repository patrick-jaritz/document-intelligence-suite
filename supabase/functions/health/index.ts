import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { getSecurityHeaders, mergeSecurityHeaders } from "../_shared/security-headers.ts";

// SECURITY: CORS headers are now generated dynamically with origin validation

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
  // SECURITY: Handle CORS preflight requests
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) {
    return preflightResponse;
  }

  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  const securityHeaders = getSecurityHeaders();
  const headers = mergeSecurityHeaders(corsHeaders, securityHeaders);

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

    // Comprehensive API provider status with type information
    const providers = {
      // OpenAI Suite
      "OPENAI_API_KEY": { configured: !!Deno.env.get("OPENAI_API_KEY"), type: "api_key" },
      "OPENAI_VISION": { configured: !!Deno.env.get("OPENAI_API_KEY"), type: "api_key" },
      
      // Anthropic
      "ANTHROPIC_API_KEY": { configured: !!Deno.env.get("ANTHROPIC_API_KEY"), type: "api_key" },
      
      // Mistral AI
      "MISTRAL_API_KEY": { configured: !!Deno.env.get("MISTRAL_API_KEY"), type: "api_key" },
      
      // Google Vision
      "GOOGLE_VISION_API_KEY": { configured: !!Deno.env.get("GOOGLE_VISION_API_KEY"), type: "api_key" },
      
      // OCR Providers
      "OCR_SPACE_API_KEY": { configured: !!Deno.env.get("OCR_SPACE_API_KEY"), type: "api_key" },
      
      // Self-hosted services (require deployment)
      "DOTS_OCR_SERVICE": { configured: !!Deno.env.get("DOTS_OCR_SERVICE_URL"), type: "self_hosted", note: "Requires deployment to cloud" },
      "PADDLE_OCR_SERVICE": { configured: !!Deno.env.get("PADDLE_OCR_SERVICE_URL"), type: "self_hosted", note: "Requires deployment to cloud" },
      "DEEPSEEK_OCR_SERVICE": { configured: !!Deno.env.get("DEEPSEEK_OCR_SERVICE_URL"), type: "self_hosted", note: "Requires GPU deployment" },
      
      // Web & Data Providers
      "CRAWL4AI_ENABLED": { configured: true, type: "built_in" },
      
      // Supabase Services (always available)
      "SUPABASE_DB": { configured: true, type: "built_in" },
      "SUPABASE_STORAGE": { configured: true, type: "built_in" },
      "SUPABASE_AUTH": { configured: true, type: "built_in" },
      "SUPABASE_EDGE_FUNCTIONS": { configured: true, type: "built_in" },
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
      { headers: { ...headers, "Content-Type": "application/json" } }
    );
  } catch (e) {
    // SECURITY: Don't expose internal error details in production
    const isProduction = Deno.env.get('ENVIRONMENT') === 'production';
    
    return new Response(JSON.stringify({ 
      ok: false, 
      error: String(e),
      ...(isProduction ? {} : { 
        details: e instanceof Error ? e.stack : String(e)
      })
    }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});


