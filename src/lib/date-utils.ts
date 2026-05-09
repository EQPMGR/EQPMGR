
// Helper function to safely convert values to Dates
// Works with Date objects, strings, timestamps, and numbers
export const toDate = (value: any): Date => {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string') {
    // Normalize date-only values as local date (so UI doesn't shift by timezone offset)
    const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:.*)?$/);
    if (dateOnlyMatch) {
      const [, y, m, d] = dateOnlyMatch;
      const date = new Date(Number(y), Number(m) - 1, Number(d));
      if (!isNaN(date.getTime())) return date;
    }

    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  if (typeof value === 'number') {
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

  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string') {
    const dateOnlyMatch = value.match(/^\d{4}-\d{2}-\d{2}$/);
    if (dateOnlyMatch) {
      const [, y, m, d] = dateOnlyMatch;
      const date = new Date(Number(y), Number(m) - 1, Number(d));
      if (!isNaN(date.getTime())) return date;
    }

    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  if (typeof value === 'number') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
};

export const formatDate = (date: Date | null, format: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY/MM/DD' = 'MM/DD/YYYY'): string => {
    if (!date) return 'N/A';

    // Ensure we work with UTC dates to avoid timezone issues.
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    switch (format) {
        case 'DD/MM/YYYY':
            return `${day}/${month}/${year}`;
        case 'YYYY/MM/DD':
            return `${year}/${month}/${day}`;
        case 'MM/DD/YYYY':
        default:
            return `${month}/${day}/${year}`;
    }
};
