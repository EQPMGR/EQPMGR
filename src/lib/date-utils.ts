import { Timestamp } from 'firebase/firestore';

// Helper function to safely convert Firestore Timestamps or other values to Dates
export const toDate = (value: any): Date => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  // Return current date as a fallback for invalid or unexpected types
  return new Date(); 
};

export const toNullableDate = (value: any): Date | null => {
  if (!value) return null;
  
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    // Check if the created date is valid
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  return null;
};
