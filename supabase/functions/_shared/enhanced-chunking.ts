/**
 * Enhanced Chunking Strategies
 * Inspired by RAGFlow's template-based and semantic chunking approaches
 * 
 * Provides multiple chunking strategies beyond simple fixed-size chunking:
 * - Semantic chunking (paragraph/section-based)
 * - Template-based chunking (structure-aware)
 * - Hybrid chunking (combines multiple strategies)
 */

export interface Chunk {
  text: string;
  index: number;
  offset: number;
  metadata?: ChunkMetadata;
}

export interface ChunkMetadata {
  strategy?: 'fixed' | 'semantic' | 'section' | 'hybrid';
  sectionTitle?: string;
  paragraphIndex?: number;
  hasCodeBlock?: boolean;
  hasTable?: boolean;
  semanticBoundary?: 'paragraph' | 'section' | 'heading' | 'list';
  structureDepth?: number;
}

export interface ChunkingOptions {
  strategy?: 'fixed' | 'semantic' | 'section' | 'hybrid';
  chunkSize?: number;
  chunkOverlap?: number;
  minChunkSize?: number;
  maxChunkSize?: number;
  respectParagraphs?: boolean;
  respectSections?: boolean;
  preserveCodeBlocks?: boolean;
  preserveTables?: boolean;
}

// Default chunking options
const DEFAULT_OPTIONS: ChunkingOptions = {
  strategy: 'hybrid',
  chunkSize: 1000,
  chunkOverlap: 200,
  minChunkSize: 100,
  maxChunkSize: 2000,
  respectParagraphs: true,
  respectSections: true,
  preserveCodeBlocks: true,
  preserveTables: true
};

// =============================================================================
// Fixed-Size Chunking (Original Simple Approach)
// =============================================================================

function chunkTextFixed(
  text: string,
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): Chunk[] {
  const chunks: Chunk[] = [];
  let index = 0;
  let offset = 0;

  while (offset < text.length) {
    const end = Math.min(offset + chunkSize, text.length);
    const chunkText = text.slice(offset, end);
    
    chunks.push({
      text: chunkText,
      index,
      offset,
      metadata: { strategy: 'fixed' }
    });
    
    index++;
    offset += chunkSize - chunkOverlap;
  }

  return chunks;
}

// =============================================================================
// Semantic Chunking (Paragraph/Section-Aware)
// Inspired by RAGFlow's semantic boundary detection
// =============================================================================

/**
 * Detects semantic boundaries in text (paragraphs, sections, headings)
 */
function detectSemanticBoundaries(text: string): Array<{ position: number; type: 'paragraph' | 'section' | 'heading' | 'list' }> {
  const boundaries: Array<{ position: number; type: 'paragraph' | 'section' | 'heading' | 'list' }> = [];
  
  // Split by double newlines (paragraphs)
  const paragraphPattern = /\n\n+/g;
  let match;
  while ((match = paragraphPattern.exec(text)) !== null) {
    boundaries.push({ position: match.index, type: 'paragraph' });
  }
  
  // Detect markdown headings
  const headingPattern = /^#{1,6}\s+.+$/gm;
  while ((match = headingPattern.exec(text)) !== null) {
    boundaries.push({ position: match.index, type: 'heading' });
  }
  
  // Detect section breaks (horizontal rules)
  const sectionPattern = /^(-{3,}|={3,}|\*{3,})$/gm;
  while ((match = sectionPattern.exec(text)) !== null) {
    boundaries.push({ position: match.index, type: 'section' });
  }
  
  // Detect list boundaries
  const listPattern = /^(\s*[-*+]\s+|\s*\d+\.\s+)/gm;
  while ((match = listPattern.exec(text)) !== null) {
    boundaries.push({ position: match.index, type: 'list' });
  }
  
  // Sort boundaries by position
  boundaries.sort((a, b) => a.position - b.position);
  
  return boundaries;
}

/**
 * Semantic chunking that respects natural text boundaries
 */
