import { 
  RequestStatus, 
  ItemStatus, 
  User as PrismaUser,
  Item as PrismaItem,
  Customer as PrismaCustomer,
  Calibration as PrismaCalibration,
  CalibrationCertificate as PrismaCertificate 
} from '@prisma/client';

// Types matching the database schema for relations that might not be fully generated yet
export interface GasCalibrationEntry {
  id: string;
  certificateId: string;
  gasType: string;
  gasConcentration: string;
  gasBalance: string;
  gasBatchNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestResultEntry {
  id: string;
  certificateId: string;
  testSensor: string;
  testSpan: string;
  testResult: string;
  createdAt: Date;
  updatedAt: Date;
}

// Simplified types for use in components
export type User = Omit<PrismaUser, 'password'>;

export interface Item extends PrismaItem {
  category?: { name: string } | null;
}

export type Customer = PrismaCustomer;

export interface CalibrationCertificate extends PrismaCertificate {
  gasEntries?: GasCalibrationEntry[];
  testEntries?: TestResultEntry[];
}

export interface Calibration extends PrismaCalibration {
  item?: Item;
  user?: User;
  customer?: Customer;
  certificate?: CalibrationCertificate;
  statusLogs?: Array<{
    id: string;
    status: RequestStatus;
    notes: string | null;
    createdAt: string;
    changedBy?: {
      id: string;
      name: string;
    }
  }>;
}

export { RequestStatus, ItemStatus }; 

export enum ActivityType {
  LOGIN = 'LOGIN',
  ITEM_CREATED = 'ITEM_CREATED',
  ITEM_UPDATED = 'ITEM_UPDATED',
  ITEM_DELETED = 'ITEM_DELETED',
  CALIBRATION_CREATED = 'CALIBRATION_CREATED',
  CALIBRATION_UPDATED = 'CALIBRATION_UPDATED',
  CALIBRATION_DELETED = 'CALIBRATION_DELETED',
  MAINTENANCE_CREATED = 'MAINTENANCE_CREATED',
  MAINTENANCE_UPDATED = 'MAINTENANCE_UPDATED',
  MAINTENANCE_DELETED = 'MAINTENANCE_DELETED',
  RENTAL_CREATED = 'RENTAL_CREATED',
  RENTAL_UPDATED = 'RENTAL_UPDATED',
  RENTAL_DELETED = 'RENTAL_DELETED',
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  CUSTOMER_CREATED = 'CUSTOMER_CREATED',
  CUSTOMER_UPDATED = 'CUSTOMER_UPDATED',
  CUSTOMER_DELETED = 'CUSTOMER_DELETED',
  REMINDER_CREATED = 'REMINDER_CREATED',
  NOTIFICATION_CREATED = 'NOTIFICATION_CREATED',
  REMINDER_ACKNOWLEDGED = 'REMINDER_ACKNOWLEDGED',
  CALIBRATION_REMINDER_ACKNOWLEDGED = 'CALIBRATION_REMINDER_ACKNOWLEDGED',
  RENTAL_REMINDER_ACKNOWLEDGED = 'RENTAL_REMINDER_ACKNOWLEDGED',
  MAINTENANCE_REMINDER_ACKNOWLEDGED = 'MAINTENANCE_REMINDER_ACKNOWLEDGED',
  SCHEDULE_REMINDER_ACKNOWLEDGED = 'SCHEDULE_REMINDER_ACKNOWLEDGED',
}

export enum ReminderType {
  CALIBRATION = 'CALIBRATION',
  RENTAL = 'RENTAL',
  SCHEDULE = 'SCHEDULE',
  MAINTENANCE = 'MAINTENANCE',
}

export enum ReminderStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
}

export interface Reminder {
  id: string;
  type: ReminderType;
  status: ReminderStatus;
  title: string;
  message: string;
  dueDate: Date;
  reminderDate: Date;
  itemSerial?: string;
  calibrationId?: string;
  rentalId?: string;
  scheduleId?: string;
  emailSent: boolean;
  emailSentAt?: Date;
  acknowledgedAt?: Date;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: Date;
  reminderId?: string;
  userId: string;
  createdAt: Date;
  reminder?: {
    id: string;
    type: string;
    dueDate: string;
    [key: string]: any; 
  };
}

export interface EmailTemplate {
  subject: string;
  body: string;
} 