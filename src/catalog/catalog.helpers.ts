/** URL-safe slug: "Ashwagandha (30ml)" -> "ashwagandha-30ml" */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

/** Prisma Decimal / number / string -> plain number for API responses. */
export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

/** Inventory status derived from quantity vs. low-stock threshold. */
export function computeInventoryStatus(
  quantity: number,
  threshold: number,
): 'in_stock' | 'low_stock' | 'out_of_stock' {
  if (quantity <= 0) return 'out_of_stock';
  if (quantity <= threshold) return 'low_stock';
  return 'in_stock';
}

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

export const ALLOWED_IMAGE_MIME_TYPES = Object.keys(MIME_EXTENSIONS);

/** File extension for an allowed image mime type, else null. */
export function imageExtension(mimetype: string): string | null {
  return MIME_EXTENSIONS[mimetype] ?? null;
}

/** Random suffix used for auto-generated SKUs: AQ-7F3K2A */
export function randomSkuSuffix(length = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
