import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { getSecurityHeaders, mergeSecurityHeaders } from '../_shared/security-headers.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!;
const mistralApiKey = Deno.env.get('MISTRAL_API_KEY')!;
const kimiApiKey = Deno.env.get('KIMI_API_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  const securityHeaders = getSecurityHeaders();
  const headers = mergeSecurityHeaders(corsHeaders, securityHeaders);

  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    const { prompt, model = 'gpt-4o-mini', temperature = 0.7, system_message } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    const startTime = Date.now();
    let response = '';
    let tokensIn = 0;
    let tokensOut = 0;

    // Determine provider from model
    const provider = model.includes('claude') ? 'anthropic' 
      : model.includes('mistral') ? 'mistral'
      : model.includes('kimi') ? 'kimi'
      : 'openai';

    try {
      if (provider === 'openai' && openaiApiKey) {
        const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: [
              ...(system_message ? [{ role: 'system', content: system_message }] : []),
              { role: 'user', content: prompt }
            ],
            temperature: temperature,
          }),
        });

        if (apiResponse.ok) {
          const data = await apiResponse.json();
          response = data.choices[0].message.content;
          tokensIn = data.usage?.prompt_tokens || 0;
          tokensOut = data.usage?.completion_tokens || 0;
        } else {
          throw new Error(`OpenAI API error: ${apiResponse.status}`);
        }
      } else if (provider === 'anthropic' && anthropicApiKey) {
        const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': anthropicApiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 4096,
            messages: [
              ...(system_message ? [{ role: 'system', content: system_message }] : []),
              { role: 'user', content: prompt }
            ],
            temperature: temperature,
          }),
        });

        if (apiResponse.ok) {
          const data = await apiResponse.json();
          response = data.content[0].text;
          tokensIn = data.usage?.input_tokens || 0;
          tokensOut = data.usage?.output_tokens || 0;
        } else {
          throw new Error(`Anthropic API error: ${apiResponse.status}`);
        }
      } else if (provider === 'mistral' && mistralApiKey) {
        const apiResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mistralApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: [
              ...(system_message ? [{ role: 'system', content: system_message }] : []),
              { role: 'user', content: prompt }
            ],
            temperature: temperature,
          }),
        });

        if (apiResponse.ok) {
          const data = await apiResponse.json();
          response = data.choices[0].message.content;
          tokensIn = data.usage?.prompt_tokens || 0;
          tokensOut = data.usage?.completion_tokens || 0;
        } else {
          throw new Error(`Mistral API error: ${apiResponse.status}`);
        }
      } else {
        throw new Error(`No API key configured for provider: ${provider}`);
      }
    } catch (error) {
      console.error('LLM API error:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to execute prompt',
          details: error instanceof Error ? error.message : String(error),
        }),
        { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    const latency = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        response,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        latency_ms: latency,
        model,
        provider,
      }),
      { headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Execute prompt error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
      { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }
});
