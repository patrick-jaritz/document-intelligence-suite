/**
 * HeadlessX Integration Types
 * Types for the HeadlessX web scraping service integration
 */

export interface HeadlessXConfig {
  apiUrl: string;
  authToken?: string;
  timeout?: number;
}

export interface HeadlessXRenderOptions {
  url: string;
  profile?: string;
  stealthMode?: 'maximum' | 'medium' | 'low';
  behaviorSimulation?: boolean;
  cloudflareBypass?: boolean;
  datadomeBypass?: boolean;
  mouseMovement?: 'natural' | 'fast';
  keyboardDynamics?: 'human' | 'fast';
  timeout?: number;
  waitForSelector?: string;
  geolocation?: {
    latitude: number;
    longitude: number;
  };
}

export interface HeadlessXScreenshotOptions {
  url: string;
  fullPage?: boolean;
  profile?: string;
  timeout?: number;
}

export interface HeadlessXPdfOptions {
  url: string;
  format?: 'A4' | 'Letter' | 'Legal';
  profile?: string;
  timeout?: number;
}

export interface HeadlessXResult {
  success: boolean;
  html?: string;
  text?: string;
  markdown?: string;
  metadata?: {
    url: string;
    title?: string;
    description?: string;
    wordCount?: number;
    processingTime?: number;
    provider?: string;
    realScraping?: boolean;
  };
  error?: string;
}

export interface DeviceProfile {
  id: string;
  name: string;
  category: 'desktop' | 'mobile' | 'tablet';
  description: string;
}

export interface HeadlessXHealth {
  status: 'ok' | 'degraded' | 'down';
  version?: string;
  uptime?: number;
  message?: string;
}
