// server/routes/unitDataExchangeRoutes.ts
// موتور جامع تبادل اطلاعات یگان‌ها بر اساس ساختار سازمانی و دوره زمانی
// تولید خروجی خام اکسل، خروجی نهایی برای یگان بالادستی، پیش‌نمایش، اعتبارسنجی و همگام‌سازی

import { Router } from 'express';
import { Readable } from 'stream';
import ExcelJS from 'exceljs';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { db, sqlite } from '../../src/db/index.js';
import { knowledgeTrees, treeNodes, issues, periods, bases, units, researchItems, gaps } from '../../src/db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import { logAudit } from '../utils/audit.js';
import { requireAuth } from '../middleware/rbac.js';
import { getUserOrgScope } from '../utils/orgAccess.js';
import { AuthRequest } from '../types/AuthRequest.js';

export const unitDataExchangeRoutes = Router();

// عناوین ردیف‌های نمونه آموزشی جهت جلوگیری قطعی از ورود به دیتابیس واقعی
export const KNOWN_SAMPLE_NODE_TITLES = new Set([
  'سامانه‌ها و تجهیزات تخصصی یگان',
  'فناوری الکترونیک و ارتباطات امن',
  'سیستم پردازش سیگنال بلادرنگ',
  'الگوریتم رمزنگاری مقاوم به نویز',
  'قابلیت اطمینان عملکردی ۹۹.۵٪',
  'پروژه تولیدی رادیو تاکتیکی نوین',
]);

export const KNOWN_SAMPLE_ISSUE_TITLES = new Set([
  'اختلال و تضعیف سیگنال در فرکانس‌های عملیاتی خاص',
]);

export const KNOWN_SAMPLE_RESEARCH_TITLES = new Set([
  'طراحی و پیاده‌سازی پروتکل ارتباطی امن ضد تداخل در شرایط جنگ الکترونیک',
]);

export function isSampleNodeRow(title?: string | null, desc?: string | null): boolean {
  if (!title) return false;
  const t = title.trim();
  if (KNOWN_SAMPLE_NODE_TITLES.has(t)) return true;
  if (t.includes('نمونه آموزشی') || (desc && desc.includes('نمونه آموزشی'))) return true;
  return false;
}

export function isSampleIssueRow(title?: string | null, desc?: string | null): boolean {
  if (!title) return false;
  const t = title.trim();
  if (KNOWN_SAMPLE_ISSUE_TITLES.has(t)) return true;
  if (t.includes('نمونه آموزشی') || (desc && desc.includes('نمونه آموزشی'))) return true;
  return false;
}

export function isSampleResearchRow(title?: string | null, nodeTitle?: string | null, desc?: string | null): boolean {
  if (!title && !nodeTitle) return false;
  const t = (title || '').trim();
  const nt = (nodeTitle || '').trim();
  if (KNOWN_SAMPLE_RESEARCH_TITLES.has(t)) return true;
  if (nt === 'الگوریتم رمزنگاری مقاوم به نویز' && t.includes('پروتکل ارتباطی')) return true;
  if (t.includes('نمونه آموزشی') || (desc && desc.includes('نمونه آموزشی'))) return true;
  return false;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
});

