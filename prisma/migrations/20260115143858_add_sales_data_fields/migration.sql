-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "addOns" TEXT,
ADD COLUMN     "contractDate" TIMESTAMP(3),
ADD COLUMN     "cpf" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "packageType" TEXT,
ADD COLUMN     "termsAccepted" BOOLEAN NOT NULL DEFAULT false;
