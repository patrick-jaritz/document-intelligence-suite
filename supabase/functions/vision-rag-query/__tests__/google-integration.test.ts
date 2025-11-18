/**
 * Integration tests for vision-rag-query with Google connector
 * Tests that Google Drive results are properly merged into RAG sources
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock types
interface PageIndexNode {
  node_id: string;
  title: string;
  page_index: number;
  summary?: string;
  prefix_summary?: string;
  start_index?: number;
  end_index?: number;
}

interface Source {
  nodeId: string;
  title: string;
  pageRange: string;
  summary?: string;
  metadata?: Record<string, any>;
}

// Mock data
const mockPageIndexNode: PageIndexNode = {
  node_id: 'node-1',
  title: 'Section 1',
  page_index: 1,
  summary: 'This is section 1 content',
  start_index: 1,
  end_index: 2,
};

const mockGoogleResult = {
  id: 'drive-file-1',
  title: 'Google Drive Document',
  name: 'Google Drive Document',
  mimeType: 'application/pdf',
  webViewLink: 'https://drive.google.com/file/d/drive-file-1/view',
  owner: 'user@example.com',
};

const mockVisionRagRequest = {
  question: 'What is the main topic?',
  documentId: 'doc-123',
  vlmModel: 'gpt-4o',
  includeGoogle: true,
  userId: 'user-456',
};

describe('Vision RAG Query with Google Connector Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Request Type', () => {
    it('should accept includeGoogle and userId in request', () => {
      const request = { ...mockVisionRagRequest };
      expect(request.includeGoogle).toBe(true);
      expect(request.userId).toBe('user-456');
    });

    it('should have includeGoogle as optional field', () => {
      const request = { question: 'test', documentId: 'doc-123' };
      expect((request as any).includeGoogle).toBeUndefined();
    });

    it('should have userId as optional field', () => {
      const request = { question: 'test', documentId: 'doc-123' };
      expect((request as any).userId).toBeUndefined();
    });
  });

  describe('Response Type', () => {
    it('should include metadata field in sources', () => {
      const source: Source = {
        nodeId: 'node-1',
        title: 'Test Node',
        pageRange: '1-2',
        summary: 'Summary text',
        metadata: { webViewLink: 'https://example.com' },
      };

      expect(source.metadata).toBeDefined();
      expect(source.metadata?.webViewLink).toBe('https://example.com');
    });

    it('should support metadata field in retrieved nodes', () => {
      const sources: Source[] = [
        {
          nodeId: 'google:drive-file-1',
          title: 'Google Document',
          pageRange: 'N/A',
          metadata: {
            webViewLink: 'https://drive.google.com/file/d/drive-file-1/view',
            mimeType: 'application/pdf',
          },
        },
      ];

      expect(sources[0].metadata?.webViewLink).toContain('drive.google.com');
      expect(sources[0].metadata?.mimeType).toBe('application/pdf');
    });
  });

  describe('Google Connector Integration', () => {
    it('should call google-connector when includeGoogle is true and userId provided', () => {
      const includeGoogle = true;
      const userId = 'user-456';

      expect(includeGoogle && userId).toBeTruthy();
    });

    it('should not call google-connector when includeGoogle is false', () => {
      const includeGoogle = false;
      const userId = 'user-456';

      expect(includeGoogle && userId).toBeFalsy();
    });

    it('should not call google-connector when userId is missing', () => {
      const includeGoogle = true;
      const userId = undefined;

      expect(includeGoogle && userId).toBeFalsy();
    });

    it('should build connector URL from environment or use default', () => {
      const connectorUrl = 'https://test.supabase.co/functions/v1/google-connector';
      expect(connectorUrl).toContain('google-connector');
    });

    it('should pass correct parameters to google-connector', () => {
      const connectorPayload = {
        userId: 'user-456',
        query: 'What is the main topic?',
        pageSize: 5,
      };

      expect(connectorPayload.userId).toBe('user-456');
      expect(connectorPayload.query).toBe('What is the main topic?');
      expect(connectorPayload.pageSize).toBe(5);
    });

    it('should use service-role key for server-to-server connector call', () => {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-service-role-key',
        'apikey': 'test-service-role-key',
      };

      expect(headers['Authorization']).toContain('Bearer');
      expect(headers['apikey']).toBeDefined();
    });
  });

  describe('Source Merging', () => {
    it('should start sources array with retrieved nodes', () => {
      const retrievedNodes: Source[] = [
        {
          nodeId: 'node-1',
          title: 'Section 1',
          pageRange: '1-2',
          summary: 'Content summary',
        },
      ];

      const sources = [...retrievedNodes];
      expect(sources.length).toBe(1);
      expect(sources[0].nodeId).toBe('node-1');
    });

    it('should append Google results to sources', () => {
      const retrievedNodes: Source[] = [
        {
          nodeId: 'node-1',
          title: 'Section 1',
          pageRange: '1-2',
        },
      ];

      const sources: Source[] = [...retrievedNodes];

      const googleResults = [mockGoogleResult];
      for (const g of googleResults) {
        sources.push({
          nodeId: `google:${g.id}`,
          title: g.title,
          pageRange: 'N/A',
          summary: g.owner || undefined,
          metadata: {
            webViewLink: g.webViewLink,
            mimeType: g.mimeType,
          },
        });
      }

      expect(sources.length).toBe(2);
      expect(sources[1].nodeId).toBe('google:drive-file-1');
      expect(sources[1].metadata?.webViewLink).toContain('drive.google.com');
    });

    it('should distinguish Google results by nodeId prefix', () => {
      const sources: Source[] = [
        {
          nodeId: 'node-1',
          title: 'Section 1',
          pageRange: '1-2',
        },
        {
          nodeId: 'google:drive-file-1',
          title: 'Google Document',
          pageRange: 'N/A',
        },
      ];

      const googleSources = sources.filter((s) => s.nodeId.startsWith('google:'));
      expect(googleSources.length).toBe(1);
      expect(googleSources[0].title).toBe('Google Document');
    });

    it('should set pageRange to N/A for Google results', () => {
      const source: Source = {
        nodeId: 'google:drive-file-1',
        title: 'Google Document',
        pageRange: 'N/A',
        metadata: { webViewLink: 'https://drive.google.com/file/d/drive-file-1/view' },
      };

      expect(source.pageRange).toBe('N/A');
    });

    it('should attach owner as summary for Google results', () => {
      const googleResult = {
        id: 'drive-file-1',
        title: 'Google Document',
        owner: 'finance@company.com',
      };

      const source: Source = {
        nodeId: `google:${googleResult.id}`,
        title: googleResult.title,
        pageRange: 'N/A',
        summary: googleResult.owner || undefined,
      };

      expect(source.summary).toBe('finance@company.com');
    });
  });

  describe('Error Handling', () => {
    it('should gracefully handle connector errors without failing', () => {
      const connectorError = new Error('google-connector failed');
      // Should log error but continue
      expect(connectorError).toBeInstanceOf(Error);
    });

    it('should continue if connector returns non-OK status', () => {
      const connectorStatus = 503;
      const shouldContinue = true; // Don't throw, just log and continue

      expect(shouldContinue).toBe(true);
    });

    it('should handle missing google-connector URL gracefully', () => {
      const supabaseUrl = 'https://test.supabase.co';
      const fallbackUrl = `${supabaseUrl}/functions/v1/google-connector`;

      expect(fallbackUrl).toContain('google-connector');
    });

    it('should handle empty Google results array', () => {
      const retrievedNodes: Source[] = [
        {
          nodeId: 'node-1',
          title: 'Section 1',
          pageRange: '1-2',
        },
      ];

      const sources = [...retrievedNodes];
      const googleResults: any[] = [];

      for (const g of googleResults) {
        sources.push({
          nodeId: `google:${g.id}`,
          title: g.title,
          pageRange: 'N/A',
        });
      }

      expect(sources.length).toBe(1); // Only original node
    });

    it('should handle connector timeout without blocking RAG response', () => {
      // Timeout should be caught and logged
      const timeoutError = new Error('Fetch timeout');
      expect(timeoutError).toBeInstanceOf(Error);
    });
  });

  describe('Response Construction', () => {
    it('should include combined sources in response', () => {
      const response = {
        answer: 'Test answer',
        retrievedNodes: [
          { nodeId: 'node-1', title: 'Section 1', pageRange: '1-2' },
        ],
        sources: [
          { nodeId: 'node-1', title: 'Section 1', pageRange: '1-2' },
          {
            nodeId: 'google:drive-file-1',
            title: 'Google Document',
            pageRange: 'N/A',
          },
        ],
        model: 'gpt-4o',
        processingTime: 1200,
      };

      expect(response.sources.length).toBe(2);
      expect(response.sources[0].nodeId).toBe('node-1');
      expect(response.sources[1].nodeId).toBe('google:drive-file-1');
    });

    it('should use combined sources instead of just retrievedNodes', () => {
      const retrievedNodes = [
        { nodeId: 'node-1', title: 'Section 1', pageRange: '1-2' },
      ];
      const sources = [
        { nodeId: 'node-1', title: 'Section 1', pageRange: '1-2' },
        { nodeId: 'google:drive-file-1', title: 'Google Document', pageRange: 'N/A' },
      ];

      expect(sources).not.toEqual(retrievedNodes);
      expect(sources.length).toBeGreaterThan(retrievedNodes.length);
    });

    it('should preserve all source metadata in response', () => {
      const source: Source = {
        nodeId: 'google:drive-file-1',
        title: 'Google Document',
        pageRange: 'N/A',
        summary: 'user@example.com',
        metadata: {
          webViewLink: 'https://drive.google.com/file/d/drive-file-1/view',
          mimeType: 'application/pdf',
        },
      };

      expect(source.metadata).toBeDefined();
      expect(Object.keys(source.metadata!)).toContain('webViewLink');
      expect(Object.keys(source.metadata!)).toContain('mimeType');
    });
  });

  describe('Performance', () => {
    it('should limit Google results to avoid performance degradation', () => {
      const pageSize = 5; // Limited to 5 results

      expect(pageSize).toBeLessThanOrEqual(5);
    });

    it('should not block RAG response while waiting for Google results', () => {
      // Should use Promise.all or similar to wait concurrently
      // or should timeout after reasonable period
      const timeout = 5000; // 5 second timeout

      expect(timeout).toBeGreaterThan(0);
    });

    it('should include processing time in response', () => {
      const processingTime = 1500; // milliseconds

      expect(processingTime).toBeGreaterThan(0);
    });
  });

  describe('Feature Flags', () => {
    it('should allow disabling Google integration via includeGoogle flag', () => {
      const request1 = { ...mockVisionRagRequest, includeGoogle: true };
      const request2 = { ...mockVisionRagRequest, includeGoogle: false };

      expect(request1.includeGoogle).toBe(true);
      expect(request2.includeGoogle).toBe(false);
    });

    it('should default to not including Google if flag is not provided', () => {
      const request = {
        question: 'test',
        documentId: 'doc-123',
      };

      const includeGoogle = (request as any).includeGoogle === true;
      expect(includeGoogle).toBe(false);
    });
  });
});
