import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { EdgeLogger, generateRequestId } from "../_shared/logger.ts";
import { withRateLimit, rateLimiters } from "../_shared/rate-limiter.ts";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { getSecurityHeaders, mergeSecurityHeaders } from "../_shared/security-headers.ts";
import { validateFile, extractFileFromDataUrl } from "../_shared/file-validation.ts";

// SECURITY: CORS headers are now generated dynamically with origin validation

interface ProcessRAGWithMarkdownRequest {
  documentId: string;
  jobId: string;
  fileUrl: string;
  ocrProvider: string;
  fileDataUrl?: string;
  openaiVisionModel?: string;
  // RAG-specific options
  generateEmbeddings?: boolean;
  embeddingProvider?: string;
  chunkSize?: number;
  chunkOverlap?: number;
  // Markdown conversion options
  convertTables?: boolean;
  preserveFormatting?: boolean;
  enableMarkdownConversion?: boolean;
}

interface OCRResult {
  text: string;
  metadata: {
    confidence?: number;
    pages?: number;
    language?: string;
    provider: string;
  };
}

interface RAGProcessedResult {
  success: boolean;
  documentId: string;
  filename: string;
  extractedText: string;
  markdownText?: string;
  embeddingsGenerated: boolean;
  chunksCreated: number;
  processingTime: number;
  metadata: {
    confidence?: number;
    pages?: number;
    language?: string;
    provider: string;
    markdownConversion?: {
      enabled: boolean;
      processingTime: number;
      wordCount: number;
      characterCount: number;
      tablesDetected: number;
      imagesDetected: number;
      linksDetected: number;
      conversionMethod: string;
    };
    ragProcessing?: {
      chunksCreated: number;
      embeddingsGenerated: number;
      embeddingProvider: string;
      chunkSize: number;
      chunkOverlap: number;
    };
  };
  requestId: string;
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

  const inboundReqId = req.headers.get('X-Request-Id') || undefined;
  const requestId = inboundReqId || generateRequestId();
  
