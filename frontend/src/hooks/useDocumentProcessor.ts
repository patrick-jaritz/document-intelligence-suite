import { useState, useCallback } from 'react';
import { supabase, supabaseUrl, callEdgeFunction } from '../lib/supabase';
import { logger } from '../lib/logger';

interface ProcessingState {
  status: 'idle' | 'uploading' | 'ocr_processing' | 'llm_processing' | 'completed' | 'failed';
  documentId?: string;
  jobId?: string;
  extractedText?: string;
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
}

export function useDocumentProcessor() {
  const [state, setState] = useState<ProcessingState>({ status: 'idle' });

  const processDocument = useCallback(async (
    file: File,
    structureTemplate: any,
    ocrProvider: 'google-vision' | 'mistral' | 'tesseract' | 'aws-textract' | 'azure-document-intelligence' | 'ocr-space' | 'openai-vision' | 'paddleocr' | 'dots-ocr' | 'deepseek-ocr' = 'google-vision',
    llmProvider: string = 'openai',
    openaiVisionModel: string = 'gpt-4o-mini',
    llmModel: string = 'gpt-4o-mini'
  ) => {
    const requestId = `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      logger.info('upload', 'Starting document processing', {
        fileName: file.name,
        fileSize: file.size,
        ocrProvider,
        llmProvider,
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

      // ========== VISION-BASED OCR PDF HANDLER START ==========
      // Special handling for Mistral/OpenAI Vision + PDF: Convert to images client-side
      const requiresImageConversion = (ocrProvider === 'mistral' || ocrProvider === 'openai-vision') && file.type === 'application/pdf';
      
      if (requiresImageConversion) {
        logger.info('ocr', `${ocrProvider} + PDF detected: Converting PDF to images client-side`, {
          fileName: file.name,
          fileSize: file.size,
          ocrProvider
        });

        // Import PDF to images converter
        const { pdfToImages } = await import('../lib/tesseractOCR');
        const images = await pdfToImages(file);
        const totalPages = images.length;

        logger.info('ocr', `PDF converted to ${totalPages} images`, {
          pages: totalPages,
          jobId: job.id,
          ocrProvider
        });

        const allText: string[] = [];
        let totalOcrTime = 0;

        // Process each page as an image through vision-based OCR
        for (let i = 0; i < images.length; i++) {
          const pageNum = i + 1;
          logger.debug('ocr', `Processing page ${pageNum}/${totalPages} with ${ocrProvider}`, {
            page: pageNum,
            totalPages,
            jobId: job.id,
            ocrProvider
          });

          // Process this page through vision-based OCR
          const pageOcrStart = Date.now();
          // Use data URL for page image to avoid storage
          const reader = new FileReader();
          const pageDataUrl: string = await new Promise((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            // read original data URL blob directly
            fetch(images[i]).then(r => r.blob()).then(b => reader.readAsDataURL(b));
          });

          const pageOcrResponse = await callEdgeFunction('process-pdf-ocr', {
            documentId: document.id,
            jobId: job.id,
            fileUrl: 'data-url',
            fileDataUrl: pageDataUrl,
            ocrProvider: ocrProvider,
            openaiVisionModel: ocrProvider === 'openai-vision' ? openaiVisionModel : undefined,
          });

          const pageOcrDuration = Date.now() - pageOcrStart;
          totalOcrTime += pageOcrDuration;

          const pageResult = pageOcrResponse;
          allText.push(pageResult.extractedText);

          logger.debug('ocr', `Page ${pageNum} processed successfully`, {
            page: pageNum,
            textLength: pageResult.extractedText?.length || 0,
            duration_ms: pageOcrDuration,
            ocrProvider
          });
        }

        // Combine all pages
        const combinedText = allText.join('\n\n--- Page Break ---\n\n');
        const ocrResult = {
          extractedText: combinedText,
          processingTime: totalOcrTime
        };

        logger.info('ocr', `All pages processed with ${ocrProvider}`, {
          totalPages,
          totalTextLength: combinedText.length,
          totalOcrTime,
          jobId: job.id,
          ocrProvider
        });

        // Now continue with LLM processing
        setState({
          status: 'llm_processing',
          documentId: document.id,
          jobId: job.id,
          extractedText: ocrResult.extractedText,
        });

        logger.info('llm', 'Calling LLM Edge Function', {
          provider: llmProvider,
          jobId: job.id,
          textLength: ocrResult.extractedText?.length || 0
        });

        const llmStartTime = Date.now();
        console.log(`Calling LLM Edge Function (${ocrProvider} OCR)...`, { 
          jobId: job.id, 
          llmProvider, 
          textLength: ocrResult.extractedText?.length || 0,
          textPreview: ocrResult.extractedText?.substring(0, 200)
        });

        const llmResponse = await fetch(
          `${supabaseUrl}/functions/v1/generate-structured-output`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              jobId: job.id,
              extractedText: ocrResult.extractedText,
              structureTemplate,
              llmProvider,
              llmModel,
            }),
          }
        );

        const llmDuration = Date.now() - llmStartTime;
        console.log(`LLM Response received (${ocrProvider} OCR):`, llmResponse.status);

        if (!llmResponse.ok) {
          const errorText = await llmResponse.text();
          logger.error('llm', 'LLM API request failed', new Error(`HTTP ${llmResponse.status}`), {
            status: llmResponse.status,
            statusText: llmResponse.statusText,
            body: errorText.substring(0, 500),
            provider: llmProvider,
            jobId: job.id,
            duration_ms: llmDuration
          });
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText };
          }
          throw new Error(errorData.error || `LLM processing failed: ${llmResponse.statusText}`);
        }

        console.log(`Parsing LLM response (${ocrProvider} OCR)...`);
        const llmResult = await llmResponse.json();
        console.log(`LLM Result (${ocrProvider} OCR):`, llmResult);
        console.log('Has demo note?', !!llmResult.structuredOutput?._demo_note);
        
        logger.info('llm', 'LLM processing completed', {
          processingTime: llmResult.processingTime,
          provider: llmProvider,
          jobId: job.id,
          duration_ms: llmDuration,
          hasOutput: !!llmResult.structuredOutput,
          isDemoData: !!llmResult.structuredOutput?._demo_note
        });

        const totalProcessingTime = ocrResult.processingTime + llmResult.processingTime;

        logger.info('system', 'Document processing completed successfully', {
          totalProcessingTime,
          documentId: document.id,
          jobId: job.id,
          ocrProvider,
          llmProvider,
          requestId
        });

        setState({
          status: 'completed',
          documentId: document.id,
          jobId: job.id,
          extractedText: ocrResult.extractedText,
          structuredOutput: llmResult.structuredOutput,
          processingTime: totalProcessingTime,
        });

        return {
          success: true,
          documentId: document.id,
          jobId: job.id,
          extractedText: ocrResult.extractedText,
          structuredOutput: llmResult.structuredOutput,
          processingTime: totalProcessingTime,
        };
      }
      // ========== VISION-BASED OCR PDF HANDLER END ==========

      // ========== TESSERACT CLIENT-SIDE OCR START ==========
      if (ocrProvider === 'tesseract') {
        logger.info('ocr', 'Starting Tesseract client-side OCR', {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          jobId: job.id
        });

        setState({
          status: 'ocr_processing',
          documentId: document.id,
          jobId: job.id,
        });

        try {
          const { processPDFWithTesseract, processImageWithTesseract } = await import('../lib/tesseractOCR');
          
          const tesseractStartTime = Date.now();
          let tesseractResult;

          if (file.type === 'application/pdf') {
            logger.info('ocr', 'Processing PDF with Tesseract', { fileName: file.name });
            tesseractResult = await processPDFWithTesseract(file, (progress) => {
              // Enhanced progress reporting with confidence and time estimates
              logger.debug('ocr', `Tesseract progress: ${progress.status}`, {
                progress: progress.progress,
                currentPage: progress.currentPage,
                totalPages: progress.totalPages,
                confidence: progress.confidence,
                estimatedTimeRemaining: progress.estimatedTimeRemaining
              });
              
              // Update UI state with detailed progress
              setState(prev => ({
                ...prev,
                status: 'ocr_processing',
                progress: progress.progress,
                progressStatus: progress.status,
                currentPage: progress.currentPage,
                totalPages: progress.totalPages,
                confidence: progress.confidence,
                estimatedTimeRemaining: progress.estimatedTimeRemaining
              }));
            });
          } else {
            logger.info('ocr', 'Processing image with Tesseract', { fileName: file.name, fileType: file.type });
            tesseractResult = await processImageWithTesseract(file, (progress) => {
              // Enhanced progress reporting for images
              logger.debug('ocr', `Tesseract progress: ${progress.status}`, {
                progress: progress.progress,
                confidence: progress.confidence,
                estimatedTimeRemaining: progress.estimatedTimeRemaining
              });
              
              // Update UI state with detailed progress
              setState(prev => ({
                ...prev,
                status: 'ocr_processing',
                progress: progress.progress,
                progressStatus: progress.status,
                confidence: progress.confidence,
                estimatedTimeRemaining: progress.estimatedTimeRemaining
              }));
            });
          }

          const tesseractDuration = Date.now() - tesseractStartTime;

          logger.info('ocr', 'Tesseract OCR completed', {
            textLength: tesseractResult.text.length,
            confidence: tesseractResult.confidence,
            pages: tesseractResult.pages,
            duration_ms: tesseractDuration,
            jobId: job.id
          });

          // Update job with Tesseract results
          await supabase
            .from('processing_jobs')
            .update({
              extracted_text: tesseractResult.text,
              provider_metadata: {
                confidence: tesseractResult.confidence,
                pages: tesseractResult.pages,
                provider: 'tesseract'
              },
              page_count: tesseractResult.pages
            })
            .eq('id', job.id);

          // Now process with LLM
          return await processWithExtractedText(
            file,
            tesseractResult.text,
            { confidence: tesseractResult.confidence, pages: tesseractResult.pages },
            structureTemplate,
            llmProvider,
            llmModel
          );
        } catch (tesseractError) {
          logger.error('ocr', 'Tesseract OCR failed', tesseractError, {
            fileName: file.name,
            jobId: job.id
          });
          throw new Error(`Tesseract OCR failed: ${tesseractError instanceof Error ? tesseractError.message : 'Unknown error'}`);
        }
      }
      // ========== TESSERACT CLIENT-SIDE OCR END ==========

      logger.info('ocr', 'Calling OCR Edge Function', {
        provider: ocrProvider,
        jobId: job.id,
        documentId: document.id
      });

      const ocrStartTime = Date.now();
      const ocrResponse = await callEdgeFunction('process-pdf-ocr', {
        documentId: document.id,
        jobId: job.id,
        fileUrl: 'data-url',
        fileDataUrl: dataUrl,
        ocrProvider,
      });

      const ocrDuration = Date.now() - ocrStartTime;

      const ocrResult = ocrResponse;
      logger.info('ocr', 'OCR processing completed', {
        textLength: ocrResult.extractedText?.length || 0,
        processingTime: ocrResult.processingTime,
        provider: ocrProvider,
        jobId: job.id,
        duration_ms: ocrDuration
      });

      setState({
        status: 'llm_processing',
        documentId: document.id,
        jobId: job.id,
        extractedText: ocrResult.extractedText,
      });

      logger.info('llm', 'Calling LLM Edge Function', {
        provider: llmProvider,
        jobId: job.id,
        textLength: ocrResult.extractedText?.length || 0
      });

      const llmStartTime = Date.now();
      const llmResponse = await callEdgeFunction('generate-structured-output', {
        jobId: job.id,
        extractedText: ocrResult.extractedText,
        structureTemplate,
        llmProvider,
      });

      const llmDuration = Date.now() - llmStartTime;

      const llmResult = llmResponse;
      logger.info('llm', 'LLM processing completed', {
        processingTime: llmResult.processingTime,
        provider: llmProvider,
        jobId: job.id,
        duration_ms: llmDuration,
        hasOutput: !!llmResult.structuredOutput
      });

      const totalProcessingTime = ocrResult.processingTime + llmResult.processingTime;

      logger.info('system', 'Document processing completed successfully', {
        totalProcessingTime,
        documentId: document.id,
        jobId: job.id,
        ocrProvider,
        llmProvider,
        requestId
      });

      setState({
        status: 'completed',
        documentId: document.id,
        jobId: job.id,
        extractedText: ocrResult.extractedText,
        structuredOutput: llmResult.structuredOutput,
        processingTime: totalProcessingTime,
      });

      return {
        success: true,
        documentId: document.id,
        jobId: job.id,
        extractedText: ocrResult.extractedText,
        structuredOutput: llmResult.structuredOutput,
        processingTime: totalProcessingTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Processing failed';
      logger.critical('system', 'Document processing failed', error, {
        errorMessage,
        fileName: file.name,
        ocrProvider,
        llmProvider,
        requestId
      });

      setState({
        status: 'failed',
        error: errorMessage,
      });
      return {
        success: false,
        error: errorMessage,
      };
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
    const requestId = `client_tesseract_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      logger.info('ocr', 'Processing with client-side extracted text (Tesseract)', {
        fileName: file.name,
        textLength: extractedText.length,
        confidence: metadata.confidence,
        pages: metadata.pages,
        llmProvider,
        requestId,
        ocrProvider: 'tesseract'
      });

      setState({ status: 'llm_processing' });

      const { data: { user } } = await supabase.auth.getUser();

      logger.debug('database', 'Creating document record for Tesseract result');
      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          filename: file.name,
          file_size: file.size,
          file_url: 'tesseract://local',
          status: 'completed',
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
          extracted_text: extractedText,
          status: 'completed',
          request_id: requestId,
          provider_metadata: {
            confidence: metadata.confidence,
            pages: metadata.pages,
            provider: 'tesseract',
          },
          page_count: metadata.pages,
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
      const errorMessage = error instanceof Error ? error.message : 'Processing failed';
      logger.critical('system', 'Tesseract document processing failed', error, {
        errorMessage,
        fileName: file.name,
        requestId
      });

      setState({
        status: 'failed',
        error: errorMessage,
      });
      return {
        success: false,
        error: errorMessage,
      };
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
    setState,
  };
}
