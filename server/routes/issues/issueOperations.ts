// server/routes/issues/issueOperations.ts
// عملیات تجمیعی، آمار کل فیلترشده، انتقال بین‌دوره‌ای و ورود گروهی با پوشش کامل فیلدها و اعتبارسنجی

import { Router } from 'express';
import { db } from '../../../src/db/index.js';
import {
  issues,
  issueTemplates,
  issueAttachments,
  periods,
  treeNodes,
  knowledgeTrees,
} from '../../../src/db/schema.js';
import { eq, and, or, like, inArray, gte, lte } from 'drizzle-orm';
import { logAudit } from '../../utils/audit.js';
import { AuthRequest } from '../../types/AuthRequest.js';
import { buildIssueOrgConditions, canUserAccessNode, hasIssueAccess } from './issueAccess.js';
import { rolloverSchema, normalizePersianText } from './issueValidation.js';

export const operationsRouter = Router();

// ============================================
// ۱. دریافت آمار تجمیعی واقعی برای کل نتایج فیلتر جاری (حل اولویت ۱۰)
// ============================================
operationsRouter.get('/stats', async (req, res) => {
  try {
    const {
      treeId,
      periodId,
      domain,
      status,
      priority,
      category,
      search,
      fromDate,
      toDate,
      baseId,
      unitId,
      mode,
    } = req.query;

    const user = (req as AuthRequest).user;
    const conditions: any[] = [];

    // ۱. کنترل دسترسی سازمانی روی آمار
    const orgConds = await buildIssueOrgConditions(user, {
      baseId: baseId ? parseInt(baseId as string) : null,
      unitId: unitId ? parseInt(unitId as string) : null,
      mode: mode as string,
    });
    if (orgConds.length > 0) {
      conditions.push(...orgConds);
    }

    // ۲. فیلتر دوره یا درخت
    if (treeId) {
      const parsedTreeId = parseInt(treeId as string);
      if (!isNaN(parsedTreeId)) {
        const treeNodesIds = await db.select({ id: treeNodes.id })
          .from(treeNodes)
          .where(eq(treeNodes.treeId, parsedTreeId));
        const nodeIds = treeNodesIds.map(n => n.id);
        if (nodeIds.length > 0) {
          conditions.push(inArray(issues.domainNodeId, nodeIds));
        } else {
          conditions.push(eq(issues.id, -1));
        }
      }
    } else if (periodId && periodId !== 'all' && periodId !== 'undefined' && periodId !== 'null') {
      const parsedPeriodId = parseInt(periodId as string);
      if (!isNaN(parsedPeriodId)) {
        conditions.push(eq(issues.periodId, parsedPeriodId));
      }
    }

    // ۳. سایر فیلترهای جاری
    if (domain) {
      conditions.push(eq(issues.domainNodeId, parseInt(domain as string)));
    }
    if (status && status !== 'all') {
      conditions.push(eq(issues.status, status as any));
    }
    if (priority && priority !== 'all') {
      conditions.push(eq(issues.actionPriority, priority as string));
    }
    if (category && category !== 'all') {
      const catClean = String(category).trim();
      conditions.push(or(
        like(issues.category, `%${catClean}%`),
        like(issues.knowledgeType, `%${catClean}%`),
        like(issues.researchProjectType, `%${catClean}%`),
        like(issues.knowledgeProjectType, `%${catClean}%`)
      ));
    }
    if (search) {
      const searchPattern = `%${String(search).trim()}%`;
      conditions.push(or(
        like(issues.title, searchPattern),
        like(issues.solutionDirection, searchPattern),
        like(issues.responsibleUnit, searchPattern)
      ));
    }
    if (fromDate) {
      conditions.push(gte(issues.approvalDate, fromDate as string));
    }
    if (toDate) {
      conditions.push(lte(issues.approvalDate, toDate as string));
    }

    const allIssues = await db.select().from(issues).where(conditions.length > 0 ? and(...conditions) : undefined);
    const total = allIssues.length;

    const pending = allIssues.filter(i => i.status === 'pending').length;
    const inProgress = allIssues.filter(i => i.status === 'in_progress').length;
    const completed = allIssues.filter(i => i.status === 'completed').length;
    const canceled = allIssues.filter(i => i.status === 'canceled').length;
    const onHold = allIssues.filter(i => i.status === 'on_hold').length;

    const byPriority = allIssues.reduce((acc: any, issue) => {
      const p = issue.actionPriority || 'متوسط';
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {});

    const totalRequiredBudget = allIssues.reduce((sum, issue) => sum + (Number(issue.requiredBudget) || 0), 0);
    const totalApprovedBudget = allIssues.reduce((sum, issue) => sum + (Number(issue.approvedBudget) || 0), 0);
    const totalAssignedBudget = allIssues.reduce((sum, issue) => sum + (Number(issue.assignedBudget) || 0), 0);

    const avgCompletion = total > 0
      ? Math.round(allIssues.reduce((sum, issue) => sum + (Number(issue.completionPercent) || 0), 0) / total)
      : 0;

    res.json({
      total,
      pending,
      inProgress,
      completed,
      canceled,
      onHold,
      byPriority,
      totalBudget: totalRequiredBudget,
      totalRequiredBudget,
      totalApprovedBudget,
      totalAssignedBudget,
      avgCompletion,
    });
  } catch (error) {
    console.error('Error fetching issue stats:', error);
    res.status(500).json({ error: 'خطا در دریافت آمار مسائل' });
  }
});

// ============================================
// ۲. انتقال بین‌دوره‌ای مسائل با اصلاح حالت انتخابی، کپی دسته‌بندی و پیوست‌ها (حل اولویت ۸)
// ============================================
operationsRouter.post('/carry-over', async (req, res) => {
  try {
    const parseResult = rolloverSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.issues[0]?.message || 'پارامترهای درخواست انتقال نامعتبر است',
        details: parseResult.error.issues,
      });
    }

    const { sourcePeriodId, targetPeriodId, mode, issueIds, responsibleUnit } = parseResult.data;
    const user = (req as AuthRequest).user;
    const userId = user?.id || null;
    const now = new Date().toISOString();

    // بررسی فریز یا خاتمه‌یافته بودن دوره مقصد
    const targetPeriod = await db.query.periods.findFirst({
      where: eq(periods.id, targetPeriodId),
    });
    if (targetPeriod && (targetPeriod.isComplete === 1 || (targetPeriod as any).status === 'completed' || (targetPeriod as any).status === 'archived')) {
      return res.status(400).json({
        error: 'دوره مقصد انتخاب‌شده خاتمه‌یافته یا فریز است و امکان انتقال مسئله به آن وجود ندارد.'
      });
    }

    // شرط پایه دوره مبدأ
    const conditions: any[] = [eq(issues.periodId, sourcePeriodId)];

    // اعمال فیلتر سازمانی کاربر
    const orgConds = await buildIssueOrgConditions(user);
    if (orgConds.length > 0) {
      conditions.push(...orgConds);
    }

    if (mode === 'open_only') {
      conditions.push(inArray(issues.status, ['pending', 'in_progress', 'on_hold']));
    } else if (mode === 'selected') {
      // به واسطه Zod قبلاً اعتبارسنجی شده که issueIds آرایه غیرخالی است
      conditions.push(inArray(issues.id, issueIds!));
    }

    if (responsibleUnit && responsibleUnit !== 'all') {
      conditions.push(eq(issues.responsibleUnit, responsibleUnit));
    }

    const sourceIssues = await db.select().from(issues).where(and(...conditions));
    if (sourceIssues.length === 0) {
      return res.json({
        message: 'مسئله‌ای منطبق با فیلترها و دسترسی شما برای انتقال در دوره مبدأ یافت نشد',
        count: 0,
        issues: [],
      });
    }

    const copiedIssues: any[] = [];

    db.transaction((tx) => {
      for (const s of sourceIssues) {
        // ۱. کپی رکورد مسئله با حفظ کامل فیلدها و کپی صریح category (حل اولویت ۸)
        const newIssue = tx.insert(issues).values({
          periodId: targetPeriodId,
          sourceIssueId: s.id, // حفظ خط سیر بین‌دوره‌ای
          researchItemId: s.researchItemId,
          domainNodeId: s.domainNodeId,
          title: s.title,
          solutionDirection: s.solutionDirection,
          responsibleUnit: s.responsibleUnit,
          confidentialityLevel: s.confidentialityLevel,
          actionPriority: s.actionPriority,
          approvalDate: s.approvalDate,
          knowledgeType: s.knowledgeType,
          projectLevel: s.projectLevel,
          approvalAuthority: s.approvalAuthority,
          researchProjectType: s.researchProjectType,
          knowledgeProjectType: s.knowledgeProjectType,
          events: s.events,
          macroProject: s.macroProject,
          scientificDiplomacy: s.scientificDiplomacy,
          collaborators: s.collaborators,
          collaborationNetwork: s.collaborationNetwork,
          referenceDocument: s.referenceDocument,
          requiredBudget: s.requiredBudget,
          approvedBudget: s.approvedBudget,
          assignedBudget: s.assignedBudget,
          expectedMonths: s.expectedMonths,
          completionPercent: s.completionPercent,
          actionsTaken: s.actionsTaken,
          bottlenecks: s.bottlenecks,
          orders: s.orders,
          issueResolutionTeam: s.issueResolutionTeam,
          needStatement: s.needStatement,
          contract: s.contract,
          executiveContract: s.executiveContract,
          stage20: s.stage20,
          stage50: s.stage50,
          stage100: s.stage100,
          application: s.application,
          status: s.status,
          category: s.category, // انتقال قطعی category (حل اولویت ۸)
          metadata: {
            ...(typeof s.metadata === 'object' && s.metadata !== null ? s.metadata : {}),
            snapshotSource: {
              periodId: sourcePeriodId,
              issueId: s.id,
              date: now,
            }
          }, // حفظ متادیتا قبلی همراه با snapshotSource (حل اولویت ۸)
          createdAt: now,
          updatedAt: now,
        }).returning().get();

        // ۲. کپی قالب‌های مرتبط
        const oldTemplates = tx.select().from(issueTemplates).where(eq(issueTemplates.issueId, s.id)).all();
        for (const it of oldTemplates) {
          tx.insert(issueTemplates).values({
            issueId: newIssue.id,
            templateId: it.templateId,
          }).run();
        }

        // ۳. کپی پیوست‌های مرتبط به رکورد جدید (حل اولویت ۸)
        const oldAttachments = tx.select().from(issueAttachments).where(eq(issueAttachments.issueId, s.id)).all();
        for (const att of oldAttachments) {
          tx.insert(issueAttachments).values({
            issueId: newIssue.id,
            filePath: att.filePath,
            fileName: att.fileName,
            fileSize: att.fileSize,
            fileType: att.fileType,
            uploadedAt: now,
            uploadedBy: userId,
          }).run();
        }

        copiedIssues.push(newIssue);
      }
    });

    logAudit({
      userId,
      action: 'ROLLOVER',
      entityName: 'نظام مسائل',
      entityId: targetPeriodId,
      changes: { count: copiedIssues.length, fromPeriod: sourcePeriodId, toPeriod: targetPeriodId, mode },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      message: `تعداد ${copiedIssues.length} مسئله همراه با دسته‌بندی و پیوست‌ها با موفقیت به دوره جدید انتقال یافتند`,
      count: copiedIssues.length,
      issues: copiedIssues,
    });
  } catch (error) {
    console.error('Error rolling over issues:', error);
    res.status(500).json({ error: 'خطا در انتقال مسائل به دوره جدید' });
  }
});

