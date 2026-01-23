import { CategoryRepository } from '../repositories/category.repository.js';
import { parsePagination, parseSort } from '../utils/pagination.js';

export const CategoryService = {
  async list(query) {
    const filter = { isDeleted: false };
    const { page, limit, skip } = parsePagination(query);
    const sort = parseSort(query);
    const [items, total] = await Promise.all([
      CategoryRepository.findLean(filter, { skip, limit, sort }),
      CategoryRepository.model.countDocuments(filter)
    ]);
    return { items, page, limit, total };
  },
  async getById(id) {
    return CategoryRepository.findByIdLean(id);
  }
};
