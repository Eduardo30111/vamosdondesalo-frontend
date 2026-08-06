-- AlterEnum
ALTER TYPE "PlanType" ADD VALUE 'PREMIUM';

-- CreateTable
CREATE TABLE "ChatbotConfig" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "storeId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "botName" TEXT NOT NULL DEFAULT 'Asistente Virtual',
    "welcomeMessage" TEXT NOT NULL DEFAULT '¡Hola! ¿En qué puedo ayudarte hoy?',
    "whatsappNumber" TEXT,
    "evolutionApiKey" TEXT,
    "n8nUrl" TEXT,
    "businessHours" TEXT NOT NULL DEFAULT '8:00 AM - 8:00 PM',
    "language" TEXT NOT NULL DEFAULT 'es',
    "tone" TEXT NOT NULL DEFAULT 'profesional',
    "promotions" TEXT,
    "featuredProducts" TEXT,
    "autoMessages" TEXT,
    "conversations" INTEGER NOT NULL DEFAULT 0,
    "ordersGenerated" INTEGER NOT NULL DEFAULT 0,
    "salesAttributed" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatbotConfig_storeId_key" ON "ChatbotConfig"("storeId");

-- AddForeignKey
ALTER TABLE "ChatbotConfig" ADD CONSTRAINT "ChatbotConfig_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
