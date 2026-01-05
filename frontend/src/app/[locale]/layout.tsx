import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { PostHogProvider } from '@/components/analytics/PostHogProvider';
import { GTMProvider } from '@/components/analytics/GTMProvider';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { CustomScriptsLoader } from '@/components/analytics/CustomScriptsLoader';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { BaseTemplate } from '@/templates/BaseTemplate';
import { AuthenticatedTemplate } from '@/templates/AuthenticatedTemplate';
import { Link } from '@/libs/I18nNavigation';
import { loadRuntimeConfig, getMetaNameForPlatform } from '@/libs/config-loader';
import { routing } from '@/libs/I18nRouting';
import { getServerSession } from '@/libs/server-auth';
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

  const t = await getTranslations({
    locale,
    namespace: 'RootLayout',
  });

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

  // Check if user is authenticated
  const session = await getServerSession();
  const isAuthenticated = !!session;

  // Render content wrapper based on authentication state
  const renderContent = (children: React.ReactNode) => {
    if (isAuthenticated) {
      return (
        <AuthenticatedTemplate>
          <div className="py-5 text-xl [&_p]:my-6">{children}</div>
        </AuthenticatedTemplate>
      );
    }

    // Logged-out users get the standard template with footer
    return (
      <BaseTemplate
        leftNav={(
          <>
            <li>
              <Link
                href="/"
                className="border-none text-gray-700 hover:text-gray-900"
              >
                {t('home_link')}
              </Link>
            </li>
            <li>
              <Link
                href="/about/"
                className="border-none text-gray-700 hover:text-gray-900"
              >
                {t('about_link')}
              </Link>
            </li>
            <li>
              <Link
                href="/features/"
                className="border-none text-gray-700 hover:text-gray-900"
              >
                {t('features_link')}
              </Link>
            </li>
            <li>
              <a
                className="border-none text-gray-700 hover:text-gray-900"
                href="https://github.com/hammadmaqdoom/fullstack-starter-kit.git"
              >
                GitHub
              </a>
            </li>
          </>
        )}
        rightNav={(
          <>
            <li>
              <Link
                href="/sign-in/"
                className="border-none text-gray-700 hover:text-gray-900"
              >
                {t('sign_in_link')}
              </Link>
            </li>

            <li>
              <Link
                href="/sign-up/"
                className="border-none text-gray-700 hover:text-gray-900"
              >
                {t('sign_up_link')}
              </Link>
            </li>

            <li>
              <LocaleSwitcher />
            </li>
          </>
        )}
      >
        <div className="py-5 text-xl [&_p]:my-6">{children}</div>
      </BaseTemplate>
    );
  };

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <head>
        {/* Verification meta tags */}
        {Object.entries(verificationMeta).map(([name, content]) => (
          <meta key={name} name={name} content={content} />
        ))}
        
        {/* Head-start custom scripts */}
        <CustomScriptsLoader scripts={config.customScripts} position="head-start" />
      </head>
      <body suppressHydrationWarning>
        <NextIntlClientProvider>
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
        </NextIntlClientProvider>
        
        {/* Body-end custom scripts */}
        <CustomScriptsLoader scripts={config.customScripts} position="body-end" />
      </body>
    </html>
  );
}
