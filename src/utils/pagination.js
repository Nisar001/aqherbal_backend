export const parsePagination = (query) => {
  const page = Math.max(parseInt(query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || '10', 10), 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const parseSort = (query) => {
  const sortBy = query.sortBy || 'createdAt';
  const order = (query.order || 'desc').toLowerCase() === 'asc' ? 1 : -1;
  return { [sortBy]: order };
};
