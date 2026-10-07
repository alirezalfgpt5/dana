import { format } from 'date-fns-jalali';
import { getStoredNumberSettings, toLatinDigits, toPersianDigits } from './numberFormat';

export function formatPersianDate(value: string | Date | null | undefined, pattern = 'yyyy/MM/dd'): string {
  if (value === null || value === undefined || value === '') return '-';

  if (typeof value === 'string') {
    const jalaliDate = value.match(/^(1[2-5]\d{2})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (jalaliDate) {
      const normalized = `${jalaliDate[1]}/${jalaliDate[2].padStart(2, '0')}/${jalaliDate[3].padStart(2, '0')}`;
      return getStoredNumberSettings().usePersianDigits ? toPersianDigits(normalized) : toLatinDigits(normalized);
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const formatted = format(date, pattern);
  return getStoredNumberSettings().usePersianDigits ? toPersianDigits(formatted) : toLatinDigits(formatted);
}

export function formatPersianDateTime(value: string | Date | null | undefined, pattern = 'yyyy/MM/dd HH:mm'): string {
  return formatPersianDate(value, pattern);
}
