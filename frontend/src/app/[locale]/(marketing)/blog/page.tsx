import { generateContentMetadata } from '@/libs/metadata-generator';
import { Metadata } from 'next';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Blog',
    description: 'Read our latest blog posts',
  };
}

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  
  // Fetch blog posts
  const posts = await fetch(`${BACKEND_URL}/api/v1/contents?type=blog&status=published&limit=10`, {
    next: { revalidate: 60 }, // ISR: revalidate every 60 seconds
  }).then(r => r.json()).catch(() => ({ data: [], meta: {} }));

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Blog</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.data?.map((post: any) => (
          <article key={post.id} className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
            <h2 className="text-2xl font-semibold mb-2">
              <a href={`/${locale}/blog/${post.slug}`}>{post.title}</a>
            </h2>
            {post.excerpt && (
              <p className="text-gray-600 mb-4">{post.excerpt}</p>
            )}
            {post.publishedAt && (
              <time className="text-sm text-gray-500">
                {new Date(post.publishedAt).toLocaleDateString()}
              </time>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

