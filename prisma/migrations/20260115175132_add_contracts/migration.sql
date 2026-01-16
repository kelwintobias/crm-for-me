-- CreateEnum
CREATE TYPE "ContractSource" AS ENUM ('ANUNCIO', 'INDICACAO', 'INFLUENCIADOR', 'PARCEIRO');

-- CreateEnum
CREATE TYPE "ContractPackage" AS ENUM ('INTERMEDIARIO', 'AVANCADO', 'ELITE', 'PRO_PLUS', 'ULTRA_PRO', 'EVOLUTION');

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "email" TEXT,
    "whatsapp" TEXT NOT NULL,
    "instagram" TEXT,
    "cpf" TEXT,
    "contractDate" TIMESTAMP(3) NOT NULL,
    "source" "ContractSource" NOT NULL,
    "package" "ContractPackage" NOT NULL,
    "addons" TEXT[],
    "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
    "totalValue" DECIMAL(10,2) NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contracts_userId_idx" ON "contracts"("userId");

-- CreateIndex
CREATE INDEX "contracts_contractDate_idx" ON "contracts"("contractDate");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
