# Pagination Helper Documentation

Complete pagination helper module for handling pagination, sorting, filtering, and search queries.

---

## Overview

The pagination helper provides utilities for:
- ✅ Pagination calculations (page, limit, skip)
- ✅ Sorting with multiple formats
- ✅ Advanced filtering with operators
- ✅ Full-text search
- ✅ Field selection/projection
- ✅ Complete query builder

---

## Installation

Already included in `src/helpers/pagination.helper.js`

### Import

```javascript
import {
  calculatePagination,
  buildPaginationMeta,
  formatPaginatedData,
  parseSortQuery,
  parseFilterQuery,
  parseSearchQuery,
  mergeFilters,
  parseSelectQuery,
  buildQuery,
  paginationHelper
} from '../helpers/index.js';
```

---

## Core Functions

### 1. **calculatePagination(query, defaultLimit, maxLimit)**

Calculate pagination parameters from query string.

#### Parameters
- `query` (Object): Request query object with `page`, `limit`, or `skip`
- `defaultLimit` (Number): Default items per page [default: 10]
- `maxLimit` (Number): Maximum items per page [default: 100]

#### Returns
```javascript
{
  page: 2,           // Current page number (1-indexed)
  limit: 10,         // Items per page
  skip: 10           // Items to skip in database query
}
```

#### Usage
```javascript
// From query: ?page=2&limit=20
const { page, limit, skip } = calculatePagination(req.query);

// Output: { page: 2, limit: 20, skip: 20 }
```

---

### 2. **buildPaginationMeta(total, page, limit)**

Build complete pagination metadata.

#### Parameters
- `total` (Number): Total items count from database
- `page` (Number): Current page
- `limit` (Number): Items per page

#### Returns
```javascript
{
  total: 150,           // Total items
  page: 2,              // Current page
  limit: 10,            // Items per page
  totalPages: 15,       // Total pages
  hasNextPage: true,    // Has next page
  hasPreviousPage: true,// Has previous page
  nextPage: 3,          // Next page number
  previousPage: 1,      // Previous page number
  startIndex: 11,       // First item index (1-indexed)
  endIndex: 20,         // Last item index on page
  itemsOnPage: 10       // Items on current page
}
```

#### Usage
```javascript
const meta = buildPaginationMeta(150, 2, 10);
```

---

### 3. **formatPaginatedData(data, total, page, limit)**

Format complete paginated response.

#### Parameters
- `data` (Array): Items array
- `total` (Number): Total items count
- `page` (Number): Current page
- `limit` (Number): Items per page

#### Returns
```javascript
{
  data: [...],          // Items array
  pagination: {         // Metadata object
    total: 150,
    page: 2,
    limit: 10,
    totalPages: 15,
    hasNextPage: true,
    // ... other metadata
  }
}
```

#### Usage
```javascript
const items = await Product.find().skip(10).limit(10);
const total = await Product.countDocuments();

const response = formatPaginatedData(items, total, 2, 10);

// Send to client
res.json({ success: true, ...response });
```

---

### 4. **parseSortQuery(sort, allowedFields)**

Parse sort query parameter with multiple formats.

#### Parameters
- `sort` (String): Sort string
- `allowedFields` (Array): Allowed fields (optional validation)

#### Formats Supported
```javascript
// Prefix notation
"-createdAt"          // Descending
"+name"               // Ascending
"-price,+name"        // Multiple fields

// Colon notation
"price:asc"
"createdAt:desc"
"price:desc,name:asc"

// Default
undefined             // Returns { _id: -1 }
```

#### Returns
```javascript
{
  price: -1,          // -1 for descending, 1 for ascending
  name: 1
}
```

#### Usage
```javascript
// Query: ?sort=-price,+name
const sort = parseSortQuery(req.query.sort, ['price', 'name', 'createdAt']);

// Use with MongoDB
const items = await Product.find().sort(sort);
```

---

### 5. **parseFilterQuery(query, allowedFilters)**

Parse filter query parameters with operators.

#### Parameters
- `query` (Object): Request query object
- `allowedFilters` (Array): Allowed filter fields (optional validation)

