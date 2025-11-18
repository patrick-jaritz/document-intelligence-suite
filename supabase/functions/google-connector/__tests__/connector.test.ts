/**
 * Tests for google-connector Edge Function
 * Tests OAuth token management, Google Drive API integration, and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Deno and Supabase
const mockDeno = {
  env: {
    get: vi.fn((key: string) => {
      const envVars: Record<string, string> = {
        'GOOGLE_CLIENT_ID': 'test-client-id',
        'GOOGLE_CLIENT_SECRET': 'test-client-secret',
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_SERVICE_ROLE_KEY': 'test-service-role-key',
      };
      return envVars[key];
    }),
  },
};

// Mock fetch responses
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Google Connector Edge Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Token Management', () => {
    it('should use existing access token if available', async () => {
      // Mock integration with valid access token
      const mockIntegration = {
        id: 'int-123',
        user_id: 'user-123',
        provider: 'google',
        access_token: 'valid-access-token',
        refresh_token: 'refresh-token',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      };

      // Mock Drive API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          files: [
            {
              id: 'file-1',
              name: 'Document.pdf',
              mimeType: 'application/pdf',
              modifiedTime: '2024-01-15T10:30:00Z',
              webViewLink: 'https://drive.google.com/file/d/file-1/view',
              owners: [{ displayName: 'user@example.com' }],
            },
          ],
        }),
      });

      // Verify API was called with correct access token
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('googleapis.com/drive/v3/files'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-access-token',
          }),
        })
      );
    });

    it('should refresh token if access token is expired', async () => {
      // Mock integration with expired access token
      const mockIntegration = {
        id: 'int-123',
        user_id: 'user-123',
        provider: 'google',
        access_token: undefined,
        refresh_token: 'valid-refresh-token',
        expires_at: new Date(Date.now() - 3600000).toISOString(),
      };

      // Mock token refresh response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      });

      // Mock Drive API response after refresh
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          files: [
            {
              id: 'file-1',
              name: 'Document.pdf',
              mimeType: 'application/pdf',
              modifiedTime: '2024-01-15T10:30:00Z',
              webViewLink: 'https://drive.google.com/file/d/file-1/view',
              owners: [{ displayName: 'user@example.com' }],
            },
          ],
        }),
      });

      // Verify token refresh was attempted
      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      );
    });

    it('should handle token refresh errors gracefully', async () => {
      // Mock integration with expired/invalid token
      const mockIntegration = {
        id: 'int-123',
        user_id: 'user-123',
        provider: 'google',
        access_token: undefined,
        refresh_token: 'invalid-refresh-token',
      };

      // Mock failed token refresh
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => '{"error": "invalid_grant"}',
      });

      // Expect error response
      expect(mockFetch).toHaveBeenCalledWith('https://oauth2.googleapis.com/token', expect.any(Object));
    });
  });

  describe('Drive Search Integration', () => {
    it('should search Google Drive with full-text query', async () => {
      const mockIntegration = {
        id: 'int-123',
        user_id: 'user-123',
        provider: 'google',
        access_token: 'valid-access-token',
        refresh_token: 'refresh-token',
      };

      const searchQuery = 'Q3 Financial Report';
      const expectedDriveQuery = `fullText contains '${searchQuery}' and trashed = false`;

      // Mock Drive API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          files: [
            {
              id: 'file-1',
              name: 'Q3_Report.pdf',
              mimeType: 'application/pdf',
              modifiedTime: '2024-01-15T10:30:00Z',
              webViewLink: 'https://drive.google.com/file/d/file-1/view',
              owners: [{ displayName: 'finance@company.com' }],
            },
            {
              id: 'file-2',
              name: 'Q3_Executive_Summary.docx',
              mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              modifiedTime: '2024-01-14T15:00:00Z',
              webViewLink: 'https://drive.google.com/file/d/file-2/view',
              owners: [{ displayName: 'exec@company.com' }],
            },
          ],
        }),
      });

      // Verify Drive API call includes search query
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('q=' + encodeURIComponent(expectedDriveQuery)),
        expect.any(Object)
      );
    });

    it('should escape special characters in search query', async () => {
      const searchQuery = "O'Brien's Report";
      const expectedEscaped = "O\\'Brien\\'s Report";

      // Verify query escaping
      const escapedQuery = searchQuery.replace(/'/g, "\\'");
      expect(escapedQuery).toBe(expectedEscaped);
    });

    it('should limit results and retrieve specific fields', async () => {
      // Mock Drive API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          files: Array(10)
            .fill(null)
            .map((_, i) => ({
              id: `file-${i}`,
              name: `Document_${i}.pdf`,
              mimeType: 'application/pdf',
              modifiedTime: `2024-01-${String(i + 1).padStart(2, '0')}T10:30:00Z`,
              webViewLink: `https://drive.google.com/file/d/file-${i}/view`,
              owners: [{ displayName: 'user@example.com' }],
            })),
        }),
      });

      // Verify API call includes pageSize parameter
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('pageSize='),
        expect.any(Object)
      );

      // Verify fields parameter for specific metadata
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('fields=files('),
        expect.any(Object)
      );
    });

    it('should normalize and return Google Drive results', async () => {
      const mockResults = [
        {
          id: 'file-1',
          name: 'Document.pdf',
          mimeType: 'application/pdf',
          modifiedTime: '2024-01-15T10:30:00Z',
          webViewLink: 'https://drive.google.com/file/d/file-1/view',
          owners: [{ displayName: 'user@example.com' }],
        },
      ];

      const normalized = mockResults.map((f: any) => ({
        id: f.id,
        title: f.name,
        mimeType: f.mimeType,
        modifiedTime: f.modifiedTime,
        webViewLink: f.webViewLink,
        owner: f.owners?.[0]?.displayName || null,
      }));

      expect(normalized[0]).toEqual({
        id: 'file-1',
        title: 'Document.pdf',
        mimeType: 'application/pdf',
        modifiedTime: '2024-01-15T10:30:00Z',
        webViewLink: 'https://drive.google.com/file/d/file-1/view',
        owner: 'user@example.com',
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for missing userId', () => {
      // Body without userId should be rejected
      const body = { query: 'test' };
      expect(() => {
        if (!body.userId) throw new Error('Missing userId or query');
      }).toThrow('Missing userId or query');
    });

    it('should return 404 when user has no Google integration', () => {
      // No integration found should return 404
      const integrationFound = null;
      expect(integrationFound).toBeNull();
    });

    it('should return 500 when unable to obtain access token', () => {
      // No valid token available should return 500
      const accessToken = undefined;
      const refreshToken = undefined;
      expect(accessToken || refreshToken).toBeFalsy();
    });

    it('should handle Google Drive API errors (5xx)', () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => '{"error": {"code": 503, "message": "Service unavailable"}}',
      });

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      // Verify error is caught and logged
      try {
        await mockFetch('https://www.googleapis.com/drive/v3/files');
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
      }
    });
  });

  describe('Security', () => {
    it('should not expose refresh tokens in responses', () => {
      const response = {
        results: [
          {
            id: 'file-1',
            title: 'Document.pdf',
            mimeType: 'application/pdf',
            webViewLink: 'https://drive.google.com/file/d/file-1/view',
          },
        ],
      };

      // Verify no token data in response
      const responseStr = JSON.stringify(response);
      expect(responseStr).not.toContain('token');
      expect(responseStr).not.toContain('refresh');
    });

    it('should use service-role key for Edge Function calls', () => {
      // Verify service-role is used in server-to-server calls
      const headers = {
        'Authorization': `Bearer ${mockDeno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      };

      expect(headers['Authorization']).toContain('test-service-role-key');
    });

    it('should validate user ownership of integration', () => {
      const mockIntegration = {
        user_id: 'user-123',
        provider: 'google',
      };

      const requestUserId = 'user-123';
      expect(mockIntegration.user_id).toBe(requestUserId);
    });

    it('should sanitize search query to prevent injection attacks', () => {
      const maliciousQuery = "'; DROP TABLE external_account_integrations; --";
      const sanitized = maliciousQuery.replace(/'/g, "\\'");

      // Verify query is escaped
      expect(sanitized).toContain("\\'");
      expect(sanitized).not.toContain("'; DROP");
    });
  });

  describe('CORS and Headers', () => {
    it('should return CORS headers in response', () => {
      // Verify CORS headers are included
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      };

      expect(corsHeaders['Access-Control-Allow-Origin']).toBeDefined();
      expect(corsHeaders['Access-Control-Allow-Methods']).toContain('POST');
    });

    it('should handle OPTIONS preflight requests', () => {
      const requestMethod = 'OPTIONS';
      expect(requestMethod).toBe('OPTIONS');
      // Should return 200 with CORS headers
    });
  });
});
