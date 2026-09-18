// src/utils/excelExportUtils.ts
// ابزارهای تولید فایل اکسل

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns-jalali';

export const EXCEL_FONT_NAME = 'Vazirmatn';

export const EXCEL_COLORS = {
  headerBg: 'FF4F46E5',
  headerBgSecondary: 'FF7C3AED',
  headerText: 'FFFFFFFF',
  titleText: 'FF1e293b',
  subtitleText: 'FF64748b',
  summaryBg: 'FFE8F0FE',
  footerText: 'FF64748b',
  gapBg: 'FFEF4444',
  filledBg: 'FF22C55E',
  partialBg: 'FFF59E0B',
};

export const excelStyles = {
  title: {
    font: { name: EXCEL_FONT_NAME, bold: true, size: 16, color: { argb: EXCEL_COLORS.titleText } },
    alignment: { horizontal: 'center', vertical: 'middle' } as Partial<ExcelJS.Alignment>,
  },
  subtitle: {
    font: { name: EXCEL_FONT_NAME, size: 10, color: { argb: EXCEL_COLORS.subtitleText } },
    alignment: { horizontal: 'center', vertical: 'middle' } as Partial<ExcelJS.Alignment>,
  },
  header: (bgColor: string = EXCEL_COLORS.headerBg) => ({
    font: { name: EXCEL_FONT_NAME, bold: true, size: 11, color: { argb: EXCEL_COLORS.headerText } },
    alignment: { horizontal: 'center', vertical: 'middle' } as Partial<ExcelJS.Alignment>,
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } as ExcelJS.Fill,
  }),
  cell: {
    font: { name: EXCEL_FONT_NAME, size: 10 },
    alignment: { horizontal: 'center', vertical: 'middle' } as Partial<ExcelJS.Alignment>,
    border: {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    } as Partial<ExcelJS.Borders>,
  },
  summary: {
    font: { name: EXCEL_FONT_NAME, bold: true, size: 12 },
    alignment: { horizontal: 'center', vertical: 'middle' } as Partial<ExcelJS.Alignment>,
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.summaryBg } } as ExcelJS.Fill,
  },
  footer: {
    font: { name: EXCEL_FONT_NAME, size: 9, color: { argb: EXCEL_COLORS.footerText } },
    alignment: { horizontal: 'center', vertical: 'middle' } as Partial<ExcelJS.Alignment>,
  }
};

export function applyStyleToRow(row: ExcelJS.Row, style: any) {
  if (style.font) row.font = style.font;
  if (style.alignment) row.alignment = style.alignment;
  if (style.fill) row.fill = style.fill;
}

export function applyStyleToCell(cell: ExcelJS.Cell, style: any) {
  if (style.font) cell.font = style.font;
  if (style.alignment) cell.alignment = style.alignment;
  if (style.fill) cell.fill = style.fill;
  if (style.border) cell.border = style.border;
}

// ============================================
// تابع ایجاد شیت درختواره
// ============================================

