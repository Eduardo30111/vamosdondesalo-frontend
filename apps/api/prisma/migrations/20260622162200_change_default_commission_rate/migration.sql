-- AlterTable
ALTER TABLE "Store" ALTER COLUMN "commissionRate" SET DEFAULT 0.0;

-- Update existing stores
UPDATE "Store" SET "commissionRate" = 0.0;
