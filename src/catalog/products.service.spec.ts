import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ProductsService, buildProductWhere } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../admin/audit.service';
import { StorageService } from '../storage/storage.service';

const actor = { id: 'admin-1' };

const variant = (overrides: Record<string, unknown> = {}) => ({
  id: 'v-1',
  productId: 'p-1',
  name: '100ml',
  price: 299,
  sku: 'AQ-TEST01',
  inventory: { quantity: 25, lowStockThreshold: 10, status: 'in_stock' },
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

const product = (overrides: Record<string, unknown> = {}) => ({
  id: 'p-1',
  name: 'Ashwagandha Powder',
  slug: 'ashwagandha-powder',
  sku: 'AQ-TEST01',
  description: null,
  categoryId: null,
  category: null,
  brand: null,
  hsnCode: null,
  basePrice: 299,
  taxPercent: 18,
  rating: 0,
  isPrescriptionRequired: false,
  status: 'active',
  isDeleted: false,
  deletedAt: null,
  images: [],
  variants: [variant()],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: {
    product: Record<string, jest.Mock>;
    productVariant: Record<string, jest.Mock>;
    category: Record<string, jest.Mock>;
    productImage: Record<string, jest.Mock>;
    review: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };
  let audit: { log: jest.Mock };
  let storage: { upload: jest.Mock; remove: jest.Mock };

  beforeEach(async () => {
    prisma = {
      product: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      productVariant: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      category: { findUnique: jest.fn() },
      productImage: {
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      review: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn() },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    storage = {
      upload: jest.fn().mockResolvedValue({ key: 'k', url: 'https://cdn/k' }),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    service = module.get(ProductsService);
  });

  describe('buildProductWhere', () => {
    it('only exposes active, non-deleted products by default', () => {
      expect(buildProductWhere({})).toMatchObject({
        status: 'active',
        isDeleted: false,
      });
    });

    it('combines category, search and price-range filters', () => {
      const where = buildProductWhere({
        category: 'hair-oils',
        search: 'amla',
        minPrice: 100,
        maxPrice: 500,
      });

      expect(where.category).toEqual({ slug: 'hair-oils' });
      expect(where.OR).toEqual([
        { name: { contains: 'amla', mode: 'insensitive' } },
        { description: { contains: 'amla', mode: 'insensitive' } },
        { brand: { contains: 'amla', mode: 'insensitive' } },
        { sku: { contains: 'amla', mode: 'insensitive' } },
      ]);
      expect(where.variants).toEqual({
        some: { price: { gte: 100, lte: 500 } },
      });
    });

    it('omits price bounds that were not supplied', () => {
      const where = buildProductWhere({ minPrice: 200 });
      expect(where.variants).toEqual({ some: { price: { gte: 200 } } });
    });
  });

  describe('listProducts', () => {
    it('returns mapped items with pagination', async () => {
      prisma.product.count.mockResolvedValue(1);
      prisma.product.findMany.mockResolvedValue([
        product({
          images: [{ id: 'i-1', url: 'https://cdn/img.jpg', position: 0 }],
          variants: [{ price: 299, inventory: { quantity: 5 } }],
        }),
      ]);

      const result = await service.listProducts({ page: 1, limit: 20 });

      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
      expect(result.data[0]).toMatchObject({
        slug: 'ashwagandha-powder',
        image: 'https://cdn/img.jpg',
        basePrice: 299,
        minPrice: 299,
        maxPrice: 299,
        stock: 5,
      });
    });
  });

  describe('getBySlug', () => {
    it('404s for unknown, draft or deleted products', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.getBySlug('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('maps variants with stock and inventory status', async () => {
      prisma.product.findFirst.mockResolvedValue(product());

      const result = await service.getBySlug('ashwagandha-powder');

      expect(result.data.variants[0]).toMatchObject({
        name: '100ml',
        price: 299,
        stock: 25,
        inventoryStatus: 'in_stock',
      });
    });
  });

  describe('create', () => {
    it('404s when the category does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          { name: 'X', basePrice: 10, categoryId: 'missing' },
          actor,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.product.create).not.toHaveBeenCalled();
    });

    it('rejects an explicit slug that is already taken', async () => {
      prisma.product.findUnique.mockResolvedValue(product());

      await expect(
        service.create(
          { name: 'X', basePrice: 10, slug: 'ashwagandha-powder' },
          actor,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates the product with a generated slug and audits it', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.productVariant.findUnique.mockResolvedValue(null);
      prisma.product.create.mockResolvedValue(product({ status: 'draft' }));

      await service.create(
        { name: 'Ashwagandha Powder', basePrice: 299, sku: 'aq-test01' },
        actor,
      );

      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'ashwagandha-powder',
            sku: 'AQ-TEST01',
            status: 'draft',
          }) as unknown,
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'product.create',
          entity: 'Product',
        }),
      );
    });
  });

  describe('remove', () => {
    it('soft-deletes (never hard-deletes) and audits', async () => {
      prisma.product.findUnique.mockResolvedValue(product());
      prisma.product.update.mockResolvedValue(product({ isDeleted: true }));

      await service.remove('p-1', actor);

      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isDeleted: true,
            status: 'archived',
          }) as unknown,
        }),
      );
      expect(prisma.product.delete).not.toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'product.delete' }),
      );
    });

    it('404s when the product is already deleted', async () => {
      prisma.product.findUnique.mockResolvedValue(product({ isDeleted: true }));
      await expect(service.remove('p-1', actor)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('addVariant', () => {
    it('404s when the product does not exist', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(
        service.addVariant('missing', { name: '250ml', price: 499 }, actor),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a duplicate SKU', async () => {
      prisma.product.findFirst.mockResolvedValue(product());
      prisma.productVariant.findUnique.mockResolvedValue(variant());

      await expect(
        service.addVariant(
          'p-1',
          { name: '250ml', price: 499, sku: 'AQ-TEST01' },
          actor,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates the variant with its initial inventory', async () => {
      prisma.product.findFirst.mockResolvedValue(product());
      prisma.productVariant.findUnique.mockResolvedValue(null);
      prisma.productVariant.create.mockResolvedValue(variant());

      await service.addVariant(
        'p-1',
        { name: '250ml', price: 499, quantity: 4, lowStockThreshold: 5 },
        actor,
      );

      expect(prisma.productVariant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productId: 'p-1',
            sku: 'AQ-TEST01-250ML',
            inventory: {
              create: {
                quantity: 4,
                lowStockThreshold: 5,
                status: 'low_stock',
              },
            },
          }) as unknown,
        }),
      );
    });
  });

  describe('addImage', () => {
    it('400s when no file was uploaded', async () => {
      await expect(
        service.addImage('p-1', undefined, actor),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(storage.upload).not.toHaveBeenCalled();
    });

    it('uploads to S3 under products/<id>/ and stores the returned URL', async () => {
      prisma.product.findFirst.mockResolvedValue(product());
      prisma.productImage.findFirst.mockResolvedValue(null);
      prisma.productImage.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 'i-1', ...data }),
      );

      await service.addImage(
        'p-1',
        {
          buffer: Buffer.from('fake'),
          mimetype: 'image/png',
        } as unknown as Express.Multer.File,
        actor,
      );

      const uploadArgs = (
        storage.upload.mock.calls as Array<
          [{ key: string; body: Buffer; contentType: string }]
        >
      )[0][0];
      expect(uploadArgs.key).toMatch(/^products\/p-1\/.+\.png$/);
      expect(uploadArgs.body).toBeInstanceOf(Buffer);
      expect(uploadArgs.contentType).toBe('image/png');
      expect(prisma.productImage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          productId: 'p-1',
          url: 'https://cdn/k',
          position: 0,
        }) as unknown,
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'product.image.upload' }),
      );
    });
  });

  describe('removeImage', () => {
    it('404s when the image belongs to another product', async () => {
      prisma.productImage.findFirst.mockResolvedValue(null);
      await expect(
        service.removeImage('p-1', 'i-1', actor),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('removes the object from storage and the row from the DB', async () => {
      prisma.productImage.findFirst.mockResolvedValue({
        id: 'i-1',
        productId: 'p-1',
        url: 'https://cdn.s3/products/p-1/a.png',
      });
      prisma.productImage.delete.mockResolvedValue({});

      await service.removeImage('p-1', 'i-1', actor);

      expect(storage.remove).toHaveBeenCalledWith(
        'https://cdn.s3/products/p-1/a.png',
      );
      expect(prisma.productImage.delete).toHaveBeenCalledWith({
        where: { id: 'i-1' },
      });
    });
  });
});