#### Supported Operators
```javascript
// Exact match
?status=active                    // { status: /^active$/i }

// Comparison
?price>=100                       // { price: { $gte: 100 } }
?price<=500                       // { price: { $lte: 500 } }
?price>100                        // { price: { $gt: 100 } }
?price<500                        // { price: { $lt: 500 } }

// Not equal
?status!=inactive                 // { status: { $ne: 'inactive' } }

// In array
?category=in:electronics,books    // { category: { $in: ['electronics', 'books'] } }

// Text search (case-insensitive)
?name=laptop                      // { name: /laptop/i }
```

#### Returns
```javascript
{
  status: { $regex: 'active', $options: 'i' },
  price: { $gte: 100, $lte: 500 },
  category: { $in: ['electronics', 'books'] }
}
```

#### Usage
```javascript
// Query: ?status=active&price>=100&price<=500
const filter = parseFilterQuery(req.query, ['status', 'price', 'category']);

// Use with MongoDB
const items = await Product.find(filter);
```

---

### 6. **parseSearchQuery(search, searchFields)**

Parse search query for multiple fields.

#### Parameters
- `search` (String): Search string
- `searchFields` (Array): Fields to search in

#### Returns
```javascript
{
  $or: [
    { name: { $regex: 'laptop', $options: 'i' } },
    { description: { $regex: 'laptop', $options: 'i' } }
  ]
}
```

#### Usage
```javascript
// Query: ?search=laptop
const searchFilter = parseSearchQuery(
  req.query.search,
  ['name', 'description', 'category']
);

// Use with MongoDB
const items = await Product.find(searchFilter);
```

---

### 7. **mergeFilters(filters, search)**

Merge filter and search objects safely.

#### Parameters
- `filters` (Object): Filter object
- `search` (Object): Search filter object

#### Returns
```javascript
// If only filters
{ status: 'active', price: { $gte: 100 } }

// If only search
{ $or: [...] }

// If both (combined with $and)
{
  $and: [
    { status: 'active' },
    { $or: [...] }
  ]
}
```

#### Usage
```javascript
const filters = parseFilterQuery(req.query);
const search = parseSearchQuery(req.query.search, ['name', 'description']);
const finalFilter = mergeFilters(filters, search);

const items = await Product.find(finalFilter);
```

---

### 8. **parseSelectQuery(fields)**

Parse field selection/projection.

#### Parameters
- `fields` (String): Fields string

#### Formats Supported
```javascript
"name,email,price"      // Include fields
"name,email,-password"  // Include some, exclude password
"-password,-tokens"     // Exclude fields
```

#### Returns
```javascript
{
  name: 1,
  email: 1,
  password: 0
}
```

#### Usage
```javascript
// Query: ?fields=name,email,-password
const projection = parseSelectQuery(req.query.fields);

// Use with MongoDB
const items = await User.find({}, projection);
```

---

### 9. **buildQuery(query, options)**

Complete query builder combining everything.

#### Parameters
- `query` (Object): Request query object
- `options` (Object): Configuration
  - `defaultLimit` (Number): [default: 10]
  - `maxLimit` (Number): [default: 100]
  - `allowedFilters` (Array): [default: []]
  - `allowedSortFields` (Array): [default: []]
  - `searchFields` (Array): [default: []]

#### Returns
```javascript
{
  pagination: {
    page: 1,
    limit: 10,
    skip: 0
  },
  sort: { _id: -1 },
  filter: { status: 'active' },
  projection: { name: 1, email: 1 },
  raw: {
    page: 1,
    limit: 10,
    skip: 0,
    sort: { _id: -1 },
    filter: { status: 'active' }
  }
}
```

#### Usage
```javascript
// Query: ?page=1&limit=10&sort=-createdAt&status=active&search=laptop&fields=name,email
const query = buildQuery(req.query, {
  defaultLimit: 10,
  maxLimit: 100,
  allowedFilters: ['status', 'category', 'price'],
  allowedSortFields: ['price', 'createdAt', 'name'],
  searchFields: ['name', 'description']
});

// Use with MongoDB
const items = await Product
  .find(query.filter, query.projection)
  .sort(query.sort)
  .skip(query.pagination.skip)
  .limit(query.pagination.limit);

const total = await Product.countDocuments(query.filter);

// Format response
const response = formatPaginatedData(items, total, query.pagination.page, query.pagination.limit);
```

