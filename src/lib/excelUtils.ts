// src/lib/excelUtils.ts
// ابزارهای کمکی برای تولید اکسل

import ExcelJS from 'exceljs';

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

// ایجاد شیت درختواره
export function createTreeSheet(workbook: ExcelJS.Workbook, tree: any, nodes: any[], sheetName: string = 'درختواره') {
  const sheet = workbook.addWorksheet(sheetName, { views: [{ rightToLeft: true }] });
  sheet.getColumn(1).width = 10;
  sheet.getColumn(2).width = 30;
  sheet.getColumn(3).width = 15;
  sheet.getColumn(4).width = 30;
  sheet.getColumn(5).width = 20;
  sheet.getColumn(6).width = 25;

  sheet.mergeCells('A1:F1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `درختواره: ${tree.name}`;
  titleCell.font = { name: EXCEL_FONT_NAME, bold: true, size: 16, color: { argb: EXCEL_COLORS.titleText } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells('A2:F2');
  const subCell = sheet.getCell('A2');
  subCell.value = `نوع: ${tree.type} • تاریخ: ${new Date().toLocaleDateString('fa-IR')}`;
  subCell.font = { name: EXCEL_FONT_NAME, size: 10, color: { argb: EXCEL_COLORS.subtitleText } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };

  const headers = ['شناسه', 'عنوان', 'سطح', 'والد', 'وضعیت گپ', 'قالب‌ها'];
  const headerRow = sheet.addRow(headers);
  headerRow.font = { name: EXCEL_FONT_NAME, bold: true, size: 11, color: { argb: EXCEL_COLORS.headerText } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.headerBg } };
  headerRow.height = 30;

  for (const node of nodes) {
    const templates = (Array.isArray(node.templateIds) ? node.templateIds : (node.templateIds ? String(node.templateIds).split(',').filter(Boolean) : [])).join(', ') || '';
    const parentTitle = nodes.find((n: any) => n.id === node.parentId)?.title || 'ریشه';
    const row = sheet.addRow([node.id, node.title, node.level, parentTitle, node.gapStatus || 'ندارد', templates]);
    row.alignment = { vertical: 'middle' };
    row.height = 25;
  }

  const summaryRow = sheet.addRow(['جمع کل', '', '', '', `تعداد گره‌ها: ${nodes.length}`, `برگ‌ها: ${nodes.filter((n: any) => n.level === 'L').length}`]);
  summaryRow.font = { name: EXCEL_FONT_NAME, bold: true, size: 11 };
  summaryRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.summaryBg } };
  summaryRow.height = 30;

  return sheet;
}

// ایجاد شیت شکاف‌ها
export function createGapsSheet(workbook: ExcelJS.Workbook, gaps: any[], sheetName: string = 'شکاف‌ها') {
  const sheet = workbook.addWorksheet(sheetName, { views: [{ rightToLeft: true }] });
  sheet.getColumn(1).width = 10;
  sheet.getColumn(2).width = 30;
  sheet.getColumn(3).width = 20;
  sheet.getColumn(4).width = 20;
  sheet.getColumn(5).width = 20;
  sheet.getColumn(6).width = 30;

  sheet.mergeCells('A1:F1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'شکاف‌های دانشی';
  titleCell.font = { name: EXCEL_FONT_NAME, bold: true, size: 16, color: { argb: EXCEL_COLORS.titleText } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells('A2:F2');
  const subCell = sheet.getCell('A2');
  subCell.value = `تاریخ: ${new Date().toLocaleDateString('fa-IR')}`;
  subCell.font = { name: EXCEL_FONT_NAME, size: 10, color: { argb: EXCEL_COLORS.subtitleText } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };

  const headers = ['شناسه', 'گره مورد نیاز', 'وضعیت', 'نوع', 'اولویت', 'گره تولیدشده'];
  const headerRow = sheet.addRow(headers);
  headerRow.font = { name: EXCEL_FONT_NAME, bold: true, size: 11, color: { argb: EXCEL_COLORS.headerText } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.headerBgSecondary } };
  headerRow.height = 30;

  for (const gap of gaps) {
    const statusColors: Record<string, string> = {
      'open': EXCEL_COLORS.gapBg,
      'filled': EXCEL_COLORS.filledBg,
      'partially_filled': EXCEL_COLORS.partialBg,
    };
    const color = statusColors[gap.status] || 'FFFFFFFF';
    const row = sheet.addRow([gap.id, gap.requiredNode?.title || 'نامشخص', gap.status === 'open' ? 'باز (گپ)' : gap.status === 'filled' ? 'پر شده' : 'نیمه‌پر', gap.gapType || '-', gap.priority || 'متوسط', gap.producedNode?.title || '-']);
    row.alignment = { vertical: 'middle' };
    row.height = 25;
    row.eachCell((cell: any) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }; });
  }

  return sheet;
}

export default {
  EXCEL_FONT_NAME,
  EXCEL_COLORS,
  excelStyles,
  applyStyleToRow,
  applyStyleToCell,
  createTreeSheet,
  createGapsSheet,
};