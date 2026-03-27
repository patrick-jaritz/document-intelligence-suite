import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

export interface TesseractProgress {
  status: string;
  progress: number;
  currentPage?: number;
  totalPages?: number;
  confidence?: number;
  estimatedTimeRemaining?: number;
}

export interface TesseractResult {
  text: string;
  confidence: number;
  pages: number;
  processingTime: number;
  language: string;
}

export interface TesseractOptions {
  language: string;
  scale: number;
  dpi: number;
  psm: number; // Page Segmentation Mode
  oem: number; // OCR Engine Mode
}

// Enhanced PDF to images conversion with better quality
export async function pdfToImages(pdfFile: File, options: Partial<TesseractOptions> = {}): Promise<string[]> {
  const startTime = Date.now();
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const images: string[] = [];

  // Enhanced settings for better OCR quality
  const scale = options.scale || 3.0; // Higher scale for better quality
  const dpi = options.dpi || 300; // Higher DPI for better text recognition

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get canvas context');
    }

    // Enhanced canvas settings for better image quality
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // Set high-quality rendering
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    // Use JPEG with high quality for better compression/speed balance
    images.push(canvas.toDataURL('image/jpeg', 0.95));
  }

  console.log(`📄 PDF converted to ${images.length} images in ${Date.now() - startTime}ms`);
  return images;
}

// Language detection and mapping
const SUPPORTED_LANGUAGES = {
  'eng': 'English',
  'deu': 'German', 
  'fra': 'French',
  'spa': 'Spanish',
  'ita': 'Italian',
  'por': 'Portuguese',
  'rus': 'Russian',
  'chi_sim': 'Chinese (Simplified)',
  'chi_tra': 'Chinese (Traditional)',
  'jpn': 'Japanese',
  'kor': 'Korean',
  'ara': 'Arabic',
  'hin': 'Hindi'
};

export function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES;
}

// Enhanced OCR configuration presets
export const OCR_PRESETS = {
  'high_quality': {
    language: 'eng',
    scale: 3.0,
    dpi: 300,
    psm: 6, // Uniform block of text
    oem: 3  // Default OCR Engine Mode
  },
  'fast': {
    language: 'eng', 
    scale: 2.0,
    dpi: 200,
    psm: 3, // Fully automatic page segmentation
    oem: 1  // LSTM OCR Engine Mode
  },
  'multilingual': {
    language: 'eng+deu+fra+spa',
    scale: 2.5,
    dpi: 250,
    psm: 6,
    oem: 3
  }
};

