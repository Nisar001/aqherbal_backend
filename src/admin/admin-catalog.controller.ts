import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, ParseUUIDPipe, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard, type AuthUser } from '../common/guards/jwt-auth.guard';
import { AuditService } from './audit.service';
import { CategoriesService } from '../catalog/categories.service';
import { InventoryService, type InventoryListQuery } from '../catalog/inventory.service';
import { ProductsService } from '../catalog/products.service';
import { CreateCategoryDto, UpdateCategoryDto } from '../catalog/dto/category.dto';
import { UpdateInventoryDto } from '../catalog/dto/inventory.dto';
import {
  AdminListProductsQueryDto,
  CreateProductDto,
  UpdateProductDto,
} from '../catalog/dto/product.dto';
import { ALLOWED_IMAGE_MIME_TYPES, imageExtension } from '../catalog/catalog.helpers';

/** Admin catalog — categories, products, variants, images, inventory. */
@ApiTags('Catalog')
@ApiBearerAuth()
@Controller('admin/catalog')
@UseGuards(JwtAuthGuard)
@Roles('admin')
export class AdminCatalogController {
  constructor(
    private readonly categories: CategoriesService,
    private readonly inventory: InventoryService,
    private readonly products: ProductsService,
    private readonly audit: AuditService,
  ) {}

  @Get('categories')
  @ResponseMessage('Categories fetched')
  @ApiOperation({ summary: 'Admin: list all categories with product counts' })
  async listCategories() {
    this.audit.log({ adminId: 'admin', action: 'ADMIN_CATALOG_CATEGORY_LIST', entity: 'categories' });
    return this.categories.listAll();
  }

  @Post('categories')
  @ResponseMessage('Category created')
  @ApiOperation({ summary: 'Admin: create a category' })
  async createCategory(@Body() dto: CreateCategoryDto, @CurrentUser() actor: AuthUser) {
    this.audit.log({
      adminId: actor.sub,
      action: 'ADMIN_CATALOG_CATEGORY_CREATE',
      entity: 'categories',
      metadata: { name: dto.name },
    });
    return this.categories.create(dto, { id: actor.sub });
  }

  @Put('categories/:id')
  @ResponseMessage('Category updated')
  @ApiOperation({ summary: 'Admin: update a category' })
  async updateCategory(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto, @CurrentUser() actor: AuthUser) {
    this.audit.log({
      adminId: actor.sub,
      action: 'ADMIN_CATALOG_CATEGORY_UPDATE',
      entity: 'categories',
      entityId: id,
      metadata: { ...dto },
    });
    return this.categories.update(id, dto, { id: actor.sub });
  }

  @Delete('categories/:id')
  @ResponseMessage('Category removed')
  @ApiOperation({ summary: 'Admin: remove a category' })
  async removeCategory(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser) {
    this.audit.log({
      adminId: actor.sub,
      action: 'ADMIN_CATALOG_CATEGORY_DELETE',
      entity: 'categories',
      entityId: id,
    });
    return this.categories.remove(id, { id: actor.sub });
  }

  @Get()
  @ResponseMessage('Products fetched')
  @ApiOperation({ summary: 'Admin: list products (paginated)' })
  async listProducts(@Query() query: AdminListProductsQueryDto) {
    this.audit.log({
      adminId: 'admin',
      action: 'ADMIN_CATALOG_PRODUCT_LIST',
      entity: 'products',
      metadata: { ...query },
    });
    return this.products.adminList(query);
  }

  @Get(':slug')
  @ResponseMessage('Product fetched')
  @ApiOperation({ summary: 'Admin: get a product' })
  async getProduct(@Param('slug') slug: string) {
    this.audit.log({ adminId: 'admin', action: 'ADMIN_CATALOG_PRODUCT_GET', entity: 'products', entityId: slug });
    return this.products.adminGet(slug);
  }

