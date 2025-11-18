/**
 * Supabase Edge Function: Execute Workflow
 * 
 * Executes a workflow template with provided inputs
 * 
 * Input: { 
 *   workflowId: string,
 *   inputs: Record<string, any>
 * }
 * Output: { 
 *   success: boolean,
 *   outputs: Record<string, any>,
 *   executionLog: string[],
 *   stats: any
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { getSecurityHeaders, mergeSecurityHeaders } from '../_shared/security-headers.ts';
import {
  getWorkflowTemplate,
  getWorkflowTemplates,
  executeWorkflow,
  getWorkflowStats,
  type WorkflowTemplate
} from '../_shared/workflow-templates.ts';

// =============================================================================
// RAG Query Integration
// =============================================================================

/**
 * Execute RAG query by calling the rag-query function
 */
async function executeRAGQuery(params: any): Promise<any> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration not found');
  }
  
  // Call the rag-query function
  const response = await fetch(`${supabaseUrl}/functions/v1/rag-query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`
    },
    body: JSON.stringify({
      question: params.question,
      documentId: params.documentId,
      filename: params.filename,
      model: params.model || 'gpt-4o-mini',
      provider: params.provider || 'openai',
      topK: params.topK || 5,
      searchStrategy: params.searchStrategy || 'hybrid',
      fusionAlpha: params.fusionAlpha || 0.5
    })
  });
  
  if (!response.ok) {
    throw new Error(`RAG query failed: ${response.statusText}`);
  }
  
  return await response.json();
}

// =============================================================================
// Main Edge Function
// =============================================================================

serve(async (req) => {
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
    // Handle GET request - list available workflows
    if (req.method === 'GET') {
      const workflows = getWorkflowTemplates();
      return new Response(
        JSON.stringify({
          workflows: workflows.map(w => ({
            id: w.id,
            name: w.name,
            description: w.description,
            category: w.category,
            inputs: w.inputs,
            outputs: w.outputs
          }))
        }),
        {
          headers: { ...headers, 'Content-Type': 'application/json' }
        }
      );
    }

    // Handle POST request - execute workflow
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const { workflowId, inputs } = await req.json();

    // SECURITY: Validate input
    if (!workflowId || typeof workflowId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid required field: workflowId' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    if (!inputs || typeof inputs !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid required field: inputs' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🚀 Executing workflow: ${workflowId}`);
    console.log('📋 Inputs:', inputs);

    // Get workflow template
    const template = getWorkflowTemplate(workflowId);
    if (!template) {
      return new Response(
        JSON.stringify({ error: `Workflow not found: ${workflowId}` }),
        { status: 404, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    // Execute workflow
    const startTime = Date.now();
    const result = await executeWorkflow(template, inputs, executeRAGQuery);
    const executionTime = Date.now() - startTime;

    // Get statistics
    const stats = {
      ...getWorkflowStats(result.context),
      executionTime
    };

    console.log(`✅ Workflow completed in ${executionTime}ms`);
    console.log('📊 Stats:', stats);

    return new Response(
      JSON.stringify({
        success: true,
        workflowId,
        workflowName: template.name,
        outputs: result.outputs,
        executionLog: result.log,
        stats
      }),
      {
        headers: { ...headers, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ Error in execute-workflow function:', error);
    
    // SECURITY: Don't expose stack traces in production
    const isProduction = Deno.env.get('ENVIRONMENT') === 'production';
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to execute workflow',
        ...(isProduction ? {} : { details: error.toString() })
      }),
      {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' }
      }
    );
  }
});
