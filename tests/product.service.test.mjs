import { jest } from '@jest/globals';
import { ProductService } from '../src/services/product.service.js';
import * as ProductRepositoryModule from '../src/repositories/product.repository.js';

describe('ProductService.list', () => {
  test('returns paginated items using repository', async () => {
    const spyFindLean = jest.spyOn(ProductRepositoryModule.ProductRepository, 'findLean').mockResolvedValue([
      { _id: '1', name: 'Herbal A' },
      { _id: '2', name: 'Hercobal B' }
    ]);
    const spyCount = jest.spyOn(ProductRepositoryModule.ProductRepository, 'count').mockResolvedValue(42);

    const { items, page, limit, total } = await ProductService.list({ page: '1', limit: '2', search: 'Herbal' });
    expect(items).toHaveLength(2);
    expect(page).toBe(1);
    expect(limit).toBe(2);
    expect(total).toBe(42);

    spyFindLean.mockRestore();
    spyCount.mockRestore();
  });
});