  // Track API usage metrics
  const startTime = Date.now();
  let requestSize = 0;
  let responseSize = 0;
  let errorOccurred = false;
  let ocrProviderUsed = 'unknown';

  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(
      rateLimiters.ocr,
      'RAG processing rate limit exceeded. Please try again in a minute.'
    )(req);
    
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    console.log('🚀 Process RAG with Markdown started', {
      requestId,
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });
    
    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://joqnpibrfzqflyogrkht.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('🔧 Environment check:', {
      SUPABASE_URL_env: Deno.env.get('SUPABASE_URL'),
      supabaseUrl_final: supabaseUrl,
      hasServiceKey: !!supabaseServiceKey
    });
    
    if (!supabaseServiceKey) {
      console.error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY');
      throw new Error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const logger = new EdgeLogger(supabaseClient, requestId);

    // Parse request body
    let requestBody: ProcessRAGWithMarkdownRequest;
    try {
      const requestText = await req.text();
      requestSize = requestText.length;
      requestBody = JSON.parse(requestText);
      
      console.log('📋 Request body parsed successfully:', {
        documentId: requestBody.documentId,
        jobId: requestBody.jobId,
        inputType: requestBody.inputType,
        ocrProvider: requestBody.ocrProvider,
        generateEmbeddings: requestBody.generateEmbeddings,
        embeddingProvider: requestBody.embeddingProvider,
        hasFileData: !!requestBody.fileDataUrl,
        hasFileUrl: !!requestBody.fileUrl
      });
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      throw new Error('Invalid JSON in request body');
    }

    const { 
      documentId, 
      jobId, 
      fileUrl, 
      ocrProvider, 
      openaiVisionModel, 
      fileDataUrl,
      generateEmbeddings = true,
      embeddingProvider = 'openai',
      chunkSize = 1000,
      chunkOverlap = 200,
      convertTables = true,
      preserveFormatting = true,
      enableMarkdownConversion = true
    } = requestBody;
    
    ocrProviderUsed = ocrProvider;

    // Validate required fields
    if (!documentId || !jobId || !ocrProvider) {
      console.error('Missing required fields:', {
        hasDocumentId: !!documentId,
        hasJobId: !!jobId,
        hasOcrProvider: !!ocrProvider,
        hasFileUrl: !!fileUrl,
        hasFileDataUrl: !!fileDataUrl
      });
      throw new Error('Missing required fields: documentId, jobId, and ocrProvider are required');
    }

    logger.info('rag-markdown', `Starting RAG + Markdown processing for document ${documentId}`, {
      documentId,
      jobId,
      ocrProvider,
      enableMarkdownConversion,
      generateEmbeddings,
      embeddingProvider,
      chunkSize,
      chunkOverlap,
      requestId
    });

    const isTestMode = documentId === 'test-doc-id' || jobId === 'test-job-id';
    const processingStartTime = Date.now();

    if (!isTestMode) {
      await supabaseClient
        .from('processing_jobs')
        .update({
          status: 'ocr_processing',
          request_id: requestId
        })
        .eq('id', jobId);

      logger.debug('database', 'Updated job status to ocr_processing', { jobId });
    }

    try {
      // Step 1: Perform OCR processing (reuse existing OCR logic)
      let pdfBuffer: ArrayBuffer;
      let contentType = 'application/pdf';

      if (isTestMode) {
        pdfBuffer = new ArrayBuffer(0);
        logger.debug('storage', 'Test mode: using empty buffer', { jobId });
      } else {
        if (fileDataUrl && fileDataUrl.startsWith('data:')) {
          // SECURITY: Validate file from data URL
          const extractedFile = extractFileFromDataUrl(fileDataUrl);
          if (!extractedFile) {
            throw new Error('Invalid file data URL format');
          }

          // SECURITY: Validate file type and content
          const validation = validateFile(
            extractedFile.data,
            requestBody.fileUrl || 'uploaded-file',
            extractedFile.mimeType,
            50 * 1024 * 1024 // 50MB max
          );

          if (!validation.valid) {
            logger.error('security', 'File validation failed', new Error(validation.error || 'Unknown validation error'), {
              filename: requestBody.fileUrl,
              detectedType: validation.detectedType
            });
            throw new Error(`File validation failed: ${validation.error || 'Unknown error'}`);
          }

          contentType = extractedFile.mimeType;
          pdfBuffer = extractedFile.data.buffer;
          logger.info('storage', 'Received and validated file as base64 data URL', { 
            contentType, 
            size: extractedFile.data.length,
            detectedType: validation.detectedType
          });
        } else {
          logger.debug('storage', 'Fetching document from storage', { fileUrl });
          const pdfResponse = await fetch(fileUrl);
          if (!pdfResponse.ok) {
            throw new Error(`Failed to fetch document: ${pdfResponse.statusText}`);
          }

          contentType = pdfResponse.headers.get('content-type') || 'application/pdf';
          const pdfBlob = await pdfResponse.blob();
          pdfBuffer = await pdfBlob.arrayBuffer();
          
          // SECURITY: Validate file fetched from URL
          const validation = validateFile(
            pdfBuffer,
            requestBody.fileUrl || 'fetched-file',
            contentType,
            50 * 1024 * 1024 // 50MB max
          );

          if (!validation.valid) {
            logger.error('security', 'File validation failed', new Error(validation.error || 'Unknown validation error'), {
              fileUrl: requestBody.fileUrl,
              detectedType: validation.detectedType
            });
            throw new Error(`File validation failed: ${validation.error || 'Unknown error'}`);
          }

          logger.info('storage', `Document fetched and validated successfully (${pdfBuffer.byteLength} bytes, ${contentType})`, {
            fileSize: pdfBuffer.byteLength,
            contentType,
            detectedType: validation.detectedType
          });
        }
      }

      // Step 2: Call existing OCR processing
      const ocrStartTime = Date.now();
      logger.info('ocr', `Calling OCR provider: ${ocrProvider}`, { ocrProvider, bufferSize: pdfBuffer.byteLength });

      // Use existing OCR processing logic (simplified for integration)
      const ocrResult = await processOCRWithProvider(ocrProvider, pdfBuffer, contentType, openaiVisionModel, logger, documentId, jobId);
      
      const ocrDuration = Date.now() - ocrStartTime;
      logger.info('ocr', `OCR processing completed`, {
        provider: ocrProvider,
        textLength: ocrResult.text.length,
        duration_ms: ocrDuration,
        confidence: ocrResult.metadata.confidence,
        pages: ocrResult.metadata.pages
      });

      // Step 3: Convert to Markdown (if enabled)
      let markdownResult = null;
      let markdownConversionTime = 0;

      if (enableMarkdownConversion && ocrResult.text && ocrResult.text.trim().length > 0) {
        const markdownStartTime = Date.now();
        logger.info('markdown', 'Starting Markdown conversion for RAG', {
          textLength: ocrResult.text.length,
          convertTables,
          preserveFormatting
        });

        try {
          const markdownResponse = await fetch(`${supabaseUrl}/functions/v1/markdown-converter`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': supabaseServiceKey,
            },
            body: JSON.stringify({
              // For plain text (OCR results), send as-is without base64 encoding
              // The markdown converter will handle both base64 and plain text
              fileData: ocrResult.text,
              contentType: 'text/plain',
              fileName: `rag-ocr-output-${documentId}.txt`,
              fileSize: ocrResult.text.length,
              convertTables,
              preserveFormatting
            })
          });

          if (markdownResponse.ok) {
            markdownResult = await markdownResponse.json();
            markdownConversionTime = Date.now() - markdownStartTime;
            
            logger.info('markdown', 'Markdown conversion completed for RAG', {
              originalLength: ocrResult.text.length,
              markdownLength: markdownResult.markdown?.length || 0,
              processingTime: markdownConversionTime,
              tablesDetected: markdownResult.metadata?.tablesDetected || 0
            });
          } else {
            logger.warning('markdown', 'Markdown conversion failed, using OCR text for RAG', {
              status: markdownResponse.status,
              statusText: markdownResponse.statusText
            });
          }
        } catch (markdownError) {
          logger.warning('markdown', 'Markdown conversion error, using OCR text for RAG', markdownError);
        }
      }

      console.log('🔍 AFTER MARKDOWN CONVERSION - ABOUT TO CREATE DOCUMENT RECORD');

      // Step 4: Create document record in rag_documents table
      console.log('🚀 REACHED DOCUMENT RECORD CREATION STEP');
      
      const filename = `rag-document-${documentId}.md`;
      const fileSize = pdfBuffer.byteLength;
      const fileType = contentType;
      
      console.log('🔧 About to create document record:', {
        documentId,
        filename,
        fileSize,
        fileType,
        embeddingProvider,
        supabaseUrl,
        hasSupabaseClient: !!supabaseClient
      });
      
      logger.info('rag', 'Creating document record', { documentId, filename });
      
      // Check if document record already exists
      const { data: existingDoc, error: checkError } = await supabaseClient
        .from('rag_documents')
        .select('id')
        .eq('id', documentId)
        .single();

      console.log('🔍 Checking for existing document record:', {
        existingDoc,
        checkError: checkError?.message,
        documentId
      });

      let docInsertError = null;
      if (!existingDoc) {
        console.log('🔧 No existing record found, creating new one...');
        
        const { error } = await supabaseClient
          .from('rag_documents')
          .insert({
            id: documentId,
            filename: filename,
            upload_date: new Date().toISOString(),
            embedding_provider: embeddingProvider,
            metadata: {
              fileSize: fileSize,
              fileType: fileType,
              ocrProvider: ocrProvider,
              markdownEnabled: enableMarkdownConversion,
              chunkSize,
              chunkOverlap
            }
          });
        
        docInsertError = error;
      } else {
        console.log('✅ Document record already exists, skipping creation');
        logger.info('rag', 'Document record already exists', { documentId });
      }

      console.log('🔧 Document record creation result:', {
        hasError: !!docInsertError,
        errorMessage: docInsertError?.message,
        errorCode: docInsertError?.code,
        errorDetails: docInsertError?.details,
        existingRecord: !!existingDoc
      });

      if (docInsertError) {
        console.error('❌ Failed to create document record:', {
          error: docInsertError.message,
          details: docInsertError.details,
          hint: docInsertError.hint,
          code: docInsertError.code,
          documentId,
          filename,
          fileSize,
          fileType
        });
        logger.warning('rag', 'Failed to create document record', {
          error: docInsertError.message,
          documentId
        });
        // Continue anyway - we can still generate embeddings without the document record
      } else {
        console.log('✅ Document record created/verified successfully:', { documentId, filename });
        logger.info('rag', 'Document record created/verified successfully', { documentId });
      }

      // Step 5: Generate embeddings (if enabled)
      let embeddingsGenerated = false;
      let chunksCreated = 0;
      let ragProcessingTime = 0;

      logger.info('rag', 'Checking embedding generation flag', {
        generateEmbeddings,
        markdownResult: !!markdownResult,
        ocrResultTextLength: ocrResult.text.length
      });

      if (generateEmbeddings) {        
        const ragStartTime = Date.now();
        const textForEmbeddings = markdownResult?.markdown || ocrResult.text;
        
        logger.info('rag', 'Starting embedding generation', {
          textLength: textForEmbeddings.length,
          embeddingProvider,
          chunkSize,
          chunkOverlap
        });

        // Verify document record exists before generating embeddings
        console.log('🔍 Verifying document record exists before embedding generation...');
        const { data: verifyDoc, error: verifyError } = await supabaseClient
          .from('rag_documents')
          .select('id')
          .eq('id', documentId)
          .single();

        console.log('🔍 Document verification result:', {
          documentId,
          exists: !!verifyDoc,
          verifyError: verifyError?.message
        });

        if (!verifyDoc && verifyError?.code !== 'PGRST116') {
          console.error('❌ Document record verification failed:', {
            documentId,
            error: verifyError?.message,
            code: verifyError?.code
          });
          logger.error('rag', 'Document record verification failed', {
            documentId,
            error: verifyError?.message
          });
        } else {
          console.log('✅ Document record verified, proceeding with embedding generation');
        }

        try {
          logger.info('rag', 'Calling generate-embeddings function', {
            supabaseUrl,
            url: `${supabaseUrl}/functions/v1/generate-embeddings`,
            documentId,
            filename: `rag-document-${documentId}.md`,
            textLength: textForEmbeddings.length
          });
          
          console.log('🔧 About to call generate-embeddings:', {
            supabaseUrl,
            fullUrl: `${supabaseUrl}/functions/v1/generate-embeddings`,
            documentId,
            textLength: textForEmbeddings.length
          });
          
          const embeddingResponse = await fetch(`${supabaseUrl}/functions/v1/generate-embeddings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': supabaseServiceKey,
            },
            body: JSON.stringify({
              text: textForEmbeddings,
              documentId: documentId,
              filename: `rag-document-${documentId}.md`,
              provider: embeddingProvider
            })
          });

          if (embeddingResponse.ok) {
            const embeddingResult = await embeddingResponse.json();
            embeddingsGenerated = true;
            chunksCreated = embeddingResult.chunkCount || embeddingResult.chunksCreated || 0;
            ragProcessingTime = Date.now() - ragStartTime;
            
            logger.info('rag', 'Embedding generation completed', {
              chunksCreated,
              embeddingProvider,
              processingTime: ragProcessingTime,
              embeddingResult
            });
          } else {
            const errorText = await embeddingResponse.text();
            logger.error('rag', 'Embedding generation failed', {
              status: embeddingResponse.status,
              statusText: embeddingResponse.statusText,
              errorText
            });
          }
        } catch (embeddingError) {
          logger.error('rag', 'Embedding generation error', {
            error: embeddingError instanceof Error ? embeddingError.message : String(embeddingError),
            stack: embeddingError instanceof Error ? embeddingError.stack : undefined,
            documentId,
            embeddingProvider
          });
        }
      }

      const totalProcessingTime = Date.now() - processingStartTime;

      // Step 5: Prepare result
      const finalText = markdownResult?.markdown || ocrResult.text;
      const result: RAGProcessedResult = {
        success: true,
        documentId: documentId,
        filename: filename,
        extractedText: ocrResult.text,
        markdownText: markdownResult?.markdown,
        embeddingsGenerated,
        chunksCreated,
        processingTime: totalProcessingTime,
        metadata: {
          ...ocrResult.metadata,
          markdownConversion: enableMarkdownConversion ? {
            enabled: true,
            processingTime: markdownConversionTime,
            wordCount: markdownResult?.metadata?.wordCount || 0,
            characterCount: markdownResult?.metadata?.characterCount || 0,
            tablesDetected: markdownResult?.metadata?.tablesDetected || 0,
            imagesDetected: markdownResult?.metadata?.imagesDetected || 0,
            linksDetected: markdownResult?.metadata?.linksDetected || 0,
            conversionMethod: markdownResult?.metadata?.conversionMethod || 'text-to-markdown'
          } : {
            enabled: false,
            processingTime: 0,
            wordCount: 0,
            characterCount: 0,
            tablesDetected: 0,
            imagesDetected: 0,
            linksDetected: 0,
            conversionMethod: 'disabled'
          },
          ragProcessing: {
            chunksCreated,
            embeddingsGenerated: embeddingsGenerated ? chunksCreated : 0,
            embeddingProvider,
            chunkSize,
            chunkOverlap
          }
        },
        requestId
      };

      logger.info('rag-markdown', 'RAG + Markdown processing completed successfully', {
        jobId,
        documentId,
        totalProcessingTime,
        ocrTextLength: ocrResult.text.length,
        markdownTextLength: finalText.length,
        chunksCreated,
        embeddingsGenerated,
        markdownEnabled: enableMarkdownConversion,
        provider: ocrProvider
      });

      if (!isTestMode) {
        await supabaseClient
          .from('processing_jobs')
          .update({
            extracted_text: ocrResult.text,
            markdown_text: markdownResult?.markdown,
            processing_time_ms: totalProcessingTime,
            provider_metadata: result.metadata,
            page_count: ocrResult.metadata.pages || 1,
            status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId);

        await supabaseClient
          .from('documents')
          .update({ status: 'completed' })
          .eq('id', documentId);

        // Note: rag_documents record was already created in Step 4

        await logger.recordPerformanceMetric({
          jobId,
          stage: 'rag-markdown',
          provider: ocrProvider,
          startTime: new Date(processingStartTime),
          endTime: new Date(),
          status: 'success',
          metadata: {
            textLength: ocrResult.text.length,
            markdownLength: finalText.length,
            chunksCreated,
            embeddingsGenerated,
            confidence: ocrResult.metadata.confidence,
            pages: ocrResult.metadata.pages,
            provider: ocrProvider,
            markdownEnabled: enableMarkdownConversion
          }
        });

        logger.debug('database', 'Updated job, document, and RAG status to completed', { jobId, documentId });
      }

      // Track successful request metrics
      const responseTime = Date.now() - startTime;
      responseSize = JSON.stringify(result).length;
      
      // Log metrics
      console.log('API_METRICS:', {
        endpoint: '/api/process-rag-markdown',
        method: 'POST',
        requestId,
        responseTime,
        requestSize,
        responseSize,
        ocrProvider: ocrProviderUsed,
        markdownEnabled: enableMarkdownConversion,
        embeddingsGenerated,
        chunksCreated,
        success: true,
        timestamp: new Date().toISOString()
      });
      
      return new Response(JSON.stringify(result), { 
          headers: { ...headers, 'Content-Type': 'application/json', 'X-Request-Id': requestId }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'RAG processing failed';
      logger.critical('rag-markdown', 'Processing failed with error', error, {
        jobId,
        documentId,
        provider: ocrProvider,
        errorMessage
      });

      if (!isTestMode) {
        await supabaseClient
          .from('processing_jobs')
          .update({
            status: 'failed',
            error_message: errorMessage,
            error_details: {
              error: errorMessage,
              provider: ocrProvider,
              timestamp: new Date().toISOString(),
              requestId
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId);

        await supabaseClient
          .from('documents')
          .update({ status: 'failed' })
          .eq('id', documentId);
      }

      throw error;
    }

  } catch (error) {
    errorOccurred = true;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Track error metrics
    const responseTime = Date.now() - startTime;
    const errorData = { success: false, error: errorMessage, requestId };
    responseSize = JSON.stringify(errorData).length;
    
    // Log error metrics
    console.log('API_METRICS:', {
      endpoint: '/api/process-rag-markdown',
      method: 'POST',
      requestId,
      responseTime,
      requestSize,
      responseSize,
      ocrProvider: ocrProviderUsed,
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
    
    console.error('[CRITICAL] Function error:', errorMessage, error);

    return new Response(JSON.stringify(errorData), { 
      status: 500, 
          headers: { ...headers, 'Content-Type': 'application/json', 'X-Request-Id': requestId }
    });
  }
});

// Real OCR processing function - calls the actual OCR edge function
async function processOCRWithProvider(
  provider: string,
  buffer: ArrayBuffer,
  contentType: string,
  openaiVisionModel: string,
  logger: EdgeLogger,
  documentId: string,
  jobId: string
): Promise<OCRResult> {
  logger.info('ocr', `Calling real OCR processing with ${provider}`, {
    provider,
    bufferSize: buffer.byteLength,
    contentType
  });

  // Convert ArrayBuffer to base64 for the OCR function
  // Use chunked approach to avoid "Maximum call stack size exceeded" for large files
  const uint8Array = new Uint8Array(buffer);
  let binaryString = '';
  const chunkSize = 8192; // Process in 8KB chunks
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, i + chunkSize);
    // Convert chunk without spread operator to avoid stack overflow
    for (let j = 0; j < chunk.length; j++) {
      binaryString += String.fromCharCode(chunk[j]);
    }
  }
  
  const base64String = btoa(binaryString);
  const dataUrl = `data:${contentType};base64,${base64String}`;

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://joqnpibrfzqflyogrkht.supabase.co';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  try {
    // Call the real OCR processing function
    const ocrResponse = await fetch(`${supabaseUrl}/functions/v1/process-pdf-ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
      },
      body: JSON.stringify({
        documentId: documentId,
        jobId: jobId,
        fileDataUrl: dataUrl,
        ocrProvider: provider,
        openaiVisionModel: openaiVisionModel || 'gpt-4o'
      }),
    });

    if (!ocrResponse.ok) {
      const errorText = await ocrResponse.text();
      logger.error('ocr', `OCR processing failed: ${ocrResponse.status}`, { errorText });
      throw new Error(`OCR processing failed: ${ocrResponse.status} ${errorText}`);
    }

    const ocrResult = await ocrResponse.json();
    
    // process-pdf-ocr returns extractedText, not text
    const extractedText = ocrResult.extractedText || ocrResult.text || '';
    
    logger.info('ocr', `Real OCR processing completed`, {
      provider,
      textLength: extractedText.length,
      confidence: ocrResult.metadata?.confidence,
      pages: ocrResult.metadata?.pages,
      success: ocrResult.success,
      hasExtractedText: !!ocrResult.extractedText,
      hasText: !!ocrResult.text
    });

    return {
      text: extractedText,
      metadata: ocrResult.metadata || {
        confidence: 0,
        pages: 1,
        provider: provider
      }
    };
  } catch (error) {
    logger.error('ocr', `OCR processing error`, error);
    throw error;
  }
}