export function createTreeSheet(
  workbook: ExcelJS.Workbook,
  tree: any,
  nodes: any[],
  sheetName: string = 'درختواره'
) {
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ rightToLeft: true }],
  });

  sheet.getColumn(1).width = 10;
  sheet.getColumn(2).width = 30;
  sheet.getColumn(3).width = 15;
  sheet.getColumn(4).width = 30;
  sheet.getColumn(5).width = 20;
  sheet.getColumn(6).width = 25;

  // عنوان
  sheet.mergeCells('A1:F1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `درختواره: ${tree.name}`;
  titleCell.font = { name: EXCEL_FONT_NAME, bold: true, size: 16, color: { argb: EXCEL_COLORS.titleText } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells('A2:F2');
  const subCell = sheet.getCell('A2');
  subCell.value = `نوع: ${tree.type} • تاریخ: ${format(new Date(), 'yyyy/MM/dd HH:mm')}`;
  subCell.font = { name: EXCEL_FONT_NAME, size: 10, color: { argb: EXCEL_COLORS.subtitleText } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // هدر
  const headers = ['شناسه', 'عنوان', 'سطح', 'والد', 'وضعیت گپ', 'قالب‌ها'];
  const headerRow = sheet.addRow(headers);
  headerRow.font = { name: EXCEL_FONT_NAME, bold: true, size: 11, color: { argb: EXCEL_COLORS.headerText } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.headerBg } };
  headerRow.height = 30;

  // داده‌ها
  for (const node of nodes) {
    const templates = (Array.isArray(node.templateIds) ? node.templateIds : (node.templateIds ? String(node.templateIds).split(',').filter(Boolean) : [])).join(', ') || '';
    const parentTitle = nodes.find((n: any) => n.id === node.parentId)?.title || 'ریشه';
    
    const row = sheet.addRow([
      node.id,
      node.title,
      node.level,
      parentTitle,
      node.gapStatus || 'ندارد',
      templates,
    ]);
    row.alignment = { vertical: 'middle' };
    row.height = 25;

    // رنگ‌بندی بر اساس سطح
    const levelColors: Record<string, string> = {
      'R': 'FFDBEAFE',
      'T': 'FFEDE9FE',
      'B': 'FFD1FAE5',
      'SB': 'FFFEF3C7',
      'L': 'FFE0E7FF',
    };
    const color = levelColors[node.level] || 'FFFFFFFF';
    row.eachCell((cell: any) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    });
  }

  // جمع‌بندی
  const summaryRow = sheet.addRow([
    'جمع کل',
    '',
    '',
    '',
    `تعداد گره‌ها: ${nodes.length}`,
    `برگ‌ها: ${nodes.filter((n: any) => n.level === 'L').length}`,
  ]);
  summaryRow.font = { name: EXCEL_FONT_NAME, bold: true, size: 11 };
  summaryRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.summaryBg } };
  summaryRow.height = 30;

  return sheet;
}

// ============================================
// تابع ایجاد شیت شکاف‌ها
// ============================================

export function createGapsSheet(
  workbook: ExcelJS.Workbook,
  gaps: any[],
  sheetName: string = 'شکاف‌ها'
) {
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ rightToLeft: true }],
  });

  sheet.getColumn(1).width = 10;
  sheet.getColumn(2).width = 30;
  sheet.getColumn(3).width = 20;
  sheet.getColumn(4).width = 20;
  sheet.getColumn(5).width = 20;
  sheet.getColumn(6).width = 30;

  // عنوان
  sheet.mergeCells('A1:F1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'شکاف‌های دانشی';
  titleCell.font = { name: EXCEL_FONT_NAME, bold: true, size: 16, color: { argb: EXCEL_COLORS.titleText } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells('A2:F2');
  const subCell = sheet.getCell('A2');
  subCell.value = `تاریخ: ${format(new Date(), 'yyyy/MM/dd HH:mm')}`;
  subCell.font = { name: EXCEL_FONT_NAME, size: 10, color: { argb: EXCEL_COLORS.subtitleText } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // هدر
  const headers = ['شناسه', 'گره مورد نیاز', 'وضعیت', 'نوع', 'اولویت', 'گره تولیدشده'];
  const headerRow = sheet.addRow(headers);
  headerRow.font = { name: EXCEL_FONT_NAME, bold: true, size: 11, color: { argb: EXCEL_COLORS.headerText } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.headerBgSecondary } };
  headerRow.height = 30;

  // داده‌ها
  for (const gap of gaps) {
    const statusColors: Record<string, string> = {
      'open': EXCEL_COLORS.gapBg,
      'filled': EXCEL_COLORS.filledBg,
      'partially_filled': EXCEL_COLORS.partialBg,
    };
    const color = statusColors[gap.status] || 'FFFFFFFF';

    const row = sheet.addRow([
      gap.id,
      gap.requiredNode?.title || 'نامشخص',
      gap.status === 'open' ? 'باز (گپ)' : gap.status === 'filled' ? 'پر شده' : 'نیمه‌پر',
      gap.gapType || '-',
      gap.priority || 'متوسط',
      gap.producedNode?.title || '-',
    ]);
    row.alignment = { vertical: 'middle' };
    row.height = 25;
    row.eachCell((cell: any) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    });
  }

  return sheet;
}

