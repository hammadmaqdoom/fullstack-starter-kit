import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MagicLinkForm } from '@/components/auth/MagicLinkForm';

type IMagicLinkPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: IMagicLinkPageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'MagicLink',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default async function MagicLinkPage(props: IMagicLinkPageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <MagicLinkForm locale={locale} />
    </div>
  );
}

