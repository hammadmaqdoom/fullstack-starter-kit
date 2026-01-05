'use client';

import { useTranslations } from 'next-intl';
import { useSession } from '@/libs/BetterAuth';
import { Sponsors } from './Sponsors';

export const Hello = () => {
  const t = useTranslations('Dashboard');
  const { data: session } = useSession();

  return (
    <>
      <p>
        {`👋 `}
        {t('hello_message', { email: session?.user?.email ?? '' })}
      </p>
      <p>
        {t.rich('alternative_message', {
          url: () => (
            <a
              className="text-blue-700 hover:border-b-2 hover:border-blue-700"
              href="https://nextjs-boilerplate.com/pro-saas-starter-kit"
            >
              Next.js Boilerplate Pro
            </a>
          ),
        })}
      </p>
      <Sponsors />
    </>
  );
};
