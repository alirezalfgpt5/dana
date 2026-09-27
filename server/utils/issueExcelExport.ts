// server/utils/issueExcelExport.ts
// منبع واحد تولید گزارش اکسل جامع نظام مسائل با اعمال کنترل دسترسی سازمانی و پوشش کامل ساختارهای JSON

import ExcelJS from 'exceljs';
import { db } from '../../src/db/index.js';
import { issues, treeNodes, periods, issueAttachments, issueTemplates, templates } from '../../src/db/schema.js';
import { eq, and, or, like, inArray, gte, lte, desc } from 'drizzle-orm';
import { buildIssueOrgConditions } from '../routes/issues/issueAccess.js';
import { format } from 'date-fns-jalali';

export async function generateIssuesExcel(user: any, query: any): Promise<ExcelJS.Workbook> {
  const {
    periodId,
    category,
    status,
    priority,
    projectLevel,
    search,
    unit,
    responsibleUnit,
    domain,
    fromDate,
    toDate,
    baseId,
    unitId,
    mode,
  } = query;

  const conditions: any[] = [];

  // ۱. کنترل دسترسی سازمانی یکپارچه (حل قطعی اولویت ۲)
  const orgConds = await buildIssueOrgConditions(user, {
    baseId: baseId ? parseInt(baseId as string) : null,
    unitId: unitId ? parseInt(unitId as string) : null,
    mode: mode as string,
  });
  if (orgConds.length > 0) {
    conditions.push(...orgConds);
  }

  // ۲. فیلتر دوره
  if (periodId && periodId !== 'all' && periodId !== 'undefined' && periodId !== 'null') {
    const pId = parseInt(periodId as string);
    if (!isNaN(pId)) {
      conditions.push(eq(issues.periodId, pId));
    }
  }

  // ۳. فیلتر حوزه
  if (domain && domain !== 'all') {
    conditions.push(eq(issues.domainNodeId, parseInt(domain as string)));
  }

  // ۴. فیلتر وضعیت
  if (status && status !== 'all') {
    conditions.push(eq(issues.status, status as any));
  }

  // ۵. فیلتر اولویت
  if (priority && priority !== 'all') {
    conditions.push(eq(issues.actionPriority, priority as string));
  }

  // ۶. فیلتر سطح پروژه
  if (projectLevel && projectLevel !== 'all') {
    conditions.push(eq(issues.projectLevel, projectLevel as string));
  }

  // ۷. فیلتر واحد متولی
  const targetUnit = (responsibleUnit || unit) as string | undefined;
  if (targetUnit && targetUnit !== 'all') {
    conditions.push(like(issues.responsibleUnit, `%${targetUnit.trim()}%`));
  }

  // ۸. فیلتر دسته‌بندی با تطبیق دقیق بر ستون issues.category (حل اولویت ۱۲)
  if (category && category !== 'all') {
    const catClean = String(category).trim();
    conditions.push(or(
      like(issues.category, `%${catClean}%`),
      like(issues.knowledgeType, `%${catClean}%`),
      like(issues.researchProjectType, `%${catClean}%`),
      like(issues.knowledgeProjectType, `%${catClean}%`)
    ));
  }

  // ۹. جستجو
  if (search) {
    const s = `%${String(search).trim()}%`;
    conditions.push(or(
      like(issues.title, s),
      like(issues.solutionDirection, s),
      like(issues.responsibleUnit, s),
      like(issues.actionsTaken, s),
      like(issues.bottlenecks, s),
      like(issues.orders, s)
    ));
  }

  // ۱۰. بازه تاریخی
  if (fromDate) {
    conditions.push(gte(issues.approvalDate, fromDate as string));
  }
  if (toDate) {
    conditions.push(lte(issues.approvalDate, toDate as string));
  }

  // واکشی مسائل مجاز فیلترشده
  const allIssues = await db.select()
    .from(issues)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(issues.createdAt));

  // استخراج نام گره‌ها و دوره‌ها
  const domainNodeIds = allIssues.map(i => i.domainNodeId).filter(Boolean) as number[];
  let nodeMap = new Map<number, string>();
  if (domainNodeIds.length > 0) {
    const nodes = await db.select({ id: treeNodes.id, title: treeNodes.title })
      .from(treeNodes)
      .where(inArray(treeNodes.id, Array.from(new Set(domainNodeIds))));
    nodeMap = new Map(nodes.map(n => [n.id, n.title]));
  }

  const periodIds = allIssues.map(i => i.periodId).filter(Boolean) as number[];
  let periodMap = new Map<number, string>();
  if (periodIds.length > 0) {
    const prds = await db.select({ id: periods.id, name: periods.name })
      .from(periods)
      .where(inArray(periods.id, Array.from(new Set(periodIds))));
    periodMap = new Map(prds.map(p => [p.id, p.name]));
  }

  // استخراج پیوست‌ها
  const issueIds = allIssues.map(i => i.id);
  let attachmentMap = new Map<number, string[]>();
  if (issueIds.length > 0) {
    const atts = await db.select({ issueId: issueAttachments.issueId, fileName: issueAttachments.fileName })
      .from(issueAttachments)
      .where(inArray(issueAttachments.issueId, issueIds));
    for (const a of atts) {
      const list = attachmentMap.get(a.issueId) || [];
      list.push(a.fileName);
      attachmentMap.set(a.issueId, list);
    }
  }

  // ایجاد کتاب کار اکسل
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'سامانه جامع مدیریت دانش و نظام مسائل (دانا)';
  workbook.created = new Date();

  // ============================================
  // شیت ۱: شناسنامه تفصیلی نظام مسائل و ابعاد اجرایی
  // ============================================
  const sheet = workbook.addWorksheet('فهرست مسائل و اعتبارات', {
    views: [{ rightToLeft: true }],
    pageSetup: { orientation: 'landscape', paperSize: 9 },
  });

  sheet.columns = [
    { header: 'ردیف', key: 'index', width: 8 },
    { header: 'کد مسئله', key: 'id', width: 12 },
    { header: 'دوره زمانی', key: 'period', width: 18 },
    { header: 'عنوان مسئله', key: 'title', width: 38 },
    { header: 'دسته‌بندی', key: 'category', width: 18 },
    { header: 'حوزه دانشی', key: 'domain', width: 24 },
    { header: 'وضعیت', key: 'status', width: 16 },
    { header: 'اولویت اقدام', key: 'actionPriority', width: 14 },
    { header: 'درصد پیشرفت', key: 'completionPercent', width: 14 },
    { header: 'واحد متولی', key: 'responsibleUnit', width: 22 },
    { header: 'سطح محرمانگی', key: 'confidentialityLevel', width: 15 },
    { header: 'نوع دانش', key: 'knowledgeType', width: 16 },
    { header: 'سطح پروژه', key: 'projectLevel', width: 14 },
    { header: 'مرجع تصویب', key: 'approvalAuthority', width: 20 },
    { header: 'بودجه مورد نیاز (ریال)', key: 'requiredBudget', width: 24 },
    { header: 'بودجه مصوب (ریال)', key: 'approvedBudget', width: 24 },
    { header: 'بودجه واگذار شده (ریال)', key: 'assignedBudget', width: 24 },
    { header: 'مدت انتظار (ماه)', key: 'expectedMonths', width: 16 },
    { header: 'تاریخ تصویب', key: 'approvalDate', width: 16 },
    { header: 'جهت‌گیری راه‌حل', key: 'solutionDirection', width: 34 },
    { header: 'متقاضی نیاز', key: 'needUser', width: 20 },
    { header: 'بودجه پیشنهادی نیاز (ریال)', key: 'needBudget', width: 22 },
    { header: 'وضعیت تصویب نیاز', key: 'needStatus', width: 18 },
    { header: 'شماره قرارداد', key: 'contractNumber', width: 18 },
    { header: 'مجری قرارداد', key: 'contractExecutor', width: 22 },
    { header: 'مبلغ قرارداد (ریال)', key: 'contractAmount', width: 22 },
    { header: 'تاریخ شروع قرارداد', key: 'contractStartDate', width: 16 },
    { header: 'مرحله ۲۰٪ (تاریخ دفاع)', key: 'stage20Defense', width: 18 },
    { header: 'مرحله ۲۰٪ (پرداخت)', key: 'stage20Paid', width: 20 },
    { header: 'مرحله ۵۰٪ (تاریخ دفاع)', key: 'stage50Defense', width: 18 },
    { header: 'مرحله ۵۰٪ (پرداخت)', key: 'stage50Paid', width: 20 },
    { header: 'مرحله ۱۰۰٪ (تاریخ دفاع)', key: 'stage100Defense', width: 18 },
    { header: 'مرحله ۱۰۰٪ (پرداخت)', key: 'stage100Paid', width: 20 },
    { header: 'نوع کاربست', key: 'applicationType', width: 18 },
    { header: 'تاریخ کاربست', key: 'applicationDate', width: 16 },
    { header: 'گروه کاربست', key: 'applicationGroup', width: 20 },
    { header: 'تعداد پیوست‌ها', key: 'attachmentsCount', width: 15 },
    { header: 'فایل‌های پیوست', key: 'attachmentsList', width: 30 },
    { header: 'گلوگاه‌ها و چالش‌ها', key: 'bottlenecks', width: 30 },
    { header: 'اقدامات انجام‌شده', key: 'actionsTaken', width: 30 },
    { header: 'تدابیر و فرامین', key: 'orders', width: 30 },
    { header: 'تاریخ ثبت', key: 'createdAt', width: 18 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.height = 32;
  headerRow.font = { name: 'Tahoma', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' },
  };

  const statusMap: Record<string, string> = {
    pending: 'در انتظار',
    in_progress: 'در حال اجرا',
    completed: 'تکمیل شده',
    on_hold: 'متوقف',
    canceled: 'لغو شده',
  };

  const safeJson = (val: any) => {
    if (!val) return {};
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return {}; }
    }
    return typeof val === 'object' ? val : {};
  };

  let totalReq = 0;
  let totalApp = 0;
  let totalAss = 0;

  allIssues.forEach((issue, idx) => {
    const reqB = Number(issue.requiredBudget || 0);
    const appB = Number(issue.approvedBudget || 0);
    const assB = Number(issue.assignedBudget || 0);
    totalReq += reqB;
    totalApp += appB;
    totalAss += assB;

    const need = safeJson(issue.needStatement);
    const contract = safeJson(issue.contract);
    const stage20 = safeJson(issue.stage20);
    const stage50 = safeJson(issue.stage50);
    const stage100 = safeJson(issue.stage100);
    const appData = safeJson(issue.application);
    const attList = attachmentMap.get(issue.id) || [];

    const row = sheet.addRow({
      index: idx + 1,
      id: `ISS-${String(issue.id).padStart(4, '0')}`,
      period: (issue.periodId && periodMap.get(issue.periodId)) || 'نامشخص',
      title: issue.title,
      category: issue.category || 'عمومی',
      domain: (issue.domainNodeId && nodeMap.get(issue.domainNodeId)) || 'نامشخص',
      status: statusMap[issue.status || ''] || issue.status || 'در انتظار',
      actionPriority: issue.actionPriority || 'متوسط',
      completionPercent: `${issue.completionPercent || 0}%`,
      responsibleUnit: issue.responsibleUnit || '-',
      confidentialityLevel: issue.confidentialityLevel || 'عمومی',
      knowledgeType: issue.knowledgeType || '-',
      projectLevel: issue.projectLevel || '-',
      approvalAuthority: issue.approvalAuthority || '-',
      requiredBudget: reqB.toLocaleString('fa-IR'),
      approvedBudget: appB.toLocaleString('fa-IR'),
      assignedBudget: assB.toLocaleString('fa-IR'),
      expectedMonths: issue.expectedMonths || 0,
      approvalDate: issue.approvalDate || '-',
      solutionDirection: issue.solutionDirection || '-',
      needUser: need.user || '-',
      needBudget: Number(need.suggestedBudget || 0).toLocaleString('fa-IR'),
      needStatus: need.approvalStatus === 'approved' ? 'تصویب شده' : (need.approvalStatus === 'rejected' ? 'رد شده' : 'در انتظار'),
      contractNumber: contract.number || '-',
      contractExecutor: contract.executor || '-',
      contractAmount: Number(contract.amount || 0).toLocaleString('fa-IR'),
      contractStartDate: contract.startDate || contract.date || '-',
      stage20Defense: stage20.defenseDate || '-',
      stage20Paid: Number(stage20.paidAmount || 0).toLocaleString('fa-IR'),
      stage50Defense: stage50.defenseDate || '-',
      stage50Paid: Number(stage50.paidAmount || 0).toLocaleString('fa-IR'),
      stage100Defense: stage100.defenseDate || '-',
      stage100Paid: Number(stage100.paidAmount || 0).toLocaleString('fa-IR'),
      applicationType: appData.applicationType || '-',
      applicationDate: appData.applicationDate || '-',
      applicationGroup: appData.workingGroup || '-',
      attachmentsCount: attList.length,
      attachmentsList: attList.join(' | ') || '-',
      bottlenecks: issue.bottlenecks || '-',
      actionsTaken: issue.actionsTaken || '-',
      orders: issue.orders || '-',
      createdAt: issue.createdAt ? format(new Date(issue.createdAt), 'yyyy/MM/dd') : '-',
    });

    row.height = 24;
    row.alignment = { vertical: 'middle', horizontal: 'center' };
    row.font = { name: 'Tahoma', size: 9 };

    row.getCell('title').alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell('solutionDirection').alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell('bottlenecks').alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell('actionsTaken').alignment = { vertical: 'middle', horizontal: 'right' };

    const statusCell = row.getCell('status');
    if (issue.status === 'completed') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
      statusCell.font = { name: 'Tahoma', size: 9, bold: true, color: { argb: 'FF166534' } };
    } else if (issue.status === 'in_progress') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
      statusCell.font = { name: 'Tahoma', size: 9, bold: true, color: { argb: 'FF1E40AF' } };
    }

    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });

    if (idx % 2 === 1) {
      row.eachCell((cell, colNumber) => {
        if (colNumber !== 7) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
      });
    }
  });

  // سطر خلاصه مجموع
  const summaryRow = sheet.addRow({
    index: 'مجموع',
    id: '',
    period: '',
    title: `تعداد کل مسائل: ${allIssues.length}`,
    category: '',
    domain: '',
    status: '',
    actionPriority: '',
    completionPercent: allIssues.length > 0 ? `${Math.round(allIssues.reduce((a, b) => a + (b.completionPercent || 0), 0) / allIssues.length)}%` : '۰%',
    responsibleUnit: '',
    confidentialityLevel: '',
    knowledgeType: '',
    projectLevel: '',
    approvalAuthority: '',
    requiredBudget: totalReq.toLocaleString('fa-IR'),
    approvedBudget: totalApp.toLocaleString('fa-IR'),
    assignedBudget: totalAss.toLocaleString('fa-IR'),
  });
  summaryRow.height = 28;
  summaryRow.font = { name: 'Tahoma', size: 10, bold: true, color: { argb: 'FF1E293B' } };
  summaryRow.alignment = { vertical: 'middle', horizontal: 'center' };
  summaryRow.eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    c.border = {
      top: { style: 'medium', color: { argb: 'FF475569' } },
      bottom: { style: 'double', color: { argb: 'FF475569' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
  });

  // ============================================
  // شیت ۲: خلاصه آمار و شاخص‌های کلان
  // ============================================
  const summarySheet = workbook.addWorksheet('داشبورد آماری اعتبارات و وضعیت', {
    views: [{ rightToLeft: true }],
  });

  summarySheet.columns = [
    { header: 'شاخص / پارامتر مدیریتی', key: 'metric', width: 34 },
    { header: 'مقدار گزارش', key: 'value', width: 28 },
    { header: 'توضیحات تکمیلی', key: 'note', width: 36 },
  ];

  const sumHeader = summarySheet.getRow(1);
  sumHeader.height = 30;
  sumHeader.font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  sumHeader.alignment = { vertical: 'middle', horizontal: 'center' };
  sumHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };

  const summaryItems = [
    { metric: 'تعداد کل رکوردهای مجاز استخراج‌شده', value: allIssues.length, note: 'تابع دسترسی سازمانی کاربر و فیلترها' },
    { metric: 'مجموع بودجه درخواستی (ریال)', value: totalReq.toLocaleString('fa-IR'), note: 'جمع بودجه مورد نیاز کلیه مسائل' },
    { metric: 'مجموع بودجه مصوب (ریال)', value: totalApp.toLocaleString('fa-IR'), note: 'جمع بودجه تصویب‌شده در مراجع' },
    { metric: 'مجموع بودجه واگذار شده (ریال)', value: totalAss.toLocaleString('fa-IR'), note: 'جمع بودجه تخصیص‌یافته به یگان‌ها' },
    { metric: 'مانده اعتبار تا تخصیص کامل (ریال)', value: Math.max(0, totalApp - totalAss).toLocaleString('fa-IR'), note: 'تفاضل مصوب و واگذار شده' },
    { metric: 'میانگین پیشرفت فیزیکی', value: allIssues.length > 0 ? `${Math.round(allIssues.reduce((a, b) => a + (b.completionPercent || 0), 0) / allIssues.length)}%` : '۰%', note: 'میانگین درصد پیشرفت مسائل' },
    { metric: 'مسائل تکمیل شده', value: allIssues.filter(i => i.status === 'completed').length, note: 'وضعیت = completed' },
    { metric: 'مسائل در حال اجرا', value: allIssues.filter(i => i.status === 'in_progress').length, note: 'وضعیت = in_progress' },
    { metric: 'مسائل در انتظار', value: allIssues.filter(i => i.status === 'pending').length, note: 'وضعیت = pending' },
    { metric: 'مسائل متوقف یا لغو شده', value: allIssues.filter(i => ['on_hold', 'canceled'].includes(i.status || '')).length, note: 'نیاز به پیگیری و بازنگری' },
  ];

  summaryItems.forEach((item, i) => {
    const r = summarySheet.addRow(item);
    r.height = 24;
    r.font = { name: 'Tahoma', size: 10 };
    r.alignment = { vertical: 'middle', horizontal: 'right' };
    r.getCell('value').alignment = { vertical: 'middle', horizontal: 'center' };
    r.eachCell(c => {
      c.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if (i % 2 === 1) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    });
  });

  return workbook;
}
