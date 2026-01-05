import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SessionManager } from '@/components/auth/SessionManager';

type ISessionsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: ISessionsPageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'Sessions',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default async function SessionsPage(props: ISessionsPageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Active Sessions</h1>
        <p className="mt-2 text-gray-600">Manage all devices where you're currently signed in</p>
      </div>
      <SessionManager />
    </div>
  );
}

