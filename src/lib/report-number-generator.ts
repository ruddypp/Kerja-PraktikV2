/**
 * Utility functions for generating report numbers
 */

/**
 * Convert a month number (1-12) to Roman numeral
 */
export function monthToRoman(month: number): string {
  const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  // Adjust month to 0-indexed for array access
  return romanMonths[month - 1] || '';
}

/**
 * Generate a sequence number for reports based on current count and format it with prefix
 * Format: number/PREFIX-PBI/romanMonth/year
 * 
 * @param count Current count of reports for the specified type and month/year
 * @param prefix Prefix for the report (e.g., 'CSR', 'TCR')
 * @param date Date to use for the month and year (defaults to current date)
 * @returns Formatted report number
 */
export function generateReportNumber(count: number, prefix: string, date: Date = new Date()): string {
  const month = date.getMonth() + 1; // JavaScript months are 0-indexed
  const year = date.getFullYear();
  const romanMonth = monthToRoman(month);
  
  return `${count}/${prefix}-PBI/${romanMonth}/${year}`;
}

/**
 * Generate a CSR (Customer Service Report) number
 */
export function generateCSRNumber(count: number, date: Date = new Date()): string {
  return generateReportNumber(count, 'CSR', date);
}

/**
 * Generate a TCR (Technical Report) number
 */
export function generateTCRNumber(count: number, date: Date = new Date()): string {
  return generateReportNumber(count, 'TCR', date);
} 