export async function processPDFWithTesseract(
  pdfFile: File,
  onProgress?: (progress: TesseractProgress) => void,
  options: Partial<TesseractOptions> = {}
): Promise<TesseractResult> {
  const startTime = Date.now();
  
  try {
    // Merge with high quality preset by default
    const config = { ...OCR_PRESETS.high_quality, ...options };
    
    onProgress?.({
      status: 'Converting PDF to images',
      progress: 0,
      estimatedTimeRemaining: 0,
    });

    const images = await pdfToImages(pdfFile, config);
    const totalPages = images.length;

    if (totalPages === 0) {
      throw new Error('Failed to convert PDF to images. The PDF might be corrupted or empty.');
    }

    if (totalPages > 50) {
      onProgress?.({
        status: 'Warning: Large PDF detected',
        progress: 5,
        totalPages,
        estimatedTimeRemaining: totalPages * 3000,
      });
    }

    onProgress?.({
      status: 'Initializing Tesseract',
      progress: 10,
      totalPages,
      estimatedTimeRemaining: totalPages * 3000, // Estimate 3 seconds per page
    });

    // Enhanced worker configuration with error handling
    let worker;
    try {
      worker = await Tesseract.createWorker(config.language, config.oem, {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            const pageProgress = m.progress * 80;
            const totalProgress = 10 + pageProgress;
            const estimatedTime = (totalPages - (totalProgress / 90)) * 3000;
            
            onProgress?.({
              status: 'Recognizing text',
              progress: totalProgress,
              currentPage: 1,
              totalPages,
              confidence: m.confidence,
              estimatedTimeRemaining: Math.max(0, estimatedTime),
            });
          }
        },
      });
    } catch (workerError) {
      throw new Error(`Failed to initialize Tesseract worker: ${workerError.message}. Please check if the language "${config.language}" is supported.`);
    }

    // Set additional Tesseract parameters for better accuracy
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: config.psm,
        tessedit_ocr_engine_mode: config.oem,
      });
    } catch (paramError) {
      console.warn('Failed to set Tesseract parameters:', paramError);
      // Continue with default parameters
    }

    const allText: string[] = [];
    let totalConfidence = 0;
    let failedPages = 0;

    for (let i = 0; i < images.length; i++) {
      const pageNum = i + 1;
      const pageStartTime = Date.now();
      
      onProgress?.({
        status: `Processing page ${pageNum} of ${totalPages}`,
        progress: 10 + ((i / totalPages) * 80),
        currentPage: pageNum,
        totalPages,
        estimatedTimeRemaining: (totalPages - i) * 3000,
      });

      try {
        const { data } = await worker.recognize(images[i]);
        allText.push(data.text);
        totalConfidence += data.confidence;
        
        const pageTime = Date.now() - pageStartTime;
        console.log(`📄 Page ${pageNum} processed in ${pageTime}ms (confidence: ${data.confidence.toFixed(1)}%)`);
        
        // Warn about low confidence pages
        if (data.confidence < 60) {
          console.warn(`⚠️ Page ${pageNum} has low confidence: ${data.confidence.toFixed(1)}%`);
        }
      } catch (pageError) {
        console.error(`❌ Failed to process page ${pageNum}:`, pageError);
        allText.push(`[Error processing page ${pageNum}: ${pageError.message}]`);
        totalConfidence += 0; // Count as 0 confidence
        failedPages++;
      }
    }

    await worker.terminate();

    const totalTime = Date.now() - startTime;
    const avgConfidence = totalConfidence / totalPages;

    // Report results with error handling
    if (failedPages > 0) {
      onProgress?.({
        status: `OCR Complete (${failedPages} pages failed)`,
        progress: 100,
        currentPage: totalPages,
        totalPages,
        confidence: avgConfidence,
        estimatedTimeRemaining: 0,
      });
      console.warn(`⚠️ Tesseract OCR completed with ${failedPages} failed pages out of ${totalPages}`);
    } else {
      onProgress?.({
        status: 'OCR Complete',
        progress: 100,
        currentPage: totalPages,
        totalPages,
        confidence: avgConfidence,
        estimatedTimeRemaining: 0,
      });
    }

    console.log(`🎉 Tesseract OCR completed: ${totalPages} pages in ${totalTime}ms (avg confidence: ${avgConfidence.toFixed(1)}%)`);

    return {
      text: allText.join('\n\n--- Page Break ---\n\n'),
      confidence: avgConfidence,
      pages: totalPages,
      processingTime: totalTime,
      language: config.language,
    };
    
  } catch (error) {
    // Comprehensive error handling
    console.error('❌ Tesseract OCR failed:', error);
    
    let errorMessage = 'OCR processing failed';
    if (error.message.includes('language')) {
      errorMessage = `Unsupported language: ${options.language || 'eng'}. Please select a supported language.`;
    } else if (error.message.includes('PDF')) {
      errorMessage = 'Failed to process PDF. The file might be corrupted or password-protected.';
    } else if (error.message.includes('memory') || error.message.includes('Memory')) {
      errorMessage = 'Insufficient memory for OCR processing. Try with a smaller file or restart your browser.';
    } else if (error.message.includes('worker')) {
      errorMessage = 'Failed to initialize OCR engine. Please refresh the page and try again.';
    } else {
      errorMessage = error.message || 'Unknown OCR error occurred.';
    }
    
    throw new Error(errorMessage);
  }
}

export async function processImageWithTesseract(
  imageFile: File,
  onProgress?: (progress: TesseractProgress) => void,
  options: Partial<TesseractOptions> = {}
): Promise<TesseractResult> {
  const startTime = Date.now();
  
  // Merge with high quality preset by default
  const config = { ...OCR_PRESETS.high_quality, ...options };
  
  onProgress?.({
    status: 'Initializing Tesseract',
    progress: 0,
    estimatedTimeRemaining: 5000, // Estimate 5 seconds for image
  });

  const imageUrl = URL.createObjectURL(imageFile);

  // Enhanced worker configuration
  const worker = await Tesseract.createWorker(config.language, config.oem, {
    logger: (m: any) => {
      if (m.status === 'recognizing text') {
        const estimatedTime = (1 - m.progress) * 5000;
        
        onProgress?.({
          status: 'Recognizing text',
          progress: m.progress * 100,
          confidence: m.confidence,
          estimatedTimeRemaining: Math.max(0, estimatedTime),
        });
      }
    },
  });

  // Set additional Tesseract parameters for better accuracy
  await worker.setParameters({
    tessedit_pageseg_mode: config.psm,
    tessedit_ocr_engine_mode: config.oem,
  });

  const { data } = await worker.recognize(imageUrl);
  await worker.terminate();
  URL.revokeObjectURL(imageUrl);

  const totalTime = Date.now() - startTime;

  onProgress?.({
    status: 'OCR Complete',
    progress: 100,
    confidence: data.confidence,
    estimatedTimeRemaining: 0,
  });

  console.log(`🖼️ Image OCR completed in ${totalTime}ms (confidence: ${data.confidence.toFixed(1)}%)`);

  return {
    text: data.text,
    confidence: data.confidence,
    pages: 1,
    processingTime: totalTime,
    language: config.language,
  };
}

// Utility function to get OCR quality recommendations
export function getOCRQualityRecommendation(fileSize: number, fileType: string): keyof typeof OCR_PRESETS {
  if (fileSize > 10 * 1024 * 1024) { // > 10MB
    return 'fast'; // Use faster processing for large files
  }
  
  if (fileType === 'application/pdf') {
    return 'high_quality'; // PDFs benefit from high quality
  }
  
  return 'high_quality'; // Default to high quality for images
}

