import { ProductModel } from '../models/product.model.js';
import { BaseRepository } from './base.repository.js';

class Repo extends BaseRepository {
  async count(filter = {}) {
    return ProductModel.countDocuments(filter);
  }
}

export const ProductRepository = new Repo(ProductModel);
