import { getTranslations } from 'next-intl/server';
import { routing } from '@/libs/I18nRouting';
import { Link } from '@/libs/I18nNavigation';

export default async function RootNotFound() {
  // Use default locale for root-level 404
  const locale = routing.defaultLocale;
  const t = await getTranslations({
    locale,
    namespace: 'NotFound',
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="text-center">
        {/* Large 404 Number */}
        <h1 className="mb-8 text-9xl font-bold text-neutral-100 md:text-[12rem] lg:text-[16rem]">
          404
        </h1>

        {/* Message */}
        <div className="mb-12">
          <p className="text-2xl font-medium text-white md:text-3xl lg:text-4xl">
            {t('message')}
          </p>
        </div>

        {/* Back to Home Link */}
        <Link
          href="/"
          className="inline-block text-lg font-medium text-neutral-200 underline decoration-neutral-200 underline-offset-4 transition-colors hover:text-white hover:decoration-white md:text-xl"
        >
          {t('back_home')}
        </Link>
      </div>
    </div>
  );
}