// ایجاد جداول مدیریت نسخه‌ها و لاگ تغییرات در صورت عدم وجود
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS sync_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id INTEGER REFERENCES units(id) ON DELETE CASCADE,
    period_id INTEGER REFERENCES periods(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    version_label TEXT NOT NULL,
    file_name TEXT,
    source_type TEXT DEFAULT 'excel_cd',
    applied_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_name TEXT,
    summary TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sync_versions_unit_idx ON sync_versions(unit_id);
  CREATE INDEX IF NOT EXISTS sync_versions_period_idx ON sync_versions(period_id);

  CREATE TABLE IF NOT EXISTS record_version_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version_id INTEGER NOT NULL REFERENCES sync_versions(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    entity_title TEXT NOT NULL,
    action TEXT NOT NULL,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    conflict_detected INTEGER DEFAULT 0,
    resolution_choice TEXT,
    resolved_by TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS record_version_logs_version_idx ON record_version_logs(version_id);
  CREATE INDEX IF NOT EXISTS record_version_logs_entity_idx ON record_version_logs(entity_type, entity_id);
`);

// رنگ‌ها و استایل‌های استاندارد اکسل
const FONT_NAME = 'Vazirmatn';
const BRAND_PRIMARY = 'FF1E40AF'; // آبی تیره
const BRAND_ACCENT = 'FF2563EB'; // آبی اصلی
const BRAND_TEAL = 'FF0F766E';   // سبز کله‌غازی
const BRAND_PURPLE = 'FF6B21A8'; // بنفش تیره
const BG_HEADER = 'FF1D4ED8';
const BG_LIGHT = 'FFF8FAFC';
const BG_MUTED = 'FFF1F5F9';
const BORDER_COLOR = 'FFE2E8F0';

/**
 * تابع ساخت ورک‌بوک جامع تبادل داده یگان با سازمان بالادستی
 */
async function generateUnitExchangeWorkbook({
  unitId,
  periodId,
  isFinalPackage = false,
  user,
}: {
  unitId: number;
  periodId: number;
  isFinalPackage?: boolean;
  user?: any;
}): Promise<{ workbook: ExcelJS.Workbook; filename: string; unitName: string; periodName: string }> {
  // ۱. دریافت مشخصات یگان و دوره
  const unitRecord = sqlite.prepare(`
    SELECT u.id, u.name as unit_name, b.id as base_id, b.name as base_name
    FROM units u
    JOIN bases b ON u.base_id = b.id
    WHERE u.id = ?
  `).get(unitId) as { id: number; unit_name: string; base_id: number; base_name: string } | undefined;

  if (!unitRecord) {
    throw new Error('یگان سازمانی انتخاب‌شده در سامانه یافت نشد.');
  }

  const periodRecord = sqlite.prepare('SELECT id, name, start_date, end_date FROM periods WHERE id = ?').get(periodId) as {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
  } | undefined;

  if (!periodRecord) {
    throw new Error('دوره زمانی انتخاب‌شده در سامانه یافت نشد.');
  }

  // ۲. استخراج مقادیر پایه‌ای سیستم جهت پر کردن دراپ‌دان‌ها (Dropdown Lookups)
  const getLookupNames = (tableName: string): string[] => {
    try {
      const rows = sqlite.prepare(`SELECT name FROM ${tableName} WHERE is_active = 1 ORDER BY sort_order ASC, id ASC`).all() as any[];
      return rows.map(r => String(r.name).trim()).filter(Boolean);
    } catch {
      return [];
    }
  };

  const knowledgeTypesList = getLookupNames('knowledge_types');
  const actionPrioritiesList = getLookupNames('action_priorities');
  const projectLevelsList = getLookupNames('project_levels');
  const confidentialityLevelsList = getLookupNames('confidentiality_levels');
  const approvalAuthoritiesList = getLookupNames('approval_authorities');
  const knowledgeProjectTypesList = getLookupNames('knowledge_project_types');
  const researchProjectTypesList = getLookupNames('research_project_types');
  const programCoveragesList = getLookupNames('program_coverages');

  const ktOptions = knowledgeTypesList.length > 0 ? knowledgeTypesList : ['نظریه', 'الگو', 'راهبرد', 'راه‌کار و توصیه', 'دانش نوظهور', 'معماری', 'دانش فنی', 'نقشه‌راه', 'ایده و ابتکار', 'سناریو', 'خلاقیت و نوآوری', 'درس‌آموخته و تجربیات', 'آیین‌نامه و دستورالعمل', 'مستند فنی و تخصصی'];
  const apOptions = actionPrioritiesList.length > 0 ? actionPrioritiesList : ['بحرانی', 'خیلی زیاد', 'زیاد', 'متوسط', 'پایین'];
  const plOptions = projectLevelsList.length > 0 ? projectLevelsList : ['راهبردی', 'سطح ۱', 'سطح ۲', 'تاکتیکی', 'عملیاتی'];
  const clOptions = confidentialityLevelsList.length > 0 ? confidentialityLevelsList : ['عادی', 'محرمانه', 'خیلی محرمانه', 'سری', 'به‌کلی سری'];
  const aaOptions = approvalAuthoritiesList.length > 0 ? approvalAuthoritiesList : ['شورای عالی دانش و پژوهش', 'فرماندهی نیرو', 'معاونت دانش و پژوهش', 'شورای پژوهشی پایگاه / یگان'];
  const kpOptions = knowledgeProjectTypesList.length > 0 ? knowledgeProjectTypesList : ['مستندسازی و تدوین دانش', 'تجربه‌نگاری و ثبت خاطرات عملیاتی', 'تاریخ شفاهی', 'تدوین درس‌آموخته', 'استانداردسازی و الگوبرداری', 'شناسایی و اکتساب دانش نوین'];
  const rpOptions = researchProjectTypesList.length > 0 ? researchProjectTypesList : ['آینده‌پژوهی و سناریوپردازی', 'نقد، مناظره و کرسی نظریه‌پردازی', 'طرح پژوهشی راهبردی', 'مطالعات تطبیقی و الگوبرداری', 'طرح ارتقا و بهینه‌سازی فنی'];
  const pcOptions = programCoveragesList.length > 0 ? programCoveragesList : ['برنامه پنج ساله', 'برنامه سالیانه', 'ابلاغیات', 'تجربیات جنگ'];

  // ۳. استخراج داده‌های موجود یگان برای این دوره
  const trees = sqlite.prepare(`
    SELECT id, name, type FROM knowledge_trees
    WHERE unit_id = ? AND period_id = ?
    ORDER BY id ASC
  `).all(unitId, periodId) as Array<{ id: number; name: string; type: string }>;

  const treeIds = trees.map(t => t.id);
  let existingNodes: any[] = [];
  if (treeIds.length > 0) {
    const placeholders = treeIds.map(() => '?').join(',');
    existingNodes = sqlite.prepare(`
      SELECT n.id, n.tree_id, n.parent_id, n.level, n.title, n.description, n.knowledge_type, n.template_ids, n.is_gap, n.gap_status, kt.type as tree_type
      FROM tree_nodes n
      JOIN knowledge_trees kt ON n.tree_id = kt.id
      WHERE n.tree_id IN (${placeholders})
      ORDER BY n.sort_order ASC, n.id ASC
    `).all(...treeIds);
  }

  // مسائل موجود
  let existingIssues: any[] = [];
  if (existingNodes.length > 0) {
    const nodeIds = existingNodes.map(n => n.id);
    const placeholders = nodeIds.map(() => '?').join(',');
    existingIssues = sqlite.prepare(`
      SELECT i.*, n.title as domain_node_title
      FROM issues i
      LEFT JOIN tree_nodes n ON i.domain_node_id = n.id
      WHERE i.period_id = ? OR i.domain_node_id IN (${placeholders}) OR i.responsible_unit = ?
    `).all(periodId, ...nodeIds, unitRecord.unit_name);
  } else {
    existingIssues = sqlite.prepare(`
      SELECT i.*, n.title as domain_node_title
      FROM issues i
      LEFT JOIN tree_nodes n ON i.domain_node_id = n.id
      WHERE i.period_id = ? OR i.responsible_unit = ?
    `).all(periodId, unitRecord.unit_name);
  }

  // آیتم‌های پژوهشی موجود
  let existingResearch: any[] = [];
  if (existingNodes.length > 0) {
    const nodeIds = existingNodes.map(n => n.id);
    const placeholders = nodeIds.map(() => '?').join(',');
    existingResearch = sqlite.prepare(`
      SELECT r.*, n.title as node_title, i.title as linked_issue_title
      FROM research_items r
      JOIN tree_nodes n ON r.node_id = n.id
      LEFT JOIN issues i ON i.research_item_id = r.id OR i.id = r.issue_id
      WHERE r.node_id IN (${placeholders})
    `).all(...nodeIds);
  }

  // ۴. ساخت ورک‌بوک
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'سامانه جامع مدیریت دانش و نظام مسائل (دانا)';
  workbook.lastModifiedBy = user?.fullName || user?.username || 'کاربر سامانه دانا';
  workbook.created = new Date();

  // -------------------------------------------------------------
  // شیت ۱: شناسنامه سازمانی و امنیتی (تغییر ناپذیر و محافظت شده)
  // -------------------------------------------------------------
  const metaSheet = workbook.addWorksheet('شناسنامه سازمانی', { views: [{ rightToLeft: true }] });
  metaSheet.columns = [
    { key: 'prop', width: 30 },
    { key: 'val', width: 45 },
    { key: 'desc', width: 50 },
  ];

  metaSheet.mergeCells('A1:C1');
  const titleCell = metaSheet.getCell('A1');
  titleCell.value = isFinalPackage
    ? `سامانه دانا — بسته نهایی اطلاعات دانشی و پژوهشی یگان جهت ارائه به سازمان بالادستی`
    : `سامانه دانا — قالب خام استاندارد جمع‌آوری داده یگان تابعه بر اساس ساختار و دوره`;
  titleCell.font = { name: FONT_NAME, bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isFinalPackage ? BRAND_PURPLE : BRAND_PRIMARY } };
  metaSheet.getRow(1).height = 42;

  metaSheet.addRow(['مشخصه سیستمی امنیتی', 'مقدار سیستمی (ثابت و قفل‌شده)', 'راهنمای امنیتی و ساختار']);
  const metaHeader = metaSheet.getRow(2);
  metaHeader.font = { name: FONT_NAME, bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  metaHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BG_HEADER } };
  metaHeader.alignment = { horizontal: 'center', vertical: 'middle' };
  metaHeader.height = 30;

  const metaDataRows = [
    ['شناسه یکتای یگان (Unit ID)', unitRecord.id, 'کد سیستمی یگان؛ تغییر این فیلد سبب رد شدن بسته در سازمان بالادستی می‌گردد'],
    ['نام یگان سازمانی', unitRecord.unit_name, 'یگان تکمیل‌کننده اطلاعات بر اساس ساختار مصوب سازمانی'],
    ['شناسه رده بالادست (Base ID)', unitRecord.base_id, 'کد پایگاه / نیروی بالادست'],
    ['نام نیرو / پایگاه بالادست', unitRecord.base_name, 'رده ناظر و تجمیع‌کننده سازمانی'],
    ['شناسه دوره زمانی (Period ID)', periodRecord.id, 'کد سیستمی دوره مصوب ارزیابی و برنامه‌ریزی'],
    ['عنوان دوره زمانی', periodRecord.name, `بازه مصوب: ${periodRecord.start_date} تا ${periodRecord.end_date}`],
    ['نوع بسته اطلاعاتی', isFinalPackage ? 'بسته نهایی و تجمیعی یگان (Final Export)' : 'قالب خام استاندارد (Raw Template)', 'وضعیت فایل جهت همگام‌سازی'],
    ['نسخه قرارداد تبادل (Contract Version)', '2.0.0', 'نسخه شِمای پایدار تبادل داده دانا'],
    ['تاریخ صدور سند', new Date().toLocaleDateString('fa-IR'), 'تاریخ استخراج سند از سامانه دانا'],
    ['شناسه درختواره‌های مرتبط', treeIds.length > 0 ? treeIds.join(',') : 'درخت جدید', 'شناسه‌های متناظر در پایگاه داده'],
  ];

  metaDataRows.forEach(row => {
    const r = metaSheet.addRow(row);
    r.font = { name: FONT_NAME, size: 10 };
    r.alignment = { horizontal: 'right', vertical: 'middle' };
    r.height = 24;
    r.getCell(1).font = { name: FONT_NAME, bold: true, size: 10 };
    r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BG_MUTED } };
    r.getCell(2).font = { name: FONT_NAME, bold: true, size: 10, color: { argb: 'FF1E3A8A' } };
  });

  // قفل کردن شیت متادیتا جهت جلوگیری از دستکاری شناسه یگان و دوره
  await metaSheet.protect('DANA_SECURITY_LOCK_2026', {
    selectLockedCells: true,
    selectUnlockedCells: true,
  });

  // -------------------------------------------------------------
  // شیت ۲: درخت دانش (مورد نیاز و تولید شده)
  // -------------------------------------------------------------
  const treeSheet = workbook.addWorksheet('درخت دانش', { views: [{ rightToLeft: true }] });
  treeSheet.columns = [
    { key: 'nodeId', width: 14 },
    { key: 'treeType', width: 18 },
    { key: 'title', width: 34 },
    { key: 'level', width: 18 },
    { key: 'parentTitle', width: 32 },
    { key: 'knowledgeType', width: 22 },
    { key: 'isGap', width: 16 },
    { key: 'gapStatus', width: 18 },
    { key: 'description', width: 45 },
    { key: 'templateIds', width: 20 },
  ];

  treeSheet.mergeCells('A1:J1');
  const treeTitle = treeSheet.getCell('A1');
  treeTitle.value = `ساختار درختواره دانش یگان: ${unitRecord.unit_name} (دوره: ${periodRecord.name}) — درخت‌های مورد نیاز و موجود`;
  treeTitle.font = { name: FONT_NAME, bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  treeTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  treeTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_ACCENT } };
  treeSheet.getRow(1).height = 36;

  const treeHeaders = [
    'شناسه گره (سیستمی)',
    'نوع درختواره *',
    'عنوان گره دانشی *',
    'سطح دانشی (R/T/B/SB/L/Q) *',
    'عنوان گره بالادست (والد)',
    'نوع دانش',
    'دارای گپ دانشی؟',
    'وضعیت گپ',
    'شرح و توضیحات گره',
    'شناسه قالب‌های مرتبط',
  ];
  const treeHeaderRow = treeSheet.addRow(treeHeaders);
  treeHeaderRow.font = { name: FONT_NAME, bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
  treeHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BG_HEADER } };
  treeHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };
  treeHeaderRow.height = 30;

  if (existingNodes.length > 0) {
    existingNodes.forEach(node => {
      const parent = existingNodes.find(p => p.id === node.parent_id);
      const r = treeSheet.addRow([
        node.id,
        node.tree_type === 'required' ? 'مورد نیاز' : 'تولید شده',
        node.title,
        node.level,
        parent?.title || '',
        node.knowledge_type || '',
        node.is_gap === 1 ? 'بله' : 'خیر',
        node.gap_status === 'open' ? 'باز' : (node.gap_status === 'partially_filled' ? 'نیمه‌پر' : 'پر شده'),
        node.description || '',
        node.template_ids || '',
      ]);
      r.font = { name: FONT_NAME, size: 10 };
      r.alignment = { horizontal: 'right', vertical: 'middle' };
      r.height = 24;
    });
  }

  // اعتبارسنجی دراپ‌دان برای شیت درخت دانش (سطر ۳ تا ۵۰۰)
  const treeTypeDropdownFormula = '"مورد نیاز,تولید شده"';
  const levelDropdownFormula = '"R,T,B,SB,L,Q"';
  const isGapDropdownFormula = '"بله,خیر"';
  const gapStatusDropdownFormula = '"باز,پر شده,نیمه‌پر"';
  const ktDropdownFormula = `"${ktOptions.slice(0, 15).join(',')}"`;

  for (let rowIdx = 3; rowIdx <= Math.max(existingNodes.length + 50, 100); rowIdx++) {
    const row = treeSheet.getRow(rowIdx);
    row.getCell(2).dataValidation = { type: 'list', allowBlank: false, formulae: [treeTypeDropdownFormula] };
    row.getCell(4).dataValidation = { type: 'list', allowBlank: false, formulae: [levelDropdownFormula] };
    row.getCell(6).dataValidation = { type: 'list', allowBlank: true, formulae: [ktDropdownFormula] };
    row.getCell(7).dataValidation = { type: 'list', allowBlank: true, formulae: [isGapDropdownFormula] };
    row.getCell(8).dataValidation = { type: 'list', allowBlank: true, formulae: [gapStatusDropdownFormula] };
  }

  // -------------------------------------------------------------
  // شیت ۳: شناسنامه نظام مسائل (Issues)
  // -------------------------------------------------------------
  const issueSheet = workbook.addWorksheet('نظام مسائل', { views: [{ rightToLeft: true }] });
  issueSheet.columns = [
    { key: 'issueId', width: 14 },
    { key: 'title', width: 36 },
    { key: 'solutionDirection', width: 34 },
    { key: 'description', width: 40 },
    { key: 'actionPriority', width: 18 },
    { key: 'projectLevel', width: 18 },
    { key: 'confidentialityLevel', width: 18 },
    { key: 'knowledgeType', width: 20 },
    { key: 'knowledgeProjectType', width: 22 },
    { key: 'researchProjectType', width: 22 },
    { key: 'approvalAuthority', width: 24 },
    { key: 'domainNodeTitle', width: 30 },
    { key: 'requiredBudget', width: 18 },
    { key: 'approvedBudget', width: 18 },
    { key: 'completionPercent', width: 18 },
    { key: 'bottlenecks', width: 35 },
    { key: 'actionsTaken', width: 35 },
    { key: 'status', width: 18 },
  ];

  issueSheet.mergeCells('A1:R1');
  const issueTitle = issueSheet.getCell('A1');
  issueTitle.value = `شناسنامه نظام مسائل یگان: ${unitRecord.unit_name} (دوره: ${periodRecord.name})`;
  issueTitle.font = { name: FONT_NAME, bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  issueTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  issueTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_TEAL } };
  issueSheet.getRow(1).height = 36;

  const issueHeaders = [
    'شناسه مسئله (سیستمی)',
    'عنوان مسئله *',
    'جهت‌گیری راه حل',
    'شرح و بیان نیاز/مسئله',
    'اولویت اقدام *',
    'سطح پروژه *',
    'سطح محرمانگی *',
    'نوع دانش *',
    'نوع پروژه دانشی',
    'نوع پروژه پژوهشی',
    'مرجع تصویب',
    'گره دانشی مرتبط (عنوان)',
    'بودجه مورد نیاز (میلیون ریال)',
    'بودجه مصوب (میلیون ریال)',
    'درصد پیشرفت (۰ تا ۱۰۰)',
    'گلوگاه‌ها و چالش‌های اصلی',
    'اقدامات انجام‌شده',
    'وضعیت مسئله',
  ];
  const issueHeaderRow = issueSheet.addRow(issueHeaders);
  issueHeaderRow.font = { name: FONT_NAME, bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
  issueHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
  issueHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };
  issueHeaderRow.height = 30;

  if (existingIssues.length > 0) {
    existingIssues.forEach(issue => {
      const node = existingNodes.find(n => n.id === issue.domain_node_id);
      const r = issueSheet.addRow([
        issue.id,
        issue.title,
        issue.solution_direction || '',
        issue.need_statement || '',
        issue.action_priority || 'متوسط',
        issue.project_level || 'عملیاتی',
        issue.confidentiality_level || 'عادی',
        issue.knowledge_type || 'دانش فنی',
        issue.knowledge_project_type || '',
        issue.research_project_type || '',
        issue.approval_authority || '',
        node?.title || issue.domain_node_title || '',
        issue.required_budget || 0,
        issue.approved_budget || 0,
        issue.completion_percent || 0,
        issue.bottlenecks || '',
        issue.actions_taken || '',
        issue.status || 'پیش‌نویس',
      ]);
      r.font = { name: FONT_NAME, size: 10 };
      r.alignment = { horizontal: 'right', vertical: 'middle' };
      r.height = 24;
    });
  }

  // اعتبارسنجی دراپ‌دان برای شیت نظام مسائل
  const apDropdownFormula = `"${apOptions.slice(0, 10).join(',')}"`;
  const plDropdownFormula = `"${plOptions.slice(0, 10).join(',')}"`;
  const clDropdownFormula = `"${clOptions.slice(0, 10).join(',')}"`;
  const kpDropdownFormula = `"${kpOptions.slice(0, 10).join(',')}"`;
  const rpDropdownFormula = `"${rpOptions.slice(0, 10).join(',')}"`;
  const aaDropdownFormula = `"${aaOptions.slice(0, 10).join(',')}"`;
  const issueStatusDropdownFormula = '"پیش‌نویس,در حال بررسی,تصویب شده,در حال اجرا,خاتمه یافته"';

  for (let rowIdx = 3; rowIdx <= Math.max(existingIssues.length + 50, 100); rowIdx++) {
    const row = issueSheet.getRow(rowIdx);
    row.getCell(5).dataValidation = { type: 'list', allowBlank: false, formulae: [apDropdownFormula] };
    row.getCell(6).dataValidation = { type: 'list', allowBlank: false, formulae: [plDropdownFormula] };
    row.getCell(7).dataValidation = { type: 'list', allowBlank: false, formulae: [clDropdownFormula] };
    row.getCell(8).dataValidation = { type: 'list', allowBlank: false, formulae: [ktDropdownFormula] };
    row.getCell(9).dataValidation = { type: 'list', allowBlank: true, formulae: [kpDropdownFormula] };
    row.getCell(10).dataValidation = { type: 'list', allowBlank: true, formulae: [rpDropdownFormula] };
    row.getCell(11).dataValidation = { type: 'list', allowBlank: true, formulae: [aaDropdownFormula] };
    row.getCell(18).dataValidation = { type: 'list', allowBlank: true, formulae: [issueStatusDropdownFormula] };
  }

  // -------------------------------------------------------------
  // شیت ۴: درختواره پژوهشی و اولویت‌ها (Research Priorities)
  // -------------------------------------------------------------
  const researchSheet = workbook.addWorksheet('درختواره پژوهشی', { views: [{ rightToLeft: true }] });
  researchSheet.columns = [
    { key: 'researchId', width: 14 },
    { key: 'title', width: 38 },
    { key: 'nodeTitle', width: 32 },
    { key: 'importance', width: 18 },
    { key: 'combatImpact', width: 18 },
    { key: 'costBenefit', width: 18 },
    { key: 'priority', width: 18 },
    { key: 'timeFrame', width: 18 },
    { key: 'programCoverage', width: 22 },
    { key: 'researchProjectType', width: 22 },
    { key: 'issueTitle', width: 32 },
    { key: 'description', width: 45 },
  ];

  researchSheet.mergeCells('A1:L1');
  const resTitle = researchSheet.getCell('A1');
  resTitle.value = `درختواره و اولویت‌های پژوهشی یگان: ${unitRecord.unit_name} (دوره: ${periodRecord.name})`;
  resTitle.font = { name: FONT_NAME, bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  resTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  resTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_PURPLE } };
  researchSheet.getRow(1).height = 36;

  const resHeaders = [
    'شناسه پژوهش (سیستمی)',
    'عنوان موضوع پژوهشی *',
    'گره دانشی مرتبط (عنوان گره)',
    'اهمیت پژوهش *',
    'تاثیر در رزم (۱ تا ۵) *',
    'هزینه به فایده (۱ تا ۵) *',
    'اولویت نهایی پژوهش',
    'افق زمانی اجرا',
    'پوشش برنامه‌ای *',
    'نوع پروژه پژوهشی',
    'مسئله متناظر (عنوان مسئله)',
    'توضیحات و دستاورد مورد انتظار',
  ];
  const resHeaderRow = researchSheet.addRow(resHeaders);
  resHeaderRow.font = { name: FONT_NAME, bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
  resHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF581C87' } };
  resHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };
  resHeaderRow.height = 30;

  if (existingResearch.length > 0) {
    existingResearch.forEach(item => {
      let pcText = '';
      try {
        const parsed = typeof item.program_coverages === 'string' ? JSON.parse(item.program_coverages) : item.program_coverages;
        if (Array.isArray(parsed)) pcText = parsed.join(', ');
      } catch {}

      const r = researchSheet.addRow([
        item.id,
        item.node_title ? `پژوهش مرتبط با: ${item.node_title}` : 'طرح پژوهشی یگان',
        item.node_title || '',
        item.importance || 'کاربردی',
        item.combat_impact || 4,
        item.cost_benefit || 4,
        item.priority || 'الف - اولویت یک',
        item.time_frame || 'میان‌مدت',
        pcText || 'برنامه پنج ساله',
        'طرح پژوهشی راهبردی',
        item.linked_issue_title || '',
        'توسعه قابلیت‌های فنی و دانشی یگان در چارچوب اولویت‌های مصوب',
      ]);
      r.font = { name: FONT_NAME, size: 10 };
      r.alignment = { horizontal: 'right', vertical: 'middle' };
      r.height = 24;
    });
  }

  // اعتبارسنجی دراپ‌دان برای شیت پژوهش
  const importanceDropdownFormula = '"راهبردی,توسعه‌ای,بنیادی,کاربردی"';
  const combatDropdownFormula = '"۵ - بسیار حیاتی,۴ - زیاد,۳ - متوسط,۲ - کم,۱ - ناچیز"';
  const costDropdownFormula = '"۵ - بسیار مطلوب,۴ - مطلوب,۳ - متوسط,۲ - پایین,۱ - نامطلوب"';
  const priorityDropdownFormula = '"الف - اولویت یک,ب - اولویت دو,ج - اولویت سه"';
  const timeFrameDropdownFormula = '"کوتاه‌مدت,میان‌مدت,بلندمدت"';
  const pcDropdownFormula = `"${pcOptions.slice(0, 10).join(',')}"`;

  for (let rowIdx = 3; rowIdx <= Math.max(existingResearch.length + 50, 100); rowIdx++) {
    const row = researchSheet.getRow(rowIdx);
    row.getCell(4).dataValidation = { type: 'list', allowBlank: false, formulae: [importanceDropdownFormula] };
    row.getCell(5).dataValidation = { type: 'list', allowBlank: false, formulae: [combatDropdownFormula] };
    row.getCell(6).dataValidation = { type: 'list', allowBlank: false, formulae: [costDropdownFormula] };
    row.getCell(7).dataValidation = { type: 'list', allowBlank: true, formulae: [priorityDropdownFormula] };
    row.getCell(8).dataValidation = { type: 'list', allowBlank: true, formulae: [timeFrameDropdownFormula] };
    row.getCell(9).dataValidation = { type: 'list', allowBlank: false, formulae: [pcDropdownFormula] };
    row.getCell(10).dataValidation = { type: 'list', allowBlank: true, formulae: [rpDropdownFormula] };
  }

  // -------------------------------------------------------------
  // شیت ۵: راهنما و قوانین کدینگ
  // -------------------------------------------------------------
  const guideSheet = workbook.addWorksheet('راهنمای کدینگ و فرایند', { views: [{ rightToLeft: true }] });
  guideSheet.columns = [
    { key: 'code', width: 22 },
    { key: 'name', width: 30 },
    { key: 'desc', width: 65 },
  ];

  guideSheet.addRow(['موضوع', 'عنوان / کد', 'توضیحات و قوانین ورود داده']);
  const guideHeader = guideSheet.getRow(1);
  guideHeader.font = { name: FONT_NAME, bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  guideHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
  guideHeader.alignment = { horizontal: 'center', vertical: 'middle' };
  guideHeader.height = 30;

  const guideRows = [
    ['سطح دانشی R', 'ریشه (Root)', 'کلان‌ترین سطح درخت دانشی؛ معمولاً ۱ رکورد اصلی است.'],
    ['سطح دانشی T', 'تنه / تم تخصصی (Theme)', 'حوزه‌های موضوعی و تخصصی کلان ذیل ریشه.'],
    ['سطح دانشی B', 'شاخه اصلی (Branch)', 'شاخه‌های اصلی فنی و تخصصی ذیل تم.'],
    ['سطح دانشی SB', 'زیرشاخه (Sub-branch)', 'زیرشاخه‌های تخصصی جهت تفکیک دقیق‌تر.'],
    ['سطح دانشی L', 'برگ دانشی (Leaf)', 'پایین‌ترین واحد مستقل محتوای دانشی که سنجش شکاف و مسئله روی آن صورت می‌پذیرد.'],
    ['سطح دانشی Q', 'شاخص کیفیت (Quality)', 'ویژگی‌های کیفی و استانداردهای الزامی برگ‌ها.'],
    ['نوع درختواره', 'مورد نیاز / تولید شده', 'درخت مورد نیاز نمایانگر اهداف و درخت تولیدشده نمایانگر دستاوردهای واقعی یگان است.'],
    ['ثبات دوره و یگان', 'تغییرناپذیری فیلدهای ثابت', 'شناسه یگان و دوره در شیت اول قفل شده و هنگام بارگذاری در پایگاه سازمان اعتبارسنجی می‌گردد.'],
    ['گردش کار یگان بالادستی', 'سناریوی دریافت و ارسال', '۱. صدور فایل توسط رده بالادست ۲. تکمیل در اکسل یا نرم‌افزار دانا ۳. خروجی نهایی و بارگذاری در سامانه سازمان.'],
    ['قرارداد نسخه ۲.۰', 'جداسازی داده واقعی از نمونه', 'ردیف‌های آموزشی صرفاً در شیت نمونه‌های راهنما قرار دارند و هرگز وارد بانک داده نمی‌شوند.'],
  ];

  guideRows.forEach(g => {
    const r = guideSheet.addRow(g);
    r.font = { name: FONT_NAME, size: 10 };
    r.alignment = { horizontal: 'right', vertical: 'middle' };
    r.height = 24;
  });

  // -------------------------------------------------------------
  // شیت ۶: نمونه‌های راهنما (غیرقابل ورود و کاملاً آموزشی)
  // -------------------------------------------------------------
  const sampleSheet = workbook.addWorksheet('نمونه‌های راهنما (آموزشی)', { views: [{ rightToLeft: true }] });
  sampleSheet.columns = [
    { key: 'section', width: 22 },
    { key: 'title', width: 38 },
    { key: 'field1', width: 26 },
    { key: 'field2', width: 26 },
    { key: 'field3', width: 26 },
    { key: 'desc', width: 50 },
  ];

  sampleSheet.mergeCells('A1:F1');
  const sampleBanner = sampleSheet.getCell('A1');
  sampleBanner.value = '⚠️ توجه مهم: ردیف‌های این شیت صرفاً نمونه آموزشی و راهنمای نگارش هستند. سیستم دانا این شیت را پردازش نمی‌کند. لطفاً رکوردهای واقعی را در شیت‌های اصلی (درخت دانش، نظام مسائل، درختواره پژوهشی) وارد فرمایید.';
  sampleBanner.font = { name: FONT_NAME, bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  sampleBanner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE11D48' } };
  sampleBanner.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  sampleSheet.getRow(1).height = 42;

  const sampleHeaders = ['بخش', 'عنوان نمونه آموزشی', 'مشخصه ۱', 'مشخصه ۲', 'مشخصه ۳', 'توضیحات و راهنما'];
  const sHRow = sampleSheet.addRow(sampleHeaders);
  sHRow.font = { name: FONT_NAME, bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
  sHRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BG_HEADER } };
  sHRow.alignment = { horizontal: 'center', vertical: 'middle' };
  sHRow.height = 30;

  const sampleGuidanceRows = [
    ['درخت دانش', 'سامانه‌ها و تجهیزات تخصصی یگان', 'سطح R (ریشه)', 'نوع: مورد نیاز', 'نوع دانش: نظریه', 'کلان‌ترین گره درخت دانش که ریشه تمام شاخه‌ها است.'],
    ['درخت دانش', 'فناوری الکترونیک و ارتباطات امن', 'سطح T (تم تخصصی)', 'والد: سامانه‌ها و تجهیزات', 'نوع دانش: معماری', 'تم تخصصی ارتباطی ذیل ریشه.'],
    ['درخت دانش', 'سیستم پردازش سیگنال بلادرنگ', 'سطح B (شاخه اصلی)', 'والد: فناوری الکترونیک', 'نوع دانش: دانش فنی', 'شاخه اصلی فنی و عملیاتی.'],
    ['درخت دانش', 'الگوریتم رمزنگاری مقاوم به نویز', 'سطح L (برگ دانشی)', 'شکاف: بله (باز)', 'نوع دانش: دانش نوظهور', 'برگ دانشی که گپ یا مسئله روی آن تعریف می‌شود.'],
    ['درخت دانش', 'قابلیت اطمینان عملکردی ۹۹.۵٪', 'سطح Q (شاخص کیفیت)', 'والد: الگوریتم رمزنگاری', 'نوع دانش: الگو', 'شاخص کیفی الزامی برگ دانشی.'],
    ['نظام مسائل', 'اختلال و تضعیف سیگنال در فرکانس‌های عملیاتی خاص', 'اولویت: خیلی زیاد', 'سطح: سطح ۱', 'بودجه: ۵۰۰ میلیون ریال', 'مسئله نیازمند تعریف جهت‌گیری راه‌حل و اقدامات اجرایی.'],
    ['درختواره پژوهشی', 'طراحی و پیاده‌سازی پروتکل ارتباطی امن ضد تداخل در شرایط جنگ الکترونیک', 'اهمیت: راهبردی', 'تاثیر رزم: ۵ - بسیار حیاتی', 'هزینه فایده: ۴ - مطلوب', 'اولویت پژوهشی مرتبط با برگ دانشی و مسئله متناظر.'],
  ];

  sampleGuidanceRows.forEach(sr => {
    const r = sampleSheet.addRow(sr);
    r.font = { name: FONT_NAME, size: 10 };
    r.alignment = { horizontal: 'right', vertical: 'middle' };
    r.height = 24;
  });

  const safeUnitName = unitRecord.unit_name.replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, '_');
  const safePeriodName = periodRecord.name.replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, '_');
  const filename = isFinalPackage
    ? `بسته_نهایی_دانا_${safeUnitName}_${safePeriodName}.xlsx`
    : `قالب_خام_دانا_${safeUnitName}_${safePeriodName}.xlsx`;

  return { workbook, filename, unitName: unitRecord.unit_name, periodName: periodRecord.name };
}

// ====================================================================
// ۱. صدور فایل قالب خام اکسل بر اساس ساختار یگان و دوره زمانی
// ====================================================================
unitDataExchangeRoutes.get('/template/download', requireAuth, async (req, res) => {
  try {
    const { unitId, periodId, mode } = req.query;
    const user = (req as AuthRequest).user;
    const orgScope = getUserOrgScope(user);

    if (!unitId || !periodId) {
      return res.status(400).json({ error: 'انتخاب یگان سازمانی و دوره زمانی الزامی است.' });
    }

    const uId = Number(unitId);
    const pId = Number(periodId);

    if (!orgScope.canAccessUnit(uId)) {
      return res.status(403).json({ error: 'شما دسترسی به این یگان سازمانی را ندارید.' });
    }

    const isFinalPackage = mode === 'full' || mode === 'export';
    const { workbook, filename, unitName } = await generateUnitExchangeWorkbook({
      unitId: uId,
      periodId: pId,
      isFinalPackage,
      user,
    });

    logAudit({
      userId: user?.id || null,
      action: 'EXPORT',
      entityName: isFinalPackage ? 'بسته نهایی یگان' : 'قالب خام یگان',
      entityId: uId,
      changes: { unitId: uId, periodId: pId, unitName, isFinalPackage },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error('Error generating unit template:', error);
    res.status(500).json({ error: error.message || 'خطا در ایجاد فایل اکسل یگان' });
  }
});

// ====================================================================
// ۱-ب. خروجی ویژه بسته اطلاعاتی برای یگان بالادستی (Export for Upper Org)
// ====================================================================
unitDataExchangeRoutes.get('/export-upper-org', requireAuth, async (req, res) => {
  try {
    const { unitId, periodId } = req.query;
    const user = (req as AuthRequest).user;
    const orgScope = getUserOrgScope(user);

    let uId = unitId ? Number(unitId) : user?.unitId;
    let pId = periodId ? Number(periodId) : null;

    if (!pId) {
      const activeP = sqlite.prepare('SELECT id FROM periods WHERE is_active = 1 LIMIT 1').get() as any;
      pId = activeP?.id || null;
    }

    if (!uId || !pId) {
      return res.status(400).json({ error: 'تعیین یگان سازمانی و دوره زمانی جهت صدور بسته برای یگان بالادست الزامی است.' });
    }

    if (!orgScope.canAccessUnit(uId)) {
      return res.status(403).json({ error: 'شما دسترسی مجاز به استخراج اطلاعات این یگان را ندارید.' });
    }

    const { workbook, filename, unitName } = await generateUnitExchangeWorkbook({
      unitId: uId,
      periodId: pId,
      isFinalPackage: true,
      user,
    });

    logAudit({
      userId: user?.id || null,
      action: 'EXPORT_FOR_UPPER_ORG',
      entityName: 'بسته اطلاعاتی یگان بالادستی',
      entityId: uId,
      changes: { unitId: uId, periodId: pId, unitName },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error('Error exporting for upper org:', error);
    res.status(500).json({ error: error.message || 'خطا در تولید بسته ارسالی به سازمان بالادستی' });
  }
});

// ====================================================================
// ۲. توابع کمکی اعتبارسنجی مشترک و بارگذاری فایل تبادل یگان
// ====================================================================

async function loadExchangeWorkbook(buffer: Buffer, mimetype?: string, originalname?: string): Promise<{ workbook: ExcelJS.Workbook; isCsv: boolean }> {
  const workbook = new ExcelJS.Workbook();
  const isCsv = (mimetype === 'text/csv') || Boolean(originalname && originalname.toLowerCase().endsWith('.csv'));
  if (isCsv) {
    const stream = Readable.from(buffer.toString('utf-8'));
    await workbook.csv.read(stream);
    return { workbook, isCsv: true };
  } else {
    await workbook.xlsx.load(buffer as any);
    return { workbook, isCsv: false };
  }
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  nodeErrors: string[];
  issueErrors: string[];
  researchErrors: string[];
  excludedSampleCount: number;
}

function validateExchangeWorkbook(workbook: ExcelJS.Workbook, isCsv: boolean): ValidationResult {
  const nodeErrors: string[] = [];
  const issueErrors: string[] = [];
  const researchErrors: string[] = [];
  let excludedSampleCount = 0;

  if (isCsv) {
    return {
      valid: false,
      errors: ['فایل با فرمت CSV شناسایی شد اما بسته استاندارد تبادل داده یگان نیازمند ساختار چندشیتی اکسل (XLSX) می‌باشد.'],
      nodeErrors: [],
      issueErrors: [],
      researchErrors: [],
      excludedSampleCount: 0,
    };
  }

  const treeSheet = workbook.getWorksheet('درخت دانش') || workbook.worksheets[1];
  const issueSheet = workbook.getWorksheet('نظام مسائل') || workbook.worksheets[2];
  const researchSheet = workbook.getWorksheet('درختواره پژوهشی') || workbook.worksheets[3];

  const validLevels = ['R', 'T', 'B', 'SB', 'L', 'Q'];
  const validPriorities = ['بحرانی', 'خیلی زیاد', 'زیاد', 'متوسط', 'پایین'];
  const validProjectLevels = ['راهبردی', 'سطح ۱', 'سطح ۲', 'تاکتیکی', 'عملیاتی'];
  const validConfidentialities = ['عادی', 'محرمانه', 'خیلی محرمانه', 'سری', 'به‌کلی سری'];
  const validIssueStatuses = ['پیش‌نویس', 'در حال بررسی', 'تصویب شده', 'در حال اجرا', 'خاتمه یافته', 'لغو شده'];
  const validImportances = ['راهبردی', 'توسعه‌ای', 'بنیادی', 'کاربردی'];

  // ۱. اعتبارسنجی شیت درخت دانش
  if (treeSheet) {
    const seenTitles = new Set<string>();
    treeSheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 2) return;
      const title = row.getCell(3).value?.toString()?.trim();
      const level = row.getCell(4).value?.toString()?.trim().toUpperCase();
      const parentTitle = row.getCell(5).value?.toString()?.trim();
      const desc = row.getCell(9).value?.toString()?.trim();

      if (!title && !level && !parentTitle) return; // سطر خالی

      // ردیف نمونه
      if (isSampleNodeRow(title, desc)) {
        excludedSampleCount++;
        return;
      }

      if (!title) {
        nodeErrors.push(`شیت درخت دانش (ردیف ${rowNumber} - ستون عنوان): عنوان گره دانشی الزامی است.`);
      } else if (title.length < 2) {
        nodeErrors.push(`شیت درخت دانش (ردیف ${rowNumber} - ستون عنوان): عنوان گره "${title}" بسیار کوتاه است (حداقل ۲ کاراکتر).`);
      } else {
        if (seenTitles.has(title.toLowerCase())) {
          nodeErrors.push(`شیت درخت دانش (ردیف ${rowNumber} - ستون عنوان): عنوان گره "${title}" در همین فایل تکراری است.`);
        }
        seenTitles.add(title.toLowerCase());
      }

      if (!level) {
        nodeErrors.push(`شیت درخت دانش (ردیف ${rowNumber} - ${title || 'نامشخص'}): فیلد سطح دانشی الزامی است.`);
      } else if (!validLevels.includes(level)) {
        nodeErrors.push(`شیت درخت دانش (ردیف ${rowNumber} - ${title || 'نامشخص'}): سطح دانشی "${level}" نامعتبر است (باید یکی از R, T, B, SB, L, Q باشد).`);
      }

      if (parentTitle && title && parentTitle.toLowerCase() === title.toLowerCase()) {
        nodeErrors.push(`شیت درخت دانش (ردیف ${rowNumber} - ${title}): گره نمی‌تواند والد خودش باشد.`);
      }
    });
  }

  // ۲. اعتبارسنجی شیت نظام مسائل
  if (issueSheet) {
    const seenIssueTitles = new Set<string>();
    issueSheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 2) return;
      const title = row.getCell(2).value?.toString()?.trim();
      const desc = row.getCell(4).value?.toString()?.trim();
      const priority = row.getCell(5).value?.toString()?.trim();
      const projectLevel = row.getCell(6).value?.toString()?.trim();
      const confidentiality = row.getCell(7).value?.toString()?.trim();
      const reqBudgetVal = row.getCell(13).value;
      const appBudgetVal = row.getCell(14).value;
      const completionVal = row.getCell(15).value;
      const status = row.getCell(18).value?.toString()?.trim();

      if (!title && !priority && reqBudgetVal === null && appBudgetVal === null) return; // سطر خالی

      if (isSampleIssueRow(title, desc)) {
        excludedSampleCount++;
        return;
      }

      if (!title) {
        issueErrors.push(`شیت نظام مسائل (ردیف ${rowNumber} - ستون عنوان): عنوان مسئله الزامی است.`);
      } else if (title.length < 3) {
        issueErrors.push(`شیت نظام مسائل (ردیف ${rowNumber} - ستون عنوان): عنوان مسئله "${title}" بسیار کوتاه است (حداقل ۳ کاراکتر).`);
      } else {
        if (seenIssueTitles.has(title.toLowerCase())) {
          issueErrors.push(`شیت نظام مسائل (ردیف ${rowNumber} - ستون عنوان): مسئله با عنوان "${title}" در همین فایل تکراری است.`);
        }
        seenIssueTitles.add(title.toLowerCase());
      }

      if (priority && !validPriorities.includes(priority)) {
        issueErrors.push(`شیت نظام مسائل (ردیف ${rowNumber} - ${title || 'نامشخص'}): اولویت اقدام "${priority}" نامعتبر است. انتظار می‌رود یکی از (${validPriorities.join(', ')}) باشد.`);
      }

      if (projectLevel && !validProjectLevels.includes(projectLevel)) {
        issueErrors.push(`شیت نظام مسائل (ردیف ${rowNumber} - ${title || 'نامشخص'}): سطح پروژه "${projectLevel}" نامعتبر است. انتظار می‌رود یکی از (${validProjectLevels.join(', ')}) باشد.`);
      }

      if (confidentiality && !validConfidentialities.includes(confidentiality)) {
        issueErrors.push(`شیت نظام مسائل (ردیف ${rowNumber} - ${title || 'نامشخص'}): سطح محرمانگی "${confidentiality}" نامعتبر است. انتظار می‌رود یکی از (${validConfidentialities.join(', ')}) باشد.`);
      }

      if (reqBudgetVal !== null && reqBudgetVal !== undefined && String(reqBudgetVal).trim() !== '') {
        const num = Number(reqBudgetVal);
        if (isNaN(num) || num < 0) {
          issueErrors.push(`شیت نظام مسائل (ردیف ${rowNumber} - ${title || 'نامشخص'}): بودجه مورد نیاز "${reqBudgetVal}" نامعتبر است (باید عدد مثبت یا صفر باشد).`);
        }
      }

      if (appBudgetVal !== null && appBudgetVal !== undefined && String(appBudgetVal).trim() !== '') {
        const num = Number(appBudgetVal);
        if (isNaN(num) || num < 0) {
          issueErrors.push(`شیت نظام مسائل (ردیف ${rowNumber} - ${title || 'نامشخص'}): بودجه مصوب "${appBudgetVal}" نامعتبر است (باید عدد مثبت یا صفر باشد).`);
        }
      }

      if (completionVal !== null && completionVal !== undefined && String(completionVal).trim() !== '') {
        const num = Number(completionVal);
        if (isNaN(num) || num < 0 || num > 100) {
          issueErrors.push(`شیت نظام مسائل (ردیف ${rowNumber} - ${title || 'نامشخص'}): درصد پیشرفت "${completionVal}" نامعتبر است (باید بین ۰ تا ۱۰۰ باشد).`);
        }
      }

      if (status && !validIssueStatuses.includes(status)) {
        issueErrors.push(`شیت نظام مسائل (ردیف ${rowNumber} - ${title || 'نامشخص'}): وضعیت مسئله "${status}" نامعتبر است. انتظار می‌رود یکی از (${validIssueStatuses.join(', ')}) باشد.`);
      }
    });
  }

  // ۳. اعتبارسنجی شیت درختواره پژوهشی
  if (researchSheet) {
    researchSheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 2) return;
      const title = row.getCell(2).value?.toString()?.trim();
      const nodeTitle = row.getCell(3).value?.toString()?.trim();
      const importance = row.getCell(4).value?.toString()?.trim();
      const combatRaw = row.getCell(5).value?.toString()?.trim();
      const costRaw = row.getCell(6).value?.toString()?.trim();
      const desc = row.getCell(12).value?.toString()?.trim();

      if (!title && !nodeTitle && !importance && !combatRaw) return; // سطر خالی

      if (isSampleResearchRow(title, nodeTitle, desc)) {
        excludedSampleCount++;
        return;
      }

      if (!title && !nodeTitle) {
        researchErrors.push(`شیت درختواره پژوهشی (ردیف ${rowNumber}): درج عنوان موضوع پژوهشی یا گره دانشی مرتبط الزامی است.`);
      }

      if (importance && !validImportances.includes(importance)) {
        researchErrors.push(`شیت درختواره پژوهشی (ردیف ${rowNumber} - ${title || nodeTitle}): اهمیت پژوهش "${importance}" نامعتبر است. انتظار می‌رود یکی از (${validImportances.join(', ')}) باشد.`);
      }

      if (combatRaw) {
        const num = parseInt(combatRaw.replace(/[^0-9]/g, ''), 10);
        if (isNaN(num) || num < 1 || num > 5) {
          researchErrors.push(`شیت درختواره پژوهشی (ردیف ${rowNumber} - ${title || nodeTitle}): تاثیر در رزم "${combatRaw}" نامعتبر است (باید بین ۱ تا ۵ باشد).`);
        }
      }

      if (costRaw) {
        const num = parseInt(costRaw.replace(/[^0-9]/g, ''), 10);
        if (isNaN(num) || num < 1 || num > 5) {
          researchErrors.push(`شیت درختواره پژوهشی (ردیف ${rowNumber} - ${title || nodeTitle}): هزینه به فایده "${costRaw}" نامعتبر است (باید بین ۱ تا ۵ باشد).`);
        }
      }
    });
  }

  const allErrors = [...nodeErrors, ...issueErrors, ...researchErrors];
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    nodeErrors,
    issueErrors,
    researchErrors,
    excludedSampleCount,
  };
}

// ====================================================================
// ۲. پیش‌نمایش، اعتبارسنجی و کشف مغایرت‌های فایل دریافتی از یگان
// ====================================================================
unitDataExchangeRoutes.post('/template/preview', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const user = (req as AuthRequest).user;
    const orgScope = getUserOrgScope(user);

    if (!req.file) {
      return res.status(400).json({ error: 'هیچ فایلی ارسال نشده است.' });
    }

    const { workbook, isCsv } = await loadExchangeWorkbook(req.file.buffer, req.file.mimetype, req.file.originalname);

    if (isCsv) {
      return res.status(400).json({
        error: 'فایل ارسالی با فرمت متنی (CSV) شناسایی شد اما بسته استاندارد تبادل داده یگان نیازمند ساختار چندشیتی اکسل (XLSX) می‌باشد. لطفاً از قالب استاندارد اکسل استفاده فرمایید.',
      });
    }

    const metaSheet = workbook.getWorksheet('شناسنامه سازمانی') || workbook.worksheets[0];
    const treeSheet = workbook.getWorksheet('درخت دانش') || workbook.worksheets[1];
    const issueSheet = workbook.getWorksheet('نظام مسائل') || workbook.worksheets[2];
    const researchSheet = workbook.getWorksheet('درختواره پژوهشی') || workbook.worksheets[3];

    // استخراج متادیتا و بررسی تغییرناپذیری
    let unitId: number | null = null;
    let periodId: number | null = null;
    let unitName: string = '';
    let periodName: string = '';

    if (metaSheet) {
      metaSheet.eachRow((row) => {
        const prop = row.getCell(1).value?.toString() || '';
        const val = row.getCell(2).value;
        if (prop.includes('Unit ID') || prop.includes('شناسه یکتای یگان')) {
          unitId = Number(val);
        } else if (prop.includes('Period ID') || prop.includes('شناسه دوره زمانی')) {
          periodId = Number(val);
        } else if (prop.includes('نام یگان')) {
          unitName = String(val || '');
        } else if (prop.includes('عنوان دوره')) {
          periodName = String(val || '');
        }
      });
    }

    if (!unitId && req.body.unitId) unitId = Number(req.body.unitId);
    if (!periodId && req.body.periodId) periodId = Number(req.body.periodId);

    // اعتبارسنجی مقادیر ثابت
    if (!unitId || !periodId) {
      return res.status(400).json({
        error: 'شناسه یگان یا دوره زمانی در فایل اکسل شناسایی نشد یا دستکاری شده است. لطفاً از قالب استاندارد دانای همین یگان استفاده نمایید.',
      });
    }

    // جلوگیری از آپلود اشتباه یک یگان برای یگان دیگر
    if (req.body.unitId && Number(req.body.unitId) !== unitId) {
      return res.status(400).json({
        error: `مغایرت یگان: این فایل متعلق به یگان شناسه ${unitId} (${unitName}) است ولی شما یگان دیگری را انتخاب کرده‌اید. دستکاری ساختار مجاز نیست.`,
      });
    }

    if (!orgScope.canAccessUnit(unitId)) {
      return res.status(403).json({
        error: 'شما مجاز به به‌روزرسانی اطلاعات این یگان نیستید (محدودیت دسترسی یگان‌های موازی).',
      });
    }

    // اعتبارسنجی ساختاری شیت‌ها و ردیف‌ها
    const validation = validateExchangeWorkbook(workbook, isCsv);

    // دریافت اطلاعات موجود در دیتابیس جهت مقایسه و تشخیص مغایرت‌ها
    const existingTrees = sqlite.prepare(`
      SELECT id, name, type FROM knowledge_trees
      WHERE unit_id = ? AND period_id = ?
    `).all(unitId, periodId) as any[];

    const treeIds = existingTrees.map(t => t.id);
    let dbNodes: any[] = [];
    if (treeIds.length > 0) {
      const placeholders = treeIds.map(() => '?').join(',');
      dbNodes = sqlite.prepare(`
        SELECT n.id, n.tree_id, n.parent_id, n.level, n.title, n.description, n.knowledge_type, n.is_gap, n.gap_status, kt.type as tree_type
        FROM tree_nodes n
        JOIN knowledge_trees kt ON n.tree_id = kt.id
        WHERE n.tree_id IN (${placeholders})
      `).all(...treeIds);
    }

    const unitRow = sqlite.prepare('SELECT id, name FROM units WHERE id = ?').get(unitId) as { id: number; name: string } | undefined;
    const currentUnitName = unitRow?.name || unitName;

    const dbIssues = sqlite.prepare(`
      SELECT id, title, solution_direction, need_statement, action_priority, project_level, confidentiality_level, knowledge_type, required_budget, approved_budget, completion_percent, bottlenecks, domain_node_id
      FROM issues WHERE period_id = ? AND (responsible_unit = ? OR responsible_unit IS NULL)
    `).all(periodId, currentUnitName) as any[];

    let dbResearch: any[] = [];
    if (dbNodes.length > 0) {
      const nodeIds = dbNodes.map(n => n.id);
      const placeholders = nodeIds.map(() => '?').join(',');
      dbResearch = sqlite.prepare(`
        SELECT r.id, r.gap_id, r.node_id, r.importance, r.combat_impact, r.cost_benefit, r.priority, r.time_frame, n.title as node_title
        FROM research_items r
        JOIN tree_nodes n ON r.node_id = n.id
        WHERE r.node_id IN (${placeholders})
      `).all(...nodeIds);
    }

    // ۱. استخراج و اعتبارسنجی گره‌های درخت
    const parsedNodes: any[] = [];
    const conflicts: any[] = [];
    let newNodesCount = 0;
    let modifiedNodesCount = 0;
    let unchangedNodesCount = 0;

    if (treeSheet) {
      treeSheet.eachRow((row, rowNumber) => {
        if (rowNumber <= 2) return;
        const nodeId = row.getCell(1).value;
        const treeTypeText = row.getCell(2).value?.toString()?.trim();
        const title = row.getCell(3).value?.toString()?.trim();
        const level = row.getCell(4).value?.toString()?.trim().toUpperCase();
        const parentTitle = row.getCell(5).value?.toString()?.trim();
        const knowledgeType = row.getCell(6).value?.toString()?.trim();
        const isGapText = row.getCell(7).value?.toString()?.trim();
        const gapStatus = row.getCell(8).value?.toString()?.trim();
        const desc = row.getCell(9).value?.toString()?.trim();

        if (!title && !level) return;

        // رد کردن نمونه آموزشی
        if (isSampleNodeRow(title, desc)) return;

        const targetTreeType = (treeTypeText && treeTypeText.includes('تولید')) ? 'produced' : 'required';
        const isGapVal = (isGapText === 'بله' || isGapText === '1' || isGapText === 'true') ? 1 : 0;
        let parsedGapStatus = gapStatus || (isGapVal === 1 ? 'open' : 'filled');
        if (parsedGapStatus === 'باز') parsedGapStatus = 'open';
        else if (parsedGapStatus === 'پر شده') parsedGapStatus = 'filled';
        else if (parsedGapStatus === 'نیمه‌پر') parsedGapStatus = 'partially_filled';

        // تطابق با دیتابیس
        let matchedDbNode: any = null;
        if (nodeId && Number(nodeId)) {
          matchedDbNode = dbNodes.find(n => n.id === Number(nodeId));
        }
        if (!matchedDbNode && title) {
          matchedDbNode = dbNodes.find(n => n.title.trim().toLowerCase() === title.toLowerCase() && n.tree_type === targetTreeType);
        }

        if (matchedDbNode && title) {
          const diffs: any[] = [];
          if (matchedDbNode.title.trim() !== title) {
            diffs.push({ field: 'title', label: 'عنوان گره', currentDb: matchedDbNode.title, incomingFile: title });
          }
          if (matchedDbNode.level !== level) {
            diffs.push({ field: 'level', label: 'سطح دانشی', currentDb: matchedDbNode.level, incomingFile: level });
          }
          if (knowledgeType && (matchedDbNode.knowledge_type || '') !== knowledgeType) {
            diffs.push({ field: 'knowledge_type', label: 'نوع دانش', currentDb: matchedDbNode.knowledge_type || 'تعریف نشده', incomingFile: knowledgeType });
          }
          if ((matchedDbNode.description || '') !== (desc || '')) {
            diffs.push({ field: 'description', label: 'توضیحات', currentDb: matchedDbNode.description || 'ندارد', incomingFile: desc || 'ندارد' });
          }
          if (matchedDbNode.is_gap !== isGapVal) {
            diffs.push({ field: 'is_gap', label: 'وضعیت شکاف', currentDb: matchedDbNode.is_gap ? 'دارد' : 'ندارد', incomingFile: isGapVal ? 'دارد' : 'ندارد' });
          }

          if (diffs.length > 0) {
            modifiedNodesCount++;
            conflicts.push({
              key: `node_${matchedDbNode.id}`,
              type: 'node',
              id: matchedDbNode.id,
              title,
              rowNumber,
              diffs,
            });
          } else {
            unchangedNodesCount++;
          }
        } else {
          newNodesCount++;
        }

        if (title) {
          parsedNodes.push({
            rowNumber,
            nodeId: nodeId ? Number(nodeId) : null,
            treeType: targetTreeType,
            title,
            level: level || 'L',
            parentTitle: parentTitle || null,
            knowledgeType: knowledgeType || null,
            description: desc || null,
            isGap: isGapVal === 1,
            gapStatus: parsedGapStatus,
            statusTag: matchedDbNode ? (conflicts.some(c => c.id === matchedDbNode.id && c.type === 'node') ? 'modified' : 'unchanged') : 'new',
          });
        }
      });
    }

    // ۲. استخراج و اعتبارسنجی مسائل
    const parsedIssues: any[] = [];
    let newIssuesCount = 0;
    let modifiedIssuesCount = 0;
    let unchangedIssuesCount = 0;

    if (issueSheet) {
      issueSheet.eachRow((row, rowNumber) => {
        if (rowNumber <= 2) return;
        const issueId = row.getCell(1).value;
        const title = row.getCell(2).value?.toString()?.trim();
        const solution = row.getCell(3).value?.toString()?.trim();
        const desc = row.getCell(4).value?.toString()?.trim();
        const priority = row.getCell(5).value?.toString()?.trim();
        const projectLevel = row.getCell(6).value?.toString()?.trim();
        const confidentiality = row.getCell(7).value?.toString()?.trim();
        const knowledgeType = row.getCell(8).value?.toString()?.trim();
        const kpType = row.getCell(9).value?.toString()?.trim();
        const rpType = row.getCell(10).value?.toString()?.trim();
        const approvalAuthority = row.getCell(11).value?.toString()?.trim();
        const domainNodeTitle = row.getCell(12).value?.toString()?.trim();
        const reqBudget = Number(row.getCell(13).value) || 0;
        const appBudget = Number(row.getCell(14).value) || 0;
        const completion = Number(row.getCell(15).value) || 0;
        const bottlenecks = row.getCell(16).value?.toString()?.trim();
        const actions = row.getCell(17).value?.toString()?.trim();
        const status = row.getCell(18).value?.toString()?.trim();

        if (!title) return;

        // رد کردن نمونه آموزشی
        if (isSampleIssueRow(title, desc)) return;

        let matchedIssue: any = null;
        if (issueId && Number(issueId)) {
          matchedIssue = dbIssues.find(i => i.id === Number(issueId));
        }
        if (!matchedIssue) {
          matchedIssue = dbIssues.find(i => i.title.trim().toLowerCase() === title.toLowerCase());
        }

        if (matchedIssue) {
          const diffs: any[] = [];
          if (matchedIssue.title.trim() !== title) {
            diffs.push({ field: 'title', label: 'عنوان مسئله', currentDb: matchedIssue.title, incomingFile: title });
          }
          if ((matchedIssue.solution_direction || '') !== (solution || '')) {
            diffs.push({ field: 'solution_direction', label: 'جهت‌گیری راهکار', currentDb: matchedIssue.solution_direction || 'ندارد', incomingFile: solution || 'ندارد' });
          }
          if (priority && (matchedIssue.action_priority || '') !== priority) {
            diffs.push({ field: 'action_priority', label: 'اولویت اقدام', currentDb: matchedIssue.action_priority || 'نامشخص', incomingFile: priority });
          }
          if (knowledgeType && (matchedIssue.knowledge_type || '') !== knowledgeType) {
            diffs.push({ field: 'knowledge_type', label: 'نوع دانش', currentDb: matchedIssue.knowledge_type || 'نامشخص', incomingFile: knowledgeType });
          }
          if (matchedIssue.required_budget !== reqBudget) {
            diffs.push({ field: 'required_budget', label: 'بودجه مورد نیاز', currentDb: matchedIssue.required_budget || 0, incomingFile: reqBudget });
          }

          if (diffs.length > 0) {
            modifiedIssuesCount++;
            conflicts.push({
              key: `issue_${matchedIssue.id}`,
              type: 'issue',
              id: matchedIssue.id,
              title,
              rowNumber,
              diffs,
            });
          } else {
            unchangedIssuesCount++;
          }
        } else {
          newIssuesCount++;
        }

        parsedIssues.push({
          rowNumber,
          issueId: issueId ? Number(issueId) : null,
          title,
          solutionDirection: solution || null,
          description: desc || null,
          actionPriority: priority || 'متوسط',
          projectLevel: projectLevel || 'عملیاتی',
          confidentialityLevel: confidentiality || 'عادی',
          knowledgeType: knowledgeType || null,
          knowledgeProjectType: kpType || null,
          researchProjectType: rpType || null,
          approvalAuthority: approvalAuthority || null,
          domainNodeTitle: domainNodeTitle || null,
          requiredBudget: reqBudget,
          approvedBudget: appBudget,
          completionPercent: completion,
          bottlenecks: bottlenecks || null,
          actionsTaken: actions || null,
          status: status || 'پیش‌نویس',
          statusTag: matchedIssue ? (conflicts.some(c => c.id === matchedIssue.id && c.type === 'issue') ? 'modified' : 'unchanged') : 'new',
        });
      });
    }

    // ۳. استخراج و اعتبارسنجی درختواره پژوهشی
    const parsedResearch: any[] = [];
    let newResearchCount = 0;
    let modifiedResearchCount = 0;
    let unchangedResearchCount = 0;

    if (researchSheet) {
      researchSheet.eachRow((row, rowNumber) => {
        if (rowNumber <= 2) return;
        const resId = row.getCell(1).value;
        const title = row.getCell(2).value?.toString()?.trim();
        const nodeTitle = row.getCell(3).value?.toString()?.trim();
        const importance = row.getCell(4).value?.toString()?.trim();
        const combatImpactRaw = row.getCell(5).value?.toString()?.trim();
        const costBenefitRaw = row.getCell(6).value?.toString()?.trim();
        const priority = row.getCell(7).value?.toString()?.trim();
        const timeFrame = row.getCell(8).value?.toString()?.trim();
        const programCoverage = row.getCell(9).value?.toString()?.trim();
        const rpType = row.getCell(10).value?.toString()?.trim();
        const linkedIssueTitle = row.getCell(11).value?.toString()?.trim();
        const desc = row.getCell(12).value?.toString()?.trim();

        if (!title && !nodeTitle) return;

        // رد کردن نمونه آموزشی
        if (isSampleResearchRow(title, nodeTitle, desc)) return;

        const combatImpact = parseInt(combatImpactRaw?.replace(/[^0-9]/g, '') || '4', 10);
        const costBenefit = parseInt(costBenefitRaw?.replace(/[^0-9]/g, '') || '4', 10);

        let matchedRes: any = null;
        if (resId && Number(resId)) {
          matchedRes = dbResearch.find(r => r.id === Number(resId));
        }
        if (!matchedRes && nodeTitle) {
          matchedRes = dbResearch.find(r => r.node_title?.trim().toLowerCase() === nodeTitle.toLowerCase());
        }

        if (matchedRes) {
          const diffs: any[] = [];
          if (importance && matchedRes.importance !== importance) {
            diffs.push({ field: 'importance', label: 'اهمیت پژوهش', currentDb: matchedRes.importance || 'نامشخص', incomingFile: importance });
          }
          if (matchedRes.combat_impact !== combatImpact) {
            diffs.push({ field: 'combat_impact', label: 'اثر در رزم', currentDb: matchedRes.combat_impact || 0, incomingFile: combatImpact });
          }

          if (diffs.length > 0) {
            modifiedResearchCount++;
            conflicts.push({
              key: `research_${matchedRes.id}`,
              type: 'research',
              id: matchedRes.id,
              title: title || nodeTitle,
              rowNumber,
              diffs,
            });
          } else {
            unchangedResearchCount++;
          }
        } else {
          newResearchCount++;
        }

        parsedResearch.push({
          rowNumber,
          researchId: resId ? Number(resId) : null,
          title: title || `طرح پژوهشی: ${nodeTitle}`,
          nodeTitle: nodeTitle || null,
          importance: importance || 'کاربردی',
          combatImpact,
          costBenefit,
          priority: priority || 'الف',
          timeFrame: timeFrame || 'میان‌مدت',
          programCoverage: programCoverage || null,
          researchProjectType: rpType || null,
          linkedIssueTitle: linkedIssueTitle || null,
          description: desc || null,
          statusTag: matchedRes ? (conflicts.some(c => c.id === matchedRes.id && c.type === 'research') ? 'modified' : 'unchanged') : 'new',
        });
      });
    }

    res.json({
      valid: validation.valid,
      unitId,
      periodId,
      unitName: currentUnitName,
      periodName: periodName || 'دوره جاری',
      stats: {
        totalNodes: parsedNodes.length,
        totalIssues: parsedIssues.length,
        totalResearch: parsedResearch.length,
        newNodesCount,
        modifiedNodesCount,
        unchangedNodesCount,
        newIssuesCount,
        modifiedIssuesCount,
        unchangedIssuesCount,
        newResearchCount,
        modifiedResearchCount,
        unchangedResearchCount,
        totalConflicts: conflicts.length,
        nodeErrorsCount: validation.nodeErrors.length,
        issueErrorsCount: validation.issueErrors.length,
        researchErrorsCount: validation.researchErrors.length,
        excludedSampleCount: validation.excludedSampleCount,
      },
      conflicts,
      previewData: {
        nodes: parsedNodes.slice(0, 25),
        issues: parsedIssues.slice(0, 25),
        research: parsedResearch.slice(0, 25),
      },
      errors: validation.errors,
    });
  } catch (error: any) {
    console.error('Error previewing unit template:', error);
    res.status(500).json({ error: error.message || 'خطا در اعتبارسنجی فایل اکسل' });
  }
});

// ====================================================================
// ۳. همگام‌سازی، ثبت نسخه و اعمال تغییرات در پایگاه داده اصلی (با تراکنش اتمی)
// ====================================================================
unitDataExchangeRoutes.post('/template/upload-sync', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const user = (req as AuthRequest).user;
    const orgScope = getUserOrgScope(user);

    if (!req.file) {
      return res.status(400).json({ error: 'هیچ فایلی ارسال نشده است.' });
    }

    const isConfirmed = req.body.confirmSync === 'true' || req.body.confirmSync === true;
    if (!isConfirmed) {
      return res.status(400).json({ error: 'تایید دستی کاربر جهت اعمال و همگام‌سازی اطلاعات در پایگاه داده الزامی است.' });
    }

    const strategy = req.body.strategy || 'smart_merge';
    let customResolutions: Record<string, 'incoming' | 'existing'> = {};
    if (req.body.resolutions) {
      try {
        customResolutions = typeof req.body.resolutions === 'string' ? JSON.parse(req.body.resolutions) : req.body.resolutions;
      } catch {
        customResolutions = {};
      }
    }

    const { workbook, isCsv } = await loadExchangeWorkbook(req.file.buffer, req.file.mimetype, req.file.originalname);

    if (isCsv) {
      return res.status(400).json({
        error: 'فرمت متنی CSV برای همگام‌سازی بسته چندشیتی یگان پشتیبانی نمی‌شود. لطفاً فایل XLSX ارسال فرمایید.',
      });
    }

    // اعتبارسنجی دقیق شیت‌ها و ردیف‌ها پیش از آغاز هرگونه تغییرات
    const validation = validateExchangeWorkbook(workbook, isCsv);
    if (!validation.valid) {
      return res.status(400).json({
        error: `فایل ارسالی دارای ${validation.errors.length} خطای اعتبارسنجی است و امکان همگام‌سازی ندارد.`,
        errors: validation.errors,
      });
    }

    const metaSheet = workbook.getWorksheet('شناسنامه سازمانی') || workbook.worksheets[0];
    const treeSheet = workbook.getWorksheet('درخت دانش') || workbook.worksheets[1];
    const issueSheet = workbook.getWorksheet('نظام مسائل') || workbook.worksheets[2];
    const researchSheet = workbook.getWorksheet('درختواره پژوهشی') || workbook.worksheets[3];

    let unitId: number | null = null;
    let periodId: number | null = null;

    if (metaSheet) {
      metaSheet.eachRow((row) => {
        const prop = row.getCell(1).value?.toString() || '';
        const val = row.getCell(2).value;
        if (prop.includes('Unit ID') || prop.includes('شناسه یکتای یگان')) {
          unitId = Number(val);
        } else if (prop.includes('Period ID') || prop.includes('شناسه دوره زمانی')) {
          periodId = Number(val);
        }
      });
    }

    if (!unitId && req.body.unitId) unitId = Number(req.body.unitId);
    if (!periodId && req.body.periodId) periodId = Number(req.body.periodId);

    if (!unitId || !periodId) {
      return res.status(400).json({ error: 'شناسه یگان یا دوره زمانی در فایل اکسل معتبر نیست.' });
    }

    if (!orgScope.canAccessUnit(unitId)) {
      return res.status(403).json({ error: 'شما مجاز به به‌روزرسانی اطلاعات این یگان نیستید.' });
    }

    const unitRow = sqlite.prepare('SELECT id, name, base_id FROM units WHERE id = ?').get(unitId) as any;
    const periodRow = sqlite.prepare('SELECT id, name FROM periods WHERE id = ?').get(periodId) as any;

    if (!unitRow || !periodRow) {
      return res.status(404).json({ error: 'یگان یا دوره زمانی در پایگاه داده یافت نشد.' });
    }

    const now = new Date().toISOString();

    // شماره نسخه جدید
    const maxVersionRow = sqlite.prepare(`
      SELECT MAX(version_number) as max_v FROM sync_versions
      WHERE unit_id = ? AND period_id = ?
    `).get(unitId, periodId) as any;

    const nextVersionNumber = (maxVersionRow?.max_v || 0) + 1;
    const versionLabel = req.body.versionLabel || `نسخه ${nextVersionNumber}.0 (${unitRow.name} - ${periodRow.name})`;

    // متغیرهای تجمیع لاگ و آمار در تراکنش
    let versionId = 0;
    let requiredTreeId = 0;
    let producedTreeId = 0;
    let nodesCreated = 0;
    let nodesUpdated = 0;
    let nodesKept = 0;
    let nodesUnchanged = 0;
    let issuesCreated = 0;
    let issuesUpdated = 0;
    let issuesKept = 0;
    let issuesUnchanged = 0;
    let researchCreated = 0;
    let researchUpdated = 0;
    let summaryData: any = {};

    // 🟢 اجرای همگام‌سازی و ثبت نسخه در تراکنش اتمی SQLite
    const executeSyncTransaction = sqlite.transaction(() => {
      // ایجاد رکورد نسخه
      const versionResult = sqlite.prepare(`
        INSERT INTO sync_versions (unit_id, period_id, version_number, version_label, file_name, source_type, applied_by, user_name, summary, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'excel_cd', ?, ?, ?, 'active', ?)
      `).run(
        unitId,
        periodId,
        nextVersionNumber,
        versionLabel,
        req.file!.originalname || 'unit_package.xlsx',
        user?.id || null,
        user?.username || 'کاربر سیستم',
        JSON.stringify({ pending: true }),
        now
      );
      versionId = Number(versionResult.lastInsertRowid);

      // ۱. آماده‌سازی درخت‌های مورد نیاز و تولید شده
      const getOrCreateTree = (treeType: 'required' | 'produced') => {
        let t = sqlite.prepare(`
          SELECT id, name FROM knowledge_trees
          WHERE unit_id = ? AND period_id = ? AND type = ?
          ORDER BY id DESC LIMIT 1
        `).get(unitId, periodId, treeType) as any;

        if (!t) {
          const typeLabel = treeType === 'required' ? 'مورد نیاز' : 'تولید شده';
          const tName = `درختواره دانش ${typeLabel} یگان ${unitRow.name} (${periodRow.name})`;
          const res = sqlite.prepare(`
            INSERT INTO knowledge_trees (name, type, description, period_id, base_id, unit_id, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
          `).run(tName, treeType, `همگام‌سازی از فایل بسته یگان ${unitRow.name}`, periodId, unitRow.base_id, unitId, now, now);
          t = { id: Number(res.lastInsertRowid), name: tName };
        }
        return t.id;
      };

      requiredTreeId = getOrCreateTree('required');
      producedTreeId = getOrCreateTree('produced');

      // ۲. استخراج ردیف‌های درخت دانش
      const rawNodes: any[] = [];
      if (treeSheet) {
        let sortOrder = 0;
        treeSheet.eachRow((row, rowNumber) => {
          if (rowNumber <= 2) return;
          const nodeId = row.getCell(1).value;
          const treeTypeText = row.getCell(2).value?.toString()?.trim();
          const title = row.getCell(3).value?.toString()?.trim();
          const level = row.getCell(4).value?.toString()?.trim().toUpperCase();
          const parentTitle = row.getCell(5).value?.toString()?.trim();
          const knowledgeType = row.getCell(6).value?.toString()?.trim();
          const isGapText = row.getCell(7).value?.toString()?.trim();
          const gapStatus = row.getCell(8).value?.toString()?.trim();
          const desc = row.getCell(9).value?.toString()?.trim();
          const templateIds = row.getCell(10).value?.toString()?.trim();

          if (!title || !level) return;

          // تضمین کنار گذاشتن ردیف‌های آموزشی
          if (isSampleNodeRow(title, desc)) return;

          const targetTreeId = (treeTypeText && treeTypeText.includes('تولید')) ? producedTreeId : requiredTreeId;
          const isGap = (isGapText === 'بله' || isGapText === '1' || isGapText === 'true') ? 1 : 0;
          let parsedGapStatus = gapStatus || (isGap === 1 ? 'open' : 'filled');
          if (parsedGapStatus === 'باز') parsedGapStatus = 'open';
          else if (parsedGapStatus === 'پر شده') parsedGapStatus = 'filled';
          else if (parsedGapStatus === 'نیمه‌پر') parsedGapStatus = 'partially_filled';

          sortOrder += 10;
          rawNodes.push({
            nodeId: nodeId ? Number(nodeId) : null,
            treeId: targetTreeId,
            title,
            level,
            parentTitle: parentTitle || null,
            knowledgeType: knowledgeType || null,
            description: desc || null,
            templateIds: templateIds || null,
            isGap,
            gapStatus: parsedGapStatus,
            sortOrder,
          });
        });
      }

      const levelPriority: Record<string, number> = { R: 1, T: 2, B: 3, SB: 4, L: 5, Q: 6 };
      rawNodes.sort((a, b) => (levelPriority[a.level] || 99) - (levelPriority[b.level] || 99));

      const existingDbNodes = sqlite.prepare(`
        SELECT id, tree_id, title, level, parent_id, description, knowledge_type, is_gap, gap_status, sort_order
        FROM tree_nodes WHERE tree_id IN (?, ?)
      `).all(requiredTreeId, producedTreeId) as any[];

      const nodeTitleToIdMap = new Map<string, number>();
      existingDbNodes.forEach(n => nodeTitleToIdMap.set(`${n.tree_id}_${n.title.trim().toLowerCase()}`, n.id));

      const insertNodeStmt = sqlite.prepare(`
        INSERT INTO tree_nodes (tree_id, parent_id, level, title, description, knowledge_type, template_ids, is_gap, gap_status, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const updateNodeStmt = sqlite.prepare(`
        UPDATE tree_nodes
        SET parent_id = ?, level = ?, title = ?, description = ?, knowledge_type = ?, is_gap = ?, gap_status = ?, sort_order = ?, updated_at = ?
        WHERE id = ? AND tree_id = ?
      `);

      const insertLogStmt = sqlite.prepare(`
        INSERT INTO record_version_logs (version_id, entity_type, entity_id, entity_title, action, field_name, old_value, new_value, conflict_detected, resolution_choice, resolved_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const node of rawNodes) {
        let parentId: number | null = null;
        if (node.parentTitle) {
          parentId = nodeTitleToIdMap.get(`${node.treeId}_${node.parentTitle.trim().toLowerCase()}`) || null;
        }

        let matchedNode: any = null;
        if (node.nodeId) {
          matchedNode = existingDbNodes.find(n => n.id === node.nodeId);
        }
        if (!matchedNode) {
          const idByTitle = nodeTitleToIdMap.get(`${node.treeId}_${node.title.trim().toLowerCase()}`);
          if (idByTitle) matchedNode = existingDbNodes.find(n => n.id === idByTitle);
        }

        if (matchedNode) {
          const hasDiff = matchedNode.level !== node.level ||
            matchedNode.title.trim() !== node.title ||
            (matchedNode.description || '') !== (node.description || '') ||
            (matchedNode.knowledge_type || '') !== (node.knowledgeType || '') ||
            matchedNode.is_gap !== node.isGap;

          if (!hasDiff) {
            nodesUnchanged++;
            nodeTitleToIdMap.set(`${node.treeId}_${node.title.trim().toLowerCase()}`, matchedNode.id);
            continue;
          }

          const itemDecision = customResolutions[`node_${matchedNode.id}`] || (strategy === 'keep_existing' ? 'existing' : 'incoming');

          if (itemDecision === 'existing') {
            insertLogStmt.run(versionId, 'tree_node', matchedNode.id, matchedNode.title, 'keep_existing', 'تمام فیلدها', matchedNode.title, node.title, 1, 'existing', user?.username || 'کاربر', now);
            nodesKept++;
            nodeTitleToIdMap.set(`${node.treeId}_${matchedNode.title.trim().toLowerCase()}`, matchedNode.id);
          } else {
            // ذخیره اسنپ‌شات کامل قبل از اعمال جهت بازگردانی بی‌نقص
            const oldSnapshot = {
              id: matchedNode.id,
              tree_id: matchedNode.tree_id,
              parent_id: matchedNode.parent_id,
              level: matchedNode.level,
              title: matchedNode.title,
              description: matchedNode.description,
              knowledge_type: matchedNode.knowledge_type,
              is_gap: matchedNode.is_gap,
              gap_status: matchedNode.gap_status,
              sort_order: matchedNode.sort_order,
            };

            const newSnapshot = {
              id: matchedNode.id,
              tree_id: node.treeId,
              parent_id: parentId,
              level: node.level,
              title: node.title,
              description: node.description,
              knowledge_type: node.knowledgeType,
              is_gap: node.isGap,
              gap_status: node.gapStatus,
              sort_order: node.sortOrder,
            };

            insertLogStmt.run(
              versionId,
              'tree_node',
              matchedNode.id,
              matchedNode.title,
              'update',
              '__snapshot__',
              JSON.stringify(oldSnapshot),
              JSON.stringify(newSnapshot),
              1,
              'incoming',
              user?.username || 'کاربر',
              now
            );

            if (matchedNode.level !== node.level) {
              insertLogStmt.run(versionId, 'tree_node', matchedNode.id, matchedNode.title, 'conflict_merge', 'level', matchedNode.level, node.level, 1, 'incoming', user?.username || 'کاربر', now);
            }
            if (node.knowledgeType && matchedNode.knowledge_type !== node.knowledgeType) {
              insertLogStmt.run(versionId, 'tree_node', matchedNode.id, matchedNode.title, 'conflict_merge', 'knowledge_type', matchedNode.knowledge_type, node.knowledgeType, 1, 'incoming', user?.username || 'کاربر', now);
            }

            updateNodeStmt.run(parentId, node.level, node.title, node.description, node.knowledgeType, node.isGap, node.gapStatus, node.sortOrder, now, matchedNode.id, node.treeId);
            nodesUpdated++;
            nodeTitleToIdMap.set(`${node.treeId}_${node.title.trim().toLowerCase()}`, matchedNode.id);
          }
        } else {
          const res = insertNodeStmt.run(node.treeId, parentId, node.level, node.title, node.description, node.knowledgeType, node.templateIds, node.isGap, node.gapStatus, node.sortOrder, now, now);
          const newId = Number(res.lastInsertRowid);
          insertLogStmt.run(versionId, 'tree_node', newId, node.title, 'create', 'گره جدید', null, node.title, 0, 'new', user?.username || 'کاربر', now);
          nodeTitleToIdMap.set(`${node.treeId}_${node.title.trim().toLowerCase()}`, newId);
          nodesCreated++;
        }
      }

      // ۳. پردازش نظام مسائل
      if (issueSheet) {
        const existingDbIssues = sqlite.prepare(`
          SELECT * FROM issues WHERE period_id = ? AND (responsible_unit = ? OR responsible_unit IS NULL)
        `).all(periodId, unitRow.name) as any[];

        const insertIssueStmt = sqlite.prepare(`
          INSERT INTO issues (period_id, domain_node_id, title, solution_direction, need_statement, action_priority, project_level, confidentiality_level, knowledge_type, knowledge_project_type, research_project_type, approval_authority, required_budget, approved_budget, completion_percent, bottlenecks, actions_taken, status, responsible_unit, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const updateIssueStmt = sqlite.prepare(`
          UPDATE issues
          SET domain_node_id = ?, title = ?, solution_direction = ?, need_statement = ?, action_priority = ?, project_level = ?, confidentiality_level = ?, knowledge_type = ?, knowledge_project_type = ?, research_project_type = ?, approval_authority = ?, required_budget = ?, approved_budget = ?, completion_percent = ?, bottlenecks = ?, actions_taken = ?, status = ?, responsible_unit = ?, updated_at = ?
          WHERE id = ?
        `);

        issueSheet.eachRow((row, rowNumber) => {
          if (rowNumber <= 2) return;
          const issueId = row.getCell(1).value;
          const title = row.getCell(2).value?.toString()?.trim();
          const solution = row.getCell(3).value?.toString()?.trim();
          const desc = row.getCell(4).value?.toString()?.trim();
          const priority = row.getCell(5).value?.toString()?.trim() || 'متوسط';
          const projectLevel = row.getCell(6).value?.toString()?.trim() || 'عملیاتی';
          const confidentiality = row.getCell(7).value?.toString()?.trim() || 'عادی';
          const knowledgeType = row.getCell(8).value?.toString()?.trim() || 'دانش فنی';
          const kpType = row.getCell(9).value?.toString()?.trim() || null;
          const rpType = row.getCell(10).value?.toString()?.trim() || null;
          const approvalAuthority = row.getCell(11).value?.toString()?.trim() || null;
          const domainNodeTitle = row.getCell(12).value?.toString()?.trim();
          const reqBudget = Number(row.getCell(13).value) || 0;
          const appBudget = Number(row.getCell(14).value) || 0;
          const completion = Number(row.getCell(15).value) || 0;
          const bottlenecks = row.getCell(16).value?.toString()?.trim() || null;
          const actions = row.getCell(17).value?.toString()?.trim() || null;
          const status = row.getCell(18).value?.toString()?.trim() || 'پیش‌نویس';

          if (!title) return;

          // رد کردن نمونه آموزشی
          if (isSampleIssueRow(title, desc)) return;

          let domainNodeId: number | null = null;
          if (domainNodeTitle) {
            domainNodeId = nodeTitleToIdMap.get(`${requiredTreeId}_${domainNodeTitle.trim().toLowerCase()}`) ||
                           nodeTitleToIdMap.get(`${producedTreeId}_${domainNodeTitle.trim().toLowerCase()}`) || null;
          }

          let matchedIssue: any = null;
          if (issueId && Number(issueId)) {
            matchedIssue = existingDbIssues.find(i => i.id === Number(issueId));
          }
          if (!matchedIssue) {
            matchedIssue = existingDbIssues.find(i => i.title.trim().toLowerCase() === title.toLowerCase());
          }

          if (matchedIssue) {
            const hasDiff = matchedIssue.title.trim() !== title ||
              (matchedIssue.solution_direction || '') !== (solution || '') ||
              (matchedIssue.action_priority || '') !== priority ||
              (matchedIssue.knowledge_type || '') !== knowledgeType ||
              matchedIssue.required_budget !== reqBudget ||
              matchedIssue.approved_budget !== appBudget ||
              matchedIssue.completion_percent !== completion ||
              (matchedIssue.status || '') !== status;

            if (!hasDiff) {
              issuesUnchanged++;
              return;
            }

            const itemDecision = customResolutions[`issue_${matchedIssue.id}`] || (strategy === 'keep_existing' ? 'existing' : 'incoming');

            if (itemDecision === 'existing') {
              insertLogStmt.run(versionId, 'issue', matchedIssue.id, matchedIssue.title, 'keep_existing', 'تمام فیلدها', matchedIssue.title, title, 1, 'existing', user?.username || 'کاربر', now);
              issuesKept++;
            } else {
              // ثبت اسنپ‌شات کامل مسئله برای بازگردانی دقیق همه فیلدها
              insertLogStmt.run(
                versionId,
                'issue',
                matchedIssue.id,
                matchedIssue.title,
                'update',
                '__snapshot__',
                JSON.stringify(matchedIssue),
                JSON.stringify({
                  domain_node_id: domainNodeId,
                  title,
                  solution_direction: solution,
                  need_statement: desc,
                  action_priority: priority,
                  project_level: projectLevel,
                  confidentiality_level: confidentiality,
                  knowledge_type: knowledgeType,
                  knowledge_project_type: kpType,
                  research_project_type: rpType,
                  approval_authority: approvalAuthority,
                  required_budget: reqBudget,
                  approved_budget: appBudget,
                  completion_percent: completion,
                  bottlenecks,
                  actions_taken: actions,
                  status,
                  responsible_unit: unitRow.name,
                }),
                1,
                'incoming',
                user?.username || 'کاربر',
                now
              );

              insertLogStmt.run(versionId, 'issue', matchedIssue.id, matchedIssue.title, 'conflict_merge', 'title', matchedIssue.title, title, 1, 'incoming', user?.username || 'کاربر', now);
              updateIssueStmt.run(domainNodeId, title, solution, desc, priority, projectLevel, confidentiality, knowledgeType, kpType, rpType, approvalAuthority, reqBudget, appBudget, completion, bottlenecks, actions, status, unitRow.name, now, matchedIssue.id);
              issuesUpdated++;
            }
          } else {
            const res = insertIssueStmt.run(periodId, domainNodeId, title, solution, desc, priority, projectLevel, confidentiality, knowledgeType, kpType, rpType, approvalAuthority, reqBudget, appBudget, completion, bottlenecks, actions, status, unitRow.name, now, now);
            const newId = Number(res.lastInsertRowid);
            insertLogStmt.run(versionId, 'issue', newId, title, 'create', 'مسئله جدید', null, title, 0, 'new', user?.username || 'کاربر', now);
            issuesCreated++;
          }
        });
      }

      // ۴. پردازش درختواره پژوهشی و گپ‌ها
      if (researchSheet) {
        researchSheet.eachRow((row, rowNumber) => {
          if (rowNumber <= 2) return;
          const resId = row.getCell(1).value;
          const title = row.getCell(2).value?.toString()?.trim();
          const nodeTitle = row.getCell(3).value?.toString()?.trim();
          const importance = row.getCell(4).value?.toString()?.trim() || 'کاربردی';
          const combatImpact = parseInt(row.getCell(5).value?.toString()?.replace(/[^0-9]/g, '') || '4', 10);
          const costBenefit = parseInt(row.getCell(6).value?.toString()?.replace(/[^0-9]/g, '') || '4', 10);
          const priority = row.getCell(7).value?.toString()?.trim() || 'الف';
          const timeFrame = row.getCell(8).value?.toString()?.trim() || 'میان‌مدت';
          const programCoverage = row.getCell(9).value?.toString()?.trim() || 'برنامه پنج ساله';
          const desc = row.getCell(12).value?.toString()?.trim() || null;

          if (!title && !nodeTitle) return;

          // رد کردن نمونه آموزشی
          if (isSampleResearchRow(title, nodeTitle, desc)) return;

          let linkedNodeId: number | null = null;
          if (nodeTitle) {
            linkedNodeId = nodeTitleToIdMap.get(`${requiredTreeId}_${nodeTitle.trim().toLowerCase()}`) ||
                           nodeTitleToIdMap.get(`${producedTreeId}_${nodeTitle.trim().toLowerCase()}`) || null;
          }

          // اطمینان از وجود گپ متناظر و ثبت آن در لاگ برای بازگردانی
          let gapId: number | null = null;
          if (linkedNodeId) {
            let g = sqlite.prepare('SELECT id FROM gaps WHERE required_node_id = ? AND period_id = ? LIMIT 1').get(linkedNodeId, periodId) as any;
            if (!g) {
              const gapRes = sqlite.prepare(`
                INSERT INTO gaps (period_id, required_node_id, status, gap_type, priority, match_score, description, created_at, updated_at)
                VALUES (?, ?, 'open', 'دانشی', ?, 0, ?, ?, ?)
              `).run(periodId, linkedNodeId, priority, desc || 'شکاف حاصل از بارگذاری داده‌های یگان', now, now);
              gapId = Number(gapRes.lastInsertRowid);
              // ثبت لاگ برای امکان بازگردانی شکاف ایجادشده
              insertLogStmt.run(versionId, 'gap', gapId, 'شکاف خودکار حاصل از بارگذاری پژوهش', 'create', 'gap', null, String(gapId), 0, 'new', user?.username || 'سیستم', now);
            } else {
              gapId = g.id;
            }
          }

          if (gapId && linkedNodeId) {
            let matchedRes = resId && Number(resId) ? sqlite.prepare('SELECT * FROM research_items WHERE id = ?').get(Number(resId)) as any : null;
            if (!matchedRes) {
              matchedRes = sqlite.prepare('SELECT * FROM research_items WHERE node_id = ? AND gap_id = ? LIMIT 1').get(linkedNodeId, gapId) as any;
            }

            if (matchedRes) {
              insertLogStmt.run(
                versionId,
                'research_item',
                matchedRes.id,
                title || nodeTitle,
                'update',
                '__snapshot__',
                JSON.stringify(matchedRes),
                JSON.stringify({
                  importance,
                  combat_impact: combatImpact,
                  cost_benefit: costBenefit,
                  priority,
                  time_frame: timeFrame,
                  period_id: periodId,
                }),
                0,
                'updated',
                user?.username || 'کاربر',
                now
              );

              sqlite.prepare(`
                UPDATE research_items
                SET importance = ?, combat_impact = ?, cost_benefit = ?, priority = ?, time_frame = ?, period_id = ?, updated_at = ?
                WHERE id = ?
              `).run(importance, combatImpact, costBenefit, priority, timeFrame, periodId, now, matchedRes.id);
              researchUpdated++;
            } else {
              const rRes = sqlite.prepare(`
                INSERT INTO research_items (gap_id, node_id, period_id, importance, combat_impact, cost_benefit, priority, time_frame, program_coverages, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(gapId, linkedNodeId, periodId, importance, combatImpact, costBenefit, priority, timeFrame, JSON.stringify([programCoverage]), now, now);
              const newResId = Number(rRes.lastInsertRowid);
              insertLogStmt.run(versionId, 'research_item', newResId, title || nodeTitle, 'create', 'اولویت پژوهشی جدید', null, title || nodeTitle, 0, 'new', user?.username || 'کاربر', now);
              researchCreated++;
            }
          }
        });
      }

      summaryData = {
        unitId,
        unitName: unitRow.name,
        periodId,
        periodName: periodRow.name,
        requiredTreeId,
        producedTreeId,
        nodesCreated,
        nodesUpdated,
        nodesKept,
        nodesUnchanged,
        issuesCreated,
        issuesUpdated,
        issuesKept,
        issuesUnchanged,
        researchCreated,
        researchUpdated,
        totalChanges: nodesCreated + nodesUpdated + issuesCreated + issuesUpdated + researchCreated + researchUpdated,
        strategy,
      };

      sqlite.prepare('UPDATE sync_versions SET summary = ? WHERE id = ?').run(JSON.stringify(summaryData), versionId);
    });

    // فراخوانی تراکنش اتمی
    executeSyncTransaction();

    logAudit({
      userId: user?.id || null,
      action: 'SYNC_VERSION_CREATED',
      entityName: 'نسخه‌بندی تبادل داده یگان',
      entityId: versionId,
      changes: summaryData,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: `اطلاعات بسته یگان "${unitRow.name}" با موفقیت، اعتبارسنجی دقیق و به‌صورت کاملاً اتمی در پایگاه داده ثبت شد.`,
      version: {
        id: versionId,
        number: nextVersionNumber,
        label: versionLabel,
        createdAt: now,
      },
      summary: summaryData,
    });
  } catch (error: any) {
    console.error('Error syncing unit template with versioning:', error);
    res.status(500).json({ error: error.message || 'خطا در پردازش و ذخیره اطلاعات نسخه' });
  }
});

// ====================================================================
// ۴. دریافت فهرست نسخه‌های ثبت‌شده همگام‌سازی (Version History)
// ====================================================================
unitDataExchangeRoutes.get('/versions', requireAuth, async (req, res) => {
  try {
    const { unitId, periodId } = req.query;
    let query = `
      SELECT sv.*, u.name as unit_name, p.name as period_name
      FROM sync_versions sv
      LEFT JOIN units u ON sv.unit_id = u.id
      LEFT JOIN periods p ON sv.period_id = p.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (unitId) {
      conditions.push('sv.unit_id = ?');
      params.push(Number(unitId));
    }
    if (periodId) {
      conditions.push('sv.period_id = ?');
      params.push(Number(periodId));
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY sv.id DESC LIMIT 50';

    const list = sqlite.prepare(query).all(...params) as any[];

    const formatted = list.map(item => {
      let parsedSummary = {};
      try {
        parsedSummary = typeof item.summary === 'string' ? JSON.parse(item.summary) : item.summary;
      } catch {}
      return {
        ...item,
        summary: parsedSummary,
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching sync versions:', error);
    res.status(500).json({ error: 'خطا در دریافت لیست نسخه‌های همگام‌سازی' });
  }
});

// ====================================================================
// ۵. دریافت لاگ تغییرات و حل تعارضات یک نسخه خاص
// ====================================================================
unitDataExchangeRoutes.get('/versions/:id/logs', requireAuth, async (req, res) => {
  try {
    const versionId = Number(req.params.id);
    const version = sqlite.prepare(`
      SELECT sv.*, u.name as unit_name, p.name as period_name
      FROM sync_versions sv
      LEFT JOIN units u ON sv.unit_id = u.id
      LEFT JOIN periods p ON sv.period_id = p.id
      WHERE sv.id = ?
    `).get(versionId) as any;

    if (!version) {
      return res.status(404).json({ error: 'نسخه مورد نظر یافت نشد.' });
    }

    const logs = sqlite.prepare(`
      SELECT * FROM record_version_logs
      WHERE version_id = ?
      ORDER BY id ASC
    `).all(versionId);

    res.json({
      version,
      logs,
      totalLogs: logs.length,
    });
  } catch (error) {
    console.error('Error fetching version logs:', error);
    res.status(500).json({ error: 'خطا در دریافت لاگ تغییرات نسخه' });
  }
});

// ====================================================================
// ۶. بازگردانی کامل به وضعیت قبل از اعمال نسخه (Rollback با تراکنش اتمی)
// ====================================================================
unitDataExchangeRoutes.post('/versions/:id/rollback', requireAuth, async (req, res) => {
  try {
    const versionId = Number(req.params.id);
    const user = (req as AuthRequest).user;

    const version = sqlite.prepare('SELECT * FROM sync_versions WHERE id = ?').get(versionId) as any;
    if (!version) {
      return res.status(404).json({ error: 'نسخه مورد نظر یافت نشد.' });
    }

    if (version.status === 'reverted') {
      return res.status(400).json({ error: 'این نسخه قبلاً بازگردانی شده است.' });
    }

    const now = new Date().toISOString();
    let revertedLogsCount = 0;

    // 🟢 اجرای بازگردانی کامل در قالب یک تراکنش اتمی
    const executeRollbackTransaction = sqlite.transaction(() => {
      const logs = sqlite.prepare('SELECT * FROM record_version_logs WHERE version_id = ? ORDER BY id DESC').all(versionId) as any[];
      revertedLogsCount = logs.length;

      for (const log of logs) {
        if (log.action === 'create') {
          if (log.entity_type === 'tree_node') {
            sqlite.prepare('DELETE FROM tree_nodes WHERE id = ?').run(log.entity_id);
          } else if (log.entity_type === 'issue') {
            sqlite.prepare('DELETE FROM issues WHERE id = ?').run(log.entity_id);
          } else if (log.entity_type === 'research_item') {
            sqlite.prepare('DELETE FROM research_items WHERE id = ?').run(log.entity_id);
          } else if (log.entity_type === 'gap') {
            sqlite.prepare('DELETE FROM gaps WHERE id = ?').run(log.entity_id);
          }
        } else if (log.action === 'update' || log.action === 'conflict_merge') {
          if (log.field_name === '__snapshot__' && log.old_value) {
            try {
              const oldData = JSON.parse(log.old_value);
              if (log.entity_type === 'tree_node') {
                sqlite.prepare(`
                  UPDATE tree_nodes
                  SET parent_id = ?, level = ?, title = ?, description = ?, knowledge_type = ?, is_gap = ?, gap_status = ?, sort_order = ?, updated_at = ?
                  WHERE id = ?
                `).run(oldData.parent_id, oldData.level, oldData.title, oldData.description, oldData.knowledge_type, oldData.is_gap, oldData.gap_status, oldData.sort_order, now, log.entity_id);
              } else if (log.entity_type === 'issue') {
                sqlite.prepare(`
                  UPDATE issues
                  SET domain_node_id = ?, title = ?, solution_direction = ?, need_statement = ?, action_priority = ?, project_level = ?, confidentiality_level = ?, knowledge_type = ?, knowledge_project_type = ?, research_project_type = ?, approval_authority = ?, required_budget = ?, approved_budget = ?, completion_percent = ?, bottlenecks = ?, actions_taken = ?, status = ?, responsible_unit = ?, updated_at = ?
                  WHERE id = ?
                `).run(
                  oldData.domain_node_id, oldData.title, oldData.solution_direction, oldData.need_statement,
                  oldData.action_priority, oldData.project_level, oldData.confidentiality_level, oldData.knowledge_type,
                  oldData.knowledge_project_type, oldData.research_project_type, oldData.approval_authority,
                  oldData.required_budget, oldData.approved_budget, oldData.completion_percent,
                  oldData.bottlenecks, oldData.actions_taken, oldData.status, oldData.responsible_unit,
                  now, log.entity_id
                );
              } else if (log.entity_type === 'research_item') {
                sqlite.prepare(`
                  UPDATE research_items
                  SET importance = ?, combat_impact = ?, cost_benefit = ?, priority = ?, time_frame = ?, period_id = ?, updated_at = ?
                  WHERE id = ?
                `).run(oldData.importance, oldData.combat_impact, oldData.cost_benefit, oldData.priority, oldData.time_frame, oldData.period_id, now, log.entity_id);
              }
            } catch (err) {
              console.error('Error applying snapshot rollback:', err);
            }
          } else if (log.field_name && log.old_value !== null) {
            // پشتیبانی از لاگ‌های فیلدی جداگانه
            if (log.entity_type === 'tree_node') {
              sqlite.prepare(`UPDATE tree_nodes SET ${log.field_name} = ? WHERE id = ?`).run(log.old_value, log.entity_id);
            } else if (log.entity_type === 'issue') {
              sqlite.prepare(`UPDATE issues SET ${log.field_name} = ? WHERE id = ?`).run(log.old_value, log.entity_id);
            } else if (log.entity_type === 'research_item') {
              sqlite.prepare(`UPDATE research_items SET ${log.field_name} = ? WHERE id = ?`).run(log.old_value, log.entity_id);
            }
          }
        }
      }

      sqlite.prepare("UPDATE sync_versions SET status = 'reverted' WHERE id = ?").run(versionId);
    });

    executeRollbackTransaction();

    logAudit({
      userId: user?.id || null,
      action: 'SYNC_VERSION_ROLLBACK',
      entityName: 'بازگردانی نسخه تبادل داده',
      entityId: versionId,
      changes: { versionId, revertedLogsCount },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: `تغییرات نسخه "${version.version_label}" با موفقیت و بازیابی کامل تمامی رکوردها بازگردانی شد.`,
    });
  } catch (error) {
    console.error('Error rolling back version:', error);
    res.status(500).json({ error: 'خطا در بازگردانی نسخه' });
  }
});

// ====================================================================
// ۷. دریافت لیست ساختار و آمار تجمیعی/تفکیکی یگان‌ها
// ====================================================================
unitDataExchangeRoutes.get('/unit-stats', requireAuth, async (req, res) => {
  try {
    const user = (req as AuthRequest).user;
    const orgScope = getUserOrgScope(user);
    const { periodId, baseId, unitId, mode } = req.query;

    const isAggregate = mode === 'aggregate';
    const effective = orgScope.getEffectiveFilter(
      baseId ? Number(baseId) : null,
      unitId ? Number(unitId) : null,
      isAggregate
    );

    let query = `
      SELECT 
        u.id as unit_id,
        u.name as unit_name,
        b.id as base_id,
        b.name as base_name,
        (SELECT COUNT(*) FROM knowledge_trees kt WHERE kt.unit_id = u.id ${periodId ? 'AND kt.period_id = ' + Number(periodId) : ''}) as tree_count,
        (SELECT COUNT(*) FROM tree_nodes tn JOIN knowledge_trees kt ON tn.tree_id = kt.id WHERE kt.unit_id = u.id ${periodId ? 'AND kt.period_id = ' + Number(periodId) : ''}) as node_count,
        (SELECT COUNT(*) FROM issues i WHERE i.responsible_unit = u.name ${periodId ? 'AND i.period_id = ' + Number(periodId) : ''}) as issue_count
      FROM units u
      JOIN bases b ON u.base_id = b.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (effective.unitIds && effective.unitIds.length > 0) {
      conditions.push(`u.id IN (${effective.unitIds.map(() => '?').join(',')})`);
      params.push(...effective.unitIds);
    } else if (effective.baseIds && effective.baseIds.length > 0) {
      conditions.push(`u.base_id IN (${effective.baseIds.map(() => '?').join(',')})`);
      params.push(...effective.baseIds);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY b.sort_order ASC, u.sort_order ASC, u.name ASC';

    const list = sqlite.prepare(query).all(...params) as any[];

    const aggregated = {
      totalUnits: list.length,
      totalTrees: list.reduce((s, u) => s + (u.tree_count || 0), 0),
      totalNodes: list.reduce((s, u) => s + (u.node_count || 0), 0),
      totalIssues: list.reduce((s, u) => s + (u.issue_count || 0), 0),
    };

    res.json({
      units: list,
      aggregated,
      userLevel: orgScope.level,
      isSuperAdmin: orgScope.isSuperAdmin,
      effectiveScope: {
        allowedBaseIds: orgScope.allowedBaseIds,
        allowedUnitIds: orgScope.allowedUnitIds,
      },
    });
  } catch (error) {
    console.error('Error fetching unit exchange stats:', error);
    res.status(500).json({ error: 'خطا در دریافت آمار ساختار سازمانی' });
  }
});
