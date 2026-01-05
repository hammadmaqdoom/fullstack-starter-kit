import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeoMetadataEntity } from './entities/seo-metadata.entity';
import { RedirectEntity, RedirectType } from './entities/redirect.entity';
import { CreateSeoMetadataDto } from './dto/create-seo-metadata.dto';
import { ContentEntity, ContentStatus } from '@/api/content/entities/content.entity';

@Injectable()
export class SeoService {
  constructor(
    @InjectRepository(SeoMetadataEntity)
    private readonly seoMetadataRepository: Repository<SeoMetadataEntity>,
    @InjectRepository(RedirectEntity)
    private readonly redirectRepository: Repository<RedirectEntity>,
    @InjectRepository(ContentEntity)
    private readonly contentRepository: Repository<ContentEntity>,
  ) {}

  async getMetadataByContentId(contentId: string): Promise<SeoMetadataEntity | null> {
    return this.seoMetadataRepository.findOne({
      where: { contentId },
    });
  }

  async createOrUpdateMetadata(dto: CreateSeoMetadataDto): Promise<SeoMetadataEntity> {
    if (dto.contentId) {
      const existing = await this.getMetadataByContentId(dto.contentId);
      if (existing) {
        Object.assign(existing, dto);
        return this.seoMetadataRepository.save(existing);
      }
    }

    const metadata = this.seoMetadataRepository.create(dto);
    return this.seoMetadataRepository.save(metadata);
  }

  async getAllVerifications() {
    // This will be handled by AnalyticsService, but kept here for SEO module completeness
    return [];
  }

  async createRedirect(fromPath: string, toPath: string, type: RedirectType = RedirectType.PERMANENT) {
    const redirect = this.redirectRepository.create({
      fromPath,
      toPath,
      type,
    });
    return this.redirectRepository.save(redirect);
  }

  async findRedirect(fromPath: string): Promise<RedirectEntity | null> {
    return this.redirectRepository.findOne({
      where: { fromPath, isActive: true },
    });
  }

  async generateSitemap(locale?: string): Promise<string> {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const contents = await this.contentRepository.find({
      where: { status: ContentStatus.PUBLISHED },
      relations: ['category'],
    });

    const urls = contents.map(content => {
      const path = locale 
        ? `/${locale}/${content.type}/${content.slug}`
        : `/${content.type}/${content.slug}`;
      return {
        loc: `${baseUrl}${path}`,
        lastmod: content.updatedAt.toISOString(),
        changefreq: 'weekly',
        priority: content.type === 'blog' ? '0.8' : '0.6',
      };
    });

    // Add static pages
    const staticPages = [
      { path: '', priority: '1.0', changefreq: 'daily' },
      { path: '/blog', priority: '0.9', changefreq: 'daily' },
      { path: '/docs', priority: '0.8', changefreq: 'weekly' },
    ];

    staticPages.forEach(page => {
      const path = locale ? `/${locale}${page.path}` : page.path;
      urls.push({
        loc: `${baseUrl}${path}`,
        lastmod: new Date().toISOString(),
        changefreq: page.changefreq,
        priority: page.priority,
      });
    });

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    return sitemap;
  }

  async generateRobotsTxt(): Promise<string> {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const sitemapUrl = `${baseUrl}/sitemap.xml`;

    return `User-agent: *
Allow: /

Sitemap: ${sitemapUrl}
`;
  }
}