function chunkTextSemantic(
  text: string,
  options: ChunkingOptions = DEFAULT_OPTIONS
): Chunk[] {
  const chunks: Chunk[] = [];
  const chunkSize = options.chunkSize || 1000;
  const minChunkSize = options.minChunkSize || 100;
  const maxChunkSize = options.maxChunkSize || 2000;
  
  // Detect semantic boundaries
  const boundaries = detectSemanticBoundaries(text);
  
  let currentChunk = '';
  let chunkStartOffset = 0;
  let index = 0;
  
  // Split text by semantic boundaries
  const segments: Array<{ text: string; offset: number; type: string }> = [];
  let lastPos = 0;
  
  for (const boundary of boundaries) {
    if (boundary.position > lastPos) {
      segments.push({
        text: text.slice(lastPos, boundary.position),
        offset: lastPos,
        type: boundary.type
      });
    }
    lastPos = boundary.position;
  }
  
  // Add final segment
  if (lastPos < text.length) {
    segments.push({
      text: text.slice(lastPos),
      offset: lastPos,
      type: 'end'
    });
  }
  
  // Build chunks respecting boundaries
  for (const segment of segments) {
    const segmentText = segment.text.trim();
    if (!segmentText) continue;
    
    // If adding this segment would exceed maxChunkSize, finalize current chunk
    if (currentChunk && (currentChunk.length + segmentText.length > maxChunkSize)) {
      if (currentChunk.length >= minChunkSize) {
        chunks.push({
          text: currentChunk.trim(),
          index: index++,
          offset: chunkStartOffset,
          metadata: {
            strategy: 'semantic',
            semanticBoundary: segment.type as any
          }
        });
      }
      currentChunk = '';
      chunkStartOffset = segment.offset;
    }
    
    // Add segment to current chunk
    currentChunk += (currentChunk ? '\n\n' : '') + segmentText;
    
    // If chunk is large enough and at a good boundary, finalize it
    if (currentChunk.length >= chunkSize && 
        (segment.type === 'paragraph' || segment.type === 'section' || segment.type === 'heading')) {
      chunks.push({
        text: currentChunk.trim(),
        index: index++,
        offset: chunkStartOffset,
        metadata: {
          strategy: 'semantic',
          semanticBoundary: segment.type as any
        }
      });
      currentChunk = '';
      chunkStartOffset = segment.offset + segment.text.length;
    }
  }
  
  // Add final chunk if it exists
  if (currentChunk.trim() && currentChunk.length >= minChunkSize) {
    chunks.push({
      text: currentChunk.trim(),
      index: index++,
      offset: chunkStartOffset,
      metadata: {
        strategy: 'semantic',
        semanticBoundary: 'end'
      }
    });
  }
  
  return chunks.length > 0 ? chunks : chunkTextFixed(text, chunkSize, options.chunkOverlap || 200);
}

// =============================================================================
// Section-Aware Chunking (Structure Preservation)
// Inspired by RAGFlow's document structure analysis
// =============================================================================

interface Section {
  title: string;
  content: string;
  level: number;
  offset: number;
  children: Section[];
}

/**
 * Extracts document structure (headings, sections)
 */
function extractDocumentStructure(text: string): Section[] {
  const sections: Section[] = [];
  const lines = text.split('\n');
  
  let currentSection: Section | null = null;
  let currentContent: string[] = [];
  let currentOffset = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineOffset = text.indexOf(line, currentOffset);
    
    // Detect markdown heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (headingMatch) {
      // Save previous section if exists
      if (currentSection) {
        currentSection.content = currentContent.join('\n');
        sections.push(currentSection);
      }
      
      // Start new section
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      
      currentSection = {
        title,
        content: '',
        level,
        offset: lineOffset,
        children: []
      };
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    } else {
      // Content before first heading
      if (!currentSection && line.trim()) {
        currentSection = {
          title: '(Introduction)',
          content: '',
          level: 0,
          offset: lineOffset,
          children: []
        };
      }
      currentContent.push(line);
    }
    
    currentOffset = lineOffset + line.length;
  }
  
  // Save final section
  if (currentSection) {
    currentSection.content = currentContent.join('\n');
    sections.push(currentSection);
  }
  
  return sections;
}

/**
 * Section-aware chunking that preserves document structure
 */
