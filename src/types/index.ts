export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type Item = {
  id: string;
  name: string;
  serial: string;
  status: string;
};

export type Status = {
  id: string;
  name: string;
  color: string;
};

export type StatusLog = {
  id: string;
  status: Status;
  createdAt: Date;
  notes: string | null;
};

export type Category = {
  id: string;
  name: string;
};

export type CalibrationCertificate = {
  id: string;
  url: string;
  createdAt: Date;
};

export type Calibration = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Calibration details
  requestedBy: User;
  requestedById: string;
  
  item: Item | null;
  itemId: string | null;
  itemName: string | null;
  itemSerial: string | null;
  
  // Gas details
  gasType: string | null;
  gasConcentration: string | null;
  gasBalance: string | null;
  gasBatchNumber: string | null;
  
  // Instrument details
  instrumentName: string | null;
  modelNumber: string | null;
  configuration: string | null;
  
  // Test results
  testSensor: string | null;
  testSpan: string | null;
  testResult: string | null;
  
  // Approval
  approvedBy: string | null;
  
  // Validity
  certificateNumber: string | null;
  calibrationDate: Date | null;
  validUntil: Date | null;
  
  // Status
  status: Status;
  notes: string | null;
  statusLogs: StatusLog[];
  
  // Reminders and certificate
  notificationSent: boolean;
  category: Category | null;
  certificate: CalibrationCertificate | null;
}; 