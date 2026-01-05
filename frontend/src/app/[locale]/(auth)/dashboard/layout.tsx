import { setRequestLocale } from 'next-intl/server';

/**
 * Dashboard Layout
 * 
 * This layout is intentionally minimal - it just sets the locale.
 * The root layout ([locale]/layout.tsx) handles the authentication-based
 * template rendering (AuthenticatedTemplate vs BaseTemplate).
 * 
 * For authenticated users, the root layout will render AuthenticatedTemplate
 * which includes the AuthenticatedNavbar (no footer).
 */
export default async function DashboardLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  // Just return children - let the root layout handle the template
  return props.children;
}
