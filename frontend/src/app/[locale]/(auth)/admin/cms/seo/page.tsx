'use client';

import { useEffect, useState } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function SeoPage() {
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [robotsTxt, setRobotsTxt] = useState('');

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    setSitemapUrl(`${baseUrl}/sitemap.xml`);

    fetch(`${BACKEND_URL}/api/v1/seo/robots.txt`)
      .then(r => r.text())
      .then(setRobotsTxt)
      .catch(() => setRobotsTxt('Failed to load robots.txt'));
  }, []);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">SEO Settings</h2>

      {/* Sitemap */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Sitemap</h3>
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Sitemap URL:</p>
          <a
            href={sitemapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {sitemapUrl}
          </a>
          <p className="text-sm text-gray-500 mt-2">
            The sitemap is automatically generated from published content.
          </p>
        </div>
      </div>

      {/* Robots.txt */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Robots.txt</h3>
        <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
          {robotsTxt || 'Loading...'}
        </pre>
        <p className="text-sm text-gray-500 mt-2">
          Robots.txt is automatically generated. Update redirects to modify it.
        </p>
      </div>

      {/* SEO Metadata Management */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">SEO Metadata</h3>
        <p className="text-sm text-gray-600 mb-4">
          Manage SEO metadata for individual content pieces from the content editor.
        </p>
        <a
          href="/admin/cms/contents"
          className="text-blue-600 hover:underline"
        >
          Go to Contents →
        </a>
      </div>
    </div>
  );
}

