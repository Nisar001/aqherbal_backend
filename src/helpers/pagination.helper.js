/**
 * Pagination Helper
 * Provides utilities for pagination calculations and responses
 */

/**
 * Calculate pagination parameters from query
 * @param {Object} query - Request query object { page, limit, skip }
 * @param {Number} defaultLimit - Default items per page (default: 10)
 * @param {Number} maxLimit - Maximum items per page (default: 100)
 * @returns {Object} { page, limit, skip }
 */
export const calculatePagination = (query, defaultLimit = 10, maxLimit = 100) => {
  let { page = 1, limit = defaultLimit, skip } = query;

  // Convert to numbers
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.min(Math.max(1, parseInt(limit, 10) || defaultLimit), maxLimit);

  // If skip is provided, calculate page from skip
  if (skip !== undefined) {
    skip = Math.max(0, parseInt(skip, 10) || 0);
    page = Math.floor(skip / limit) + 1;
  } else {
    skip = (page - 1) * limit;
  }

  return { page, limit, skip };
};

/**
 * Build pagination metadata
 * @param {Number} total - Total items count
 * @param {Number} page - Current page
 * @param {Number} limit - Items per page
 * @returns {Object} Pagination metadata
 */
export const buildPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    nextPage: hasNextPage ? page + 1 : null,
    previousPage: hasPreviousPage ? page - 1 : null,
    startIndex: (page - 1) * limit + 1,
    endIndex: Math.min(page * limit, total),
    itemsOnPage: Math.min(limit, total - (page - 1) * limit)
  };
};

/**
 * Format paginated response with full metadata
 * @param {Array} data - Items array
 * @param {Number} total - Total items count
 * @param {Number} page - Current page
 * @param {Number} limit - Items per page
 * @returns {Object} Formatted paginated response
 */
export const formatPaginatedData = (data, total, page, limit) => {
  return {
    data,
    pagination: buildPaginationMeta(total, page, limit)
  };
};

/**
 * Parse sort query parameter
 * @param {String} sort - Sort string (e.g., "-createdAt,name" or "price:asc")
 * @param {Array} allowedFields - List of allowed sort fields
 * @returns {Object} MongoDB sort object
 */
export const parseSortQuery = (sort, allowedFields = []) => {
  if (!sort) return { _id: -1 }; // Default sort by creation date descending

  const sortObj = {};
  const sortFields = sort.split(',');

  sortFields.forEach(field => {
    let fieldName = field.trim();
    let direction = 1; // ascending

    // Handle prefix notation (-field or +field)
    if (fieldName.startsWith('-')) {
      direction = -1;
      fieldName = fieldName.substring(1);
    } else if (fieldName.startsWith('+')) {
      direction = 1;
      fieldName = fieldName.substring(1);
    }

    // Handle colon notation (field:asc or field:desc)
    if (fieldName.includes(':')) {
      const [name, dir] = fieldName.split(':');
      fieldName = name;
      direction = dir.toLowerCase() === 'desc' ? -1 : 1;
    }

    // Validate field if allowedFields is provided
    if (allowedFields.length > 0 && !allowedFields.includes(fieldName)) {
      return; // Skip invalid fields
    }

    sortObj[fieldName] = direction;
  });

  return Object.keys(sortObj).length > 0 ? sortObj : { _id: -1 };
};

/**
 * Parse filter query parameters
 * @param {Object} query - Request query object
 * @param {Array} allowedFilters - List of allowed filter fields
 * @returns {Object} MongoDB filter object
 */
export const parseFilterQuery = (query, allowedFilters = []) => {
  const filter = {};
  const excludeParams = ['page', 'limit', 'skip', 'sort', 'fields', 'search'];

  Object.keys(query).forEach(key => {
    if (excludeParams.includes(key)) return;
    if (allowedFilters.length > 0 && !allowedFilters.includes(key)) return;

    const value = query[key];

    // Handle different operators
    if (typeof value === 'string') {
      // Range queries: field>=10&field<=20
      if (value.startsWith('>=')) {
        filter[key] = { ...filter[key], $gte: Number(value.slice(2)) };
      } else if (value.startsWith('<=')) {
        filter[key] = { ...filter[key], $lte: Number(value.slice(2)) };
      } else if (value.startsWith('>')) {
        filter[key] = { ...filter[key], $gt: Number(value.slice(1)) };
      } else if (value.startsWith('<')) {
        filter[key] = { ...filter[key], $lt: Number(value.slice(1)) };
      } else if (value.startsWith('!=')) {
        filter[key] = { ...filter[key], $ne: value.slice(2) };
      } else if (value.startsWith('in:')) {
        // in:val1,val2,val3
        const values = value.slice(3).split(',');
        filter[key] = { $in: values };
      } else {
        // Exact match or partial match for strings
        filter[key] = { $regex: value, $options: 'i' };
      }
    } else {
      filter[key] = value;
    }
  });

  return filter;
};

/**
 * Parse search query
 * @param {String} search - Search string
 * @param {Array} searchFields - Fields to search in
 * @returns {Object} MongoDB filter object
 */
export const parseSearchQuery = (search, searchFields = []) => {
  if (!search || !searchFields.length) return {};

  return {
    $or: searchFields.map(field => ({
      [field]: { $regex: search, $options: 'i' }
    }))
  };
};

/**
 * Merge filters and search
 * @param {Object} filters - Filter object
 * @param {Object} search - Search filter object
 * @returns {Object} Merged filter object
 */
export const mergeFilters = (filters = {}, search = {}) => {
  if (Object.keys(search).length === 0) {
    return filters;
  }

  if (Object.keys(filters).length === 0) {
    return search;
  }

  return {
    $and: [filters, search]
  };
};

/**
 * Parse select/projection query
 * @param {String} fields - Fields string (e.g., "name,email,-password")
 * @returns {Object} MongoDB projection object
 */
export const parseSelectQuery = (fields) => {
  if (!fields) return {};

  const projection = {};
  const fieldList = fields.split(',');

  fieldList.forEach(field => {
    field = field.trim();
    if (field.startsWith('-')) {
      // Exclude field
      projection[field.substring(1)] = 0;
    } else {
      // Include field
      projection[field] = 1;
    }
  });

  return projection;
};

/**
 * Complete query builder helper
 * Combines pagination, sorting, filtering, and search
 * @param {Object} query - Request query object
 * @param {Object} options - Configuration options
 * @returns {Object} Complete query parameters
 */
export const buildQuery = (
  query,
  {
    defaultLimit = 10,
    maxLimit = 100,
    allowedFilters = [],
    allowedSortFields = [],
    searchFields = []
  } = {}
) => {
  const { page, limit, skip } = calculatePagination(query, defaultLimit, maxLimit);
  const sort = parseSortQuery(query.sort, allowedSortFields);
  const filter = parseFilterQuery(query, allowedFilters);
  const search = query.search ? parseSearchQuery(query.search, searchFields) : {};
  const finalFilter = mergeFilters(filter, search);
  const projection = parseSelectQuery(query.fields);

  return {
    pagination: { page, limit, skip },
    sort,
    filter: finalFilter,
    projection,
    raw: {
      page,
      limit,
      skip,
      sort,
      filter: finalFilter
    }
  };
};

/**
 * Pagination helper object with all utilities
 */
export const paginationHelper = {
  calculatePagination,
  buildPaginationMeta,
  formatPaginatedData,
  parseSortQuery,
  parseFilterQuery,
  parseSearchQuery,
  mergeFilters,
  parseSelectQuery,
  buildQuery
};