// Utility function to estimate processing time
export function estimateProcessingTime(fileSize: number, fileType: string): number {
  const baseTime = fileType === 'application/pdf' ? 3000 : 5000; // Base time per page/image
  const sizeMultiplier = Math.min(fileSize / (1024 * 1024), 5); // Cap at 5x for very large files
  
  return Math.round(baseTime * sizeMultiplier);
}

// Worker pool for concurrent processing (speed optimization)
class TesseractWorkerPool {
  private workers: Tesseract.Worker[] = [];
  private maxWorkers = navigator.hardwareConcurrency || 4;
  private availableWorkers: Tesseract.Worker[] = [];

  async getWorker(language: string = 'eng', oem: number = 3): Promise<Tesseract.Worker> {
    if (this.availableWorkers.length > 0) {
      const worker = this.availableWorkers.pop()!;
      // Reconfigure worker if needed
      await worker.setParameters({
        tessedit_ocr_engine_mode: oem,
      });
      return worker;
    }

    if (this.workers.length < this.maxWorkers) {
      const worker = await Tesseract.createWorker(language, oem);
      this.workers.push(worker);
      return worker;
    }

    // Wait for an available worker
    return new Promise((resolve) => {
      const checkForWorker = () => {
        if (this.availableWorkers.length > 0) {
          const worker = this.availableWorkers.pop()!;
          resolve(worker);
        } else {
          setTimeout(checkForWorker, 100);
        }
      };
      checkForWorker();
    });
  }

  releaseWorker(worker: Tesseract.Worker) {
    this.availableWorkers.push(worker);
  }

  async terminateAll() {
    await Promise.all(this.workers.map(worker => worker.terminate()));
    this.workers = [];
    this.availableWorkers = [];
  }
}

// Global worker pool instance
const workerPool = new TesseractWorkerPool();

// Enhanced concurrent PDF processing for speed
export async function processPDFWithTesseractConcurrent(
  pdfFile: File,
  onProgress?: (progress: TesseractProgress) => void,
  options: Partial<TesseractOptions> = {}
): Promise<TesseractResult> {
  const startTime = Date.now();
  const config = { ...OCR_PRESETS.high_quality, ...options };
  
  onProgress?.({
    status: 'Converting PDF to images',
    progress: 0,
    estimatedTimeRemaining: 0,
  });

  const images = await pdfToImages(pdfFile, config);
  const totalPages = images.length;

  onProgress?.({
    status: 'Initializing Tesseract workers',
    progress: 10,
    totalPages,
    estimatedTimeRemaining: totalPages * 2000, // Faster with concurrent processing
  });

  const allText: string[] = new Array(totalPages);
  let totalConfidence = 0;
  let completedPages = 0;

  // Process pages concurrently
  const concurrency = Math.min(totalPages, 3); // Limit to 3 concurrent workers
  const batches = [];
  
  for (let i = 0; i < totalPages; i += concurrency) {
    const batch = images.slice(i, i + concurrency);
    batches.push(batch.map((image, batchIndex) => ({
      image,
      pageIndex: i + batchIndex,
      pageNum: i + batchIndex + 1
    })));
  }

  for (const batch of batches) {
    const batchPromises = batch.map(async ({ image, pageIndex, pageNum }) => {
      const worker = await workerPool.getWorker(config.language, config.oem);
      
      try {
        await worker.setParameters({
          tessedit_pageseg_mode: config.psm,
          tessedit_ocr_engine_mode: config.oem,
        });

        const { data } = await worker.recognize(image);
        allText[pageIndex] = data.text;
        
        completedPages++;
        const progress = 10 + ((completedPages / totalPages) * 80);
        
        onProgress?.({
          status: `Processing page ${pageNum} of ${totalPages}`,
          progress,
          currentPage: pageNum,
          totalPages,
          estimatedTimeRemaining: (totalPages - completedPages) * 2000,
        });

        workerPool.releaseWorker(worker);
        return { confidence: data.confidence, pageNum };
      } catch (error) {
        workerPool.releaseWorker(worker);
        throw error;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    totalConfidence += batchResults.reduce((sum, result) => sum + result.confidence, 0);
  }

  const totalTime = Date.now() - startTime;
  const avgConfidence = totalConfidence / totalPages;

  onProgress?.({
    status: 'OCR Complete',
    progress: 100,
    currentPage: totalPages,
    totalPages,
    confidence: avgConfidence,
    estimatedTimeRemaining: 0,
  });

  console.log(`🚀 Concurrent Tesseract OCR completed: ${totalPages} pages in ${totalTime}ms (avg confidence: ${avgConfidence.toFixed(1)}%)`);

  return {
    text: allText.join('\n\n--- Page Break ---\n\n'),
    confidence: avgConfidence,
    pages: totalPages,
    processingTime: totalTime,
    language: config.language,
  };
}

// Cleanup function to terminate all workers
export async function cleanupTesseractWorkers() {
  await workerPool.terminateAll();
}