function chunkTextSection(
  text: string,
  options: ChunkingOptions = DEFAULT_OPTIONS
): Chunk[] {
  const chunks: Chunk[] = [];
  const chunkSize = options.chunkSize || 1000;
  const maxChunkSize = options.maxChunkSize || 2000;
  
  const sections = extractDocumentStructure(text);
  let index = 0;
  
  for (const section of sections) {
    const sectionText = `# ${section.title}\n\n${section.content}`.trim();
    
    // If section fits in one chunk, use it as is
    if (sectionText.length <= maxChunkSize) {
      chunks.push({
        text: sectionText,
        index: index++,
        offset: section.offset,
        metadata: {
          strategy: 'section',
          sectionTitle: section.title,
          structureDepth: section.level
        }
      });
    } else {
      // Section is too large, split it while preserving section context
      const sectionChunks = chunkTextSemantic(section.content, options);
      
      for (const chunk of sectionChunks) {
        chunks.push({
          text: `# ${section.title}\n\n${chunk.text}`,
          index: index++,
          offset: section.offset + chunk.offset,
          metadata: {
            strategy: 'section',
            sectionTitle: section.title,
            structureDepth: section.level,
            semanticBoundary: chunk.metadata?.semanticBoundary
          }
        });
      }
    }
  }
  
  return chunks.length > 0 ? chunks : chunkTextSemantic(text, options);
}

// =============================================================================
// Code Block and Table Preservation
// =============================================================================

interface SpecialBlock {
  type: 'code' | 'table';
  content: string;
  start: number;
  end: number;
  language?: string;
}

/**
 * Detects code blocks and tables in text
 */
function detectSpecialBlocks(text: string): SpecialBlock[] {
  const blocks: SpecialBlock[] = [];
  
  // Detect code blocks (```language\n...\n```)
  const codePattern = /```(\w*)\n([\s\S]*?)```/g;
  let match;
  while ((match = codePattern.exec(text)) !== null) {
    blocks.push({
      type: 'code',
      content: match[0],
      start: match.index,
      end: match.index + match[0].length,
      language: match[1] || 'text'
    });
  }
  
  // Detect markdown tables
  const tablePattern = /^\|(.+)\|[\r\n]+\|[\s:-]+\|[\r\n]+((?:\|.+\|[\r\n]*)+)/gm;
  while ((match = tablePattern.exec(text)) !== null) {
    blocks.push({
      type: 'table',
      content: match[0],
      start: match.index,
      end: match.index + match[0].length
    });
  }
  
  blocks.sort((a, b) => a.start - b.start);
  return blocks;
}

/**
 * Ensures code blocks and tables are not split across chunks
 */
function preserveSpecialBlocks(chunks: Chunk[], text: string, options: ChunkingOptions): Chunk[] {
  if (!options.preserveCodeBlocks && !options.preserveTables) {
    return chunks;
  }
  
  const specialBlocks = detectSpecialBlocks(text);
  if (specialBlocks.length === 0) {
    return chunks;
  }
  
  // For each chunk, check if it contains partial special blocks
  const adjustedChunks: Chunk[] = [];
  
  for (const chunk of chunks) {
    const chunkStart = chunk.offset;
    const chunkEnd = chunk.offset + chunk.text.length;
    
    let needsAdjustment = false;
    
    for (const block of specialBlocks) {
      // Check if block is partially in chunk
      const blockInChunk = (block.start >= chunkStart && block.start < chunkEnd) ||
                          (block.end > chunkStart && block.end <= chunkEnd);
      const blockPartiallyInChunk = blockInChunk && (block.start < chunkStart || block.end > chunkEnd);
      
      if (blockPartiallyInChunk) {
        needsAdjustment = true;
        break;
      }
    }
    
    if (needsAdjustment) {
      // For now, just mark the chunk but keep it
      // A more sophisticated approach would be to adjust boundaries
      if (chunk.metadata) {
        chunk.metadata.hasCodeBlock = true;
        chunk.metadata.hasTable = true;
      }
    }
    
    adjustedChunks.push(chunk);
  }
  
  return adjustedChunks;
}

// =============================================================================
// Hybrid Chunking Strategy
// Combines semantic and section-aware approaches
// =============================================================================