---

## Real-World Examples

### Example 1: Simple Product Listing

```javascript
// Controller
export const listProducts = async (req, res, next) => {
  try {
    const { page, limit, skip } = calculatePagination(req.query);

    const products = await Product.find()
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Product.countDocuments();

    const response = formatPaginatedData(products, total, page, limit);

    res.json({
      success: true,
      ...response,
      message: 'Products retrieved'
    });
  } catch (error) {
    next(error);
  }
};

// Usage: GET /api/v1/products?page=1&limit=10
```

### Example 2: Advanced Product Filtering

```javascript
export const searchProducts = async (req, res, next) => {
  try {
    const query = buildQuery(req.query, {
      defaultLimit: 20,
      maxLimit: 100,
      allowedFilters: ['status', 'category', 'stock'],
      allowedSortFields: ['price', 'createdAt', 'name', 'rating'],
      searchFields: ['name', 'description', 'SKU']
    });

    const products = await Product
      .find(query.filter, query.projection)
      .sort(query.sort)
      .skip(query.pagination.skip)
      .limit(query.pagination.limit)
      .lean();

    const total = await Product.countDocuments(query.filter);

    const response = formatPaginatedData(
      products,
      total,
      query.pagination.page,
      query.pagination.limit
    );

    res.json({
      success: true,
      ...response,
      message: 'Search completed'
    });
  } catch (error) {
    next(error);
  }
};

// Usage: GET /api/v1/products/search?page=1&limit=20&sort=-price&category=electronics&price>=100&search=laptop&fields=name,price
```

### Example 3: User Listing with Admin Filter

```javascript
export const listUsers = async (req, res, next) => {
  try {
    const query = buildQuery(req.query, {
      defaultLimit: 15,
      maxLimit: 50,
      allowedFilters: ['role', 'status', 'createdAt'],
      allowedSortFields: ['createdAt', 'email', 'name'],
      searchFields: ['name', 'email']
    });

    const users = await User
      .find(query.filter, query.projection)
      .sort(query.sort)
      .skip(query.pagination.skip)
      .limit(query.pagination.limit)
      .select('-password')
      .lean();

    const total = await User.countDocuments(query.filter);

    const response = formatPaginatedData(
      users,
      total,
      query.pagination.page,
      query.pagination.limit
    );

    res.json({
      success: true,
      ...response,
      message: 'Users retrieved'
    });
  } catch (error) {
    next(error);
  }
};

// Usage: GET /api/v1/admin/users?page=1&limit=15&sort=-createdAt&role=user&search=john&fields=name,email,role
```

### Example 4: Order History with Date Range

```javascript
export const orderHistory = async (req, res, next) => {
  try {
    const query = buildQuery(req.query, {
      defaultLimit: 10,
      maxLimit: 50,
      allowedFilters: ['status', 'totalAmount', 'createdAt'],
      allowedSortFields: ['createdAt', 'totalAmount', 'status'],
      searchFields: ['orderNumber', 'status']
    });

    // Date range filtering
    if (req.query.fromDate || req.query.toDate) {
      const dateFilter = {};
      if (req.query.fromDate) {
        dateFilter.$gte = new Date(req.query.fromDate);
      }
      if (req.query.toDate) {
        dateFilter.$lte = new Date(req.query.toDate);
      }
      query.filter.createdAt = dateFilter;
    }

    const orders = await Order
      .find(query.filter, query.projection)
      .populate('userId', 'name email')
      .populate('items.productId', 'name price')
      .sort(query.sort)
      .skip(query.pagination.skip)
      .limit(query.pagination.limit)
      .lean();

    const total = await Order.countDocuments(query.filter);

    const response = formatPaginatedData(
      orders,
      total,
      query.pagination.page,
      query.pagination.limit
    );

    res.json({
      success: true,
      ...response,
      message: 'Order history retrieved'
    });
  } catch (error) {
    next(error);
  }
};

// Usage: GET /api/v1/orders/history?page=1&limit=10&sort=-createdAt&status=completed&fromDate=2024-01-01&toDate=2024-12-31
```

