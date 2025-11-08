import { useState, useCallback } from 'react';
import { supabase, supabaseUrl, callEdgeFunction, ragHelpers } from '../lib/supabase';
import { logger } from '../lib/logger';

interface ProcessingState {
  status: 'idle' | 'uploading' | 'ocr_processing' | 'llm_processing' | 'completed' | 'failed';
  documentId?: string;
  jobId?: string;
  extractedText?: string;
  markdownText?: string;
  structuredOutput?: any;
  error?: string;
  processingTime?: number;
  // Enhanced progress tracking
  progress?: number;
  progressStatus?: string;
  currentPage?: number;
  totalPages?: number;
  confidence?: number;
  estimatedTimeRemaining?: number;
  // Markdown conversion metadata
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
}

interface ProcessingOptions {
  enableMarkdownConversion?: boolean;
  convertTables?: boolean;
  preserveFormatting?: boolean;
  useIntegratedPipeline?: boolean;
}

export function useDocumentProcessor() {
  const [state, setState] = useState<ProcessingState>({ status: 'idle' });

  const processDocument = useCallback(async (
    file: File,
    structureTemplate: any,
    ocrProvider: 'google-vision' | 'mistral' | 'tesseract' | 'aws-textract' | 'azure-document-intelligence' | 'ocr-space' | 'openai-vision' | 'paddleocr' | 'dots-ocr' | 'deepseek-ocr' = 'google-vision',
    llmProvider: 'openai' | 'anthropic' | 'mistral' | 'kimi' = 'openai',
    openaiVisionModel: string = 'gpt-4o-mini',
    llmModel: string = 'gpt-4o-mini',
    options: ProcessingOptions = {}
  ) => {
    const requestId = `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      logger.info('upload', 'Starting document processing with Markdown integration', {
        fileName: file.name,
        fileSize: file.size,
        ocrProvider,
        llmProvider,
        enableMarkdownConversion: options.enableMarkdownConversion ?? true,
        useIntegratedPipeline: options.useIntegratedPipeline ?? true,
        requestId
      });
      setState({ status: 'uploading' });

      const uploadStartTime = new Date();

      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `documents/${fileName}`;

      // Build Data URL to avoid storage dependency for OCR
      logger.debug('storage', 'Preparing base64 data URL for OCR');
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      const dataUrl = `data:${file.type};base64,${base64}`;

      const { data: { user } } = await supabase.auth.getUser();

      logger.debug('database', 'Creating document record', { userId: user?.id });
      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          filename: file.name,
          file_size: file.size,
          file_url: 'data-url',
          status: 'processing',
          user_id: user?.id || null,
        })
        .select()
        .single();

      if (docError) {
        logger.error('database', 'Failed to create document record', docError, {
          fileName: file.name,
          fileSize: file.size
        });
        throw docError;
      }
      logger.info('database', 'Document record created', { documentId: document.id });

      logger.debug('database', 'Creating processing job', { documentId: document.id });
      const { data: job, error: jobError } = await supabase
        .from('processing_jobs')
        .insert({
          document_id: document.id,
          structure_template: structureTemplate,
          ocr_provider: ocrProvider,
          llm_provider: llmProvider,
          status: 'pending',
          request_id: requestId,
        })
        .select()
        .single();

      if (jobError) {
        logger.error('database', 'Failed to create processing job', jobError, {
          documentId: document.id
        });
        throw jobError;
      }
      logger.info('database', 'Processing job created', { jobId: job.id, documentId: document.id });

      setState({
        status: 'ocr_processing',
        documentId: document.id,
        jobId: job.id,
      });

      // Use integrated OCR + Markdown pipeline if enabled
      if (options.useIntegratedPipeline ?? true) {
        logger.info('ocr-markdown', 'Using integrated OCR + Markdown pipeline', {
          jobId: job.id,
          documentId: document.id,
          enableMarkdownConversion: options.enableMarkdownConversion ?? true
        });

        try {
          const ocrMarkdownResult = await ragHelpers.processOCRWithMarkdown(
            document.id,
            job.id,
            'data-url',
            ocrProvider,
            dataUrl,
            openaiVisionModel,
            options.enableMarkdownConversion ?? true,
            options.convertTables ?? true,
            options.preserveFormatting ?? true
          );

          if (!ocrMarkdownResult.success) {
            throw new Error(ocrMarkdownResult.error || 'OCR + Markdown processing failed');
          }

          logger.info('ocr-markdown', 'OCR + Markdown processing completed', {
            jobId: job.id,
            documentId: document.id,
            processingTime: ocrMarkdownResult.processingTime,
            extractedTextLength: ocrMarkdownResult.extractedText?.length || 0,
            markdownTextLength: ocrMarkdownResult.markdownText?.length || 0,
            markdownConversion: ocrMarkdownResult.metadata?.markdownConversion
          });

          setState({
            status: 'llm_processing',
            documentId: document.id,
            jobId: job.id,
            extractedText: ocrMarkdownResult.extractedText,
            markdownText: ocrMarkdownResult.markdownText,
            markdownConversion: ocrMarkdownResult.metadata?.markdownConversion,
          });

          // Use Markdown text for LLM processing if available
          const textForLLM = ocrMarkdownResult.markdownText || ocrMarkdownResult.extractedText;

          logger.info('llm', 'Calling LLM Edge Function with enhanced text', {
            provider: llmProvider,
            jobId: job.id,
            textLength: textForLLM.length,
            usingMarkdown: !!ocrMarkdownResult.markdownText
          });

          const llmStartTime = Date.now();
          console.log('Calling LLM Edge Function with enhanced text...', { 
            jobId: job.id, 
            llmProvider, 
            textLength: textForLLM.length,
            usingMarkdown: !!ocrMarkdownResult.markdownText
          });
          
          let llmResult;
          try {
            llmResult = await callEdgeFunction('generate-structured-output', {
              jobId: job.id,
              extractedText: textForLLM,
              structureTemplate,
              llmProvider,
            });
            console.log('LLM Response received:', llmResult);
          } catch (error) {
            const llmDuration = Date.now() - llmStartTime;
            logger.error('llm', 'LLM API request failed', error, {
              duration_ms: llmDuration,
              provider: llmProvider
            });
            throw error;
          }

          const llmDuration = Date.now() - llmStartTime;
          
          console.log('LLM Result:', llmResult);
          logger.info('llm', 'LLM processing completed with enhanced text', {
            processingTime: llmResult.processingTime,
            duration_ms: llmDuration,
            hasStructuredOutput: !!llmResult.structuredOutput,
            outputKeys: llmResult.structuredOutput ? Object.keys(llmResult.structuredOutput) : [],
            usingMarkdown: !!ocrMarkdownResult.markdownText
          });

          setState({
            status: 'completed',
            documentId: document.id,
            jobId: job.id,
            extractedText: ocrMarkdownResult.extractedText,
            markdownText: ocrMarkdownResult.markdownText,
            structuredOutput: llmResult.structuredOutput,
            processingTime: llmResult.processingTime,
            markdownConversion: ocrMarkdownResult.metadata?.markdownConversion,
          });

          return {
            success: true,
            documentId: document.id,
            jobId: job.id,
            extractedText: ocrMarkdownResult.extractedText,
            markdownText: ocrMarkdownResult.markdownText,
            structuredOutput: llmResult.structuredOutput,
            processingTime: llmResult.processingTime,
            markdownConversion: ocrMarkdownResult.metadata?.markdownConversion,
          };

        } catch (ocrMarkdownError) {
          logger.error('ocr-markdown', 'Integrated pipeline failed, falling back to original OCR', ocrMarkdownError);
          
          // Fallback to original OCR processing
          logger.info('ocr', 'Falling back to original OCR processing', {
            jobId: job.id,
            documentId: document.id
          });

          const ocrResult = await ragHelpers.processOCR(
            document.id,
            job.id,
            'data-url',
            ocrProvider,
            dataUrl,
            openaiVisionModel
          );

          if (!ocrResult.success) {
            throw new Error(ocrResult.error || 'OCR processing failed');
          }

          setState({
            status: 'llm_processing',
            documentId: document.id,
            jobId: job.id,
            extractedText: ocrResult.extractedText,
          });

          // Continue with LLM processing using original text
          const llmStartTime = Date.now();
          const llmResult = await callEdgeFunction('generate-structured-output', {
            jobId: job.id,
            extractedText: ocrResult.extractedText,
            structureTemplate,
            llmProvider,
          });

          const llmDuration = Date.now() - llmStartTime;
          
          setState({
            status: 'completed',
            documentId: document.id,
            jobId: job.id,
            extractedText: ocrResult.extractedText,
            structuredOutput: llmResult.structuredOutput,
            processingTime: llmResult.processingTime,
          });

          return {
            success: true,
            documentId: document.id,
            jobId: job.id,
            extractedText: ocrResult.extractedText,
            structuredOutput: llmResult.structuredOutput,
            processingTime: llmResult.processingTime,
          };
        }
      } else {
        // Use original OCR processing pipeline
        logger.info('ocr', 'Using original OCR processing pipeline', {
          jobId: job.id,
          documentId: document.id
        });

        const ocrResult = await ragHelpers.processOCR(
          document.id,
          job.id,
          'data-url',
          ocrProvider,
          dataUrl,
          openaiVisionModel
        );

        if (!ocrResult.success) {
          throw new Error(ocrResult.error || 'OCR processing failed');
        }

        setState({
          status: 'llm_processing',
          documentId: document.id,
          jobId: job.id,
          extractedText: ocrResult.extractedText,
        });

        const llmStartTime = Date.now();
        const llmResult = await callEdgeFunction('generate-structured-output', {
          jobId: job.id,
          extractedText: ocrResult.extractedText,
          structureTemplate,
          llmProvider,
        });

        const llmDuration = Date.now() - llmStartTime;
        
        setState({
          status: 'completed',
          documentId: document.id,
          jobId: job.id,
          extractedText: ocrResult.extractedText,
          structuredOutput: llmResult.structuredOutput,
          processingTime: llmResult.processingTime,
        });

        return {
          success: true,
          documentId: document.id,
          jobId: job.id,
          extractedText: ocrResult.extractedText,
          structuredOutput: llmResult.structuredOutput,
          processingTime: llmResult.processingTime,
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Document processing failed';
      logger.critical('processing', 'Document processing failed', error, {
        fileName: file.name,
        fileSize: file.size,
        errorMessage
      });

      setState({
        status: 'failed',
        error: errorMessage,
      });

      throw error;
    }
  }, []);

  const processWithExtractedText = useCallback(async (
    file: File,
    extractedText: string,
    metadata: { confidence: number; pages: number },
    structureTemplate: any,
    llmProvider: string = 'openai',
    llmModel: string = 'gpt-4o-mini'
  ) => {
    const requestId = `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      logger.info('llm', 'Starting LLM processing with extracted text', {
        fileName: file.name,
        textLength: extractedText.length,
        llmProvider,
        requestId
      });

      const { data: { user } } = await supabase.auth.getUser();

      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          filename: file.name,
          file_size: file.size,
          file_url: 'data-url',
          status: 'processing',
          user_id: user?.id || null,
        })
        .select()
        .single();

      if (docError) {
        logger.error('database', 'Failed to create document record', docError);
        throw docError;
      }

      const { data: job, error: jobError } = await supabase
        .from('processing_jobs')
        .insert({
          document_id: document.id,
          structure_template: structureTemplate,
          ocr_provider: 'tesseract',
          llm_provider: llmProvider,
          status: 'pending',
          request_id: requestId,
        })
        .select()
        .single();

      if (jobError) {
        logger.error('database', 'Failed to create processing job', jobError);
        throw jobError;
      }

      setState({
        status: 'llm_processing',
        documentId: document.id,
        jobId: job.id,
        extractedText: extractedText,
      });

      logger.info('llm', 'Calling LLM Edge Function with Tesseract text', {
        provider: llmProvider,
        jobId: job.id,
        textLength: extractedText.length
      });

      const llmStartTime = Date.now();
      console.log('Calling LLM Edge Function...', { jobId: job.id, llmProvider, textLength: extractedText.length });
      
      let llmResult;
      try {
        llmResult = await callEdgeFunction('generate-structured-output', {
          jobId: job.id,
          extractedText: extractedText,
          structureTemplate,
          llmProvider,
        });
        console.log('LLM Response received:', llmResult);
      } catch (error) {
        const llmDuration = Date.now() - llmStartTime;
        logger.error('llm', 'LLM API request failed', error, {
          duration_ms: llmDuration,
          provider: llmProvider
        });
        throw error;
      }

      const llmDuration = Date.now() - llmStartTime;
      
      console.log('LLM Result:', llmResult);
      logger.info('llm', 'LLM processing completed with Tesseract text', {
        processingTime: llmResult.processingTime,
        duration_ms: llmDuration,
        hasStructuredOutput: !!llmResult.structuredOutput,
        outputKeys: llmResult.structuredOutput ? Object.keys(llmResult.structuredOutput) : []
      });

      setState({
        status: 'completed',
        documentId: document.id,
        jobId: job.id,
        extractedText: extractedText,
        structuredOutput: llmResult.structuredOutput,
        processingTime: llmResult.processingTime,
      });

      return {
        success: true,
        documentId: document.id,
        jobId: job.id,
        extractedText: extractedText,
        structuredOutput: llmResult.structuredOutput,
        processingTime: llmResult.processingTime,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'LLM processing failed';
      logger.critical('llm', 'LLM processing failed', error, {
        fileName: file.name,
        textLength: extractedText.length,
        errorMessage
      });

      setState({
        status: 'failed',
        error: errorMessage,
      });

      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  return {
    ...state,
    processDocument,
    processWithExtractedText,
    reset,
  };
}
