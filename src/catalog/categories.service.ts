import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../admin/audit.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { slugify } from './catalog.helpers';

export interface Actor {
  id: string;
  ip?: string;
}

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  parentId: string | null;
  productCount: number;
  children: CategoryNode[];
}

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ------------------------------- public --------------------------------

  async listTree() {
    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { products: { where: { isDeleted: false } } } },
      },
    });

    const nodes: CategoryNode[] = categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      imageUrl: c.imageUrl,
      parentId: c.parentId,
      productCount: c._count.products,
      children: [],
    }));

    const byId = new Map(nodes.map((n) => [n.id, n]));
    const roots: CategoryNode[] = [];
    for (const node of nodes) {
      const parent = node.parentId ? byId.get(node.parentId) : undefined;
      if (parent && parent !== node) parent.children.push(node);
      else roots.push(node);
    }

    return { data: roots, message: 'Categories fetched' };
  }

  async getBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        _count: { select: { products: { where: { isDeleted: false } } } },
        children: {
          orderBy: { name: 'asc' },
          include: {
            _count: { select: { products: { where: { isDeleted: false } } } },
          },
        },
      },
    });
    if (!category) throw new NotFoundException('Category not found');

    return {
      data: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        imageUrl: category.imageUrl,
        parentId: category.parentId,
        productCount: category._count.products,
        children: category.children.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          imageUrl: c.imageUrl,
          productCount: c._count.products,
        })),
      },
      message: 'Category fetched',
    };
  }

  // -------------------------------- admin ---------------------------------

  async listAll() {
    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { products: { where: { isDeleted: false } } } },
      },
    });
    return {
      data: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        imageUrl: c.imageUrl,
        parentId: c.parentId,
        productCount: c._count.products,
        createdAt: c.createdAt,
      })),
      message: 'Categories fetched',
    };
  }

  async create(dto: CreateCategoryDto, actor: Actor) {
    if (dto.parentId) await this.assertExists(dto.parentId);

    const slug = await this.resolveUniqueSlug(dto.slug ?? slugify(dto.name));
    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        imageUrl: dto.imageUrl,
        parentId: dto.parentId ?? null,
      },
    });

    await this.audit.log({
      adminId: actor.id,
      action: 'category.create',
      entity: 'Category',
      entityId: category.id,
      metadata: { slug: category.slug },
      ipAddress: actor.ip,
    });

    return { data: category, message: 'Category created' };
  }

  async update(id: string, dto: UpdateCategoryDto, actor: Actor) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Category not found');

    if (dto.slug && dto.slug !== existing.slug) {
      const taken = await this.prisma.category.findUnique({
        where: { slug: dto.slug },
      });
      if (taken) throw new ConflictException('Slug is already in use');
    }

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new ConflictException('A category cannot be its own parent');
      }
      await this.assertExists(dto.parentId);
      if (await this.isDescendant(id, dto.parentId)) {
        throw new ConflictException(
          'Cannot move a category under one of its own subcategories',
        );
      }
    }

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
      },
    });

    await this.audit.log({
      adminId: actor.id,
      action: 'category.update',
      entity: 'Category',
      entityId: id,
      metadata: { changes: dto },
      ipAddress: actor.ip,
    });

    return { data: category, message: 'Category updated' };
  }

  async remove(id: string, actor: Actor) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Category not found');

    const [childCount, productCount] = await this.prisma.$transaction([
      this.prisma.category.count({ where: { parentId: id } }),
      this.prisma.product.count({
        where: { categoryId: id, isDeleted: false },
      }),
    ]);
    if (childCount > 0) {
      throw new ConflictException(
        'Cannot delete a category that still has subcategories',
      );
    }
    if (productCount > 0) {
      throw new ConflictException(
        'Cannot delete a category that still has products — move them first',
      );
    }

    await this.prisma.category.delete({ where: { id } });

    await this.audit.log({
      adminId: actor.id,
      action: 'category.delete',
      entity: 'Category',
      entityId: id,
      metadata: { slug: existing.slug },
      ipAddress: actor.ip,
    });

    return { data: { id }, message: 'Category deleted' };
  }

  // -------------------------------- helpers --------------------------------

  private async assertExists(id: string) {
    const parent = await this.prisma.category.findUnique({ where: { id } });
    if (!parent) throw new NotFoundException('Parent category not found');
  }

  private async resolveUniqueSlug(base: string): Promise<string> {
    const root = base || 'category';
    let candidate = root;
    let suffix = 2;
    while (
      await this.prisma.category.findUnique({ where: { slug: candidate } })
    ) {
      candidate = `${root}-${suffix++}`;
    }
    return candidate;
  }

  /** True when `candidateParentId` is `categoryId` itself or one of its descendants. */
  private async isDescendant(
    categoryId: string,
    candidateParentId: string,
  ): Promise<boolean> {
    let cursor: string | null = candidateParentId;
    const seen = new Set<string>();
    while (cursor && !seen.has(cursor)) {
      if (cursor === categoryId) return true;
      seen.add(cursor);
      const node: { parentId: string | null } | null =
        await this.prisma.category.findUnique({
          where: { id: cursor },
          select: { parentId: true },
        });
      cursor = node?.parentId ?? null;
    }
    return false;
  }
}
