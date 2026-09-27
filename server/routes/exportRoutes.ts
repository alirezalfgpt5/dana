// server/routes/exportRoutes.ts
// صدور شناسنامه مستند Word (DOCX) نظام مسائل با اطلاعات واقعی، ساختار رسمی و کنترل دسترسی سازمانی

import { Router } from 'express';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { db } from '../../src/db/index.js';
import { issues, treeNodes, periods } from '../../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { format } from 'date-fns-jalali';
import { hasIssueAccess } from './issues/issueAccess.js';
import { AuthRequest } from '../types/AuthRequest.js';
import { logAudit } from '../utils/audit.js';

export const exportRoutes = Router();

const safeJson = (val: any, fallback: any = {}) => {
  if (!val) return fallback;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return fallback; }
  }
  return typeof val === 'object' ? val : fallback;
};

const statusMap: Record<string, string> = {
  pending: 'در انتظار',
  in_progress: 'در حال اجرا',
  completed: 'تکمیل شده',
  on_hold: 'متوقف',
  canceled: 'لغو شده',
};

export function createFieldRow(label: string, value: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { after: 120 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 22 }),
      new TextRun({ text: value || '-', size: 22 }),
    ],
  });
}

export function createSectionHeader(title: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    alignment: AlignmentType.RIGHT,
    spacing: { before: 240, after: 140 },
    children: [
      new TextRun({ text: `🔹 ${title}`, bold: true, size: 24, color: '1E3A8A' }),
    ],
  });
}

