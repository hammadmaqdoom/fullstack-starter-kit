import { generateContentMetadata } from '@/libs/metadata-generator';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/seo/JsonLd';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  return generateContentMetadata(slug, locale);
}

export default async function BlogPostPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  
  // Fetch blog post
  const post = await fetch(`${BACKEND_URL}/api/v1/contents/slug/${slug}?includeDrafts=false`, {
    next: { revalidate: 60 }, // ISR
  }).then(r => r.json()).catch(() => null);

  if (!post) {
    notFound();
  }

  // Fetch JSON-LD schema
  const jsonLd = await fetch(`${BACKEND_URL}/api/v1/structured-data/generate/${post.id}`)
    .then(r => r.json())
    .catch(() => null);

  return (
    <article className="container mx-auto px-4 py-8 max-w-4xl">
      {/* JSON-LD structured data */}
      {jsonLd && <JsonLd data={jsonLd} />}
      
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
        {post.excerpt && (
          <p className="text-xl text-gray-600 mb-4">{post.excerpt}</p>
        )}
        <div className="flex items-center gap-4 text-sm text-gray-500"> 
          {post.author && (
            <span>By {post.author.username || post.author.email}</span>
          )}
          {post.publishedAt && (
            <time>{new Date(post.publishedAt).toLocaleDateString()}</time>
          )}
          {post.readingTime && (
            <span>{post.readingTime} min read</span>
          )}
        </div>
      </header>

      {post.featuredImage && (
        <img
          src={post.featuredImage}
          alt={post.title}
          className="w-full h-auto mb-8 rounded-lg"
        />
      )}

      <div
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}