// ============================================
// تابع ایجاد شیت مسائل
// ============================================

export function createIssuesSheet(
  workbook: ExcelJS.Workbook,
  issues: any[],
  sheetName: string = 'مسائل'
) {
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ rightToLeft: true }],
  });

  sheet.getColumn(1).width = 10;
  sheet.getColumn(2).width = 35;
  sheet.getColumn(3).width = 25;
  sheet.getColumn(4).width = 20;
  sheet.getColumn(5).width = 20;
  sheet.getColumn(6).width = 20;
  sheet.getColumn(7).width = 20;

  // عنوان
  sheet.mergeCells('A1:AH1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'نظام مسائل';
  titleCell.font = { name: EXCEL_FONT_NAME, bold: true, size: 16, color: { argb: EXCEL_COLORS.titleText } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells('A2:AH2');
  const subCell = sheet.getCell('A2');
  subCell.value = `تاریخ: ${format(new Date(), 'yyyy/MM/dd HH:mm')}`;
  subCell.font = { name: EXCEL_FONT_NAME, size: 10, color: { argb: EXCEL_COLORS.subtitleText } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // هدر
  const headers = [
    'شناسه', 'عنوان', 'راستای راه‌حل', 'یگان متولی', 'سطح محرمانگی', 'اولویت اقدام',
    'تاریخ تصویب', 'نوع دانش', 'سطح کلان پروژه', 'مرجع تصویب', 'نوع پروژه پژوهشی',
    'نوع پروژه دانشی', 'رویدادها', 'کلان پروژه (پویا)', 'دیپلماسی علمی', 'همکاران',
    'شبکه همکاران (پویا)', 'سند بالادستی', 'بودجه مورد نیاز', 'بودجه مصوب', 'بودجه تخصیص یافته',
    'زمان مورد انتظار (ماه)', 'درصد پیشرفت', 'اقدامات انجام شده', 'گلوگاه‌ها', 'دستورات',
    'تیم حل مسئله', 'بیان مسئله', 'اطلاعات قرارداد', 'مقطع ۲۰ درصد', 'مقطع ۵۰ درصد',
    'مقطع ۱۰۰ درصد', 'کاربست', 'وضعیت'
  ];
  sheet.columns = headers.map(h => ({ header: h, width: 20 }));
  const headerRow = sheet.addRow(headers);
  headerRow.font = { name: EXCEL_FONT_NAME, bold: true, size: 11, color: { argb: EXCEL_COLORS.headerText } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.headerBg } };
  headerRow.height = 30;

  // داده‌ها
  for (const issue of issues) {
    const statusLabels: Record<string, string> = {
      'pending': 'در انتظار',
      'in_progress': 'در حال اجرا',
      'completed': 'تکمیل شده',
      'canceled': 'لغو شده',
      'on_hold': 'متوقف',
    };

    const row = sheet.addRow([
      issue.id,
      issue.title || '',
      issue.solutionDirection || '',
      issue.responsibleUnit || '',
      issue.confidentialityLevel || '',
      issue.actionPriority || '',
      issue.approvalDate || '',
      issue.knowledgeType || '',
      issue.projectLevel || '',
      issue.approvalAuthority || '',
      issue.researchProjectType || '',
      issue.knowledgeProjectType || '',
      issue.events || '',
      typeof issue.macroProject === 'string' ? issue.macroProject : JSON.stringify(issue.macroProject || {}),
      issue.scientificDiplomacy || '',
      issue.collaborators || '',
      typeof issue.collaborationNetwork === 'string' ? issue.collaborationNetwork : JSON.stringify(issue.collaborationNetwork || {}),
      issue.referenceDocument || '',
      new Intl.NumberFormat('fa-IR').format(issue.requiredBudget || 0),
      new Intl.NumberFormat('fa-IR').format(issue.approvedBudget || 0),
      new Intl.NumberFormat('fa-IR').format(issue.assignedBudget || 0),
      issue.expectedMonths || 0,
      `${issue.completionPercent || 0}%`,
      issue.actionsTaken || '',
      issue.bottlenecks || '',
      issue.orders || '',
      typeof issue.issueResolutionTeam === 'string' ? issue.issueResolutionTeam : JSON.stringify(issue.issueResolutionTeam || {}),
      typeof issue.needStatement === 'string' ? issue.needStatement : JSON.stringify(issue.needStatement || {}),
      typeof issue.contract === 'string' ? issue.contract : JSON.stringify(issue.contract || {}),
      typeof issue.stage20 === 'string' ? issue.stage20 : JSON.stringify(issue.stage20 || {}),
      typeof issue.stage50 === 'string' ? issue.stage50 : JSON.stringify(issue.stage50 || {}),
      typeof issue.stage100 === 'string' ? issue.stage100 : JSON.stringify(issue.stage100 || {}),
      typeof issue.application === 'string' ? issue.application : JSON.stringify(issue.application || {}),
      issue.status === 'pending' ? '⏳ در انتظار' :
      issue.status === 'in_progress' ? '🔄 در حال اجرا' :
      issue.status === 'completed' ? '✅ تکمیل شده' :
      issue.status === 'canceled' ? '❌ لغو شده' : '⏸️ متوقف',
    ]);
    row.alignment = { vertical: 'middle' };
    row.height = 25;
  }

  return sheet;
}

// ============================================
// تابع ایجاد گزارش کامل
// ============================================

export async function createFullReport(
  workbook: ExcelJS.Workbook,
  data: {
    tree: any;
    nodes: any[];
    gaps: any[];
    issues: any[];
  },
  filename: string
) {
  // شیت درختواره
  createTreeSheet(workbook, data.tree, data.nodes);

  // شیت شکاف‌ها
  if (data.gaps.length > 0) {
    createGapsSheet(workbook, data.gaps);
  }

  // شیت مسائل
  if (data.issues.length > 0) {
    createIssuesSheet(workbook, data.issues);
  }

  // شیت اطلاعات کلی
  const infoSheet = workbook.addWorksheet('اطلاعات کلی', {
    views: [{ rightToLeft: true }],
  });

  infoSheet.getColumn(1).width = 30;
  infoSheet.getColumn(2).width = 30;

  const infoData = [
    ['گزارش کامل سیستم مدیریت دانش', ''],
    ['', ''],
    ['نام سیستم', 'سیستم مدیریت دانش (DANA)'],
    ['تاریخ تهیه', format(new Date(), 'yyyy/MM/dd HH:mm')],
    ['', ''],
    ['آمار کلی', ''],
    ['تعداد گره‌ها', data.nodes.length],
    ['تعداد برگ‌ها', data.nodes.filter((n: any) => n.level === 'L').length],
    ['تعداد گپ‌ها', data.gaps.length],
    ['تعداد مسائل', data.issues.length],
    ['', ''],
    ['وضعیت مسائل', ''],
    ['در انتظار', data.issues.filter((i: any) => i.status === 'pending').length],
    ['در حال اجرا', data.issues.filter((i: any) => i.status === 'in_progress').length],
    ['تکمیل شده', data.issues.filter((i: any) => i.status === 'completed').length],
  ];

  for (const [label, value] of infoData) {
    const row = infoSheet.addRow([label, value]);
    row.alignment = { vertical: 'middle' };
    if (typeof label === 'string' && (label.includes('گزارش') || label.includes('آمار') || label.includes('وضعیت'))) {
      row.font = { name: EXCEL_FONT_NAME, bold: true, size: 12 };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, filename);
}

export default {
  EXCEL_FONT_NAME,
  EXCEL_COLORS,
  excelStyles,
  applyStyleToRow,
  applyStyleToCell,
  createTreeSheet,
  createGapsSheet,
  createIssuesSheet,
  createFullReport,
};