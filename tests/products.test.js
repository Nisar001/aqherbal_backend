/**
 * Product & Category Tests
 * Tests: List products, Get product details, Filter, Sort, Pagination
 */

import request from 'supertest';
import { describe, it, expect, beforeEach } from '@jest/globals';
import app from '../src/server.js';
import Product from '../src/models/product.model.js';
import Category from '../src/models/category.model.js';
import { generateTestToken } from './setup.js';

describe('📦 Products & Categories', () => {
  
  let testCategory;
  let adminToken;
  let userToken;

  beforeEach(async () => {
    // Create test category
    testCategory = await Category.create({
      name: 'Herbal Remedies',
      description: 'Natural herbal medicines',
      slug: 'herbal-remedies',
    });

    // Create test admin token
    adminToken = generateTestToken('admin_id_123', 'admin');
    userToken = generateTestToken('user_id_123', 'user');
  });

  // ============= GET PRODUCTS TESTS =============
  describe('GET /api/v1/products', () => {
    
    beforeEach(async () => {
      // Seed test products
      await Product.insertMany([
        {
          name: 'Turmeric Powder',
          sku: 'TURMERIC-001',
          categoryId: testCategory._id,
          price: 299,
          stock: 100,
          description: 'Pure turmeric powder',
          isActive: true,
          isApproved: true,
        },
        {
          name: 'Neem Leaves',
          sku: 'NEEM-001',
          categoryId: testCategory._id,
          price: 199,
          stock: 50,
          description: 'Fresh neem leaves',
          isActive: true,
          isApproved: true,
        },
        {
          name: 'Ashwagandha Root',
          sku: 'ASHWA-001',
          categoryId: testCategory._id,
          price: 399,
          stock: 30,
          description: 'Organic ashwagandha',
          isActive: true,
          isApproved: true,
        },
      ]);
    });

    it('✓ Should get all products with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination).toHaveProperty('total');
      expect(res.body.pagination).toHaveProperty('currentPage');
      expect(res.body.pagination).toHaveProperty('totalPages');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('✓ Should filter products by category', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .query({ categoryId: testCategory._id });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      res.body.data.forEach((product) => {
        expect(product.categoryId.toString()).toBe(testCategory._id.toString());
      });
    });

    it('✓ Should search products by name', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .query({ search: 'Turmeric' });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].name).toContain('Turmeric');
    });

    it('✓ Should sort products by price ascending', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .query({ sortBy: 'price', order: 'asc' });

      expect(res.status).toBe(200);
      const prices = res.body.data.map((p) => p.price);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    });

    it('✓ Should sort products by price descending', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .query({ sortBy: 'price', order: 'desc' });

      expect(res.status).toBe(200);
      const prices = res.body.data.map((p) => p.price);
      expect(prices).toEqual([...prices].sort((a, b) => b - a));
    });

    it('✓ Should filter products by price range', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .query({ minPrice: 200, maxPrice: 400 });

      expect(res.status).toBe(200);
      res.body.data.forEach((product) => {
        expect(product.price).toBeGreaterThanOrEqual(200);
        expect(product.price).toBeLessThanOrEqual(400);
      });
    });

    it('✓ Should handle pagination correctly', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .query({ page: 1, limit: 2 });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });

    it('✗ Should return 400 for invalid pagination', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .query({ page: -1, limit: 'invalid' });

      expect(res.status).toBe(400);
    });

    it('✗ Should only show approved products', async () => {
      // Create unapproved product
      await Product.create({
        name: 'Unapproved Product',
        sku: 'UNAPP-001',
        categoryId: testCategory._id,
        price: 99,
        stock: 10,
        isApproved: false,
      });

      const res = await request(app)
        .get('/api/v1/products');

      expect(res.status).toBe(200);
      res.body.data.forEach((product) => {
        expect(product.isApproved).toBe(true);
      });
    });
  });

  // ============= GET PRODUCT DETAILS TESTS =============
  describe('GET /api/v1/products/:id', () => {
    
    let product;

    beforeEach(async () => {
      product = await Product.create({
        name: 'Test Product',
        sku: 'TEST-001',
        categoryId: testCategory._id,
        price: 299,
        stock: 100,
        description: 'Test description',
        isActive: true,
        isApproved: true,
      });
    });

    it('✓ Should get product details', async () => {
      const res = await request(app)
        .get(`/api/v1/products/${product._id}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data._id.toString()).toBe(product._id.toString());
      expect(res.body.data.name).toBe('Test Product');
      expect(res.body.data).toHaveProperty('price');
      expect(res.body.data).toHaveProperty('stock');
    });

    it('✗ Should return 404 for non-existent product', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const res = await request(app)
        .get(`/api/v1/products/${fakeId}`);

      expect(res.status).toBe(404);
    });

    it('✗ Should return 400 for invalid product ID', async () => {
      const res = await request(app)
        .get('/api/v1/products/invalid-id');

      expect(res.status).toBe(400);
    });

    it('✓ Should include related products', async () => {
      const res = await request(app)
        .get(`/api/v1/products/${product._id}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('reviews');
    });
  });

  // ============= CREATE PRODUCT TESTS (ADMIN ONLY) =============
  describe('POST /api/v1/products', () => {
    const buildValidProduct = () => ({
      name: 'New Herbal Product',
      sku: 'NEW-001',
      categoryId: testCategory._id.toString(),
      price: 299,
      stock: 50,
      description: 'High-quality herbal product',
      images: [],
    });

    it('✓ Admin can create product', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildValidProduct());

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.name).toBe('New Herbal Product');
    });

    it('✗ User cannot create product', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${userToken}`)
        .send(buildValidProduct());

      expect(res.status).toBe(403);
    });

    it('✗ Unauthenticated user cannot create product', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .send(buildValidProduct());

      expect(res.status).toBe(401);
    });

    it('✗ Should fail with missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Incomplete Product',
          // Missing: sku, categoryId, price, stock
        });

      expect(res.status).toBe(400);
    });

    it('✗ Should fail with invalid price', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...buildValidProduct(),
          price: -100,
        });

      expect(res.status).toBe(400);
    });

    it('✗ Should fail with invalid stock', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...buildValidProduct(),
          stock: -10,
        });

      expect(res.status).toBe(400);
    });

    it('✗ Should fail with duplicate SKU', async () => {
      await Product.create({
        ...buildValidProduct(),
        categoryId: testCategory._id,
      });

      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildValidProduct());

      expect(res.status).toBe(400);
    });
  });

  // ============= UPDATE PRODUCT TESTS =============
  describe('PUT /api/v1/products/:id', () => {
    
    let product;

    beforeEach(async () => {
      product = await Product.create({
        name: 'Original Product',
        sku: 'ORIG-001',
        categoryId: testCategory._id,
        price: 299,
        stock: 100,
      });
    });

    it('✓ Admin can update product', async () => {
      const res = await request(app)
        .put(`/api/v1/products/${product._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Product',
          price: 399,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Product');
      expect(res.body.data.price).toBe(399);
    });

    it('✗ User cannot update product', async () => {
      const res = await request(app)
        .put(`/api/v1/products/${product._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Updated Product' });

      expect(res.status).toBe(403);
    });
  });

  // ============= CATEGORIES TESTS =============
  describe('GET /api/v1/categories', () => {
    
    it('✓ Should get all categories', async () => {
      const res = await request(app)
        .get('/api/v1/categories');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('✓ Should get category with products', async () => {
      const res = await request(app)
        .get(`/api/v1/categories/${testCategory._id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe(testCategory.name);
    });
  });
});
