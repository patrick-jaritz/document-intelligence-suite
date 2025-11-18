/**
 * Workflow Templates Module
 * Inspired by RAGFlow's agentic workflow capabilities
 * 
 * Provides simple multi-step reasoning workflows for complex document analysis tasks.
 * Designed for serverless Edge Function environment.
 */

export type WorkflowStepType = 
  | 'rag_query'           // Standard RAG query
  | 'compare_documents'   // Compare multiple documents
  | 'summarize'           // Summarize results
  | 'filter'              // Filter results based on criteria
  | 'aggregate'           // Aggregate information
  | 'conditional';        // Conditional branching

export interface WorkflowStep {
  id: string;
  type: WorkflowStepType;
  name: string;
  description?: string;
  parameters: Record<string, any>;
  condition?: {
    field: string;
    operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan';
    value: any;
  };
  nextStepOnSuccess?: string;
  nextStepOnFailure?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'analysis' | 'comparison' | 'extraction' | 'qa';
  steps: WorkflowStep[];
  inputs: {
    name: string;
    type: 'string' | 'array' | 'number';
    required: boolean;
    description: string;
  }[];
  outputs: {
    name: string;
    type: 'string' | 'array' | 'object';
    description: string;
  }[];
}

export interface WorkflowContext {
  inputs: Record<string, any>;
  variables: Record<string, any>;
  results: Record<string, any>;
  currentStep: string;
  executionLog: string[];
}

// =============================================================================
// Pre-defined Workflow Templates
// =============================================================================

/**
 * Simple Q&A workflow - single RAG query
 */
export const SIMPLE_QA_WORKFLOW: WorkflowTemplate = {
  id: 'simple-qa',
  name: 'Simple Q&A',
  description: 'Answer a question using RAG retrieval from a single document',
  category: 'qa',
  inputs: [
    { name: 'question', type: 'string', required: true, description: 'Question to answer' },
    { name: 'documentId', type: 'string', required: false, description: 'Document ID to search' }
  ],
  outputs: [
    { name: 'answer', type: 'string', description: 'Generated answer' },
    { name: 'sources', type: 'array', description: 'Source citations' }
  ],
  steps: [
    {
      id: 'query',
      type: 'rag_query',
      name: 'Query Document',
      parameters: {
        question: '${input.question}',
        documentId: '${input.documentId}',
        searchStrategy: 'hybrid'
      }
    }
  ]
};

/**
 * Multi-document comparison workflow
 */
export const DOCUMENT_COMPARISON_WORKFLOW: WorkflowTemplate = {
  id: 'doc-comparison',
  name: 'Document Comparison',
  description: 'Compare information across multiple documents and synthesize findings',
  category: 'comparison',
  inputs: [
    { name: 'question', type: 'string', required: true, description: 'Comparison question' },
    { name: 'documentIds', type: 'array', required: true, description: 'List of document IDs to compare' }
  ],
  outputs: [
    { name: 'comparison', type: 'string', description: 'Comparative analysis' },
    { name: 'sourcesByDocument', type: 'object', description: 'Sources grouped by document' }
  ],
  steps: [
    {
      id: 'query_doc1',
      type: 'rag_query',
      name: 'Query First Document',
      parameters: {
        question: '${input.question}',
        documentId: '${input.documentIds[0]}',
        searchStrategy: 'hybrid'
      },
      nextStepOnSuccess: 'query_doc2'
    },
    {
      id: 'query_doc2',
      type: 'rag_query',
      name: 'Query Second Document',
      parameters: {
        question: '${input.question}',
        documentId: '${input.documentIds[1]}',
        searchStrategy: 'hybrid'
      },
      nextStepOnSuccess: 'compare'
    },
    {
      id: 'compare',
      type: 'compare_documents',
      name: 'Compare Results',
      parameters: {
        results: ['${results.query_doc1}', '${results.query_doc2}'],
        question: '${input.question}'
      }
    }
  ]
};

/**
 * Progressive refinement workflow - iterative querying
 */
export const PROGRESSIVE_REFINEMENT_WORKFLOW: WorkflowTemplate = {
  id: 'progressive-refinement',
  name: 'Progressive Refinement',
  description: 'Iteratively refine answer by querying multiple times with different strategies',
  category: 'analysis',
  inputs: [
    { name: 'question', type: 'string', required: true, description: 'Initial question' },
    { name: 'documentId', type: 'string', required: true, description: 'Document to analyze' }
  ],
  outputs: [
    { name: 'finalAnswer', type: 'string', description: 'Refined answer' },
    { name: 'allSources', type: 'array', description: 'All sources used' }
  ],
  steps: [
    {
      id: 'broad_query',
      type: 'rag_query',
      name: 'Broad Query (Semantic)',
      parameters: {
        question: '${input.question}',
        documentId: '${input.documentId}',
        searchStrategy: 'vector'
      },
      nextStepOnSuccess: 'specific_query'
    },
    {
      id: 'specific_query',
      type: 'rag_query',
      name: 'Specific Query (Keyword)',
      parameters: {
        question: '${input.question}',
        documentId: '${input.documentId}',
        searchStrategy: 'keyword'
      },
      nextStepOnSuccess: 'synthesize'
    },
    {
      id: 'synthesize',
      type: 'aggregate',
      name: 'Synthesize Answers',
      parameters: {
        results: ['${results.broad_query}', '${results.specific_query}'],
        strategy: 'combine_unique'
      }
    }
  ]
};