export_route: exportRoutes.get('/issues/:id/word', async (req, res) => {
  try {
    const issueId = parseInt(req.params.id);
    const user = (req as AuthRequest).user;

    // بررسی دسترسی سازمانی کاربر به مسئله (حل اولویت ۱ و ۱۳)
    const hasAccess = await hasIssueAccess(user, issueId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'شما دسترسی لازم برای دریافت شناسنامه این مسئله را ندارید.' });
    }

    const issueArr = await db.select().from(issues).where(eq(issues.id, issueId));
    if (issueArr.length === 0) {
      return res.status(404).json({ error: 'مسئله یافت نشد.' });
    }
    const issue = issueArr[0];

    // واکشی گره دانشی و دوره
    let domainTitle = 'نامشخص';
    if (issue.domainNodeId) {
      const node = await db.query.treeNodes.findFirst({ where: eq(treeNodes.id, issue.domainNodeId) });
      if (node?.title) domainTitle = node.title;
    }

    let periodName = 'نامشخص';
    if (issue.periodId) {
      const p = await db.query.periods.findFirst({ where: eq(periods.id, issue.periodId) });
      if (p?.name) periodName = p.name;
    }

    const need = safeJson(issue.needStatement);
    const contract = safeJson(issue.contract);
    const execContract = safeJson(issue.executiveContract);
    const stage20 = safeJson(issue.stage20);
    const stage50 = safeJson(issue.stage50);
    const stage100 = safeJson(issue.stage100);
    const appData = safeJson(issue.application);
    const teamMembers = safeJson(issue.issueResolutionTeam, []);

    // شرح و بیان مسئله واقعی (حل اولویت ۱۳: جایگزینی placeholder با مقادیر واقعی)
    const problemDescription = need.problem || issue.solutionDirection || issue.actionsTaken || 'شرحی ثبت نشده است.';

    const paragraphs: Paragraph[] = [
      new Paragraph({
        text: 'سامانه جامع مدیریت دانش و نظام مسائل (دانا)',
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [
          new TextRun({ text: 'سامانه جامع مدیریت دانش و نظام مسائل (دانا)', size: 20, color: '64748B' }),
        ],
      }),
      new Paragraph({
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
        children: [
          new TextRun({ text: 'شناسنامه رسمی نظام مسائل', bold: true, size: 32, color: '1E3A8A' }),
        ],
      }),

      createSectionHeader('مشخصات و هویت مسئله'),
      createFieldRow('کد شناسایی مسئله', `ISS-${String(issue.id).padStart(4, '0')}`),
      createFieldRow('عنوان مسئله', issue.title),
      createFieldRow('دوره زمانی', periodName),
      createFieldRow('حوزه دانشی', domainTitle),
      createFieldRow('دسته‌بندی', issue.category || 'عمومی'),
      createFieldRow('وضعیت جاری', statusMap[issue.status || ''] || issue.status || 'در انتظار'),
      createFieldRow('اولویت اقدام', issue.actionPriority || 'متوسط'),
      createFieldRow('سطح محرمانگی', issue.confidentialityLevel || 'عمومی'),
      createFieldRow('واحد متولی / مسئول', issue.responsibleUnit || '-'),
      createFieldRow('نوع دانش', issue.knowledgeType || '-'),
      createFieldRow('سطح پروژه', issue.projectLevel || '-'),
      createFieldRow('مرجع تصویب', issue.approvalAuthority || '-'),

      createSectionHeader('شرح و بیان عینی نیاز و مسئله'),
      createFieldRow('شرح و بیان تفصیلی مسئله', problemDescription),
      createFieldRow('جهت‌گیری راه‌حل دانشی', issue.solutionDirection || '-'),
      createFieldRow('متقاضی / کاربر نهایی نیاز', need.user || '-'),
      createFieldRow('بودجه پیشنهادی متقاضی', need.suggestedBudget ? `${Number(need.suggestedBudget).toLocaleString('fa-IR')} ریال` : '-'),
      createFieldRow('وضعیت تصویب نیاز', need.approvalStatus === 'approved' ? 'تصویب شد' : (need.approvalStatus === 'rejected' ? 'رد شد' : 'در انتظار')),

      createSectionHeader('اطلاعات اعتبارات مالی و پیشرفت فیزیکی'),
      createFieldRow('بودجه مورد نیاز (درخواستی)', `${Number(issue.requiredBudget || 0).toLocaleString('fa-IR')} ریال`),
      createFieldRow('بودجه مصوب مراجع', `${Number(issue.approvedBudget || 0).toLocaleString('fa-IR')} ریال`),
      createFieldRow('بودجه واگذار شده (تخصیص‌یافته)', `${Number(issue.assignedBudget || 0).toLocaleString('fa-IR')} ریال`),
      createFieldRow('مدت زمان پیش‌بینی شده', `${issue.expectedMonths || 0} ماه`),
      createFieldRow('درصد پیشرفت فیزیکی', `${issue.completionPercent || 0}٪`),
      createFieldRow('سند بالادستی یا ارجاعی', issue.referenceDocument || '-'),

      createSectionHeader('مشخصات قرارداد و ابعاد اجرایی'),
      createFieldRow('شماره قرارداد', contract.number || '-'),
      createFieldRow('مجری قرارداد', contract.executor || '-'),
      createFieldRow('مبلغ قرارداد', contract.amount ? `${Number(contract.amount).toLocaleString('fa-IR')} ریال` : '-'),
      createFieldRow('تاریخ شروع قرارداد', contract.startDate || contract.date || '-'),
      createFieldRow('مصوبه شورای اجرایی', execContract.minutes || '-'),

      createSectionHeader('مراحل سه‌گانه و دفاع'),
      createFieldRow('مقطع ۲۰٪ (پروپوزال)', `تاریخ دفاع: ${stage20.defenseDate || '-'} | پرداخت: ${Number(stage20.paidAmount || 0).toLocaleString('fa-IR')} ریال`),
      createFieldRow('مقطع ۵۰٪ (میانی)', `تاریخ دفاع: ${stage50.defenseDate || '-'} | پرداخت: ${Number(stage50.paidAmount || 0).toLocaleString('fa-IR')} ریال`),
      createFieldRow('مقطع ۱۰۰٪ (نهایی)', `تاریخ دفاع: ${stage100.defenseDate || '-'} | پرداخت: ${Number(stage100.paidAmount || 0).toLocaleString('fa-IR')} ریال`),

      createSectionHeader('کاربست نتایج در رده‌ها و توان رزم'),
      createFieldRow('نوع کاربست', appData.applicationType || '-'),
      createFieldRow('تاریخ کاربست', appData.applicationDate || '-'),
      createFieldRow('کارگروه کاربست', appData.workingGroup || '-'),
      createFieldRow('بازتاب نتایج در رده‌ها و توان رزم', appData.resultReflection || '-'),

      createSectionHeader('گلوگاه‌ها، اقدامات و تدابیر ابلاغی'),
      createFieldRow('اقدامات صورت‌گرفته', issue.actionsTaken || '-'),
      createFieldRow('گلوگاه‌ها و موانع اصلی', issue.bottlenecks || '-'),
      createFieldRow('تدابیر و فرامین ابلاغی', issue.orders || '-'),
      createFieldRow('تاریخ ثبت در سامانه', issue.createdAt ? format(new Date(issue.createdAt), 'yyyy/MM/dd') : '-'),
    ];

    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs,
      }],
    });

    const buffer = await Packer.toBuffer(doc);

    logAudit({
      userId: user?.id || null,
      action: 'EXPORT',
      entityName: 'مسئله - شناسنامه Word',
      entityId: issueId,
      changes: { format: 'docx', issueId },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.setHeader('Content-Disposition', `attachment; filename="issue-${issueId}-id.docx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
  } catch (err) {
    console.error('Error exporting word:', err);
    res.status(500).json({ error: 'خطا در تولید فایل Word' });
  }
});

export default exportRoutes;