  @Post()
  @ResponseMessage('Product created')
  @ApiOperation({ summary: 'Admin: create a product' })
  async createProduct(@Body() dto: CreateProductDto, @CurrentUser() actor: AuthUser) {
    this.audit.log({
      adminId: actor.sub,
      action: 'ADMIN_CATALOG_PRODUCT_CREATE',
      entity: 'products',
      metadata: { ...dto },
    });
    return this.products.create(dto, { id: actor.sub });
  }

  @Put(':slug')
  @ResponseMessage('Product updated')
  @ApiOperation({ summary: 'Admin: update a product' })
  async updateProduct(@Param('slug') slug: string, @Body() dto: UpdateProductDto, @CurrentUser() actor: AuthUser) {
    this.audit.log({
      adminId: actor.sub,
      action: 'ADMIN_CATALOG_PRODUCT_UPDATE',
      entity: 'products',
      entityId: slug,
      metadata: { ...dto },
    });
    return this.products.update(slug, dto, { id: actor.sub });
  }

  @Delete(':slug')
  @ResponseMessage('Product removed')
  @ApiOperation({ summary: 'Admin: remove a product' })
  async removeProduct(@Param('slug') slug: string, @CurrentUser() actor: AuthUser) {
    this.audit.log({
      adminId: actor.sub,
      action: 'ADMIN_CATALOG_PRODUCT_DELETE',
      entity: 'products',
      entityId: slug,
    });
    return this.products.remove(slug, { id: actor.sub });
  }

  @Post(':slug/image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
          return cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  @ResponseMessage('Image uploaded')
  @ApiOperation({ summary: 'Admin: upload a product image' })
  async uploadImage(@Param('slug') slug: string, @UploadedFile() file: Express.Multer.File, @CurrentUser() actor: AuthUser) {
    this.audit.log({
      adminId: actor.sub,
      action: 'ADMIN_CATALOG_IMAGE_UPLOAD',
      entity: 'products',
      entityId: slug,
      metadata: { mime: file.mimetype },
    });
    const url = await this.products.addImage(slug, file, { id: actor.sub });
    return { url, extension: imageExtension(file.mimetype) };
  }

  @Get('inventory')
  @ResponseMessage('Inventory fetched')
  @ApiOperation({ summary: 'Admin: list inventory with stock levels' })
  async listInventory(@Query() query: InventoryListQuery) {
    this.audit.log({
      adminId: 'admin',
      action: 'ADMIN_CATALOG_INVENTORY_LIST',
      entity: 'inventory',
      metadata: { ...query },
    });
    return this.inventory.list(query);
  }

  @Patch('inventory/:variantId')
  @ResponseMessage('Inventory adjusted')
  @ApiOperation({ summary: 'Admin: adjust variant stock in one call' })
  async adjustInventory(@Param('variantId', ParseUUIDPipe) variantId: string, @Body() dto: UpdateInventoryDto, @CurrentUser() actor: AuthUser) {
    this.audit.log({
      adminId: actor.sub,
      action: 'ADMIN_CATALOG_INVENTORY_ADJUST',
      entity: 'inventory',
      entityId: variantId,
      metadata: { ...dto },
    });
    return this.inventory.updateStock(variantId, dto, { id: actor.sub });
  }

  @Get('inventory/low-stock')
  @ResponseMessage('Low-stock items fetched')
  @ApiOperation({ summary: 'Admin: list low-stock variants' })
  lowStock() {
    this.audit.log({ adminId: 'admin', action: 'ADMIN_CATALOG_INVENTORY_LOW_STOCK', entity: 'inventory' });
    return this.inventory.lowStock();
  }

  @Get('inventory/:variantId')
  @ResponseMessage('Inventory variant fetched')
  @ApiOperation({ summary: 'Admin: get a stock variant' })
  async getInventoryVariant(@Param('variantId', ParseUUIDPipe) variantId: string) {
    this.audit.log({ adminId: 'admin', action: 'ADMIN_CATALOG_INVENTORY_GET', entity: 'inventory', entityId: variantId });
    return this.inventory.get(variantId);
  }
}
