import { 
  RequestStatus, 
  ItemStatus, 
  User as PrismaUser,
  Item as PrismaItem,
  Vendor as PrismaVendor,
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

export type Vendor = PrismaVendor;

export interface CalibrationCertificate extends PrismaCertificate {
  gasEntries?: GasCalibrationEntry[];
  testEntries?: TestResultEntry[];
}

export interface Calibration extends PrismaCalibration {
  item?: Item;
  user?: User;
  vendor?: Vendor;
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