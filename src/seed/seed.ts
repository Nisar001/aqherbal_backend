import 'dotenv/config';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Idempotent catalogue seed — data transcribed from the storefront
 * (artifacts/aq-herbal-storefront/src/App.tsx). Do not invent products,
 * prices or copy: edit App.tsx and mirror changes here.
 *
 * Run: pnpm run seed   (safe to re-run; upserts by slug/sku/code)
 *
 * Money is stored in integer paise (₹980 → 98000).
 */

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) {
  throw new Error('DATABASE_URL must be set to seed the database');
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const image = (id: string) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200`;

const categories = [
  { name: 'Daily tonics', slug: 'daily-tonics', imageUrl: image('6693657') },
  { name: 'Skin rituals', slug: 'skin-rituals', imageUrl: image('4202325') },
  { name: 'Digestive care', slug: 'digestive-care', imageUrl: image('5946085') },
  { name: 'Quiet evenings', slug: 'quiet-evenings', imageUrl: image('4041392') },
];

type SeedVariant = {
  name: string;
  pricePaise: number;
  sku: string;
  stock: number;
};

type SeedProduct = {
  name: string;
  slug: string;
  sku: string;
  brand: string;
  description: string;
  categorySlug: string;
  basePricePaise: number;
  taxPercent: number;
  images: string[];
  benefits: string[];
  ingredients: string[];
  note: string;
  accent: string;
  variants: SeedVariant[];
};

const products: SeedProduct[] = [
  {
    name: 'Ashwagandha + Saffron',
    slug: 'ashwagandha-saffron',
    sku: 'AQ-AS',
    brand: 'AQ Originals',
    description:
      'A grounding nightly blend for steadier energy, softer edges and a more considered tomorrow.',
    categorySlug: 'daily-tonics',
    basePricePaise: 98000,
    taxPercent: 12,
    images: [image('5946085'), image('6157054'), image('4041392')],
    benefits: [
      'Supports a calm stress response',
      'Helps maintain everyday vitality',
      'Made for a slow evening ritual',
    ],
    ingredients: ['KSM-66 Ashwagandha', 'Kashmiri saffron', 'Amla extract'],
    note: 'Best seller',
    accent: '#e9c9a6',
    variants: [
      { name: '60 capsules', pricePaise: 98000, sku: 'AQ-AS-60', stock: 50 },
      { name: '120 capsules', pricePaise: 168000, sku: 'AQ-AS-120', stock: 40 },
    ],
  },
  {
    name: 'Rosehip & Licorice Powder',
    slug: 'rosehip-licorice-powder',
    sku: 'AQ-RL',
    brand: 'AQ Botanica',
    description:
      'A bright, fine-milled powder for skin that looks rested and feels replenished.',
    categorySlug: 'skin-rituals',
    basePricePaise: 72000,
    taxPercent: 12,
    images: [image('4202325'), image('6621324'), image('5946085')],
    benefits: [
      'Visibly brightens and evens tone',
      'Rich in natural antioxidants',
      'Pairs with water, honey or yogurt',
    ],
    ingredients: ['Rosehip', 'Mulethi root', 'Manjistha', 'Turmeric'],
    note: 'Small batch',
    accent: '#e8b2a0',
    variants: [
      { name: '50 g glass jar', pricePaise: 72000, sku: 'AQ-RL-50', stock: 60 },
      { name: '100 g glass jar', pricePaise: 120000, sku: 'AQ-RL-100', stock: 35 },
    ],
  },
  {
    name: 'Triphala Night Tea',
    slug: 'triphala-night-tea',
    sku: 'AQ-TN',
    brand: 'AQ Infusions',
    description:
      'Three fruits, one gentle cup. A traditional digestive tea for the end of your day.',
    categorySlug: 'digestive-care',
    basePricePaise: 64000,
    taxPercent: 5,
    images: [image('4041392'), image('4110336'), image('5946085')],
    benefits: [
      'A gentle post-dinner ritual',
      'Supports comfortable digestion',
      'Caffeine-free and naturally fragrant',
    ],
    ingredients: ['Amalaki', 'Bibhitaki', 'Haritaki', 'Fennel seed'],
    note: 'Evening favourite',
    accent: '#d9c693',
    variants: [
      { name: '20 sachets', pricePaise: 64000, sku: 'AQ-TN-20', stock: 70 },
      { name: '40 sachets', pricePaise: 105000, sku: 'AQ-TN-40', stock: 45 },
    ],
  },
  {
    name: 'Tulsi & Blue Pea Drops',
    slug: 'tulsi-blue-pea-drops',
    sku: 'AQ-TB',
    brand: 'AQ Infusions',
    description:
      'Concentrated botanical drops to bring a little blue-hour pause to busy days.',
    categorySlug: 'quiet-evenings',
    basePricePaise: 89000,
    taxPercent: 12,
    images: [image('6157054'), image('4041392'), image('6693657')],
    benefits: [
      'Aromatic daily reset',
      'Easy to take on the go',
      'No artificial colour or flavour',
    ],
    ingredients: ['Holy basil', 'Blue pea flower', 'Lemon peel', 'Jatamansi'],
    note: 'New ritual',
    accent: '#b9c5d8',
    variants: [
      { name: '30 ml dropper', pricePaise: 89000, sku: 'AQ-TB-30', stock: 55 },
    ],
  },
  {
    name: 'Kumkumadi Face Oil',
    slug: 'kumkumadi-face-oil',
    sku: 'AQ-KF',
    brand: 'AQ Botanica',
    description:
      'A luminous Ayurvedic face oil with saffron and sesame for an unhurried nightly massage.',
    categorySlug: 'skin-rituals',
    basePricePaise: 145000,
    taxPercent: 18,
    images: [image('4202325'), image('6621324'), image('6621469')],
    benefits: [
      'Softens and nourishes skin',
      'Encourages a slower night ritual',
      'Blended in small batches',
    ],
    ingredients: ['Saffron', 'Manjistha', 'Sesame oil', 'Vetiver'],
    note: 'Ritual classic',
    accent: '#ddb36c',
    variants: [
      { name: '30 ml bottle', pricePaise: 145000, sku: 'AQ-KF-30', stock: 30 },
    ],
  },
  {
    name: 'Brahmi Focus Tonic',
    slug: 'brahmi-focus-tonic',
    sku: 'AQ-BF',
    brand: 'AQ Originals',
    description:
      'A clear, botanical tonic for long afternoons, deep work and a little less mental noise.',
    categorySlug: 'daily-tonics',
    basePricePaise: 110000,
    taxPercent: 12,
    images: [image('6693657'), image('6157054'), image('5946085')],
    benefits: [
      'Supports focus and mental clarity',
      'Bright herbal finish',
      'Simple dropper format',
    ],
    ingredients: ['Brahmi', 'Shankhpushpi', 'Gotu kola', 'Lemon balm'],
    note: 'Workday companion',
    accent: '#b9d0c2',
    variants: [
      { name: '100 ml bottle', pricePaise: 110000, sku: 'AQ-BF-100', stock: 48 },
    ],
  },
];

async function seed() {
  console.log('Seeding AQ Herbal catalogue…');

  // 1) Categories
  const categoryIds = new Map<string, string>();
  for (const cat of categories) {
    const row = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, imageUrl: cat.imageUrl },
      create: cat,
    });
    categoryIds.set(cat.slug, row.id);
  }
  console.log(`  categories: ${categoryIds.size}`);

  // 2) Products + variants + images + inventory
  let productCount = 0;
  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        sku: p.sku,
        brand: p.brand,
        description: p.description,
        categoryId: categoryIds.get(p.categorySlug) ?? null,
        basePrice: p.basePricePaise,
        taxPercent: p.taxPercent,
        status: 'active',
        benefits: p.benefits,
        ingredients: p.ingredients,
        note: p.note,
        accent: p.accent,
      },
      create: {
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        brand: p.brand,
        description: p.description,
        categoryId: categoryIds.get(p.categorySlug) ?? null,
        basePrice: p.basePricePaise,
        taxPercent: p.taxPercent,
        status: 'active',
        benefits: p.benefits,
        ingredients: p.ingredients,
        note: p.note,
        accent: p.accent,
      },
    });
    productCount += 1;

    // Images (keep positions stable; replace set on re-seed)
    const existingImages = await prisma.productImage.findMany({
      where: { productId: product.id },
    });
    if (existingImages.length !== p.images.length) {
      await prisma.productImage.deleteMany({ where: { productId: product.id } });
      await prisma.productImage.createMany({
        data: p.images.map((url, position) => ({
          productId: product.id,
          url,
          position,
        })),
      });
    }

    for (const v of p.variants) {
      const variant = await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: { name: v.name, price: v.pricePaise, productId: product.id },
        create: {
          productId: product.id,
          name: v.name,
          price: v.pricePaise,
          sku: v.sku,
        },
      });
      // Seed stock only when the inventory row does not exist yet — never
      // clobber live stock counts on re-runs.
      await prisma.inventory.upsert({
        where: { variantId: variant.id },
        update: {},
        create: {
          variantId: variant.id,
          quantity: v.stock,
          lowStockThreshold: 10,
          status: 'in_stock',
        },
      });
    }
  }
  console.log(`  products: ${productCount}`);

  // 3) RITUAL10 — 10% off (case-insensitive by convention: stored uppercase)
  await prisma.coupon.upsert({
    where: { code: 'RITUAL10' },
    update: { discountType: 'percentage', value: 10, isActive: true },
    create: {
      code: 'RITUAL10',
      description: '10% off your order — a little thank you',
      discountType: 'percentage',
      value: 10,
      isActive: true,
      maxPerUser: 10,
    },
  });
  console.log('  coupon: RITUAL10 (10% off)');

  console.log('Seed complete.');
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
