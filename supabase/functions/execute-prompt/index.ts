/**
 * Supabase Edge Function: Execute Prompt
 * 
 * Executes a prompt with LLM provider and logs the execution
 * 
 * POST /functions/v1/execute-prompt
 * Body: {
 *   prompt_id: string,
 *   prompt_version_id?: string,
 *   parameters: { [key: string]: any },
 *   model_provider: 'openai' | 'anthropic' | 'openrouter',
 *   model_name: string,
 *   temperature?: number,
 *   max_tokens?: number,
 *   system_message?: string
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { getSecurityHeaders, mergeSecurityHeaders } from '../_shared/security-headers.ts';

serve(async (req) => {
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) {
    return preflightResponse;
  }

  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  const securityHeaders = getSecurityHeaders();
  const headers = mergeSecurityHeaders(corsHeaders, securityHeaders);

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...headers, 'Content-Type': 'application/json' } 
        }
      );
    }

    const body = await req.json();
    const {
      prompt_id,
      prompt_version_id,
      parameters = {},
      model_provider,
      model_name,
      temperature = 0.7,
      max_tokens = 1000,
      system_message,
      openrouter_api_key,
      openai_api_key,
      anthropic_api_key,
    } = body;

    if (!prompt_id || !model_provider || !model_name) {
      return new Response(
        JSON.stringify({ error: 'prompt_id, model_provider, and model_name are required' }),
        { 
          status: 400, 
          headers: { ...headers, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get prompt
    const { data: prompt, error: promptError } = await supabase
      .from('prompts')
      .select('*, prompt_versions(*)')
      .eq('id', prompt_id)
      .or(`user_id.eq.${user.id},visibility.eq.public`)
      .single();

    if (promptError || !prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt not found' }),
        { 
          status: 404, 
          headers: { ...headers, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get version (or use current)
    let version = null;
    if (prompt_version_id) {
      const { data: v } = await supabase
        .from('prompt_versions')
        .select('*')
        .eq('id', prompt_version_id)
        .eq('prompt_id', prompt_id)
        .single();
      version = v;
    } else if (prompt.current_version_id) {
      const { data: v } = await supabase
        .from('prompt_versions')
        .select('*')
        .eq('id', prompt.current_version_id)
        .single();
      version = v;
    }

    // Use version prompt_body if available, otherwise use prompt prompt_body
    const promptBody = version?.prompt_body || prompt.prompt_body;
    const finalSystemMessage = system_message || version?.system_message || prompt.system_message;

    // Replace placeholders in prompt body
    let finalPrompt = promptBody;
    for (const [key, value] of Object.entries(parameters)) {
      const placeholder = `{{${key}}}`;
      finalPrompt = finalPrompt.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value));
    }

    const startTime = Date.now();

    // Execute with LLM provider
    let response: any;
    let usage: any = {};
    let cost: number | undefined;

    try {
      if (model_provider === 'openrouter') {
        if (!openrouter_api_key) {
          throw new Error('OpenRouter API key is required');
        }
        response = await executeOpenRouter(
          finalPrompt,
          finalSystemMessage,
          model_name,
          temperature,
          max_tokens,
          openrouter_api_key
        );
        usage = response.usage || {};
        cost = response.cost?.total;
      } else if (model_provider === 'openai') {
        if (!openai_api_key) {
          throw new Error('OpenAI API key is required');
        }
        response = await executeOpenAI(
          finalPrompt,
          finalSystemMessage,
          model_name,
          temperature,
          max_tokens,
          openai_api_key
        );
        usage = response.usage || {};
      } else if (model_provider === 'anthropic') {
        if (!anthropic_api_key) {
          throw new Error('Anthropic API key is required');
        }
        response = await executeAnthropic(
          finalPrompt,
          finalSystemMessage,
          model_name,
          temperature,
          max_tokens,
          anthropic_api_key
        );
        usage = response.usage || {};
      } else {
        throw new Error(`Unsupported model provider: ${model_provider}`);
      }
    } catch (execError) {
      console.error('Execution error:', execError);
      return new Response(
        JSON.stringify({ 
          error: execError instanceof Error ? execError.message : 'Execution failed',
          details: execError instanceof Error ? execError.stack : String(execError)
        }),
        { 
          status: 500, 
          headers: { ...headers, 'Content-Type': 'application/json' } 
        }
      );
    }

    const latencyMs = Date.now() - startTime;
    const responseText = response.content || response.text || '';
    const responseLength = responseText.length;
    const shouldStoreSeparately = responseLength > 100000; // 100KB threshold

    // Create execution record
    const executionData: any = {
      prompt_id,
      prompt_version_id: version?.id || null,
      user_id: user.id,
      input_parameters: parameters,
      model_provider,
      model_name,
      temperature: Math.max(0, Math.min(2, temperature)),
      max_tokens: Math.max(1, Math.min(32000, max_tokens)),
      system_message: finalSystemMessage || null,
      response_text: shouldStoreSeparately ? responseText.substring(0, 100000) : responseText,
      response_stored: shouldStoreSeparately,
      tokens_input: usage.prompt_tokens || 0,
      tokens_output: usage.completion_tokens || 0,
      tokens_total: usage.total_tokens || 0,
      latency_ms: latencyMs,
      cost_usd: cost || null,
      execution_context: {
        user_agent: req.headers.get('User-Agent'),
        timestamp: new Date().toISOString(),
      },
    };

    const { data: execution, error: execInsertError } = await supabase
      .from('executions')
      .insert(executionData)
      .select()
      .single();

    if (execInsertError) {
      console.error('Error inserting execution:', execInsertError);
      throw execInsertError;
    }

    // Store large response separately if needed
    if (shouldStoreSeparately && execution) {
      await supabase
        .from('executions_data')
        .insert({
          execution_id: execution.id,
          response_text: responseText,
        });
    }

    // Update prompt metrics (trigger handles this, but we can also update view count)
    await supabase
      .from('prompt_metrics')
      .update({ 
        last_viewed_at: new Date().toISOString(),
        view_count: supabase.raw('view_count + 1')
      })
      .eq('prompt_id', prompt_id)
      .onConflict('prompt_id')
      .merge();

    return new Response(
      JSON.stringify({
        execution_id: execution.id,
        response: responseText,
        usage: {
          prompt_tokens: usage.prompt_tokens || 0,
          completion_tokens: usage.completion_tokens || 0,
          total_tokens: usage.total_tokens || 0,
        },
        cost,
        latency_ms,
        model: model_name,
        provider: model_provider,
      }),
      {
        headers: { ...headers, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Execute prompt error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function executeOpenRouter(
  prompt: string,
  systemMessage: string | null,
  model: string,
  temperature: number,
  maxTokens: number,
  apiKey: string
): Promise<any> {
  const messages: any[] = [];
  
  if (systemMessage) {
    messages.push({ role: 'system', content: systemMessage });
  }
  
  messages.push({ role: 'user', content: prompt });

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://document-intelligence-suite.vercel.app',
      'X-Title': 'Document Intelligence Suite',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: Math.max(0, Math.min(2, temperature)),
      max_tokens: Math.max(1, Math.min(32000, maxTokens)),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const usage = data.usage || {};
  
  let cost = undefined;
  if (data.usage && data.model_details?.pricing) {
    const pricing = data.model_details.pricing;
    const promptCost = (usage.prompt_tokens / 1_000_000) * parseFloat(pricing.prompt || '0');
    const completionCost = (usage.completion_tokens / 1_000_000) * parseFloat(pricing.completion || '0');
    cost = promptCost + completionCost;
  }

  return {
    content,
    usage,
    cost: cost ? { total: cost } : undefined,
  };
}

async function executeOpenAI(
  prompt: string,
  systemMessage: string | null,
  model: string,
  temperature: number,
  maxTokens: number,
  apiKey: string
): Promise<any> {
  const messages: any[] = [];
  
  if (systemMessage) {
    messages.push({ role: 'system', content: systemMessage });
  }
  
  messages.push({ role: 'user', content: prompt });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: Math.max(0, Math.min(2, temperature)),
      max_tokens: Math.max(1, Math.min(32000, maxTokens)),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    usage: data.usage || {},
  };
}

async function executeAnthropic(
  prompt: string,
  systemMessage: string | null,
  model: string,
  temperature: number,
  maxTokens: number,
  apiKey: string
): Promise<any> {
  const messages = [{ role: 'user', content: prompt }];

  const body: any = {
    model,
    messages,
    max_tokens: Math.max(1, Math.min(4096, maxTokens)),
    temperature: Math.max(0, Math.min(1, temperature)),
  };

  if (systemMessage) {
    body.system = systemMessage;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return {
    content: data.content?.[0]?.text || '',
    usage: {
      prompt_tokens: data.usage?.input_tokens || 0,
      completion_tokens: data.usage?.output_tokens || 0,
      total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    },
  };
}
