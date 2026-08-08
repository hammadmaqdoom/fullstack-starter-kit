import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CMS Admin',
  description: 'Content Management System',
};

export default function CmsAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
