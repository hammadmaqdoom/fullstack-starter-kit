import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CMS Admin',
  description: 'Content Management System',
};

export default function CmsAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-semibold">CMS Admin</h1>
            <div className="flex gap-4">
              <a href="/admin/cms/contents" className="text-gray-700 hover:text-gray-900">
                Contents
              </a>
              <a href="/admin/cms/analytics" className="text-gray-700 hover:text-gray-900">
                Analytics
              </a>
              <a href="/admin/cms/seo" className="text-gray-700 hover:text-gray-900">
                SEO
              </a>
              <a href="/admin/cms/media" className="text-gray-700 hover:text-gray-900">
                Media
              </a>
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

