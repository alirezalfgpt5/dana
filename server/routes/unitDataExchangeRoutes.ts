// server/routes/unitDataExchangeRoutes.ts
// موتور تبادل اطلاعات یگان‌ها بر اساس ساختار سازمانی و دوره زمانی
// تولید خروجی خام اکسل، پیش‌نمایش، اعتبارسنجی و خواندن/به‌روزرسانی پایگاه داده

import { Router } from 'express';
import ExcelJS from 'exceljs';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { db, sqlite } from '../../src/db/index.js';
import { knowledgeTrees, treeNodes, issues, periods, bases, units } from '../../src/db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import { logAudit } from '../utils/audit.js';
import { requireAuth } from '../middleware/rbac.js';
import { getUserOrgScope } from '../utils/orgAccess.js';
import { AuthRequest } from '../types/AuthRequest.js';

export const unitDataExchangeRoutes = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

// ایجاد جداول مدیریت نسخه‌ها و لاگ تغییرات در SQLite در صورت عدم وجود
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
const BRAND_ACCENT = 'FF3B82F6'; // آبی متوسط
const BG_HEADER = 'FF2563EB';
const BG_LIGHT = 'FFF8FAFC';
const BG_MUTED = 'FFF1F5F9';
const BORDER_COLOR = 'FFE2E8F0';

