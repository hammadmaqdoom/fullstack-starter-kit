import { setRequestLocale } from 'next-intl/server';
import { redirect } from '@/libs/I18nNavigation';
import { getServerSession } from '@/libs/server-auth';

type IIndexProps = {
  params: Promise<{ locale: string }>;
};

export default async function Index(props: IIndexProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const session = await getServerSession();
  if (session) {
    redirect({ href: '/dashboard', locale });
  }

  redirect({ href: '/sign-in', locale });
}
