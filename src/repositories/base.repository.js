export class BaseRepository {
  constructor(model) {
    this.model = model;
  }
  async findById(id) {
    return this.model.findById(id);
  }
  async findByIdLean(id) {
    return this.model.findById(id).lean();
  }
  async find(filter = {}, options = {}) {
    return this.model.find(filter, null, options);
  }
  async findLean(filter = {}, options = {}) {
    return this.model.find(filter, null, options).lean();
  }
  async findOne(filter = {}) {
    return this.model.findOne(filter);
  }
  async findOneLean(filter = {}) {
    return this.model.findOne(filter).lean();
  }
  async create(data) {
    return this.model.create(data);
  }
  async updateById(id, update) {
    return this.model.findByIdAndUpdate(id, update, { new: true });
  }
  async softDeleteById(id) {
    return this.model.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() }, { new: true });
  }
}
