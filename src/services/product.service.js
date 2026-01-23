import { ProductRepository } from '../repositories/product.repository.js';
import { buildProductFilter } from '../utils/filter.js';
import { parsePagination, parseSort } from '../utils/pagination.js';

export const ProductService = {
  async list(query) {
    const filter = buildProductFilter(query);
    const { page, limit, skip } = parsePagination(query);
    const sort = parseSort(query);
    const [items, total] = await Promise.all([
      ProductRepository.findLean(filter, { skip, limit, sort }),
      ProductRepository.count(filter)
    ]);
    return { items, page, limit, total };
  },
  async getById(id) {
    return ProductRepository.findByIdLean(id);
  }
};
