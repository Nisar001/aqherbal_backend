import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AdminCatalogController } from '../admin/admin-catalog.controller';
import { CatalogController } from './catalog.controller';
import { CategoriesService } from './categories.service';
import { InventoryService } from './inventory.service';
import { ProductsService } from './products.service';

/**
 * Module 2 — Product Catalog & Inventory.
 * Public storefront routes live in CatalogController (@Public, no JWT);
 * admin CRUD lives in AdminCatalogController (admin role + audit log).
 */
@Module({
  imports: [AdminModule], // for AuditService
  controllers: [CatalogController, AdminCatalogController],
  providers: [CategoriesService, ProductsService, InventoryService],
  exports: [CategoriesService, ProductsService, InventoryService],
})
export class CatalogModule {}