---

## Query String Examples

### Products Endpoint
```
// Basic pagination
GET /api/v1/products?page=1&limit=20

// With sorting
GET /api/v1/products?page=1&limit=20&sort=-price

// With filtering
GET /api/v1/products?status=active&price>=100&price<=500

// With search
GET /api/v1/products?search=laptop

// Combined
GET /api/v1/products?page=2&limit=20&sort=-createdAt&status=active&category=in:electronics,books&search=phone&fields=name,price
```

### Users Endpoint
```
// List all users
GET /api/v1/users?page=1&limit=15

// Filter by role
GET /api/v1/users?role=admin&page=1&limit=10

// Search users
GET /api/v1/users?search=john&page=1&limit=10

// Combined
GET /api/v1/users?page=1&limit=20&sort=name&role=user&search=email@example&fields=name,email,role
```

---

## Best Practices

### 1. **Always Validate Fields**
```javascript
// ✅ Good: Whitelist allowed fields
const query = buildQuery(req.query, {
  allowedFilters: ['status', 'category'],
  allowedSortFields: ['price', 'createdAt']
});

// ❌ Bad: Allow any field
const filter = parseFilterQuery(req.query);
```

### 2. **Set Maximum Limit**
```javascript
// ✅ Good: Prevent large queries
const { page, limit, skip } = calculatePagination(req.query, 10, 50);

// ❌ Bad: No max limit
const { page, limit, skip } = calculatePagination(req.query);
```

### 3. **Use Projections**
```javascript
// ✅ Good: Select only needed fields
const projection = parseSelectQuery(req.query.fields);
const users = await User.find({}, projection);

// ❌ Bad: Return all fields
const users = await User.find();
```

### 4. **Combine Filters & Search**
```javascript
// ✅ Good: Use both together
const filters = parseFilterQuery(req.query);
const search = parseSearchQuery(req.query.search);
const finalFilter = mergeFilters(filters, search);
```

### 5. **Count Efficiently**
```javascript
// ✅ Good: Count with same filter
const total = await Product.countDocuments(query.filter);

// ❌ Bad: Different filters
const total = await Product.countDocuments();
```

---

## Response Format

### Success Response
```javascript
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 10,
    "totalPages": 15,
    "hasNextPage": true,
    "hasPreviousPage": false,
    "nextPage": 2,
    "previousPage": null,
    "startIndex": 1,
    "endIndex": 10,
    "itemsOnPage": 10
  },
  "message": "Products retrieved"
}
```

---

## Performance Tips

1. **Add Database Indexes**
   ```javascript
   // For sorting fields
   db.products.createIndex({ createdAt: -1 });
   db.products.createIndex({ price: 1 });

   // For filtering
   db.products.createIndex({ status: 1 });
   db.products.createIndex({ category: 1 });
   ```

2. **Use Lean Queries**
   ```javascript
   const items = await Product.find().lean(); // Faster for read-only
   ```

3. **Limit Default Results**
   - Set reasonable default and max limits
   - Never return unlimited results

4. **Use Field Projection**
   - Exclude unnecessary fields (`-password`, `-tokens`)
   - Include only needed fields

---

## Troubleshooting

### Page 1 is Empty
- Check your `skip` calculation: should be `(page - 1) * limit`
- Verify database has results

### Wrong Sort Order
- Use `-field` for descending or `+field` for ascending
- Check `allowedSortFields` configuration

### Filters Not Working
- Verify field name in `allowedFilters`
- Check MongoDB operator syntax
- Test filter manually in MongoDB

### Too Many Results
- Set `maxLimit` appropriately
- Add `defaultLimit`
- Require explicit limit in query

---

**File**: [src/helpers/pagination.helper.js](src/helpers/pagination.helper.js)

**Status**: ✅ Ready to use in all endpoints

