-- AlterEnum
ALTER TYPE "ReminderType" ADD VALUE 'MAINTENANCE';

-- AlterTable
ALTER TABLE "Reminder" ADD COLUMN     "maintenanceId" TEXT;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "Maintenance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
