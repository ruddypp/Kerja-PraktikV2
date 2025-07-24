/*
  Warnings:

  - The values [MAINTENANCE,CALIBRATION,SCHEDULE,RENTAL] on the enum `ActivityType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `inventoryCheckId` on the `ActivityLog` table. All the data in the column will be lost.
  - You are about to drop the column `vendorId` on the `ActivityLog` table. All the data in the column will be lost.
  - You are about to drop the column `vendorId` on the `Calibration` table. All the data in the column will be lost.
  - You are about to drop the column `vendorAddress` on the `CalibrationCertificate` table. All the data in the column will be lost.
  - You are about to drop the column `vendorFax` on the `CalibrationCertificate` table. All the data in the column will be lost.
  - You are about to drop the column `vendorName` on the `CalibrationCertificate` table. All the data in the column will be lost.
  - You are about to drop the column `vendorPhone` on the `CalibrationCertificate` table. All the data in the column will be lost.
  - You are about to drop the `Vendor` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VendorHistory` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('CALIBRATION', 'RENTAL', 'SCHEDULE');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'ACKNOWLEDGED');

-- AlterEnum
BEGIN;
CREATE TYPE "ActivityType_new" AS ENUM ('LOGIN', 'ITEM_CREATED', 'ITEM_UPDATED', 'ITEM_DELETED', 'CALIBRATION_CREATED', 'CALIBRATION_UPDATED', 'CALIBRATION_DELETED', 'MAINTENANCE_CREATED', 'MAINTENANCE_UPDATED', 'MAINTENANCE_DELETED', 'RENTAL_CREATED', 'RENTAL_UPDATED', 'RENTAL_DELETED', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'CUSTOMER_CREATED', 'CUSTOMER_UPDATED', 'CUSTOMER_DELETED', 'REMINDER_CREATED', 'NOTIFICATION_CREATED');
ALTER TABLE "ActivityLog" ALTER COLUMN "type" TYPE "ActivityType_new" USING ("type"::text::"ActivityType_new");
ALTER TYPE "ActivityType" RENAME TO "ActivityType_old";
ALTER TYPE "ActivityType_new" RENAME TO "ActivityType";
DROP TYPE "ActivityType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "ActivityLog" DROP CONSTRAINT "ActivityLog_inventoryCheckId_fkey";

-- DropForeignKey
ALTER TABLE "ActivityLog" DROP CONSTRAINT "ActivityLog_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "Calibration" DROP CONSTRAINT "Calibration_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_customerId_fkey";

-- DropForeignKey
ALTER TABLE "VendorHistory" DROP CONSTRAINT "VendorHistory_vendorId_fkey";

-- AlterTable
ALTER TABLE "ActivityLog" DROP COLUMN "inventoryCheckId",
DROP COLUMN "vendorId",
ADD COLUMN     "customerId" TEXT;

-- AlterTable
ALTER TABLE "Calibration" DROP COLUMN "vendorId",
ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "fax" TEXT;

-- AlterTable
ALTER TABLE "CalibrationCertificate" DROP COLUMN "vendorAddress",
DROP COLUMN "vendorFax",
DROP COLUMN "vendorName",
DROP COLUMN "vendorPhone",
ADD COLUMN     "customerAddress" TEXT,
ADD COLUMN     "customerFax" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "customerPhone" TEXT;

-- AlterTable
ALTER TABLE "Rental" ADD COLUMN     "customerId" TEXT;

-- DropTable
DROP TABLE "Vendor";

-- DropTable
DROP TABLE "VendorHistory";

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "service" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerHistory" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "performance" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "type" "ReminderType" NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "reminderDate" TIMESTAMP(3) NOT NULL,
    "itemSerial" TEXT,
    "calibrationId" TEXT,
    "rentalId" TEXT,
    "scheduleId" TEXT,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "shouldPlaySound" BOOLEAN NOT NULL DEFAULT false,
    "reminderId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calibration" ADD CONSTRAINT "Calibration_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_itemSerial_fkey" FOREIGN KEY ("itemSerial") REFERENCES "Item"("serialNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_calibrationId_fkey" FOREIGN KEY ("calibrationId") REFERENCES "Calibration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "InventoryCheck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "Reminder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