// ====================================================================
// ۱. صدور فایل قالب خام اکسل برای یگان بر اساس ساختار و دوره زمانی
// ====================================================================
unitDataExchangeRoutes.get('/template/download', requireAuth, async (req, res) => {
  try {
    const { unitId, periodId } = req.query;
    const user = (req as AuthRequest).user;
    const orgScope = getUserOrgScope(user);

    if (!unitId || !periodId) {
      return res.status(400).json({ error: 'انتخاب یگان سازمانی و دوره زمانی الزامی است.' });
    }

    const uId = Number(unitId);
    const pId = Number(periodId);

    // بررسی دسترسی سازمانی: آیا کاربر مجاز به دسترسی به این یگان است؟
    if (!orgScope.canAccessUnit(uId)) {
      return res.status(403).json({ error: 'شما دسترسی به این یگان سازمانی را ندارید (عدم دسترسی به یگان‌های موازی).' });
    }

    // دریافت اطلاعات یگان و پایگاه
    const unitRecord = sqlite.prepare(`
      SELECT u.id, u.name as unit_name, b.id as base_id, b.name as base_name
      FROM units u
      JOIN bases b ON u.base_id = b.id
      WHERE u.id = ?
    `).get(uId) as { id: number; unit_name: string; base_id: number; base_name: string } | undefined;

    if (!unitRecord) {
      return res.status(404).json({ error: 'یگان سازمانی انتخاب‌شده یافت نشد.' });
    }

    // دریافت اطلاعات دوره زمانی
    const periodRecord = sqlite.prepare('SELECT id, name, start_date, end_date FROM periods WHERE id = ?').get(pId) as {
      id: number;
      name: string;
      start_date: string;
      end_date: string;
    } | undefined;

    if (!periodRecord) {
      return res.status(404).json({ error: 'دوره زمانی انتخاب‌شده یافت نشد.' });
    }

    // دریافت اطلاعات موجود (اگر قبلاً درختی ثبت شده، به عنوان پیش‌فرض در فایل قرار گیرد)
    const existingTree = sqlite.prepare(`
      SELECT id, name FROM knowledge_trees
      WHERE unit_id = ? AND period_id = ?
      ORDER BY id DESC LIMIT 1
    `).get(uId, pId) as { id: number; name: string } | undefined;

    let existingNodes: any[] = [];
    if (existingTree) {
      existingNodes = sqlite.prepare(`
        SELECT id, parent_id, level, title, description, is_gap, gap_status, template_ids
        FROM tree_nodes WHERE tree_id = ? ORDER BY sort_order ASC, id ASC
      `).all(existingTree.id);
    }

    // دریافت مسائل موجود یگان و دوره
    let existingIssues: any[] = [];
    if (existingTree && existingNodes.length > 0) {
      const nodeIds = existingNodes.map(n => n.id);
      const placeholders = nodeIds.map(() => '?').join(',');
      existingIssues = sqlite.prepare(`
        SELECT id, title, solution_direction, need_statement, confidentiality_level, action_priority, project_level, bottlenecks, domain_node_id
        FROM issues WHERE period_id = ? OR domain_node_id IN (${placeholders})
      `).all(pId, ...nodeIds);
    } else {
      existingIssues = sqlite.prepare(`
        SELECT id, title, solution_direction, need_statement, confidentiality_level, action_priority, project_level, bottlenecks, domain_node_id
        FROM issues WHERE period_id = ?
      `).all(pId);
    }

    // ساخت فایل اکسل
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'سامانه مدیریت دانش و نظام مسائل (دانا)';
    workbook.lastModifiedBy = (user as any)?.fullName || user?.username || 'کاربر سامانه';
    workbook.created = new Date();

    // ---------------------------------------------------------------
    // شیت ۱: شناسنامه و متادیتا
    // ---------------------------------------------------------------
    const metaSheet = workbook.addWorksheet('شناسنامه سازمانی', { views: [{ rightToLeft: true }] });
    metaSheet.columns = [
      { key: 'prop', width: 28 },
      { key: 'val', width: 45 },
      { key: 'desc', width: 45 },
    ];

    metaSheet.mergeCells('A1:C1');
    const titleCell = metaSheet.getCell('A1');
    titleCell.value = 'سامانه جامع مدیریت دانش و نظام مسائل (دانا) - شناسنامه جمع‌آوری داده یگان';
    titleCell.font = { name: FONT_NAME, bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_PRIMARY } };
    metaSheet.getRow(1).height = 40;

    metaSheet.addRow(['مشخصه سیستمی', 'مقدار (تغییر ناپذیر)', 'راهنمای کاربری']);
    const metaHeader = metaSheet.getRow(2);
    metaHeader.font = { name: FONT_NAME, bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    metaHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BG_HEADER } };
    metaHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    metaHeader.height = 28;

    const metaDataRows = [
      ['شناسه یکتای یگان (Unit ID)', unitRecord.id, 'کد سیستمی یگان؛ لطفاً این مقدار را تغییر ندهید'],
      ['نام یگان سازمانی', unitRecord.unit_name, 'یگان تکمیل‌کننده اطلاعات بر اساس ساختار مصوب'],
      ['شناسه رده بالادست (Base ID)', unitRecord.base_id, 'کد پایگاه / نیروی بالادست'],
      ['نام نیرو / پایگاه بالادست', unitRecord.base_name, 'رده ناظر و تجمیع‌کننده سازمانی'],
      ['شناسه دوره زمانی (Period ID)', periodRecord.id, 'کد سیستمی دوره ارزیابی و برنامه‌ریزی'],
      ['عنوان دوره زمانی', periodRecord.name, `بازه زمانی: ${periodRecord.start_date} تا ${periodRecord.end_date}`],
      ['تاریخ صدور قالب', new Date().toLocaleDateString('fa-IR'), 'تاریخ استخراج قالب خام از سامانه دانا'],
      ['شناسه درختواره موجود (Tree ID)', existingTree?.id || 'جدید (خام)', 'در صورت وجود، شناسه درخت جهت به‌روزرسانی'],
    ];

    metaDataRows.forEach(row => {
      const r = metaSheet.addRow(row);
      r.font = { name: FONT_NAME, size: 10 };
      r.alignment = { horizontal: 'right', vertical: 'middle' };
      r.height = 24;
      r.getCell(1).font = { name: FONT_NAME, bold: true, size: 10 };
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BG_MUTED } };
    });

    // ---------------------------------------------------------------
    // شیت ۲: درختواره دانش (Knowledge Tree)
    // ---------------------------------------------------------------
    const treeSheet = workbook.addWorksheet('درخت دانش', { views: [{ rightToLeft: true }] });
    treeSheet.columns = [
      { key: 'nodeId', width: 14 },
      { key: 'title', width: 34 },
      { key: 'level', width: 16 },
      { key: 'parentTitle', width: 32 },
      { key: 'description', width: 45 },
      { key: 'isGap', width: 18 },
      { key: 'gapStatus', width: 18 },
      { key: 'templateIds', width: 22 },
    ];

    treeSheet.mergeCells('A1:H1');
    const treeTitle = treeSheet.getCell('A1');
    treeTitle.value = `ساختار درختواره دانش یگان: ${unitRecord.unit_name} (دوره: ${periodRecord.name})`;
    treeTitle.font = { name: FONT_NAME, bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    treeTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    treeTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_ACCENT } };
    treeSheet.getRow(1).height = 36;

    const treeHeaders = [
      'شناسه گره (سیستمی)',
      'عنوان گره دانشی *',
      'سطح دانشی (R/T/B/SB/L/Q) *',
      'عنوان گره بالادست (والد)',
      'شرح و توضیحات گره',
      'دارای گپ دانشی؟ (بله/خیر)',
      'وضعیت گپ (باز/پر شده/نیمه‌پر)',
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
          node.title,
          node.level,
          parent?.title || '',
          node.description || '',
          node.is_gap === 1 ? 'بله' : 'خیر',
          node.gap_status || (node.is_gap === 1 ? 'باز' : 'پر شده'),
          node.template_ids || '',
        ]);
        r.font = { name: FONT_NAME, size: 10 };
        r.alignment = { horizontal: 'right', vertical: 'middle' };
        r.height = 22;
      });
    } else {
      // ردیف‌های نمونه جهت راهنمایی کاربر
      const samples = [
        ['', 'سامانه‌ها و تجهیزات هوایی', 'R', '', 'ریشه اصلی درخت دانش یگان', 'خیر', 'پر شده', ''],
        ['', 'فناوری اویونیک و ناوبری', 'T', 'سامانه‌ها و تجهیزات هوایی', 'تم تخصصی اول', 'خیر', 'پر شده', ''],
        ['', 'رادار و جنگ الکترونیک', 'B', 'فناوری اویونیک و ناوبری', 'شاخه اصلی دانشی', 'خیر', 'پر شده', ''],
        ['', 'سیستم پردازش سیگنال پالس', 'L', 'رادار و جنگ الکترونیک', 'برگ عملیاتی و فنی دانشی', 'بله', 'باز', '1,2'],
        ['', 'قابلیت اطمینان عملکردی ۹۹٪', 'Q', 'سیستم پردازش سیگنال پالس', 'شاخص کیفی و استاندارد دانشی', 'بله', 'باز', ''],
      ];
      samples.forEach(s => {
        const r = treeSheet.addRow(s);
        r.font = { name: FONT_NAME, size: 10, italic: true };
        r.alignment = { horizontal: 'right', vertical: 'middle' };
        r.height = 22;
      });
    }

    // ---------------------------------------------------------------
    // شیت ۳: شناسنامه نظام مسائل (Issues)
    // ---------------------------------------------------------------
    const issueSheet = workbook.addWorksheet('نظام مسائل', { views: [{ rightToLeft: true }] });
    issueSheet.columns = [
      { key: 'issueId', width: 14 },
      { key: 'title', width: 36 },
      { key: 'solutionDirection', width: 34 },
      { key: 'description', width: 40 },
      { key: 'actionPriority', width: 18 },
      { key: 'projectLevel', width: 18 },
      { key: 'confidentialityLevel', width: 18 },
      { key: 'domainNodeTitle', width: 30 },
      { key: 'bottlenecks', width: 35 },
    ];

    issueSheet.mergeCells('A1:I1');
    const issueTitle = issueSheet.getCell('A1');
    issueTitle.value = `شناسنامه نظام مسائل یگان: ${unitRecord.unit_name} (دوره: ${periodRecord.name})`;
    issueTitle.font = { name: FONT_NAME, bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    issueTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    issueTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } }; // رنگ تیل
    issueSheet.getRow(1).height = 36;

    const issueHeaders = [
      'شناسه مسئله (سیستمی)',
      'عنوان مسئله *',
      'جهت‌گیری راه حل',
      'شرح و بیان مسئله',
      'اولویت اقدام (بحرانی/بالا/متوسط/پایین)',
      'سطح پروژه (راهبردی/تاکتیکی/عملیاتی)',
      'سطح محرمانگی (عادی/محرمانه/خیلی محرمانه)',
      'گره دانشی مرتبط (عنوان)',
      'گلوگاه‌ها و چالش‌های اصلی',
    ];
    const issueHeaderRow = issueSheet.addRow(issueHeaders);
    issueHeaderRow.font = { name: FONT_NAME, bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    issueHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
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
          issue.action_priority === 'critical' ? 'بحرانی' :
            issue.action_priority === 'high' ? 'بالا' :
            issue.action_priority === 'low' ? 'پایین' : 'متوسط',
          issue.project_level === 'strategic' ? 'راهبردی' :
            issue.project_level === 'tactical' ? 'تاکتیکی' : 'عملیاتی',
          issue.confidentiality_level || 'عادی',
          node?.title || '',
          issue.bottlenecks || '',
        ]);
        r.font = { name: FONT_NAME, size: 10 };
        r.alignment = { horizontal: 'right', vertical: 'middle' };
        r.height = 22;
      });
    } else {
      const issueSamples = [
        ['', 'عدم دستیابی به الگوریتم پالایش نویزهای محیطی در سامانه‌های ناوبری', 'طراحی الگوریتم بومی پالایش ماتریسی با استفاده از ظرفیت دانشگاهی', 'محدودیت منابع پردازشی و فیلترهای آنالوگ موجود', 'بالا', 'راهبردی', 'محرمانه', 'سیستم پردازش سیگنال پالس', 'نبود زیرساخت سخت‌افزاری بلادرنگ'],
      ];
      issueSamples.forEach(s => {
        const r = issueSheet.addRow(s);
        r.font = { name: FONT_NAME, size: 10, italic: true };
        r.alignment = { horizontal: 'right', vertical: 'middle' };
        r.height = 22;
      });
    }

    // ---------------------------------------------------------------
    // شیت ۴: راهنمای کدهای استاندارد
    // ---------------------------------------------------------------
    const guideSheet = workbook.addWorksheet('راهنما و کدینگ', { views: [{ rightToLeft: true }] });
    guideSheet.columns = [
      { key: 'col1', width: 22 },
      { key: 'col2', width: 30 },
      { key: 'col3', width: 55 },
    ];

    guideSheet.addRow(['کد سطح', 'عنوان سطح دانشی', 'توضیحات و جایگاه در درخت']);
    const guideHeader = guideSheet.getRow(1);
    guideHeader.font = { name: FONT_NAME, bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    guideHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
    guideHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    guideHeader.height = 28;

    const levelGuides = [
      ['R', 'ریشه (Root)', 'بالاترین سطح درخت دانشی؛ معمولاً ۱ رکورد اصلی است.'],
      ['T', 'تم / حوزه تخصصی (Theme)', 'حوزه‌های موضوعی و راهبردی ذیل ریشه.'],
      ['B', 'شاخه اصلی (Branch)', 'شاخه‌های اصلی فنی و تخصصی ذیل تم.'],
      ['SB', 'زیرشاخه (Sub-branch)', 'زیرشاخه‌های تخصصی جهت تفکیک دقیق‌تر.'],
      ['L', 'برگ دانشی (Leaf)', 'پایین‌ترین واحد مستقل محتوای دانشی که ارزیابی شکاف روی آن انجام می‌شود.'],
      ['Q', 'ویژگی کیفی (Quality)', 'شاخص‌ها، الزامات کیفی و استانداردهای متصل به برگ‌ها.'],
    ];
    levelGuides.forEach(g => {
      const r = guideSheet.addRow(g);
      r.font = { name: FONT_NAME, size: 10 };
      r.alignment = { horizontal: 'right', vertical: 'middle' };
      r.height = 22;
    });

    logAudit({
      userId: user?.id || null,
      action: 'EXPORT',
      entityName: 'قالب خام یگان',
      entityId: uId,
      changes: { unitId: uId, periodId: pId, unitName: unitRecord.unit_name },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const safeUnitName = unitRecord.unit_name.replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, '_');
    const safePeriodName = periodRecord.name.replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, '_');
    const filename = `قالب_خام_دانا_${safeUnitName}_${safePeriodName}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating unit template:', error);
    res.status(500).json({ error: 'خطا در ایجاد قالب اکسل یگان' });
  }
});

// ====================================================================
// ۲. پیش‌نمایش، اعتبارسنجی و تشخیص تعارضات و مغایرت‌های فایل دریافتی
// ====================================================================
unitDataExchangeRoutes.post('/template/preview', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const user = (req as AuthRequest).user;
    const orgScope = getUserOrgScope(user);

    if (!req.file) {
      return res.status(400).json({ error: 'هیچ فایلی ارسال نشده است.' });
    }

    const isTextFile = ['text/csv'].includes(req.file.mimetype);
    if (!isTextFile) {
      const meta = await fileTypeFromBuffer(req.file.buffer);
      if (!meta || !['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(meta.mime)) {
        return res.status(400).json({ error: 'فرمت فایل معتبر نیست. لطفاً فقط فایل اکسل ارسال کنید.' });
      }
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const metaSheet = workbook.getWorksheet('شناسنامه سازمانی') || workbook.worksheets[0];
    const treeSheet = workbook.getWorksheet('درخت دانش') || workbook.worksheets[1];
    const issueSheet = workbook.getWorksheet('نظام مسائل') || workbook.worksheets[2];

    // استخراج متادیتا
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

    if (!unitId || !periodId) {
      return res.status(400).json({
        error: 'شناسه یگان یا دوره زمانی در فایل اکسل شناسایی نشد. لطفاً از قالب استاندارد دانای همین یگان استفاده نمایید.',
      });
    }

    if (!orgScope.canAccessUnit(unitId)) {
      return res.status(403).json({
        error: 'شما مجاز به به‌روزرسانی اطلاعات این یگان نیستید (محدودیت دسترسی یگان‌های موازی).',
      });
    }

    // دریافت اطلاعات فعلی پایگاه داده برای مقایسه و تشخیص مغایرت‌ها
    const existingTree = sqlite.prepare(`
      SELECT id, name FROM knowledge_trees
      WHERE unit_id = ? AND period_id = ?
      ORDER BY id DESC LIMIT 1
    `).get(unitId, periodId) as { id: number; name: string } | undefined;

    let dbNodes: any[] = [];
    if (existingTree) {
      dbNodes = sqlite.prepare(`
        SELECT id, parent_id, level, title, description, is_gap, gap_status
        FROM tree_nodes WHERE tree_id = ?
      `).all(existingTree.id);
    }

    const unitRow = sqlite.prepare('SELECT id, name FROM units WHERE id = ?').get(unitId) as { id: number; name: string } | undefined;
    const currentUnitName = unitRow?.name || unitName;

    const dbIssues = sqlite.prepare(`
      SELECT id, title, solution_direction, need_statement, action_priority, project_level, confidentiality_level, bottlenecks, domain_node_id
      FROM issues WHERE period_id = ? AND responsible_unit = ?
    `).all(periodId, currentUnitName) as any[];

    // استخراج گره‌های درخت و مقایسه
    const parsedNodes: any[] = [];
    const nodeErrors: string[] = [];
    const conflicts: any[] = [];
    let newNodesCount = 0;
    let modifiedNodesCount = 0;
    let unchangedNodesCount = 0;

    if (treeSheet) {
      treeSheet.eachRow((row, rowNumber) => {
        if (rowNumber <= 2) return;
        const nodeId = row.getCell(1).value;
        const title = row.getCell(2).value?.toString()?.trim();
        const level = row.getCell(3).value?.toString()?.trim().toUpperCase();
        const parentTitle = row.getCell(4).value?.toString()?.trim();
        const desc = row.getCell(5).value?.toString()?.trim();
        const isGapText = row.getCell(6).value?.toString()?.trim();
        const gapStatus = row.getCell(7).value?.toString()?.trim();

        if (!title && !level) return;

        if (!title) {
          nodeErrors.push(`ردیف ${rowNumber}: عنوان گره دانشی الزامی است.`);
          return;
        }

        const validLevels = ['R', 'T', 'B', 'SB', 'L', 'Q'];
        if (!level || !validLevels.includes(level)) {
          nodeErrors.push(`ردیف ${rowNumber} (${title}): سطح دانشی "${level}" نامعتبر است.`);
          return;
        }

        const isGapVal = (isGapText === 'بله' || isGapText === '1' || isGapText === 'true') ? 1 : 0;
        let parsedGapStatus = gapStatus || (isGapVal === 1 ? 'open' : 'filled');
        if (parsedGapStatus === 'باز') parsedGapStatus = 'open';
        else if (parsedGapStatus === 'پر شده') parsedGapStatus = 'filled';
        else if (parsedGapStatus === 'نیمه‌پر') parsedGapStatus = 'partially_filled';

        // بررسی تطابق با رکورد موجود در دیتابیس
        let matchedDbNode: any = null;
        if (nodeId && Number(nodeId)) {
          matchedDbNode = dbNodes.find(n => n.id === Number(nodeId));
        }
        if (!matchedDbNode) {
          matchedDbNode = dbNodes.find(n => n.title.trim().toLowerCase() === title.toLowerCase());
        }

        if (matchedDbNode) {
          // بررسی تغییرات فیلدها
          const diffs: any[] = [];
          if (matchedDbNode.title.trim() !== title) {
            diffs.push({ field: 'title', label: 'عنوان گره', currentDb: matchedDbNode.title, incomingFile: title });
          }
          if (matchedDbNode.level !== level) {
            diffs.push({ field: 'level', label: 'سطح دانشی', currentDb: matchedDbNode.level, incomingFile: level });
          }
          if ((matchedDbNode.description || '') !== (desc || '')) {
            diffs.push({ field: 'description', label: 'توضیحات', currentDb: matchedDbNode.description || 'ندارد', incomingFile: desc || 'ندارد' });
          }
          if (matchedDbNode.is_gap !== isGapVal) {
            diffs.push({ field: 'is_gap', label: 'وضعیت گپ دانشی', currentDb: matchedDbNode.is_gap ? 'دارد' : 'ندارد', incomingFile: isGapVal ? 'دارد' : 'ندارد' });
          }
          if (matchedDbNode.gap_status !== parsedGapStatus && isGapVal) {
            diffs.push({ field: 'gap_status', label: 'نوع وضعیت گپ', currentDb: matchedDbNode.gap_status || 'نامشخص', incomingFile: parsedGapStatus });
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

        parsedNodes.push({
          rowNumber,
          nodeId: nodeId ? Number(nodeId) : null,
          title,
          level,
          parentTitle: parentTitle || null,
          description: desc || null,
          isGap: isGapVal === 1,
          gapStatus: parsedGapStatus,
          statusTag: matchedDbNode ? (conflicts.some(c => c.id === matchedDbNode.id && c.type === 'node') ? 'modified' : 'unchanged') : 'new',
        });
      });
    }

    // استخراج مسائل و مقایسه
    const parsedIssues: any[] = [];
    const issueErrors: string[] = [];
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
        const domainNodeTitle = row.getCell(8).value?.toString()?.trim();
        const bottlenecks = row.getCell(9).value?.toString()?.trim();

        if (!title) return;

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
          if ((matchedIssue.need_statement || '') !== (desc || '')) {
            diffs.push({ field: 'need_statement', label: 'شرح نیاز', currentDb: matchedIssue.need_statement || 'ندارد', incomingFile: desc || 'ندارد' });
          }
          if (priority && (matchedIssue.action_priority || '') !== priority) {
            diffs.push({ field: 'action_priority', label: 'اولویت اقدام', currentDb: matchedIssue.action_priority || 'نامشخص', incomingFile: priority });
          }
          if (projectLevel && (matchedIssue.project_level || '') !== projectLevel) {
            diffs.push({ field: 'project_level', label: 'سطح پروژه', currentDb: matchedIssue.project_level || 'نامشخص', incomingFile: projectLevel });
          }
          if (confidentiality && (matchedIssue.confidentiality_level || '') !== confidentiality) {
            diffs.push({ field: 'confidentiality_level', label: 'سطح محرمانگی', currentDb: matchedIssue.confidentiality_level || 'عادی', incomingFile: confidentiality });
          }
          if ((matchedIssue.bottlenecks || '') !== (bottlenecks || '')) {
            diffs.push({ field: 'bottlenecks', label: 'گلوگاه‌ها', currentDb: matchedIssue.bottlenecks || 'ندارد', incomingFile: bottlenecks || 'ندارد' });
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
          domainNodeTitle: domainNodeTitle || null,
          bottlenecks: bottlenecks || null,
          statusTag: matchedIssue ? (conflicts.some(c => c.id === matchedIssue.id && c.type === 'issue') ? 'modified' : 'unchanged') : 'new',
        });
      });
    }

    res.json({
      valid: nodeErrors.length === 0,
      unitId,
      periodId,
      unitName: currentUnitName,
      periodName: periodName || 'دوره جاری',
      stats: {
        totalNodes: parsedNodes.length,
        totalIssues: parsedIssues.length,
        newNodesCount,
        modifiedNodesCount,
        unchangedNodesCount,
        newIssuesCount,
        modifiedIssuesCount,
        unchangedIssuesCount,
        totalConflicts: conflicts.length,
        nodeErrorsCount: nodeErrors.length,
        issueErrorsCount: issueErrors.length,
      },
      conflicts,
      previewData: {
        nodes: parsedNodes.slice(0, 20),
        issues: parsedIssues.slice(0, 20),
      },
      errors: [...nodeErrors, ...issueErrors],
    });
  } catch (error) {
    console.error('Error previewing unit template:', error);
    res.status(500).json({ error: 'خطا در اعتبارسنجی فایل اکسل' });
  }
});

// ====================================================================
// ۳. خواندن و همگام‌سازی سامانه با تایید دستی، عدم بازنویسی، ورژنبندی و ثبت لاگ
// ====================================================================
unitDataExchangeRoutes.post('/template/upload-sync', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const user = (req as AuthRequest).user;
    const orgScope = getUserOrgScope(user);

    if (!req.file) {
      return res.status(400).json({ error: 'هیچ فایلی ارسال نشده است.' });
    }

    // الزام تایید دستی کاربر جهت جلوگیری از همگام‌سازی ناخواسته
    const isConfirmed = req.body.confirmSync === 'true' || req.body.confirmSync === true;
    if (!isConfirmed) {
      return res.status(400).json({ error: 'تایید دستی کاربر برای همگام‌سازی و اعمال تغییرات الزامی است.' });
    }

    const strategy = req.body.strategy || 'smart_merge'; // 'smart_merge' | 'apply_incoming' | 'keep_existing'
    let customResolutions: Record<string, 'incoming' | 'existing'> = {};
    if (req.body.resolutions) {
      try {
        customResolutions = typeof req.body.resolutions === 'string' ? JSON.parse(req.body.resolutions) : req.body.resolutions;
      } catch {
        customResolutions = {};
      }
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const metaSheet = workbook.getWorksheet('شناسنامه سازمانی') || workbook.worksheets[0];
    const treeSheet = workbook.getWorksheet('درخت دانش') || workbook.worksheets[1];
    const issueSheet = workbook.getWorksheet('نظام مسائل') || workbook.worksheets[2];

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
      return res.status(403).json({ error: 'شما مجاز به به‌روزرسانی این یگان نیستید.' });
    }

    const unitRow = sqlite.prepare('SELECT id, name, base_id FROM units WHERE id = ?').get(unitId) as {
      id: number;
      name: string;
      base_id: number;
    } | undefined;

    if (!unitRow) {
      return res.status(404).json({ error: 'یگان سازمانی در دیتابیس یافت نشد.' });
    }

    const periodRow = sqlite.prepare('SELECT id, name FROM periods WHERE id = ?').get(periodId) as {
      id: number;
      name: string;
    } | undefined;

    if (!periodRow) {
      return res.status(404).json({ error: 'دوره زمانی در دیتابیس یافت نشد.' });
    }

    const now = new Date().toISOString();

    // محاسبه شماره نسخه جدید برای این یگان و دوره
    const maxVersionRow = sqlite.prepare(`
      SELECT MAX(version_number) as max_v FROM sync_versions
      WHERE unit_id = ? AND period_id = ?
    `).get(unitId, periodId) as { max_v: number | null } | undefined;

    const nextVersionNumber = (maxVersionRow?.max_v || 0) + 1;
    const versionLabel = req.body.versionLabel || `نسخه ${nextVersionNumber}.0 (${unitRow.name} - ${periodRow.name})`;

    // ایجاد رکورد نسخه جدید در دیتابیس لوکال
    const insertVersionStmt = sqlite.prepare(`
      INSERT INTO sync_versions (unit_id, period_id, version_number, version_label, file_name, source_type, applied_by, user_name, summary, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'excel_cd', ?, ?, ?, 'active', ?)
    `);

    const versionResult = insertVersionStmt.run(
      unitId,
      periodId,
      nextVersionNumber,
      versionLabel,
      req.file.originalname || 'unit_data.xlsx',
      user?.id || null,
      user?.username || 'کاربر سیستم',
      JSON.stringify({ pending: true }),
      now
    );
    const versionId = Number(versionResult.lastInsertRowid);

    // ۱. پیدا کردن یا ساخت درختواره برای این یگان و دوره
    let tree = sqlite.prepare(`
      SELECT id, name FROM knowledge_trees
      WHERE unit_id = ? AND period_id = ?
      ORDER BY id DESC LIMIT 1
    `).get(unitId, periodId) as { id: number; name: string } | undefined;

    if (!tree) {
      const treeName = `درختواره دانش یگان ${unitRow.name} - ${periodRow.name}`;
      const insertTreeStmt = sqlite.prepare(`
        INSERT INTO knowledge_trees (name, type, description, period_id, base_id, unit_id, is_active, created_at, updated_at)
        VALUES (?, 'produced', ?, ?, ?, ?, 1, ?, ?)
      `);
      const result = insertTreeStmt.run(treeName, `ثبت شده از طریق تبادل داده سی‌دی یگان ${unitRow.name}`, periodId, unitRow.base_id, unitId, now, now);
      tree = { id: Number(result.lastInsertRowid), name: treeName };
    }

    const treeId = tree.id;

    // ۲. استخراج ردیف‌های درخت دانش
    const rawNodes: Array<{
      nodeId: number | null;
      title: string;
      level: string;
      parentTitle: string | null;
      description: string | null;
      isGap: number;
      gapStatus: string | null;
      sortOrder: number;
    }> = [];

    if (treeSheet) {
      let sortOrder = 0;
      treeSheet.eachRow((row, rowNumber) => {
        if (rowNumber <= 2) return;
        const nodeId = row.getCell(1).value;
        const title = row.getCell(2).value?.toString()?.trim();
        const level = row.getCell(3).value?.toString()?.trim().toUpperCase();
        const parentTitle = row.getCell(4).value?.toString()?.trim();
        const desc = row.getCell(5).value?.toString()?.trim();
        const isGapText = row.getCell(6).value?.toString()?.trim();
        const gapStatus = row.getCell(7).value?.toString()?.trim();

        if (!title || !level) return;

        const isGap = (isGapText === 'بله' || isGapText === '1' || isGapText === 'true') ? 1 : 0;
        let parsedGapStatus = gapStatus || (isGap === 1 ? 'open' : 'filled');
        if (parsedGapStatus === 'باز') parsedGapStatus = 'open';
        else if (parsedGapStatus === 'پر شده') parsedGapStatus = 'filled';
        else if (parsedGapStatus === 'نیمه‌پر') parsedGapStatus = 'partially_filled';

        sortOrder += 10;
        rawNodes.push({
          nodeId: nodeId ? Number(nodeId) : null,
          title,
          level,
          parentTitle: parentTitle || null,
          description: desc || null,
          isGap,
          gapStatus: parsedGapStatus,
          sortOrder,
        });
      });
    }

    // اولویت درج گره‌ها بر اساس سطح ساختاری
    const levelPriority: Record<string, number> = { R: 1, T: 2, B: 3, SB: 4, L: 5, Q: 6 };
    rawNodes.sort((a, b) => (levelPriority[a.level] || 99) - (levelPriority[b.level] || 99));

    const existingDbNodes = sqlite.prepare('SELECT id, title, level, parent_id, description, is_gap, gap_status FROM tree_nodes WHERE tree_id = ?').all(treeId) as any[];
    const nodeTitleToIdMap = new Map<string, number>();
    existingDbNodes.forEach(n => nodeTitleToIdMap.set(n.title.trim().toLowerCase(), n.id));

    let nodesCreated = 0;
    let nodesUpdated = 0;
    let nodesKept = 0;
    let nodesUnchanged = 0;

    const insertNodeStmt = sqlite.prepare(`
      INSERT INTO tree_nodes (tree_id, parent_id, level, title, description, is_gap, gap_status, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateNodeStmt = sqlite.prepare(`
      UPDATE tree_nodes
      SET parent_id = ?, level = ?, title = ?, description = ?, is_gap = ?, gap_status = ?, sort_order = ?, updated_at = ?
      WHERE id = ? AND tree_id = ?
    `);

    const insertLogStmt = sqlite.prepare(`
      INSERT INTO record_version_logs (version_id, entity_type, entity_id, entity_title, action, field_name, old_value, new_value, conflict_detected, resolution_choice, resolved_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const node of rawNodes) {
      let parentId: number | null = null;
      if (node.parentTitle) {
        parentId = nodeTitleToIdMap.get(node.parentTitle.trim().toLowerCase()) || null;
      }

      let matchedNode: any = null;
      if (node.nodeId) {
        matchedNode = existingDbNodes.find(n => n.id === node.nodeId);
      }
      if (!matchedNode) {
        const idByTitle = nodeTitleToIdMap.get(node.title.trim().toLowerCase());
        if (idByTitle) matchedNode = existingDbNodes.find(n => n.id === idByTitle);
      }

      if (matchedNode) {
        // آیا تفاوتی وجود دارد؟
        const hasDiff = matchedNode.level !== node.level ||
          matchedNode.title.trim() !== node.title ||
          (matchedNode.description || '') !== (node.description || '') ||
          matchedNode.is_gap !== node.isGap ||
          matchedNode.gap_status !== node.gapStatus;

        if (!hasDiff) {
          nodesUnchanged++;
          nodeTitleToIdMap.set(node.title.trim().toLowerCase(), matchedNode.id);
          continue;
        }

        // تصمیم‌گیری برای حل تعارض: اولویت با تصمیم اختصاصی کاربر روی این رکورد، در غیر این صورت استراتژی عمومی
        const itemDecision = customResolutions[`node_${matchedNode.id}`] || (strategy === 'keep_existing' ? 'existing' : 'incoming');

        if (itemDecision === 'existing') {
          // دیتای قبلی حفظ می‌شود و بازنویسی نمی‌گردد
          insertLogStmt.run(
            versionId,
            'tree_node',
            matchedNode.id,
            matchedNode.title,
            'keep_existing',
            'تمام فیلدها',
            matchedNode.title,
            node.title,
            1,
            'existing',
            user?.username || 'کاربر',
            now
          );
          nodesKept++;
          nodeTitleToIdMap.set(matchedNode.title.trim().toLowerCase(), matchedNode.id);
        } else {
          // نسخه جدید با ثبت دقیق لاگ تغییرات اعمال می‌شود (دیتای قبلی در تاریخچه لاگ ثبت است)
          if (matchedNode.level !== node.level) {
            insertLogStmt.run(versionId, 'tree_node', matchedNode.id, matchedNode.title, 'conflict_merge', 'level', matchedNode.level, node.level, 1, 'incoming', user?.username || 'کاربر', now);
          }
          if ((matchedNode.description || '') !== (node.description || '')) {
            insertLogStmt.run(versionId, 'tree_node', matchedNode.id, matchedNode.title, 'conflict_merge', 'description', matchedNode.description, node.description, 1, 'incoming', user?.username || 'کاربر', now);
          }
          if (matchedNode.is_gap !== node.isGap) {
            insertLogStmt.run(versionId, 'tree_node', matchedNode.id, matchedNode.title, 'conflict_merge', 'is_gap', String(matchedNode.is_gap), String(node.isGap), 1, 'incoming', user?.username || 'کاربر', now);
          }

          updateNodeStmt.run(parentId, node.level, node.title, node.description, node.isGap, node.gapStatus, node.sortOrder, now, matchedNode.id, treeId);
          nodesUpdated++;
          nodeTitleToIdMap.set(node.title.trim().toLowerCase(), matchedNode.id);
        }
      } else {
        // درج گره جدید بدون دست‌زدن به رکوردهای قبلی
        const res = insertNodeStmt.run(treeId, parentId, node.level, node.title, node.description, node.isGap, node.gapStatus, node.sortOrder, now, now);
        const newId = Number(res.lastInsertRowid);
        insertLogStmt.run(versionId, 'tree_node', newId, node.title, 'create', 'رکورد جدید', null, node.title, 0, 'new', user?.username || 'کاربر', now);
        nodeTitleToIdMap.set(node.title.trim().toLowerCase(), newId);
        nodesCreated++;
      }
    }

    // ۳. پردازش شیت نظام مسائل
    let issuesCreated = 0;
    let issuesUpdated = 0;
    let issuesKept = 0;
    let issuesUnchanged = 0;

    if (issueSheet) {
      const existingDbIssues = sqlite.prepare('SELECT id, title, solution_direction, need_statement, action_priority, project_level, confidentiality_level, bottlenecks FROM issues WHERE period_id = ? AND responsible_unit = ?').all(periodId, unitRow.name) as any[];

      const insertIssueStmt = sqlite.prepare(`
        INSERT INTO issues (period_id, domain_node_id, title, solution_direction, need_statement, action_priority, project_level, confidentiality_level, bottlenecks, responsible_unit, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const updateIssueStmt = sqlite.prepare(`
        UPDATE issues
        SET domain_node_id = ?, title = ?, solution_direction = ?, need_statement = ?, action_priority = ?, project_level = ?, confidentiality_level = ?, bottlenecks = ?, responsible_unit = ?, updated_at = ?
        WHERE id = ?
      `);

      issueSheet.eachRow((row, rowNumber) => {
        if (rowNumber <= 2) return;
        const issueId = row.getCell(1).value;
        const title = row.getCell(2).value?.toString()?.trim();
        const solution = row.getCell(3).value?.toString()?.trim();
        const desc = row.getCell(4).value?.toString()?.trim();
        const priorityText = row.getCell(5).value?.toString()?.trim();
        const projectLevelText = row.getCell(6).value?.toString()?.trim();
        const confidentiality = row.getCell(7).value?.toString()?.trim();
        const domainNodeTitle = row.getCell(8).value?.toString()?.trim();
        const bottlenecks = row.getCell(9).value?.toString()?.trim();

        if (!title) return;

        let actionPriority = 'medium';
        if (priorityText === 'بحرانی') actionPriority = 'critical';
        else if (priorityText === 'بالا') actionPriority = 'high';
        else if (priorityText === 'پایین') actionPriority = 'low';

        let projectLevel = 'operational';
        if (projectLevelText === 'راهبردی') projectLevel = 'strategic';
        else if (projectLevelText === 'تاکتیکی') projectLevel = 'tactical';

        let domainNodeId: number | null = null;
        if (domainNodeTitle) {
          domainNodeId = nodeTitleToIdMap.get(domainNodeTitle.trim().toLowerCase()) || null;
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
            (matchedIssue.need_statement || '') !== (desc || '') ||
            (matchedIssue.action_priority || '') !== actionPriority ||
            (matchedIssue.project_level || '') !== projectLevel ||
            (matchedIssue.bottlenecks || '') !== (bottlenecks || '');

          if (!hasDiff) {
            issuesUnchanged++;
            return;
          }

          const itemDecision = customResolutions[`issue_${matchedIssue.id}`] || (strategy === 'keep_existing' ? 'existing' : 'incoming');

          if (itemDecision === 'existing') {
            insertLogStmt.run(versionId, 'issue', matchedIssue.id, matchedIssue.title, 'keep_existing', 'تمام فیلدها', matchedIssue.title, title, 1, 'existing', user?.username || 'کاربر', now);
            issuesKept++;
          } else {
            if ((matchedIssue.solution_direction || '') !== (solution || '')) {
              insertLogStmt.run(versionId, 'issue', matchedIssue.id, matchedIssue.title, 'conflict_merge', 'solution_direction', matchedIssue.solution_direction, solution, 1, 'incoming', user?.username || 'کاربر', now);
            }
            if ((matchedIssue.need_statement || '') !== (desc || '')) {
              insertLogStmt.run(versionId, 'issue', matchedIssue.id, matchedIssue.title, 'conflict_merge', 'need_statement', matchedIssue.need_statement, desc, 1, 'incoming', user?.username || 'کاربر', now);
            }
            if ((matchedIssue.action_priority || '') !== actionPriority) {
              insertLogStmt.run(versionId, 'issue', matchedIssue.id, matchedIssue.title, 'conflict_merge', 'action_priority', matchedIssue.action_priority, actionPriority, 1, 'incoming', user?.username || 'کاربر', now);
            }

            updateIssueStmt.run(domainNodeId, title, solution, desc, actionPriority, projectLevel, confidentiality || 'عادی', bottlenecks, unitRow.name, now, matchedIssue.id);
            issuesUpdated++;
          }
        } else {
          const res = insertIssueStmt.run(periodId, domainNodeId, title, solution, desc, actionPriority, projectLevel, confidentiality || 'عادی', bottlenecks, unitRow.name, now, now);
          const newId = Number(res.lastInsertRowid);
          insertLogStmt.run(versionId, 'issue', newId, title, 'create', 'مسئله جدید', null, title, 0, 'new', user?.username || 'کاربر', now);
          issuesCreated++;
        }
      });
    }

    // به‌روزرسانی خلاصه نهایی در جدول نسخه
    const summaryData = {
      unitId,
      unitName: unitRow.name,
      periodId,
      periodName: periodRow.name,
      treeId,
      nodesCreated,
      nodesUpdated,
      nodesKept,
      nodesUnchanged,
      issuesCreated,
      issuesUpdated,
      issuesKept,
      issuesUnchanged,
      totalChanges: nodesCreated + nodesUpdated + issuesCreated + issuesUpdated,
      strategy,
    };

    sqlite.prepare('UPDATE sync_versions SET summary = ? WHERE id = ?').run(JSON.stringify(summaryData), versionId);

    // ثبت در audit log
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
      message: `اطلاعات فایل سی‌دی یگان "${unitRow.name}" با موفقیت تحلیل و به عنوان "${versionLabel}" در دیتابیس لوکال ثبت شد.`,
      version: {
        id: versionId,
        number: nextVersionNumber,
        label: versionLabel,
        createdAt: now,
      },
      summary: summaryData,
    });
  } catch (error) {
    console.error('Error syncing unit template with versioning:', error);
    res.status(500).json({ error: (error as any)?.message || 'خطا در پردازش و ذخیره اطلاعات نسخه' });
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
// ۶. بازگردانی به وضعیت قبل از اعمال نسخه (Rollback)
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

    const logs = sqlite.prepare('SELECT * FROM record_version_logs WHERE version_id = ? ORDER BY id DESC').all(versionId) as any[];

    // بازگردانی رکوردهای تغییریافته
    for (const log of logs) {
      if (log.action === 'create') {
        if (log.entity_type === 'tree_node') {
          sqlite.prepare('DELETE FROM tree_nodes WHERE id = ?').run(log.entity_id);
        } else if (log.entity_type === 'issue') {
          sqlite.prepare('DELETE FROM issues WHERE id = ?').run(log.entity_id);
        }
      } else if (log.action === 'conflict_merge' && log.old_value !== null) {
        if (log.entity_type === 'tree_node' && log.field_name) {
          sqlite.prepare(`UPDATE tree_nodes SET ${log.field_name} = ? WHERE id = ?`).run(log.old_value, log.entity_id);
        } else if (log.entity_type === 'issue' && log.field_name) {
          sqlite.prepare(`UPDATE issues SET ${log.field_name} = ? WHERE id = ?`).run(log.old_value, log.entity_id);
        }
      }
    }

    sqlite.prepare("UPDATE sync_versions SET status = 'reverted' WHERE id = ?").run(versionId);

    logAudit({
      userId: user?.id || null,
      action: 'SYNC_VERSION_ROLLBACK',
      entityName: 'بازگردانی نسخه تبادل داده',
      entityId: versionId,
      changes: { versionId, revertedLogsCount: logs.length },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: `تغییرات نسخه "${version.version_label}" با موفقیت بازگردانی شد.`,
    });
  } catch (error) {
    console.error('Error rolling back version:', error);
    res.status(500).json({ error: 'خطا در بازگردانی نسخه' });
  }
});

// ====================================================================
// ۴. دریافت لیست ساختار و آمار تجمیعی/تفکیکی یگان‌ها
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
