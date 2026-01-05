import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { BaseTemplate } from '@/templates/BaseTemplate';

export default async function DashboardLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: 'DashboardLayout',
  });

  return (
    <BaseTemplate
      leftNav={(
        <>
          <li>
            <Link
              href={`/${locale}/dashboard`}
              className="border-none text-gray-700 hover:text-gray-900"
            >
              {t('dashboard_link')}
            </Link>
          </li>
          <li>
            <Link
              href={`/${locale}/dashboard/security`}
              className="border-none text-gray-700 hover:text-gray-900"
            >
              {t('security_link')}
            </Link>
          </li>
          <li>
            <Link
              href={`/${locale}/dashboard/sessions`}
              className="border-none text-gray-700 hover:text-gray-900"
            >
              {t('sessions_link')}
            </Link>
          </li>
          <li>
            <Link
              href={`/${locale}/dashboard/user-profile`}
              className="border-none text-gray-700 hover:text-gray-900"
            >
              {t('user_profile_link')}
            </Link>
          </li>
        </>
      )}
      rightNav={(
        <>
          <li>
            <SignOutButton>
              <span className="border-none text-gray-700 hover:text-gray-900">
                {t('sign_out')}
              </span>
            </SignOutButton>
          </li>

          <li>
            <LocaleSwitcher />
          </li>
        </>
      )}
    >
      {props.children}
    </BaseTemplate>
  );
}
