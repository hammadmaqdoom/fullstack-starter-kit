import type { Metadata } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { PostHogProvider } from '@/components/analytics/PostHogProvider';
import { GTMProvider } from '@/components/analytics/GTMProvider';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { CustomScriptsLoader } from '@/components/analytics/CustomScriptsLoader';
import { loadRuntimeConfig, getMetaNameForPlatform } from '@/libs/config-loader';
import { routing } from '@/libs/I18nRouting';
import '@/styles/global.css';

export const metadata: Metadata = {
  icons: [
    {
      rel: 'apple-touch-icon',
      url: '/apple-touch-icon.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '32x32',
      url: '/favicon-32x32.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '16x16',
      url: '/favicon-16x16.png',
    },
    {
      rel: 'icon',
      url: '/favicon.ico',
    },
  ],
};

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}

export default async function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  // Load runtime config from database
  const config = await loadRuntimeConfig();
  
  // Check if analytics is enabled
  const analyticsEnabled = config.features.find(f => f.flagName === 'ENABLE_ANALYTICS')?.isEnabled ?? true;
  
  // Get analytics configs
  const gtmConfig = config.analytics.find(a => a.platform === 'GTM' && a.isActive);
  const ga4Config = config.analytics.find(a => a.platform === 'GA4' && a.isActive);

  // Get verification meta tags
  const verificationMeta: Record<string, string> = {};
  config.verification.forEach(v => {
    if (v.verificationCode) {
      verificationMeta[getMetaNameForPlatform(v.platform)] = v.verificationCode;
    }
  });

  return (
    <html lang={locale}>
      <head>
        {/* Verification meta tags */}
        {Object.entries(verificationMeta).map(([name, content]) => (
          <meta key={name} name={name} content={content} />
        ))}
        
        {/* Head-start custom scripts */}
        <CustomScriptsLoader scripts={config.customScripts} position="head-start" />
      </head>
      <body>
        <NextIntlClientProvider>
          {analyticsEnabled && gtmConfig && (
            <GTMProvider containerId={gtmConfig.trackingId}>
              {analyticsEnabled && ga4Config && (
                <GoogleAnalytics measurementId={ga4Config.trackingId} />
              )}
              <PostHogProvider>
                {props.children}
              </PostHogProvider>
            </GTMProvider>
          )}
          {(!analyticsEnabled || !gtmConfig) && (
            <>
              {analyticsEnabled && ga4Config && (
                <GoogleAnalytics measurementId={ga4Config.trackingId} />
              )}
              <PostHogProvider>
                {props.children}
              </PostHogProvider>
            </>
          )}
        </NextIntlClientProvider>
        
        {/* Body-end custom scripts */}
        <CustomScriptsLoader scripts={config.customScripts} position="body-end" />
      </body>
    </html>
  );
}
