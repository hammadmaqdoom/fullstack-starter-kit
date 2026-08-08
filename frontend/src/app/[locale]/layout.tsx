import type { Metadata, Viewport } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { PrimeProvider } from '@/components/providers/PrimeProvider';
import { PostHogProvider } from '@/components/analytics/PostHogProvider';
import { GTMProvider } from '@/components/analytics/GTMProvider';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { CustomScriptsLoader } from '@/components/analytics/CustomScriptsLoader';
import { AuthenticatedTemplate } from '@/templates/AuthenticatedTemplate';
import { GuestTemplate } from '@/templates/GuestTemplate';
import { loadRuntimeConfig, getMetaNameForPlatform } from '@/libs/config-loader';
import { routing } from '@/libs/I18nRouting';
import { getServerSession } from '@/libs/server-auth';
import '@/styles/global.css';

export const viewport: Viewport = {
  themeColor: '#3a5fe0',
};

export const metadata: Metadata = {
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Polaris',
  },
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

  const config = await loadRuntimeConfig();

  const analyticsEnabled = config.features.find(f => f.flagName === 'ENABLE_ANALYTICS')?.isEnabled ?? true;

  const gtmConfig = config.analytics.find(a => a.platform === 'GTM' && a.isActive);
  const ga4Config = config.analytics.find(a => a.platform === 'GA4' && a.isActive);

  const verificationMeta: Record<string, string> = {};
  config.verification.forEach(v => {
    if (v.verificationCode) {
      verificationMeta[getMetaNameForPlatform(v.platform)] = v.verificationCode;
    }
  });

  const session = await getServerSession();
  const isAuthenticated = !!session;

  const renderContent = (children: React.ReactNode) => {
    if (isAuthenticated) {
      return (
        <AuthenticatedTemplate>
          {children}
        </AuthenticatedTemplate>
      );
    }

    return <GuestTemplate>{children}</GuestTemplate>;
  };

  return (
    <html lang={locale} dir="ltr">
      <head>
        {Object.entries(verificationMeta).map(([name, content]) => (
          <meta key={name} name={name} content={content} />
        ))}

        <CustomScriptsLoader scripts={config.customScripts} position="head-start" />
      </head>
      <body suppressHydrationWarning>
        <NextIntlClientProvider>
          <PrimeProvider>
            {analyticsEnabled && gtmConfig && (
              <GTMProvider containerId={gtmConfig.trackingId}>
                {analyticsEnabled && ga4Config && (
                  <GoogleAnalytics measurementId={ga4Config.trackingId} />
                )}
                <PostHogProvider>
                  {renderContent(props.children)}
                </PostHogProvider>
              </GTMProvider>
            )}
            {(!analyticsEnabled || !gtmConfig) && (
              <>
                {analyticsEnabled && ga4Config && (
                  <GoogleAnalytics measurementId={ga4Config.trackingId} />
                )}
                <PostHogProvider>
                  {renderContent(props.children)}
                </PostHogProvider>
              </>
            )}
          </PrimeProvider>
        </NextIntlClientProvider>

        <CustomScriptsLoader scripts={config.customScripts} position="body-end" />
      </body>
    </html>
  );
}
