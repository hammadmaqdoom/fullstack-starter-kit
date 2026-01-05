import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ContentEntity, ContentStatus } from './entities/content.entity';
import { CategoryEntity } from './entities/category.entity';
import { TagEntity } from './entities/tag.entity';
import { ContentVersionEntity } from './entities/content-version.entity';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { QueryContentDto } from './dto/query-content.dto';
import { ContentDto, toContentDto } from './dto/content.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { paginate } from '@/utils/pagination/offset-pagination';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(ContentEntity)
    private readonly contentRepository: Repository<ContentEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
    @InjectRepository(TagEntity)
    private readonly tagRepository: Repository<TagEntity>,
    @InjectRepository(ContentVersionEntity)
    private readonly contentVersionRepository: Repository<ContentVersionEntity>,
  ) {}

  async findAll(dto: QueryContentDto): Promise<OffsetPaginatedDto<ContentDto>> {
    const query = this.contentRepository
      .createQueryBuilder('content')
      .leftJoinAndSelect('content.author', 'author')
      .leftJoinAndSelect('content.category', 'category')
      .leftJoinAndSelect('content.tags', 'tags')
      .orderBy('content.createdAt', 'DESC');

    if (dto.type) {
      query.andWhere('content.type = :type', { type: dto.type });
    }

    if (dto.status) {
      query.andWhere('content.status = :status', { status: dto.status });
    }

    if (dto.categoryId) {
      query.andWhere('content.categoryId = :categoryId', { categoryId: dto.categoryId });
    }

    if (dto.authorId) {
      query.andWhere('content.authorId = :authorId', { authorId: dto.authorId });
    }

    if (dto.search) {
      query.andWhere(
        '(content.title ILIKE :search OR content.content ILIKE :search OR content.excerpt ILIKE :search)',
        { search: `%${dto.search}%` },
      );
    }

    if (dto.tagSlug) {
      query.innerJoin('content.tags', 'tag', 'tag.slug = :tagSlug', { tagSlug: dto.tagSlug });
    }

    const [contents, metaDto] = await paginate<ContentEntity>(query, dto, {
      skipCount: false,
      takeAll: false,
    });

    return new OffsetPaginatedDto(
      contents.map(toContentDto),
      metaDto,
    );
  }

  async findBySlug(slug: string, includeDrafts = false): Promise<ContentDto> {
    const query = this.contentRepository
      .createQueryBuilder('content')
      .leftJoinAndSelect('content.author', 'author')
      .leftJoinAndSelect('content.category', 'category')
      .leftJoinAndSelect('content.tags', 'tags')
      .where('content.slug = :slug', { slug });

    if (!includeDrafts) {
      query.andWhere('content.status = :status', { status: ContentStatus.PUBLISHED });
    }

    const content = await query.getOne();

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    return toContentDto(content);
  }

  async findById(id: string): Promise<ContentDto> {
    const content = await this.contentRepository.findOne({
      where: { id },
      relations: ['author', 'category', 'tags'],
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    return toContentDto(content);
  }

  async create(dto: CreateContentDto, authorId: string): Promise<ContentDto> {
    const content = this.contentRepository.create({
      ...dto,
      authorId,
      status: dto.status || ContentStatus.DRAFT,
    });

    if (dto.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
      content.category = category;
    }

    if (dto.tagIds && dto.tagIds.length > 0) {
      const tags = await this.tagRepository.find({
        where: { id: In(dto.tagIds) },
      });
      content.tags = tags;
    }

    // Calculate reading time (rough estimate: 200 words per minute)
    const wordCount = dto.content.split(/\s+/).length;
    content.readingTime = Math.ceil(wordCount / 200);

    const saved = await this.contentRepository.save(content);
    return this.findById(saved.id);
  }

  async update(id: string, dto: UpdateContentDto): Promise<ContentDto> {
    const content = await this.contentRepository.findOne({
      where: { id },
      relations: ['tags'],
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    // Create version before updating
    await this.createVersion(content);

    if (dto.categoryId !== undefined) {
      if (dto.categoryId) {
        const category = await this.categoryRepository.findOne({
          where: { id: dto.categoryId },
        });
        if (!category) {
          throw new NotFoundException('Category not found');
        }
        content.category = category;
      } else {
        content.category = null;
      }
    }

    if (dto.tagIds !== undefined) {
      if (dto.tagIds.length > 0) {
        const tags = await this.tagRepository.find({
          where: { id: In(dto.tagIds) },
        });
        content.tags = tags;
      } else {
        content.tags = [];
      }
    }

    if (dto.content) {
      const wordCount = dto.content.split(/\s+/).length;
      content.readingTime = Math.ceil(wordCount / 200);
    }

    Object.assign(content, dto);
    await this.contentRepository.save(content);

    return this.findById(id);
  }

  async publish(id: string): Promise<ContentDto> {
    const content = await this.contentRepository.findOne({ where: { id } });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    content.status = ContentStatus.PUBLISHED;
    content.publishedAt = new Date();

    await this.contentRepository.save(content);
    return this.findById(id);
  }

  async unpublish(id: string): Promise<ContentDto> {
    const content = await this.contentRepository.findOne({ where: { id } });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    content.status = ContentStatus.DRAFT;
    await this.contentRepository.save(content);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const content = await this.contentRepository.findOne({ where: { id } });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    await this.contentRepository.softDelete(id);
  }

  async getVersions(contentId: string): Promise<ContentVersionEntity[]> {
    return this.contentVersionRepository.find({
      where: { contentId },
      order: { createdAt: 'DESC' },
    });
  }

  private async createVersion(content: ContentEntity): Promise<void> {
    const version = this.contentVersionRepository.create({
      contentId: content.id,
      title: content.title,
      contentData: content.content,
      excerpt: content.excerpt,
      metadata: {
        status: content.status,
        type: content.type,
      },
    });

    await this.contentVersionRepository.save(version);
  }
}

