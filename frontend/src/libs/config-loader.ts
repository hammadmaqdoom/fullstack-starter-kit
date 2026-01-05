const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export interface AnalyticsConfig {
  id: string;
  platform: string;
  name: string;
  trackingId: string;
  isActive: boolean;
  environment: string;
  priority: number;
}

export interface SiteVerification {
  id: string;
  platform: string;
  verificationCode: string;
  metaTag?: string;
  isVerified: boolean;
}

export interface FeatureFlag {
  id: string;
  flagName: string;
  description?: string;
  isEnabled: boolean;
  environment: string;
}

export interface CustomScript {
  id: string;
  name: string;
  scriptContent: string;
  position: 'head-start' | 'head-end' | 'body-start' | 'body-end';
  isActive: boolean;
  priority: number;
}

export interface RuntimeConfig {
  analytics: AnalyticsConfig[];
  verification: SiteVerification[];
  features: FeatureFlag[];
  customScripts: CustomScript[];
}

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    const [analytics, verification, features, customScripts] = await Promise.all([
      fetch(`${BACKEND_URL}/api/v1/analytics/configs?active=true`).then(r => r.json()),
      fetch(`${BACKEND_URL}/api/v1/seo/verification`).then(r => r.json()),
      fetch(`${BACKEND_URL}/api/v1/analytics/feature-flags`).then(r => r.json()),
      fetch(`${BACKEND_URL}/api/v1/analytics/custom-scripts?active=true`).then(r => r.json()),
    ]);

    return {
      analytics: analytics || [],
      verification: verification || [],
      features: features || [],
      customScripts: customScripts || [],
    };
  } catch (error) {
    console.error('Failed to load runtime config:', error);
    return {
      analytics: [],
      verification: [],
      features: [],
      customScripts: [],
    };
  }
}

export function getMetaNameForPlatform(platform: string): string {
  const metaNames: Record<string, string> = {
    GOOGLE: 'google-site-verification',
    BING: 'msvalidate.01',
    YANDEX: 'yandex-verification',
    FACEBOOK: 'facebook-domain-verification',
    PINTEREST: 'pinterest-site-verification',
  };
  return metaNames[platform] || platform.toLowerCase();
}

