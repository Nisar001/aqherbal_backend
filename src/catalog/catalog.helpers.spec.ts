import {
  computeInventoryStatus,
  imageExtension,
  slugify,
  toNumber,
} from './catalog.helpers';

describe('catalog.helpers', () => {
  describe('slugify', () => {
    it('lowercases and kebab-cases a product name', () => {
      expect(slugify('Ashwagandha (30ml)')).toBe('ashwagandha-30ml');
      expect(slugify('  Triphala & Chyawanprash  ')).toBe(
        'triphala-chyawanprash',
      );
    });

    it('strips quotes and collapses separators', () => {
      expect(slugify("Mother's  Tincture//Formula")).toBe(
        'mothers-tincture-formula',
      );
    });

    it('never returns a slug starting or ending with a hyphen', () => {
      expect(slugify('---Amla---')).toBe('amla');
    });
  });

  describe('toNumber', () => {
    it('converts numeric strings and numbers', () => {
      expect(toNumber('299.50')).toBe(299.5);
      expect(toNumber(12)).toBe(12);
    });

    it('falls back to 0 for null/undefined/garbage', () => {
      expect(toNumber(null)).toBe(0);
      expect(toNumber(undefined)).toBe(0);
      expect(toNumber('abc')).toBe(0);
    });
  });

  describe('computeInventoryStatus', () => {
    it('maps quantity to status against the threshold', () => {
      expect(computeInventoryStatus(0, 10)).toBe('out_of_stock');
      expect(computeInventoryStatus(5, 10)).toBe('low_stock');
      expect(computeInventoryStatus(10, 10)).toBe('low_stock');
      expect(computeInventoryStatus(11, 10)).toBe('in_stock');
    });
  });

  describe('imageExtension', () => {
    it('accepts the allowed image types only', () => {
      expect(imageExtension('image/jpeg')).toBe('jpg');
      expect(imageExtension('image/webp')).toBe('webp');
      expect(imageExtension('image/svg+xml')).toBeNull();
      expect(imageExtension('application/pdf')).toBeNull();
    });
  });
});
