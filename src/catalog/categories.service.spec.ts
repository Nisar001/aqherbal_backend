import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../admin/audit.service';

const actor = { id: 'admin-1' };

const category = (overrides: Record<string, unknown> = {}) => ({
  id: 'c-1',
  name: 'Hair Care',
  slug: 'hair-care',
  imageUrl: null,
  parentId: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: {
    category: Record<string, jest.Mock>;
    product: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    prisma = {
      category: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      product: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(CategoriesService);
  });

  describe('listTree', () => {
    it('nests children under their parents and keeps roots separate', async () => {
      prisma.category.findMany.mockResolvedValue([
        category({ _count: { products: 3 } }),
        category({
          id: 'c-2',
          name: 'Hair Oils',
          slug: 'hair-oils',
          parentId: 'c-1',
          _count: { products: 1 },
        }),
      ]);

      const result = await service.listTree();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].slug).toBe('hair-care');
      expect(result.data[0].productCount).toBe(3);
      expect(result.data[0].children).toHaveLength(1);
      expect(result.data[0].children[0].slug).toBe('hair-oils');
    });
  });

  describe('create', () => {
    it('generates a slug from the name and writes an audit entry', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue(category());

      await service.create({ name: 'Triphala Powder' }, actor);

      expect(prisma.category.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Triphala Powder',
          slug: 'triphala-powder',
        }) as unknown,
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'category.create',
          entity: 'Category',
        }),
      );
    });

    it('appends a suffix when the slug is already taken', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce(category()) // 'hair-care' taken
        .mockResolvedValueOnce(null); // 'hair-care-2' free
      prisma.category.create.mockResolvedValue(
        category({ slug: 'hair-care-2' }),
      );

      await service.create({ name: 'Hair Care' }, actor);

      expect(prisma.category.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ slug: 'hair-care-2' }) as unknown,
      });
    });

    it('404s when the parent category does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ name: 'Oils', parentId: 'missing' }, actor),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.category.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('rejects making a category its own parent', async () => {
      prisma.category.findUnique.mockResolvedValue(category());

      await expect(
        service.update('c-1', { parentId: 'c-1' }, actor),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects moving a category under its own descendant', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce(category()) // existing category
        .mockResolvedValueOnce(category({ id: 'c-child' })) // candidate parent exists
        .mockResolvedValueOnce(category({ parentId: 'c-1' })); // ...and is itself under c-1

      await expect(
        service.update('c-1', { parentId: 'c-child' }, actor),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('remove', () => {
    it('refuses to delete a category that still has products', async () => {
      prisma.category.findUnique.mockResolvedValue(category());
      prisma.product.count.mockResolvedValue(4);

      await expect(service.remove('c-1', actor)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it('refuses to delete a category that still has subcategories', async () => {
      prisma.category.findUnique.mockResolvedValue(category());
      prisma.category.count.mockResolvedValue(2);

      await expect(service.remove('c-1', actor)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('deletes an empty category and audits it', async () => {
      prisma.category.findUnique.mockResolvedValue(category());
      prisma.category.delete.mockResolvedValue(category());

      const result = await service.remove('c-1', actor);

      expect(result.data).toEqual({ id: 'c-1' });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'category.delete' }),
      );
    });
  });
});
