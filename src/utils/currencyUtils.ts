// src/utils/currencyUtils.ts
// توابع جامع محاسبات مالی، قالب‌بندی ریالی و تبدیل به حروف بومی

/**
 * تبدیل ارقام انگلیسی، عربی به ارقام استاندارد
 */
export function normalizeDigits(str: string | number): string {
  if (str === null || str === undefined) return '';
  const s = String(str);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  
  return s
    .replace(/[۰-۹]/g, w => String(persianDigits.indexOf(w)))
    .replace(/[٠-٩]/g, w => String(arabicDigits.indexOf(w)));
}

/**
 * تبدیل رشته دارای جداکننده هزارگان به عدد خام
 */
export function parseRialInput(input: string | number): number {
  if (typeof input === 'number') return isNaN(input) ? 0 : input;
  if (!input) return 0;
  const normalized = normalizeDigits(input).replace(/,/g, '').replace(/،/g, '').replace(/\s/g, '');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
}

/**
 * فرمت عدد با جداکننده ۳ رقمی فارسی
 */
export function formatThousands(value: number | string): string {
  const num = typeof value === 'number' ? value : parseRialInput(value);
  if (!num || isNaN(num)) return '۰';
  return new Intl.NumberFormat('fa-IR').format(num);
}

/**
 * فرمت نهایی به ریال همراه با جداکننده هزارگان
 */
export function formatRials(value: number | string): string {
  const num = typeof value === 'number' ? value : parseRialInput(value);
  if (!num || num === 0) return '۰ ریال';
  return `${new Intl.NumberFormat('fa-IR').format(num)} ریال`;
}

/**
 * تبدیل مبلغ ریال به متن فارسی خوانا و معادل تومان
 */
export function formatRialsWithWords(value: number | string): {
  rialsFormatted: string;
  words: string;
  tomansEquivalent: string;
} {
  const rials = typeof value === 'number' ? value : parseRialInput(value);
  const rialsFormatted = formatRials(rials);
  
  if (rials <= 0) {
    return {
      rialsFormatted: '۰ ریال',
      words: 'صفر ریال',
      tomansEquivalent: '۰ تومان',
    };
  }

  // تبدیل مبالغ بزرگ به میلیارد / میلیون
  let words = '';
  if (rials >= 1_000_000_000_000) {
    const hezarMilliard = (rials / 1_000_000_000_000).toFixed(2).replace(/\.00$/, '');
    words = `${new Intl.NumberFormat('fa-IR').format(Number(hezarMilliard))} هزار میلیارد ریال`;
  } else if (rials >= 1_000_000_000) {
    const milliard = (rials / 1_000_000_000).toFixed(2).replace(/\.00$/, '');
    words = `${new Intl.NumberFormat('fa-IR').format(Number(milliard))} میلیارد ریال`;
  } else if (rials >= 1_000_000) {
    const million = (rials / 1_000_000).toFixed(1).replace(/\.0$/, '');
    words = `${new Intl.NumberFormat('fa-IR').format(Number(million))} میلیون ریال`;
  } else if (rials >= 1_000) {
    const hezar = (rials / 1_000).toFixed(0);
    words = `${new Intl.NumberFormat('fa-IR').format(Number(hezar))} هزار ریال`;
  } else {
    words = `${new Intl.NumberFormat('fa-IR').format(rials)} ریال`;
  }

  const tomans = Math.floor(rials / 10);
  const tomansFormatted = `${new Intl.NumberFormat('fa-IR').format(tomans)} تومان`;

  return {
    rialsFormatted,
    words,
    tomansEquivalent: tomansFormatted,
  };
}

export interface FinancialCalculationResult {
  requiredBudget: number;
  approvedBudget: number;
  assignedBudget: number;
  /** تفاوت بودجه مصوب با مورد نیاز (منفی یعنی کسری مصوب، مثبت یعنی مازاد مصوب) */
  approvalGap: number;
  /** مانده بودجه مصوب که هنوز واگذار نشده */
  unassignedBalance: number;
  /** درصد تخصیص اعتبارات نسبت به بودجه مصوب */
  assignedPercent: number;
  /** درصد تصویب نسبت به نیاز */
  approvalPercent: number;
  /** وضعیت مالی */
  status: 'fully_assigned' | 'under_assigned' | 'over_assigned' | 'not_assigned' | 'no_budget';
  statusLabel: string;
  statusColor: string;
}

/**
 * محاسبه خودکار و دقیق تمام شاخص‌های مالی مسئله
 */
export function calculateFinancialMetrics(
  required: number | string = 0,
  approved: number | string = 0,
  assigned: number | string = 0
): FinancialCalculationResult {
  const req = parseRialInput(required);
  const app = parseRialInput(approved);
  const ass = parseRialInput(assigned);

  const approvalGap = app - req;
  const unassignedBalance = Math.max(0, app - ass);
  
  const assignedPercent = app > 0 ? Math.min(100, Math.round((ass / app) * 100)) : 0;
  const approvalPercent = req > 0 ? Math.min(100, Math.round((app / req) * 100)) : (app > 0 ? 100 : 0);

  let status: FinancialCalculationResult['status'] = 'no_budget';
  let statusLabel = 'فاقد اعتبار ثبت شده';
  let statusColor = 'text-gray-500 bg-gray-100 border-gray-200';

  if (app === 0 && req === 0) {
    status = 'no_budget';
    statusLabel = 'بدون بودجه';
    statusColor = 'text-gray-500 bg-gray-100 border-gray-200';
  } else if (ass === 0) {
    status = 'not_assigned';
    statusLabel = 'تخصیص‌نیافته (صفر درصد)';
    statusColor = 'text-red-700 bg-red-50 border-red-200';
  } else if (ass >= app && app > 0) {
    status = 'fully_assigned';
    statusLabel = 'تخصیص کامل (۱۰۰٪)';
    statusColor = 'text-green-700 bg-green-50 border-green-200';
  } else if (ass < app) {
    status = 'under_assigned';
    statusLabel = `کسری تخصیص (${new Intl.NumberFormat('fa-IR').format(100 - assignedPercent)}٪ مانده)`;
    statusColor = 'text-amber-700 bg-amber-50 border-amber-200';
  }

  return {
    requiredBudget: req,
    approvedBudget: app,
    assignedBudget: ass,
    approvalGap,
    unassignedBalance,
    assignedPercent,
    approvalPercent,
    status,
    statusLabel,
    statusColor,
  };
}