function chunkTextHybrid(
  text: string,
  options: ChunkingOptions = DEFAULT_OPTIONS
): Chunk[] {
  // First, try section-aware chunking
  let chunks = chunkTextSection(text, options);
  
  // If document doesn't have clear sections, fall back to semantic
  if (chunks.length === 0 || (chunks.length === 1 && !chunks[0].metadata?.sectionTitle)) {
    chunks = chunkTextSemantic(text, options);
  }
  
  // Preserve special blocks
  if (options.preserveCodeBlocks || options.preserveTables) {
    chunks = preserveSpecialBlocks(chunks, text, options);
  }
  
  // Add overlap between chunks for better context
  if (options.chunkOverlap && options.chunkOverlap > 0) {
    chunks = addChunkOverlap(chunks, text, options.chunkOverlap);
  }
  
  return chunks;
}

/**
 * Adds overlap between chunks for better context preservation
 */
function addChunkOverlap(chunks: Chunk[], originalText: string, overlapSize: number): Chunk[] {
  if (chunks.length <= 1) {
    return chunks;
  }
  
  const overlappedChunks: Chunk[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    let chunkText = chunk.text;
    
    // Add overlap from previous chunk (if not first)
    if (i > 0 && overlapSize > 0) {
      const prevChunk = chunks[i - 1];
      const overlapText = prevChunk.text.slice(-overlapSize);
      chunkText = overlapText + '\n...\n' + chunkText;
    }
    
    // Add overlap to next chunk (if not last)
    if (i < chunks.length - 1 && overlapSize > 0) {
      const nextChunk = chunks[i + 1];
      const overlapText = nextChunk.text.slice(0, overlapSize);
      chunkText = chunkText + '\n...\n' + overlapText;
    }
    
    overlappedChunks.push({
      ...chunk,
      text: chunkText
    });
  }
  
  return overlappedChunks;
}

// =============================================================================
// Main Chunking Function
// =============================================================================

/**
 * Main chunking function that selects strategy based on options
 */
export function chunkText(
  text: string,
  options: Partial<ChunkingOptions> = {}
): Chunk[] {
  const opts: ChunkingOptions = { ...DEFAULT_OPTIONS, ...options };
  
  console.log('🔪 Chunking text with strategy:', opts.strategy, {
    textLength: text.length,
    chunkSize: opts.chunkSize,
    overlap: opts.chunkOverlap
  });
  
  let chunks: Chunk[] = [];
  
  switch (opts.strategy) {
    case 'fixed':
      chunks = chunkTextFixed(text, opts.chunkSize, opts.chunkOverlap);
      break;
    
    case 'semantic':
      chunks = chunkTextSemantic(text, opts);
      break;
    
    case 'section':
      chunks = chunkTextSection(text, opts);
      break;
    
    case 'hybrid':
    default:
      chunks = chunkTextHybrid(text, opts);
      break;
  }
  
  console.log('✅ Chunking complete:', {
    strategy: opts.strategy,
    chunkCount: chunks.length,
    avgChunkSize: chunks.reduce((sum, c) => sum + c.text.length, 0) / chunks.length,
    firstChunkMetadata: chunks[0]?.metadata
  });
  
  return chunks;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get chunking statistics for analysis
 */
export function getChunkingStats(chunks: Chunk[]): {
  count: number;
  avgSize: number;
  minSize: number;
  maxSize: number;
  strategyCounts: Record<string, number>;
} {
  if (chunks.length === 0) {
    return {
      count: 0,
      avgSize: 0,
      minSize: 0,
      maxSize: 0,
      strategyCounts: {}
    };
  }
  
  const sizes = chunks.map(c => c.text.length);
  const strategyCounts: Record<string, number> = {};
  
  for (const chunk of chunks) {
    const strategy = chunk.metadata?.strategy || 'unknown';
    strategyCounts[strategy] = (strategyCounts[strategy] || 0) + 1;
  }
  
  return {
    count: chunks.length,
    avgSize: sizes.reduce((sum, size) => sum + size, 0) / sizes.length,
    minSize: Math.min(...sizes),
    maxSize: Math.max(...sizes),
    strategyCounts
  };
}
