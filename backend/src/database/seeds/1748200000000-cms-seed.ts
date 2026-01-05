import { CategoryEntity } from '@/api/content/entities/category.entity';
import { ContentEntity, ContentStatus, ContentType } from '@/api/content/entities/content.entity';
import { TagEntity } from '@/api/content/entities/tag.entity';
import { UserEntity } from '@/auth/entities/user.entity';
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

export class CmsSeed1748200000000 implements Seeder {
  track = true;

  public async run(
    dataSource: DataSource,
    _: SeederFactoryManager,
  ): Promise<any> {
    await dataSource.transaction(async (transactionManager) => {
      const userRepository = transactionManager.getRepository(UserEntity);
      const categoryRepository = transactionManager.getRepository(CategoryEntity);
      const tagRepository = transactionManager.getRepository(TagEntity);
      const contentRepository = transactionManager.getRepository(ContentEntity);

      // Get admin user (created by initial seed)
      const adminUser = await userRepository.findOne({
        where: { email: 'admin@admin.com' },
      });

      if (!adminUser) {
        console.warn('Admin user not found. Run initial seed first.');
        return;
      }

      // ===== CREATE CATEGORIES =====
      console.log('Creating categories...');
      
      // Main categories
      const techCategory = await categoryRepository.save(
        categoryRepository.create({
          name: 'Technology',
          slug: 'technology',
          description: 'Articles about technology, software, and innovation',
        }),
      );

      const businessCategory = await categoryRepository.save(
        categoryRepository.create({
          name: 'Business',
          slug: 'business',
          description: 'Business insights, entrepreneurship, and industry trends',
        }),
      );

      const lifestyleCategory = await categoryRepository.save(
        categoryRepository.create({
          name: 'Lifestyle',
          slug: 'lifestyle',
          description: 'Lifestyle, health, and personal development',
        }),
      );

      // Subcategories for Technology
      const webDevCategory = await categoryRepository.save(
        categoryRepository.create({
          name: 'Web Development',
          slug: 'web-development',
          description: 'Frontend, backend, and full-stack development',
          parentId: techCategory.id,
        }),
      );

      const aiCategory = await categoryRepository.save(
        categoryRepository.create({
          name: 'Artificial Intelligence',
          slug: 'artificial-intelligence',
          description: 'AI, machine learning, and data science',
          parentId: techCategory.id,
        }),
      );

      // Subcategories for Business
      const startupCategory = await categoryRepository.save(
        categoryRepository.create({
          name: 'Startups',
          slug: 'startups',
          description: 'Startup stories, funding, and growth strategies',
          parentId: businessCategory.id,
        }),
      );

      const marketingCategory = await categoryRepository.save(
        categoryRepository.create({
          name: 'Marketing',
          slug: 'marketing',
          description: 'Digital marketing, SEO, and content strategy',
          parentId: businessCategory.id,
        }),
      );

      console.log(`Created ${7} categories`);

      // ===== CREATE TAGS =====
      console.log('Creating tags...');

      const tags = await tagRepository.save([
        tagRepository.create({
          name: 'JavaScript',
          slug: 'javascript',
          description: 'JavaScript programming language',
        }),
        tagRepository.create({
          name: 'TypeScript',
          slug: 'typescript',
          description: 'TypeScript programming language',
        }),
        tagRepository.create({
          name: 'React',
          slug: 'react',
          description: 'React.js library',
        }),
        tagRepository.create({
          name: 'Next.js',
          slug: 'nextjs',
          description: 'Next.js framework',
        }),
        tagRepository.create({
          name: 'NestJS',
          slug: 'nestjs',
          description: 'NestJS framework',
        }),
        tagRepository.create({
          name: 'Node.js',
          slug: 'nodejs',
          description: 'Node.js runtime',
        }),
        tagRepository.create({
          name: 'AI',
          slug: 'ai',
          description: 'Artificial Intelligence',
        }),
        tagRepository.create({
          name: 'Machine Learning',
          slug: 'machine-learning',
          description: 'Machine Learning and ML models',
        }),
        tagRepository.create({
          name: 'SEO',
          slug: 'seo',
          description: 'Search Engine Optimization',
        }),
        tagRepository.create({
          name: 'Productivity',
          slug: 'productivity',
          description: 'Productivity tips and tools',
        }),
        tagRepository.create({
          name: 'Tutorial',
          slug: 'tutorial',
          description: 'Step-by-step tutorials',
        }),
        tagRepository.create({
          name: 'Best Practices',
          slug: 'best-practices',
          description: 'Industry best practices',
        }),
      ]);

      console.log(`Created ${tags.length} tags`);

      // ===== CREATE CONTENT =====
      console.log('Creating content...');

      // Blog Post 1: Web Development
      const post1 = await contentRepository.save(
        contentRepository.create({
          title: 'Building Modern Web Applications with Next.js 16',
          slug: 'building-modern-web-apps-nextjs-16',
          excerpt: 'Learn how to build fast, scalable web applications using Next.js 16 with the new App Router and Server Components.',
          content: `# Building Modern Web Applications with Next.js 16

Next.js 16 brings powerful new features that make building web applications faster and more efficient than ever before.

## What's New in Next.js 16

The latest version of Next.js introduces several groundbreaking features:

### 1. Enhanced App Router
The App Router now supports advanced routing patterns with improved performance and better developer experience.

### 2. Server Components by Default
React Server Components are now the default, enabling better performance and smaller bundle sizes.

### 3. Improved Image Optimization
The new Image component offers even better optimization with automatic format detection and responsive sizing.

## Getting Started

To create a new Next.js 16 project:

\`\`\`bash
npx create-next-app@latest my-app
cd my-app
npm run dev
\`\`\`

## Best Practices

1. **Use Server Components**: Leverage server components for data fetching
2. **Optimize Images**: Always use the Next.js Image component
3. **Implement Caching**: Use the built-in caching strategies
4. **Code Splitting**: Take advantage of automatic code splitting

## Conclusion

Next.js 16 is a game-changer for web development. Start building your next project with these powerful features today!`,
          type: ContentType.BLOG,
          status: ContentStatus.PUBLISHED,
          publishedAt: new Date('2024-01-15'),
          featuredImage: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200',
          readingTime: 5,
          authorId: adminUser.id,
          categoryId: webDevCategory.id,
          tags: [tags[0], tags[2], tags[3], tags[10]], // JavaScript, React, Next.js, Tutorial
        }),
      );

      // Blog Post 2: AI
      const post2 = await contentRepository.save(
        contentRepository.create({
          title: 'Understanding Large Language Models: A Comprehensive Guide',
          slug: 'understanding-large-language-models',
          excerpt: 'Dive deep into how Large Language Models work, their applications, and the future of AI-powered applications.',
          content: `# Understanding Large Language Models

Large Language Models (LLMs) have revolutionized the field of artificial intelligence and natural language processing.

## What are LLMs?

LLMs are neural networks trained on vast amounts of text data to understand and generate human-like text.

### Key Characteristics

- **Scale**: Billions of parameters
- **Training Data**: Diverse internet text
- **Capabilities**: Text generation, translation, summarization, and more

## Popular LLMs

1. **GPT-4**: OpenAI's most advanced model
2. **Claude**: Anthropic's conversational AI
3. **Gemini**: Google's multimodal AI
4. **LLaMA**: Meta's open-source models

## Applications

### Content Creation
LLMs can generate articles, stories, and marketing copy.

### Code Generation
Tools like GitHub Copilot use LLMs to assist developers.

### Customer Support
Chatbots powered by LLMs provide 24/7 support.

## Challenges and Considerations

- **Hallucinations**: Models can generate false information
- **Bias**: Training data may contain biases
- **Cost**: Running LLMs requires significant compute resources
- **Privacy**: Handling sensitive data requires careful consideration

## The Future

The future of LLMs includes:
- More efficient models
- Better reasoning capabilities
- Multimodal understanding
- Specialized domain models

## Conclusion

LLMs are transforming how we interact with technology. Understanding their capabilities and limitations is crucial for building effective AI applications.`,
          type: ContentType.BLOG,
          status: ContentStatus.PUBLISHED,
          publishedAt: new Date('2024-01-20'),
          featuredImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200',
          readingTime: 8,
          authorId: adminUser.id,
          categoryId: aiCategory.id,
          tags: [tags[6], tags[7], tags[11]], // AI, Machine Learning, Best Practices
        }),
      );

      // Blog Post 3: Business/Startups
      const post3 = await contentRepository.save(
        contentRepository.create({
          title: 'From Idea to Launch: Building Your First SaaS Product',
          slug: 'from-idea-to-launch-saas-product',
          excerpt: 'A practical guide to building and launching your first SaaS product, from validation to go-to-market strategy.',
          content: `# From Idea to Launch: Building Your First SaaS Product

Turning your SaaS idea into a successful product requires careful planning and execution.

## Phase 1: Validation

Before writing any code, validate your idea:

### Market Research
- Identify your target audience
- Analyze competitors
- Understand pain points

### Customer Interviews
Talk to potential customers to validate the problem and solution.

## Phase 2: MVP Development

Build a Minimum Viable Product with core features:

1. **Define Core Features**: Focus on solving the main problem
2. **Choose Your Stack**: Select technologies you're comfortable with
3. **Set Deadlines**: Aim to launch in 3-6 months

### Recommended Tech Stack
- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: NestJS, PostgreSQL, Redis
- **Auth**: Better Auth or similar
- **Hosting**: Vercel, AWS, or DigitalOcean

## Phase 3: Go-to-Market Strategy

### Pricing Strategy
- Research competitor pricing
- Consider value-based pricing
- Offer a free trial

### Marketing Channels
1. Content marketing (blog, SEO)
2. Social media presence
3. Product Hunt launch
4. Community engagement

## Phase 4: Launch

### Pre-Launch Checklist
- [ ] Landing page ready
- [ ] Email collection setup
- [ ] Beta testers lined up
- [ ] Analytics configured
- [ ] Support system ready

### Launch Day
- Post on Product Hunt
- Share on social media
- Email your list
- Engage with early users

## Post-Launch

Focus on:
- Gathering feedback
- Fixing bugs quickly
- Iterating on features
- Building community

## Common Mistakes to Avoid

1. **Over-engineering**: Don't build features no one asked for
2. **Ignoring Marketing**: Start marketing before launch
3. **Poor Onboarding**: Make it easy for users to get started
4. **No Pricing Strategy**: Don't be afraid to charge

## Conclusion

Building a SaaS product is challenging but rewarding. Focus on solving real problems, ship quickly, and iterate based on feedback.`,
          type: ContentType.BLOG,
          status: ContentStatus.PUBLISHED,
          publishedAt: new Date('2024-01-25'),
          featuredImage: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200',
          readingTime: 10,
          authorId: adminUser.id,
          categoryId: startupCategory.id,
          tags: [tags[11]], // Best Practices
        }),
      );

      // Page 1: About
      const aboutPage = await contentRepository.save(
        contentRepository.create({
          title: 'About Us',
          slug: 'about',
          excerpt: 'Learn more about our mission, vision, and the team behind our platform.',
          content: `# About Us

Welcome to our platform! We're dedicated to providing high-quality content and resources for developers, entrepreneurs, and technology enthusiasts.

## Our Mission

Our mission is to empower individuals and teams to build better software products through education, tools, and community.

## What We Offer

### Educational Content
We publish in-depth articles, tutorials, and guides on modern web development, AI, and business strategies.

### Starter Kits
Our open-source starter kits help developers launch projects faster with best practices built-in.

### Community
Join our growing community of developers and entrepreneurs sharing knowledge and experiences.

## Our Values

1. **Quality First**: We prioritize quality over quantity
2. **Open Source**: We believe in giving back to the community
3. **Continuous Learning**: Technology evolves, and so do we
4. **Practical Focus**: Real-world solutions for real-world problems

## Get in Touch

Have questions or suggestions? We'd love to hear from you!

- Email: hello@example.com
- Twitter: @example
- GitHub: github.com/example`,
          type: ContentType.PAGE,
          status: ContentStatus.PUBLISHED,
          publishedAt: new Date('2024-01-01'),
          readingTime: 2,
          authorId: adminUser.id,
          categoryId: null,
          tags: [],
        }),
      );

      // Page 2: Privacy Policy
      const privacyPage = await contentRepository.save(
        contentRepository.create({
          title: 'Privacy Policy',
          slug: 'privacy-policy',
          excerpt: 'Our commitment to protecting your privacy and personal information.',
          content: `# Privacy Policy

**Last Updated: January 1, 2024**

## Introduction

We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information.

## Information We Collect

### Account Information
- Email address
- Name (optional)
- Profile information

### Usage Data
- Pages visited
- Time spent on site
- Device and browser information

### Cookies
We use cookies to improve your experience and analyze site usage.

## How We Use Your Information

1. **Provide Services**: To operate and maintain our platform
2. **Communications**: To send updates and newsletters (with consent)
3. **Analytics**: To understand how users interact with our site
4. **Security**: To protect against fraud and abuse

## Data Sharing

We do not sell your personal information. We may share data with:
- Service providers (hosting, analytics)
- Legal authorities (when required by law)

## Your Rights

You have the right to:
- Access your data
- Correct inaccurate data
- Request deletion
- Opt-out of marketing communications

## Data Security

We implement industry-standard security measures to protect your data, including:
- Encryption in transit and at rest
- Regular security audits
- Access controls

## Changes to This Policy

We may update this policy periodically. We'll notify you of significant changes via email or site notification.

## Contact Us

Questions about this privacy policy? Contact us at privacy@example.com`,
          type: ContentType.PAGE,
          status: ContentStatus.PUBLISHED,
          publishedAt: new Date('2024-01-01'),
          readingTime: 3,
          authorId: adminUser.id,
          categoryId: null,
          tags: [],
        }),
      );

      // Draft Post (unpublished)
      const draftPost = await contentRepository.save(
        contentRepository.create({
          title: 'Advanced TypeScript Patterns for Enterprise Applications',
          slug: 'advanced-typescript-patterns-enterprise',
          excerpt: 'Explore advanced TypeScript patterns and techniques for building scalable enterprise applications.',
          content: `# Advanced TypeScript Patterns for Enterprise Applications

[This is a draft post - content in progress]

## Introduction

TypeScript has become the de facto standard for building large-scale applications...

## Pattern 1: Branded Types

[Content to be added]

## Pattern 2: Builder Pattern

[Content to be added]

## Conclusion

[To be completed]`,
          type: ContentType.BLOG,
          status: ContentStatus.DRAFT,
          publishedAt: null,
          readingTime: 0,
          authorId: adminUser.id,
          categoryId: webDevCategory.id,
          tags: [tags[1], tags[11]], // TypeScript, Best Practices
        }),
      );

      console.log(`Created ${6} content items (4 published, 1 draft, 2 pages)`);

      console.log('\n✅ CMS seed completed successfully!');
      console.log('\nSummary:');
      console.log(`- Categories: 7 (3 main, 4 subcategories)`);
      console.log(`- Tags: ${tags.length}`);
      console.log(`- Content: 6 items (3 blog posts, 2 pages, 1 draft)`);
    });
  }
}

