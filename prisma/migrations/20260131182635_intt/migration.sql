-- AlterTable
ALTER TABLE "RentalOrder" ADD COLUMN     "deliveryCharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "deliveryMethod" TEXT DEFAULT 'pickup';
