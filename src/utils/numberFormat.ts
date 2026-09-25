// src/utils/numberFormat.ts
// ماژول بومی‌سازی قالب‌بندی اعداد و مبالغ ریالی با جداکننده هزارگان

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * تبدیل ارقام انگلیسی یا عربی به ارقام فارسی
 */
export function toPersianDigits(input: number | string | null | undefined): string {
  if (input === null || input === undefined || input === '') return '';
  const str = String(input);
  return str
    .replace(/[0-9]/g, (w) => PERSIAN_DIGITS[+w])
    .replace(/[٠-٩]/g, (w) => PERSIAN_DIGITS[ARABIC_DIGITS.indexOf(w)]);
}

/**
 * تبدیل ارقام فارسی یا عربی به ارقام انگلیسی
 */
export function toLatinDigits(input: string): string {
  if (!input) return '';
  return input
    .replace(/[۰-۹]/g, (w) => String(PERSIAN_DIGITS.indexOf(w)))
    .replace(/[٠-٩]/g, (w) => String(ARABIC_DIGITS.indexOf(w)));
}

export interface NumberFormatOptions {
  usePersianDigits?: boolean;
  useGrouping?: boolean;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

/**
 * دریافت تنظیمات جاری فرمت اعداد از حافظه محلی
 */
export function getStoredNumberSettings(): { usePersianDigits: boolean; useGrouping: boolean } {
  try {
    const rawFormat = localStorage.getItem('dana_number_format');
    const rawGrouping = localStorage.getItem('dana_show_thousand_separator');
    return {
      usePersianDigits: rawFormat !== 'latin', // پیش‌فرض فارسی است
      useGrouping: rawGrouping !== 'false',    // پیش‌فرض فعال است
    };
  } catch {
    return { usePersianDigits: true, useGrouping: true };
  }
}

/**
 * قالب‌بندی عمومی عدد با امکان درج جداکننده هزارگان و تبدیل به ارقام فارسی
 */
export function formatNumber(
  value: number | string | null | undefined,
  options?: NumberFormatOptions
): string {
  if (value === null || value === undefined || value === '') return '۰';

  const stored = getStoredNumberSettings();
  const usePersian = options?.usePersianDigits ?? stored.usePersianDigits;
  const useGrouping = options?.useGrouping ?? stored.useGrouping;

  let num: number;
  if (typeof value === 'number') {
    num = value;
  } else {
    const cleanStr = toLatinDigits(String(value)).replace(/,/g, '').replace(/٬/g, '').trim();
    num = Number(cleanStr);
    if (isNaN(num)) return String(value);
  }

  const parts = num.toString().split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  if (useGrouping) {
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  let formatted = integerPart;
  if (decimalPart !== undefined) {
    formatted += '.' + decimalPart;
  }

  if (usePersian) {
    formatted = toPersianDigits(formatted).replace(/,/g, '٬');
  }

  if (options?.prefix) formatted = options.prefix + formatted;
  if (options?.suffix) formatted = formatted + options.suffix;

  return formatted;
}

/**
 * قالب‌بندی مبالغ ریالی با جداکننده هزارگان و واحد «ریال»
 */
export function formatCurrency(
  value: number | string | null | undefined,
  showUnit: boolean = false
): string {
  if (value === null || value === undefined || value === 0 || value === '0') {
    return showUnit ? '۰ ریال' : '۰';
  }
  const formatted = formatNumber(value);
  return showUnit ? `${formatted} ریال` : formatted;
}

/**
 * تجزیه مقدار ورودی کاربر به عدد خالص (جهت ذخیره در فرم‌ها و دیتابیس)
 */
export function parseNumberInput(input: string): number {
  if (!input) return 0;
  const clean = toLatinDigits(input).replace(/[^\d.-]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}
