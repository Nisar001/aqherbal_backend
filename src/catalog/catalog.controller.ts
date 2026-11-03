import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CategoriesService } from './categories.service';
import { ProductsService } from './products.service';
import { ListProductsQueryDto, ListReviewsQueryDto } from './dto/product.dto';

/**
 * Storefront catalog — browsing is public (no JWT required).
 * Every response goes through the global `{ success, message, data }` envelope.
 */
@ApiTags('Catalog')
@Public()
@Controller()
export class CatalogController {
  constructor(
    private readonly categories: CategoriesService,
    private readonly products: ProductsService,
  ) {}

  @Get('categories')
  @ApiOperation({ summary: 'Category tree (public)' })
  listCategories() {
    return this.categories.listTree();
  }

  @Get('categories/:slug')
  @ApiOperation({ summary: 'One category with its subcategories (public)' })
  getCategory(@Param('slug') slug: string) {
    return this.categories.getBySlug(slug);
  }

  @Get('products')
  @ApiOperation({
    summary: 'List products — filters, sort, pagination (public)',
  })
  listProducts(@Query() query: ListProductsQueryDto) {
    return this.products.listProducts(query);
  }

  @Get('products/:slug')
  @ApiOperation({ summary: 'Product detail by slug (public)' })
  getProduct(@Param('slug') slug: string) {
    return this.products.getBySlug(slug);
  }

  @Get('products/:id/reviews')
  @ApiOperation({ summary: 'Approved reviews for a product (public)' })
  listReviews(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListReviewsQueryDto,
  ) {
    return this.products.listReviews(id, query);
  }
}
