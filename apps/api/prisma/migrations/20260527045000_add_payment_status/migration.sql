-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'FIADO', 'CANCELLED');

-- Add paymentStatus column
ALTER TABLE "Order"
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID';

-- Legacy mapping:
-- - status = 'CANCELLED' => paymentStatus = 'CANCELLED'
-- - status = 'PAID' AND isFiated=true  => paymentStatus = 'FIADO'
-- - status = 'PAID' AND isFiated=false => paymentStatus = 'PAID'
-- Use text comparison to avoid enum conversion errors on older DBs
UPDATE "Order"
SET "paymentStatus" = 'CANCELLED'
WHERE "status"::text = 'CANCELLED';

-- Fallback: mark paid orders as PAID. If fiados exist, set them later.
UPDATE "Order"
SET "paymentStatus" = 'PAID'
WHERE "status"::text = 'PAID';

