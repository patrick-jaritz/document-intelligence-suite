/**
 * HeadlessX API Client
 * Client for interacting with HeadlessX web scraping service
 */

import {
  HeadlessXConfig,
  HeadlessXRenderOptions,
  HeadlessXScreenshotOptions,
  HeadlessXPdfOptions,
  HeadlessXResult,
  DeviceProfile,
  HeadlessXHealth
} from './types';

export class HeadlessXClient {
  private config: HeadlessXConfig;

  constructor(config: HeadlessXConfig) {
    this.config = {
      timeout: 30000,
      ...config
    };
  }

  /**
   * Check HeadlessX service health
   */
  async checkHealth(): Promise<HeadlessXHealth> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        return {
          status: 'down',
          message: `Health check failed with status ${response.status}`
        };
      }

      const data = await response.json();
      return {
        status: 'ok',
        ...data
      };
    } catch (error) {
      return {
        status: 'down',
        message: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }

  /**
   * Get available device profiles
   */
  async getProfiles(): Promise<DeviceProfile[]> {
    try {
      const url = new URL(`${this.config.apiUrl}/api/profiles`);
      if (this.config.authToken) {
        url.searchParams.set('token', this.config.authToken);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch profiles: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch profiles:', error);
      return [];
    }
  }

  /**
   * Render a page with full anti-detection
   */
  async render(options: HeadlessXRenderOptions): Promise<HeadlessXResult> {
    try {
      const url = new URL(`${this.config.apiUrl}/api/render`);
      if (this.config.authToken) {
        url.searchParams.set('token', this.config.authToken);
      }

      const timeout = options.timeout || this.config.timeout || 30000;

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(options),
        signal: AbortSignal.timeout(timeout + 5000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Render failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return {
        success: true,
        ...result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Render failed'
      };
    }
  }

  /**
   * Extract HTML from a URL
   */
  async getHtml(url: string, options?: Partial<HeadlessXRenderOptions>): Promise<HeadlessXResult> {
    try {
      const apiUrl = new URL(`${this.config.apiUrl}/api/html`);
      if (this.config.authToken) {
        apiUrl.searchParams.set('token', this.config.authToken);
      }

      const timeout = options?.timeout || this.config.timeout || 30000;

      const response = await fetch(apiUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url,
          ...options
        }),
        signal: AbortSignal.timeout(timeout + 5000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTML extraction failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return {
        success: true,
        html: result.html,
        metadata: {
          url,
          processingTime: result.processingTime,
          provider: 'headlessx'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'HTML extraction failed'
      };
    }
  }

  /**
   * Extract text content from a URL
   */
  async getText(url: string, options?: Partial<HeadlessXRenderOptions>): Promise<HeadlessXResult> {
    try {
      const apiUrl = new URL(`${this.config.apiUrl}/api/content`);
      if (this.config.authToken) {
        apiUrl.searchParams.set('token', this.config.authToken);
      }

      const timeout = options?.timeout || this.config.timeout || 30000;

      const response = await fetch(apiUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url,
          ...options
        }),
        signal: AbortSignal.timeout(timeout + 5000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Text extraction failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return {
        success: true,
        text: result.text,
        metadata: {
          url,
          processingTime: result.processingTime,
          provider: 'headlessx',
          wordCount: result.text?.split(/\s+/).length || 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Text extraction failed'
      };
    }
  }

  /**
   * Take a screenshot of a URL
   */
  async screenshot(options: HeadlessXScreenshotOptions): Promise<Blob | null> {
    try {
      const url = new URL(`${this.config.apiUrl}/api/screenshot`);
      if (this.config.authToken) {
        url.searchParams.set('token', this.config.authToken);
      }
      url.searchParams.set('url', options.url);
      
      if (options.fullPage !== undefined) {
        url.searchParams.set('fullPage', String(options.fullPage));
      }
      if (options.profile) {
        url.searchParams.set('profile', options.profile);
      }

      const timeout = options.timeout || this.config.timeout || 30000;

      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: AbortSignal.timeout(timeout + 5000)
      });

      if (!response.ok) {
        throw new Error(`Screenshot failed: ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Screenshot error:', error);
      return null;
    }
  }

  /**
   * Generate a PDF from a URL
   */
  async generatePdf(options: HeadlessXPdfOptions): Promise<Blob | null> {
    try {
      const url = new URL(`${this.config.apiUrl}/api/pdf`);
      if (this.config.authToken) {
        url.searchParams.set('token', this.config.authToken);
      }

      const timeout = options.timeout || this.config.timeout || 30000;

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(options),
        signal: AbortSignal.timeout(timeout + 5000)
      });

      if (!response.ok) {
        throw new Error(`PDF generation failed: ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('PDF generation error:', error);
      return null;
    }
  }

  /**
   * Render with maximum stealth mode
   */
  async renderStealth(url: string, options?: Partial<HeadlessXRenderOptions>): Promise<HeadlessXResult> {
    return this.render({
      url,
      stealthMode: 'maximum',
      behaviorSimulation: true,
      cloudflareBypass: true,
      datadomeBypass: true,
      mouseMovement: 'natural',
      keyboardDynamics: 'human',
      ...options
    });
  }
}

/**
 * Create a default HeadlessX client instance
 */
export function createHeadlessXClient(apiUrl: string, authToken?: string): HeadlessXClient {
  return new HeadlessXClient({
    apiUrl,
    authToken,
    timeout: 30000
  });
}
