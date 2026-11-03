-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "accent" TEXT,
ADD COLUMN     "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "ingredients" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "note" TEXT;
