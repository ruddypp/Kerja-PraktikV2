-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('AVAILABLE', 'IN_CALIBRATION', 'RENTED', 'IN_MAINTENANCE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('MAINTENANCE', 'CALIBRATION', 'SCHEDULE', 'RENTAL');

-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "serialNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "sensor" TEXT,
    "description" TEXT,
    "customerId" TEXT,
    "status" "ItemStatus" NOT NULL DEFAULT 'AVAILABLE',
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("serialNumber")
);

-- CreateTable
CREATE TABLE "Rental" (
    "id" TEXT NOT NULL,
    "itemSerial" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "poNumber" TEXT,
    "doNumber" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "returnDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "renterName" TEXT,
    "renterPhone" TEXT,
    "renterAddress" TEXT,
    "initialCondition" TEXT,
    "returnCondition" TEXT,

    CONSTRAINT "Rental_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Calibration" (
    "id" TEXT NOT NULL,
    "itemSerial" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "calibrationDate" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "certificateNumber" TEXT,
    "certificateUrl" TEXT,
    "vendorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "Calibration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalibrationCertificate" (
    "id" TEXT NOT NULL,
    "calibrationId" TEXT NOT NULL,
    "vendorAddress" TEXT,
    "vendorPhone" TEXT,
    "vendorFax" TEXT,
    "vendorName" TEXT,
    "manufacturer" TEXT,
    "instrumentName" TEXT,
    "modelNumber" TEXT,
    "configuration" TEXT,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalibrationCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GasCalibrationEntry" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "gasType" TEXT NOT NULL,
    "gasConcentration" TEXT NOT NULL,
    "gasBalance" TEXT NOT NULL,
    "gasBatchNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GasCalibrationEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestResultEntry" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "testSensor" TEXT NOT NULL,
    "testSpan" TEXT NOT NULL,
    "testResult" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestResultEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Maintenance" (
    "id" TEXT NOT NULL,
    "itemSerial" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceReport" (
    "id" TEXT NOT NULL,
    "maintenanceId" TEXT NOT NULL,
    "reportNumber" TEXT,
    "customer" TEXT,
    "location" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "dateIn" TIMESTAMP(3),
    "reasonForReturn" TEXT,
    "findings" TEXT,
    "action" TEXT,
    "sensorCO" BOOLEAN NOT NULL DEFAULT false,
    "sensorH2S" BOOLEAN NOT NULL DEFAULT false,
    "sensorO2" BOOLEAN NOT NULL DEFAULT false,
    "sensorLEL" BOOLEAN NOT NULL DEFAULT false,
    "lampClean" BOOLEAN NOT NULL DEFAULT false,
    "lampReplace" BOOLEAN NOT NULL DEFAULT false,
    "pumpTested" BOOLEAN NOT NULL DEFAULT false,
    "pumpRebuilt" BOOLEAN NOT NULL DEFAULT false,
    "pumpReplaced" BOOLEAN NOT NULL DEFAULT false,
    "pumpClean" BOOLEAN NOT NULL DEFAULT false,
    "instrumentCalibrate" BOOLEAN NOT NULL DEFAULT false,
    "instrumentUpgrade" BOOLEAN NOT NULL DEFAULT false,
    "instrumentCharge" BOOLEAN NOT NULL DEFAULT false,
    "instrumentClean" BOOLEAN NOT NULL DEFAULT false,
    "instrumentSensorAssembly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicalReport" (
    "id" TEXT NOT NULL,
    "maintenanceId" TEXT NOT NULL,
    "csrNumber" TEXT,
    "deliveryTo" TEXT,
    "quoNumber" TEXT,
    "dateReport" TIMESTAMP(3),
    "techSupport" TEXT,
    "dateIn" TIMESTAMP(3),
    "estimateWork" TEXT,
    "reasonForReturn" TEXT,
    "findings" TEXT,
    "action" TEXT,
    "beforePhotoUrl" TEXT,
    "afterPhotoUrl" TEXT,
    "termsConditions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechnicalReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceReportPart" (
    "id" TEXT NOT NULL,
    "serviceReportId" TEXT NOT NULL,
    "itemNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "snPnOld" TEXT,
    "snPnNew" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceReportPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicalReportPart" (
    "id" TEXT NOT NULL,
    "technicalReportId" TEXT NOT NULL,
    "itemNumber" INTEGER NOT NULL,
    "namaUnit" TEXT,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION,
    "totalPrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TechnicalReportPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemHistory" (
    "id" TEXT NOT NULL,
    "itemSerial" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "relatedId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "userId" TEXT NOT NULL,
    "itemSerial" TEXT,
    "rentalId" TEXT,
    "calibrationId" TEXT,
    "maintenanceId" TEXT,
    "inventoryCheckId" TEXT,
    "affectedUserId" TEXT,
    "vendorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
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

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorHistory" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "performance" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCheck" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceType" "RecurrenceType",
    "nextDate" TIMESTAMP(3),

    CONSTRAINT "InventoryCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCheckItem" (
    "id" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "itemSerial" TEXT NOT NULL,
    "verifiedStatus" "ItemStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryCheckItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalibrationStatusLog" (
    "id" TEXT NOT NULL,
    "calibrationId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalibrationStatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceStatusLog" (
    "id" TEXT NOT NULL,
    "maintenanceId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceStatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalStatusLog" (
    "id" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalStatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CalibrationCertificate_calibrationId_key" ON "CalibrationCertificate"("calibrationId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceReport_maintenanceId_key" ON "ServiceReport"("maintenanceId");

-- CreateIndex
CREATE UNIQUE INDEX "TechnicalReport_maintenanceId_key" ON "TechnicalReport"("maintenanceId");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_itemSerial_fkey" FOREIGN KEY ("itemSerial") REFERENCES "Item"("serialNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calibration" ADD CONSTRAINT "Calibration_itemSerial_fkey" FOREIGN KEY ("itemSerial") REFERENCES "Item"("serialNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calibration" ADD CONSTRAINT "Calibration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calibration" ADD CONSTRAINT "Calibration_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationCertificate" ADD CONSTRAINT "CalibrationCertificate_calibrationId_fkey" FOREIGN KEY ("calibrationId") REFERENCES "Calibration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GasCalibrationEntry" ADD CONSTRAINT "GasCalibrationEntry_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "CalibrationCertificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResultEntry" ADD CONSTRAINT "TestResultEntry_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "CalibrationCertificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Maintenance" ADD CONSTRAINT "Maintenance_itemSerial_fkey" FOREIGN KEY ("itemSerial") REFERENCES "Item"("serialNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Maintenance" ADD CONSTRAINT "Maintenance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReport" ADD CONSTRAINT "ServiceReport_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "Maintenance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalReport" ADD CONSTRAINT "TechnicalReport_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "Maintenance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReportPart" ADD CONSTRAINT "ServiceReportPart_serviceReportId_fkey" FOREIGN KEY ("serviceReportId") REFERENCES "ServiceReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalReportPart" ADD CONSTRAINT "TechnicalReportPart_technicalReportId_fkey" FOREIGN KEY ("technicalReportId") REFERENCES "TechnicalReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemHistory" ADD CONSTRAINT "ItemHistory_itemSerial_fkey" FOREIGN KEY ("itemSerial") REFERENCES "Item"("serialNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_itemSerial_fkey" FOREIGN KEY ("itemSerial") REFERENCES "Item"("serialNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_calibrationId_fkey" FOREIGN KEY ("calibrationId") REFERENCES "Calibration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "Maintenance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_inventoryCheckId_fkey" FOREIGN KEY ("inventoryCheckId") REFERENCES "InventoryCheck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_affectedUserId_fkey" FOREIGN KEY ("affectedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorHistory" ADD CONSTRAINT "VendorHistory_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCheck" ADD CONSTRAINT "InventoryCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCheckItem" ADD CONSTRAINT "InventoryCheckItem_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "InventoryCheck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCheckItem" ADD CONSTRAINT "InventoryCheckItem_itemSerial_fkey" FOREIGN KEY ("itemSerial") REFERENCES "Item"("serialNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationStatusLog" ADD CONSTRAINT "CalibrationStatusLog_calibrationId_fkey" FOREIGN KEY ("calibrationId") REFERENCES "Calibration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationStatusLog" ADD CONSTRAINT "CalibrationStatusLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceStatusLog" ADD CONSTRAINT "MaintenanceStatusLog_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "Maintenance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceStatusLog" ADD CONSTRAINT "MaintenanceStatusLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalStatusLog" ADD CONSTRAINT "RentalStatusLog_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalStatusLog" ADD CONSTRAINT "RentalStatusLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
