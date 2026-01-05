import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Sponsors } from '@/components/Sponsors';

type IIndexProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: IIndexProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'Index',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default async function Index(props: IIndexProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: 'Index',
  });

  return (
    <>
      {/* Hero Section */}
      <div className="mb-16 text-center">
        <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl">
          {t('hero_title')}
        </h1>
        <p className="mx-auto mb-8 max-w-3xl text-xl text-gray-600 md:text-2xl">
          {t('hero_description')}
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="/sign-up"
            className="rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-blue-700 hover:shadow-lg"
          >
            {t('cta_get_started')}
          </a>
          <a
            href="https://github.com/hammadmaqdoom/fullstack-starter-kit"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border-2 border-gray-300 px-8 py-4 text-lg font-semibold text-gray-700 transition-all hover:border-gray-400 hover:shadow-lg"
          >
            {t('cta_view_github')}
          </a>
        </div>
      </div>

      {/* Features Section */}
      <div className="mb-16">
        <h2 className="mb-12 text-center text-4xl font-bold">
          {t('features_title')}
        </h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Feature 1: Modern Stack */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-blue-100">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="mb-3 text-xl font-semibold">
              {t('feature_modern_stack_title')}
            </h3>
            <p className="text-gray-600">
              {t('feature_modern_stack_description')}
            </p>
          </div>

          {/* Feature 2: Authentication */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-green-100">
              <span className="text-2xl">🔒</span>
            </div>
            <h3 className="mb-3 text-xl font-semibold">
              {t('feature_auth_title')}
            </h3>
            <p className="text-gray-600">
              {t('feature_auth_description')}
            </p>
          </div>

          {/* Feature 3: Type Safety */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-purple-100">
              <span className="text-2xl">🛡️</span>
            </div>
            <h3 className="mb-3 text-xl font-semibold">
              {t('feature_type_safety_title')}
            </h3>
            <p className="text-gray-600">
              {t('feature_type_safety_description')}
            </p>
          </div>

          {/* Feature 4: Database */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-yellow-100">
              <span className="text-2xl">💾</span>
            </div>
            <h3 className="mb-3 text-xl font-semibold">
              {t('feature_database_title')}
            </h3>
            <p className="text-gray-600">
              {t('feature_database_description')}
            </p>
          </div>

          {/* Feature 5: Testing */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-red-100">
              <span className="text-2xl">🧪</span>
            </div>
            <h3 className="mb-3 text-xl font-semibold">
              {t('feature_testing_title')}
            </h3>
            <p className="text-gray-600">
              {t('feature_testing_description')}
            </p>
          </div>

          {/* Feature 6: Production Ready */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-indigo-100">
              <span className="text-2xl">🚀</span>
            </div>
            <h3 className="mb-3 text-xl font-semibold">
              {t('feature_production_title')}
            </h3>
            <p className="text-gray-600">
              {t('feature_production_description')}
            </p>
          </div>
        </div>
      </div>

      {/* Tech Stack Section */}
      <div className="mb-16">
        <h2 className="mb-8 text-center text-4xl font-bold">
          {t('tech_stack_title')}
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Frontend Stack */}
          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
            <h3 className="mb-4 text-2xl font-semibold">Frontend</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-center">
                <span className="mr-2">✓</span> Next.js 16 (App Router)
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span> TypeScript 5.x
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span> Tailwind CSS 4
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span> Better Auth Client
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span> React Hook Form + Zod
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span> next-intl (i18n)
              </li>
            </ul>
          </div>

          {/* Backend Stack */}
          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-green-50 to-emerald-50 p-8">
            <h3 className="mb-4 text-2xl font-semibold">Backend</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-center">
                <span className="mr-2">✓</span> NestJS 10
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span> PostgreSQL + TypeORM
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span> Redis (Cache & Sessions)
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span> Better Auth Server
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span> REST + GraphQL APIs
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span> BullMQ (Background Jobs)
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="mb-16 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-12 text-center text-white">
        <h2 className="mb-4 text-4xl font-bold">
          {t('cta_section_title')}
        </h2>
        <p className="mb-8 text-xl opacity-90">
          {t('cta_section_description')}
        </p>
        <a
          href="/sign-up"
          className="inline-block rounded-lg bg-white px-8 py-4 text-lg font-semibold text-blue-600 transition-all hover:bg-gray-100 hover:shadow-lg"
        >
          {t('cta_start_building')}
        </a>
      </div>

      {/* Sponsors Section */}
      <div className="mb-8">
        <h2 className="mb-8 text-center text-3xl font-bold">
          {t('sponsors_title')}
        </h2>
        <Sponsors />
      </div>
    </>
  );
};
