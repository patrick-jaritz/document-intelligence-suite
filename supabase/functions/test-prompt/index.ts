/**
 * Supabase Edge Function: Test Prompt with OpenRouter
 * 
 * Proxies prompt testing requests to OpenRouter API
 * Supports 100+ AI models with parameter tuning
 * 
 * Input: { 
 *   prompt: string,
 *   systemPrompt?: string,
 *   model: string,
 *   temperature?: number,
 *   max_tokens?: number,
 *   top_p?: number,
 *   top_k?: number,
 *   frequency_penalty?: number,
 *   presence_penalty?: number,
 *   stream?: boolean,
 *   json_mode?: boolean,
 *   openrouter_api_key: string
 * }
 * Output: { 
 *   response: string,
 *   usage: { prompt_tokens, completion_tokens, total_tokens },
 *   cost?: { prompt, completion, total },
 *   model: string
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...headers, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const {
      prompt,
      systemPrompt,
      model,
      temperature = 0.7,
      max_tokens = 1000,
      top_p = 1.0,
      top_k,
      frequency_penalty = 0,
      presence_penalty = 0,
      stream = false,
      json_mode = false,
      openrouter_api_key,
    } = await req.json();

    // SECURITY: Validate input
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required and must be a non-empty string' }),
        { 
          status: 400, 
          headers: { ...headers, 'Content-Type': 'application/json' } 
        }
      );
    }

    // SECURITY: Validate prompt length
    if (prompt.length > 100000) { // 100KB limit for prompt
      return new Response(
        JSON.stringify({ error: 'Prompt too long (max 100KB)' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    if (!model || typeof model !== 'string' || model.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Model is required' }),
        { 
          status: 400, 
          headers: { ...headers, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!openrouter_api_key) {
      return new Response(
        JSON.stringify({ error: 'OpenRouter API key is required' }),
        { 
          status: 400, 
          headers: { ...headers, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Build messages
    const messages: any[] = [];

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    // Build request body
    const requestBody: any = {
      model,
      messages,
      temperature: Math.max(0, Math.min(2, temperature)),
      max_tokens: Math.max(1, Math.min(32000, max_tokens)),
      top_p: Math.max(0, Math.min(1, top_p)),
      frequency_penalty: Math.max(-2, Math.min(2, frequency_penalty)),
      presence_penalty: Math.max(-2, Math.min(2, presence_penalty)),
    };

    // Add optional parameters
    if (top_k !== undefined) {
      requestBody.top_k = Math.max(0, Math.min(100, top_k));
    }

    if (json_mode) {
      // JSON mode for models that support it
      if (model.includes('gpt-4') || model.includes('gpt-3.5')) {
        requestBody.response_format = { type: 'json_object' };
      }
    }

    // Handle streaming
    if (stream) {
      // For streaming, we'll return SSE (Server-Sent Events)
      // Simplified: return first chunk for now
      // Full streaming would require WebSocket or SSE implementation
      requestBody.stream = true;
    }

    const startTime = Date.now();

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouter_api_key}`,
        'HTTP-Referer': 'https://document-intelligence-suite.vercel.app', // Optional
        'X-Title': 'Document Intelligence Suite', // Optional
      },
      body: JSON.stringify(requestBody),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `OpenRouter API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          status: response.status 
        }),
        { 
          status: response.status, 
          headers: { ...headers, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();

    // Extract response content
    const content = data.choices?.[0]?.message?.content || '';
    const usage = data.usage || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };

    // Calculate cost if pricing is available
    let cost = undefined;
    if (data.usage && data.model_details?.pricing) {
      const pricing = data.model_details.pricing;
      const promptCost = (usage.prompt_tokens / 1_000_000) * parseFloat(pricing.prompt || '0');
      const completionCost = (usage.completion_tokens / 1_000_000) * parseFloat(pricing.completion || '0');
      
      cost = {
        prompt: promptCost,
        completion: completionCost,
        total: promptCost + completionCost,
      };
    }

    return new Response(
      JSON.stringify({
        response: content,
        usage: {
          prompt_tokens: usage.prompt_tokens || 0,
          completion_tokens: usage.completion_tokens || 0,
          total_tokens: usage.total_tokens || 0,
        },
        cost,
        model: data.model || model,
        duration,
      }),
      {
        headers: { ...headers, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Test prompt error:', error);
    
    // SECURITY: Don't expose stack traces in production
    const isProduction = Deno.env.get('ENVIRONMENT') === 'production';
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        ...(isProduction ? {} : { 
          details: error instanceof Error ? error.stack : String(error)
        })
      }),
      {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' }
      }
    );
  }
});

