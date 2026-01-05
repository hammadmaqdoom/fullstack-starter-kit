import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

type IFeaturesProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: IFeaturesProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'Features',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default async function Features(props: IFeaturesProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: 'Features',
  });

  const features = [
    {
      icon: '🚀',
      title: t('feature_fast_title'),
      description: t('feature_fast_description'),
    },
    {
      icon: '🔒',
      title: t('feature_secure_title'),
      description: t('feature_secure_description'),
    },
    {
      icon: '📱',
      title: t('feature_responsive_title'),
      description: t('feature_responsive_description'),
    },
    {
      icon: '⚡',
      title: t('feature_modern_title'),
      description: t('feature_modern_description'),
    },
    {
      icon: '🎨',
      title: t('feature_customizable_title'),
      description: t('feature_customizable_description'),
    },
    {
      icon: '🌍',
      title: t('feature_international_title'),
      description: t('feature_international_description'),
    },
  ];

  return (
    <div className="py-8">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">
          {t('page_title')}
        </h1>
        <p className="mx-auto max-w-2xl text-xl text-gray-600">
          {t('page_description')}
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <div
            key={index}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md"
          >
            <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-blue-100">
              <span className="text-2xl">{feature.icon}</span>
            </div>
            <h3 className="mb-3 text-xl font-semibold text-gray-900">
              {feature.title}
            </h3>
            <p className="text-gray-600">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Additional CTA Section */}
      <div className="mt-16 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center text-white md:p-12">
        <h2 className="mb-4 text-3xl font-bold">
          {t('cta_title')}
        </h2>
        <p className="mb-6 text-lg opacity-90">
          {t('cta_description')}
        </p>
        <a
          href="/sign-up"
          className="inline-block rounded-lg bg-white px-8 py-3 font-semibold text-blue-600 transition-all hover:bg-gray-100 hover:shadow-lg"
        >
          {t('cta_button')}
        </a>
      </div>
    </div>
  );
};

