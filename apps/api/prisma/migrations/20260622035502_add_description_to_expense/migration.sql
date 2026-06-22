-- AlterTable
ALTER TABLE "CashClose" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "dailyStock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supplierReceivedQty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supplierReturnedQty" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Waste" ADD COLUMN     "note" TEXT;

-- AddForeignKey
ALTER TABLE "CashClose" ADD CONSTRAINT "CashClose_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Waste" ADD CONSTRAINT "Waste_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
