/*
  Warnings:

  - You are about to drop the column `pricePerDay` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "pricePerDay",
DROP COLUMN "quantity",
ADD COLUMN     "attributes" JSONB,
ADD COLUMN     "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRentable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rentalPriceDaily" DOUBLE PRECISION,
ADD COLUMN     "rentalPriceHourly" DOUBLE PRECISION,
ADD COLUMN     "rentalPriceWeekly" DOUBLE PRECISION,
ADD COLUMN     "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "salesPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