/**
 * Extract and summarize workflow
 */
export const EXTRACT_SUMMARIZE_WORKFLOW: WorkflowTemplate = {
  id: 'extract-summarize',
  name: 'Extract & Summarize',
  description: 'Extract relevant information and provide a summary',
  category: 'extraction',
  inputs: [
    { name: 'topic', type: 'string', required: true, description: 'Topic to extract information about' },
    { name: 'documentId', type: 'string', required: true, description: 'Document to analyze' }
  ],
  outputs: [
    { name: 'summary', type: 'string', description: 'Summary of findings' },
    { name: 'keyPoints', type: 'array', description: 'Key points extracted' }
  ],
  steps: [
    {
      id: 'extract',
      type: 'rag_query',
      name: 'Extract Information',
      parameters: {
        question: 'What information is available about ${input.topic}?',
        documentId: '${input.documentId}',
        searchStrategy: 'hybrid',
        topK: 10
      },
      nextStepOnSuccess: 'summarize'
    },
    {
      id: 'summarize',
      type: 'summarize',
      name: 'Summarize Findings',
      parameters: {
        content: '${results.extract.answer}',
        sources: '${results.extract.sources}',
        style: 'bullet_points'
      }
    }
  ]
};

// =============================================================================
// Workflow Registry
// =============================================================================

export const WORKFLOW_TEMPLATES: Record<string, WorkflowTemplate> = {
  'simple-qa': SIMPLE_QA_WORKFLOW,
  'doc-comparison': DOCUMENT_COMPARISON_WORKFLOW,
  'progressive-refinement': PROGRESSIVE_REFINEMENT_WORKFLOW,
  'extract-summarize': EXTRACT_SUMMARIZE_WORKFLOW
};

/**
 * Get all available workflow templates
 */
export function getWorkflowTemplates(): WorkflowTemplate[] {
  return Object.values(WORKFLOW_TEMPLATES);
}

/**
 * Get a specific workflow template by ID
 */
export function getWorkflowTemplate(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES[id];
}

// =============================================================================
// Workflow Execution Engine
// =============================================================================

/**
 * Resolve template variables in a string
 */
function resolveVariables(template: string, context: WorkflowContext): any {
  // Handle template syntax: ${input.name}, ${results.stepId.field}, ${variables.name}
  const variablePattern = /\$\{([^}]+)\}/g;
  
  let resolved = template;
  let match;
  
  while ((match = variablePattern.exec(template)) !== null) {
    const path = match[1];
    const value = getValueByPath(context, path);
    resolved = resolved.replace(match[0], String(value || ''));
  }
  
  return resolved;
}

/**
 * Get value from context by dot notation path
 */
function getValueByPath(context: WorkflowContext, path: string): any {
  const parts = path.split('.');
  let value: any = context;
  
  for (const part of parts) {
    // Handle array indexing like "documentIds[0]"
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      value = value[key]?.[parseInt(index)];
    } else {
      value = value[part];
    }
    
    if (value === undefined) break;
  }
  
  return value;
}

/**
 * Resolve all parameters in a step
 */
function resolveStepParameters(parameters: Record<string, any>, context: WorkflowContext): Record<string, any> {
  const resolved: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(parameters)) {
    if (typeof value === 'string' && value.includes('${')) {
      resolved[key] = resolveVariables(value, context);
    } else if (Array.isArray(value)) {
      resolved[key] = value.map(item => 
        typeof item === 'string' && item.includes('${') 
          ? resolveVariables(item, context)
          : item
      );
    } else {
      resolved[key] = value;
    }
  }
  
  return resolved;
}

/**
 * Evaluate a condition
 */
function evaluateCondition(condition: WorkflowStep['condition'], context: WorkflowContext): boolean {
  if (!condition) return true;
  
  const value = getValueByPath(context, condition.field);
  
  switch (condition.operator) {
    case 'equals':
      return value === condition.value;
    case 'contains':
      return String(value).includes(condition.value);
    case 'greaterThan':
      return Number(value) > Number(condition.value);
    case 'lessThan':
      return Number(value) < Number(condition.value);
    default:
      return true;
  }
}

/**
 * Execute a single workflow step
 * Note: This is a simplified version. Full implementation would require
 * actual integration with RAG query function and other services.
 */
