import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm';
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup';
import Link from 'next/link';

type ISecurityPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: ISecurityPageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'Security',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default async function SecurityPage(props: ISecurityPageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
        <p className="mt-2 text-gray-600">Manage your password and two-factor authentication</p>
      </div>

      <div className="space-y-8">
        {/* Password Section */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Change Password</h2>
          <ChangePasswordForm />
        </div>

        {/* Two-Factor Authentication Section */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Two-Factor Authentication</h2>
          <TwoFactorSetup isEnabled={false} />
        </div>

        {/* Sessions Link */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Active Sessions</h2>
          <p className="text-gray-600 mb-4">
            View and manage all devices where you're currently signed in
          </p>
          <Link
            href={`/${locale}/dashboard/sessions`}
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Manage Sessions
          </Link>
        </div>
      </div>
    </div>
  );
}

