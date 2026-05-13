import { format, parseISO } from 'date-fns';

export const safeParseDate = (dateValue: any, dateStr?: string | null): Date | null => {
  if (!dateValue) return null;

  // If it's already a Date object
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue;
  }

  // If it's a Firestore Timestamp
  if (typeof dateValue === 'object' && dateValue.toDate) {
    try {
      const d = dateValue.toDate();
      return isNaN(d.getTime()) ? null : d;
    } catch (e) {
      return null;
    }
  }

  const str = String(dateValue);

  // If it's a full ISO string
  if (str.includes('-') && str.includes(':') && (str.includes('T') || str.includes(' '))) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;
  }

  // If it's just YYYY-MM-DD
  if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const d = new Date(str + 'T00:00:00');
    if (!isNaN(d.getTime())) return d;
  }

  // If it's just HH:mm and we have a date portion
  if (str.match(/^\d{1,2}:\d{2}$/) && dateStr) {
    const d = new Date(`${dateStr}T${str.padStart(5, '0')}`);
    if (!isNaN(d.getTime())) return d;
  }

  // Fallback for strings that might be valid dates
  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) return fallback;

  return null;
};

export const safeFormat = (dateValue: any, formatStr: string, fallback: string = '-', dateStr?: string | null): string => {
  const d = safeParseDate(dateValue, dateStr);
  if (!d) return fallback;
  try {
    return format(d, formatStr);
  } catch (e) {
    return fallback;
  }
};