export async function executeWorkflowStep(
  step: WorkflowStep,
  context: WorkflowContext,
  ragQueryFunction?: (params: any) => Promise<any>
): Promise<any> {
  console.log(`🔄 Executing step: ${step.name} (${step.type})`);
  
  // Resolve parameters
  const resolvedParams = resolveStepParameters(step.parameters, context);
  
  // Log execution
  context.executionLog.push(`Executing ${step.name} with params: ${JSON.stringify(resolvedParams)}`);
  
  // Execute based on step type
  switch (step.type) {
    case 'rag_query':
      if (!ragQueryFunction) {
        throw new Error('RAG query function not provided');
      }
      return await ragQueryFunction(resolvedParams);
    
    case 'compare_documents':
      // Simplified comparison logic
      const results = resolvedParams.results || [];
      return {
        comparison: `Comparison of ${results.length} documents for question: ${resolvedParams.question}`,
        results: results
      };
    
    case 'summarize':
      // Simplified summarization
      return {
        summary: `Summary: ${resolvedParams.content?.substring(0, 200)}...`,
        style: resolvedParams.style
      };
    
    case 'aggregate':
      // Simplified aggregation
      const allResults = resolvedParams.results || [];
      return {
        aggregated: true,
        count: allResults.length,
        combined: allResults
      };
    
    case 'filter':
      // Simplified filtering
      return {
        filtered: true,
        criteria: resolvedParams
      };
    
    case 'conditional':
      // Conditional logic handled in workflow execution
      return { condition: 'evaluated' };
    
    default:
      throw new Error(`Unknown step type: ${step.type}`);
  }
}

/**
 * Execute a complete workflow
 */
export async function executeWorkflow(
  template: WorkflowTemplate,
  inputs: Record<string, any>,
  ragQueryFunction?: (params: any) => Promise<any>
): Promise<{ outputs: Record<string, any>; log: string[]; context: WorkflowContext }> {
  console.log(`🚀 Starting workflow: ${template.name}`);
  
  // Initialize context
  const context: WorkflowContext = {
    inputs,
    variables: {},
    results: {},
    currentStep: template.steps[0]?.id || '',
    executionLog: [`Starting workflow: ${template.name}`]
  };
  
  // Validate inputs
  for (const input of template.inputs) {
    if (input.required && !(input.name in inputs)) {
      throw new Error(`Missing required input: ${input.name}`);
    }
  }
  
  // Execute steps
  let currentStepId = template.steps[0]?.id;
  const executedSteps = new Set<string>();
  const maxSteps = 10; // Prevent infinite loops
  
  while (currentStepId && executedSteps.size < maxSteps) {
    const step = template.steps.find(s => s.id === currentStepId);
    if (!step) break;
    
    // Check for infinite loop
    if (executedSteps.has(currentStepId)) {
      console.warn(`⚠️ Step ${currentStepId} already executed, stopping to prevent loop`);
      break;
    }
    
    executedSteps.add(currentStepId);
    context.currentStep = currentStepId;
    
    // Evaluate condition if present
    if (step.condition && !evaluateCondition(step.condition, context)) {
      console.log(`⏭️ Skipping step ${step.name} due to condition`);
      currentStepId = step.nextStepOnFailure || '';
      continue;
    }
    
    // Execute step
    try {
      const result = await executeWorkflowStep(step, context, ragQueryFunction);
      context.results[step.id] = result;
      context.executionLog.push(`✅ Completed ${step.name}`);
      
      // Determine next step
      currentStepId = step.nextStepOnSuccess || '';
      
      // If no explicit next step, try to find next in sequence
      if (!currentStepId) {
        const currentIndex = template.steps.findIndex(s => s.id === step.id);
        if (currentIndex < template.steps.length - 1) {
          currentStepId = template.steps[currentIndex + 1].id;
        }
      }
    } catch (error) {
      console.error(`❌ Error in step ${step.name}:`, error);
      context.executionLog.push(`❌ Error in ${step.name}: ${error.message}`);
      currentStepId = step.nextStepOnFailure || '';
      
      // If no failure path, stop execution
      if (!currentStepId) break;
    }
  }
  
  // Extract outputs
  const outputs: Record<string, any> = {};
  for (const output of template.outputs) {
    // Try to find output in results
    const lastResult = context.results[template.steps[template.steps.length - 1]?.id];
    outputs[output.name] = lastResult?.[output.name] || lastResult;
  }
  
  console.log(`✅ Workflow completed: ${template.name}`);
  
  return {
    outputs,
    log: context.executionLog,
    context
  };
}

/**
 * Get workflow execution statistics
 */
export function getWorkflowStats(context: WorkflowContext): {
  stepsExecuted: number;
  stepsTotal: number;
  executionTime?: number;
  success: boolean;
} {
  const stepsExecuted = Object.keys(context.results).length;
  const hasErrors = context.executionLog.some(log => log.includes('❌'));
  
  return {
    stepsExecuted,
    stepsTotal: stepsExecuted,
    success: !hasErrors
  };
}
