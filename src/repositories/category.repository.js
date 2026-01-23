import { CategoryModel } from '../models/category.model.js';
import { BaseRepository } from './base.repository.js';

export const CategoryRepository = new BaseRepository(CategoryModel);