// ============================================
// ۳. بارگذاری گروهی مسائل با نگاشت جامع کلیه فیلدها و تطبیق پایدار (حل اولویت ۹)
// ============================================
operationsRouter.post('/batch-import', async (req, res) => {
  try {
    const { targetPeriodId, issuesList, updateExisting = true, responsibleUnit } = req.body;
    if (!targetPeriodId || !Array.isArray(issuesList) || issuesList.length === 0) {
      return res.status(400).json({ error: 'شناسه دوره مقصد و لیست غیرخالی مسائل الزامی است' });
    }

    const user = (req as AuthRequest).user;
    const userId = user?.id || null;
    const now = new Date().toISOString();

    const targetPeriod = await db.query.periods.findFirst({
      where: eq(periods.id, parseInt(targetPeriodId)),
    });
    if (targetPeriod && (targetPeriod.isComplete === 1 || (targetPeriod as any).status === 'completed' || (targetPeriod as any).status === 'archived')) {
      return res.status(400).json({ error: 'دوره مقصد انتخاب‌شده خاتمه‌یافته یا فریز است و نمی‌توان به آن مسئله وارد کرد.' });
    }

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: any[] = [];

    // استخراج تمام مسائل موجود در این دوره برای تطبیق پایدار
    const existingIssuesInPeriod = await db.select().from(issues).where(eq(issues.periodId, parseInt(targetPeriodId)));
    const existingMapByNormalizedTitle = new Map<string, typeof existingIssuesInPeriod[0]>();
    const existingMapById = new Map<number, typeof existingIssuesInPeriod[0]>();

    for (const ex of existingIssuesInPeriod) {
      existingMapById.set(ex.id, ex);
      if (ex.title) {
        existingMapByNormalizedTitle.set(normalizePersianText(ex.title), ex);
      }
    }

    db.transaction((tx) => {
      for (let idx = 0; idx < issuesList.length; idx++) {
        const item = issuesList[idx];
        if (!item || !item.title || String(item.title).trim() === '') {
          skippedCount++;
          errors.push({ row: idx + 1, error: 'عنوان مسئله خالی است' });
          continue;
        }

        const rawTitle = String(item.title).trim();
        const normTitle = normalizePersianText(rawTitle);

        // تطبیق پایدار: ابتدا با شناسه مشخص در صورت وجود، سپس با عنوان نرمالایزشده
        let matched = (item.id && existingMapById.get(parseInt(item.id))) || existingMapByNormalizedTitle.get(normTitle);

        const completionPercent = item.completionPercent !== undefined
          ? Math.min(100, Math.max(0, parseInt(String(item.completionPercent)) || 0))
          : undefined;

        const reqBudget = item.requiredBudget !== undefined ? Math.max(0, parseFloat(String(item.requiredBudget)) || 0) : undefined;
        const appBudget = item.approvedBudget !== undefined ? Math.max(0, parseFloat(String(item.approvedBudget)) || 0) : undefined;
        const assBudget = item.assignedBudget !== undefined ? Math.max(0, parseFloat(String(item.assignedBudget)) || 0) : undefined;

        if (matched && updateExisting) {
          // به‌روزرسانی جامع با تمام فیلدها (حل اولویت ۹)
          tx.update(issues).set({
            completionPercent: completionPercent !== undefined ? completionPercent : matched.completionPercent,
            status: item.status || matched.status,
            category: item.category !== undefined ? item.category : matched.category,
            researchItemId: item.researchItemId !== undefined ? (item.researchItemId ? parseInt(item.researchItemId) : null) : matched.researchItemId,
            domainNodeId: item.domainNodeId !== undefined ? (item.domainNodeId ? parseInt(item.domainNodeId) : null) : matched.domainNodeId,
            requiredBudget: reqBudget !== undefined ? reqBudget : matched.requiredBudget,
            approvedBudget: appBudget !== undefined ? appBudget : matched.approvedBudget,
            assignedBudget: assBudget !== undefined ? assBudget : matched.assignedBudget,
            expectedMonths: item.expectedMonths !== undefined ? parseInt(item.expectedMonths) || 0 : matched.expectedMonths,
            actionsTaken: item.actionsTaken !== undefined ? item.actionsTaken : matched.actionsTaken,
            bottlenecks: item.bottlenecks !== undefined ? item.bottlenecks : matched.bottlenecks,
            orders: item.orders !== undefined ? item.orders : matched.orders,
            solutionDirection: item.solutionDirection !== undefined ? item.solutionDirection : matched.solutionDirection,
            responsibleUnit: item.responsibleUnit !== undefined ? item.responsibleUnit : (responsibleUnit || matched.responsibleUnit),
            actionPriority: item.actionPriority !== undefined ? item.actionPriority : matched.actionPriority,
            confidentialityLevel: item.confidentialityLevel !== undefined ? item.confidentialityLevel : matched.confidentialityLevel,
            knowledgeType: item.knowledgeType !== undefined ? item.knowledgeType : matched.knowledgeType,
            projectLevel: item.projectLevel !== undefined ? item.projectLevel : matched.projectLevel,
            approvalAuthority: item.approvalAuthority !== undefined ? item.approvalAuthority : matched.approvalAuthority,
            needStatement: item.needStatement !== undefined ? item.needStatement : matched.needStatement,
            contract: item.contract !== undefined ? item.contract : matched.contract,
            executiveContract: item.executiveContract !== undefined ? item.executiveContract : matched.executiveContract,
            stage20: item.stage20 !== undefined ? item.stage20 : matched.stage20,
            stage50: item.stage50 !== undefined ? item.stage50 : matched.stage50,
            stage100: item.stage100 !== undefined ? item.stage100 : matched.stage100,
            application: item.application !== undefined ? item.application : matched.application,
            metadata: item.metadata !== undefined ? item.metadata : matched.metadata,
            updatedAt: now,
          }).where(eq(issues.id, matched.id)).run();

          updatedCount++;
        } else {
          // ایجاد رکورد جدید با نگاشت کامل فیلدها و ساختارهای JSON (حل اولویت ۹)
          const newIssue = tx.insert(issues).values({
            periodId: parseInt(targetPeriodId),
            domainNodeId: item.domainNodeId ? parseInt(item.domainNodeId) : null,
            researchItemId: item.researchItemId ? parseInt(item.researchItemId) : null,
            title: rawTitle,
            solutionDirection: item.solutionDirection || '',
            responsibleUnit: item.responsibleUnit || responsibleUnit || '',
            confidentialityLevel: item.confidentialityLevel || 'عمومی',
            actionPriority: item.actionPriority || 'متوسط',
            approvalDate: item.approvalDate || now,
            knowledgeType: item.knowledgeType || 'نظریه',
            projectLevel: item.projectLevel || 'سطح1',
            approvalAuthority: item.approvalAuthority || 'نهاجا',
            researchProjectType: item.researchProjectType || '',
            knowledgeProjectType: item.knowledgeProjectType || '',
            events: item.events || '',
            macroProject: item.macroProject || null,
            scientificDiplomacy: item.scientificDiplomacy || '',
            collaborators: item.collaborators || '',
            collaborationNetwork: item.collaborationNetwork || null,
            referenceDocument: item.referenceDocument || '',
            requiredBudget: reqBudget || 0,
            approvedBudget: appBudget || 0,
            assignedBudget: assBudget || 0,
            expectedMonths: item.expectedMonths ? parseInt(item.expectedMonths) : 0,
            completionPercent: completionPercent || 0,
            actionsTaken: item.actionsTaken || '',
            bottlenecks: item.bottlenecks || '',
            orders: item.orders || '',
            issueResolutionTeam: item.issueResolutionTeam || null,
            needStatement: item.needStatement || null,
            contract: item.contract || null,
            executiveContract: item.executiveContract || null,
            stage20: item.stage20 || null,
            stage50: item.stage50 || null,
            stage100: item.stage100 || null,
            application: item.application || null,
            status: item.status || 'pending',
            category: item.category || '',
            metadata: item.metadata || null,
            createdAt: now,
            updatedAt: now,
          }).returning().get();

          if (item.templateIds && Array.isArray(item.templateIds)) {
            for (const tId of item.templateIds) {
              if (tId) {
                tx.insert(issueTemplates).values({
                  issueId: newIssue.id,
                  templateId: parseInt(String(tId)),
                }).run();
              }
            }
          }

          addedCount++;
        }
      }
    });

    logAudit({
      userId,
      action: 'IMPORT',
      entityName: 'نظام مسائل - بارگذاری گروهی',
      entityId: parseInt(targetPeriodId),
      changes: { addedCount, updatedCount, skippedCount },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      message: `پردازش ورود داده با موفقیت پایان یافت: ${addedCount} مسئله جدید ثبت شد و ${updatedCount} مسئله به‌روزرسانی گردید.`,
      addedCount,
      updatedCount,
      skippedCount,
      errors,
    });
  } catch (error) {
    console.error('Error batch importing issues:', error);
    res.status(500).json({ error: 'خطا در بارگذاری گروهی مسائل' });
  }
});
