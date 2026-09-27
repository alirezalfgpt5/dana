// server/routes/issues/issueCrud.ts
// عملیات ثبت، ویرایش، حذف، دریافت و تاریخچه مسائل با کنترل دسترسی سازمانی کامل و اعتبارسنجی یکپارچه

import { Router } from 'express';
import { db, sqlite } from '../../../src/db/index.js';
import {
  issues,
  issueTemplates,
  issueAttachments,
  issueHistory,
  researchItems,
  treeNodes,
  knowledgeTrees,
  templates,
  users,
  gaps,
  periods,
} from '../../../src/db/schema.js';
import { eq, and, or, like, desc, inArray, sql, gte, lte } from 'drizzle-orm';
import { logAudit } from '../../utils/audit.js';
import { AuthRequest } from '../../types/AuthRequest.js';
import { hasIssueAccess, canUserAccessNode, canUserAccessResearchItem, buildIssueOrgConditions } from './issueAccess.js';
import { issueInputSchema, issueUpdateSchema, normalizePersianText, validStatuses } from './issueValidation.js';
import fs from 'fs';

export const crudRouter = Router();

// ============================================
// ۱. دریافت لیست مسائل با فیلترهای پیشرفته و کنترل سازمانی
// ============================================
crudRouter.get('/', async (req, res) => {
  try {
    const {
      domain,
      status,
      priority,
      projectLevel,
      timeFrame,
      knowledgeType,
      category,
      search,
      fromDate,
      toDate,
      advancedFilter,
      baseId,
      unitId,
      mode,
      treeId,
      periodId,
      page = 1,
      limit = 20,
    } = req.query;

    const user = (req as AuthRequest).user;
    const conditions: any[] = [];

    // ۱. کنترل دسترسی سازمانی یکپارچه (حل نقص عدم فیلتر و شرایط پایگاه بدون درخت)
    const orgConds = await buildIssueOrgConditions(user, {
      baseId: baseId ? parseInt(baseId as string) : null,
      unitId: unitId ? parseInt(unitId as string) : null,
      mode: mode as string,
    });
    if (orgConds.length > 0) {
      conditions.push(...orgConds);
    }

    // ۲. فیلتر درخت یا دوره
    if (treeId) {
      const parsedTreeId = parseInt(treeId as string);
      const treeNodesIds = await db.select({ id: treeNodes.id })
        .from(treeNodes)
        .where(eq(treeNodes.treeId, parsedTreeId));
      const nodeIds = treeNodesIds.map(n => n.id);
      if (nodeIds.length > 0) {
        conditions.push(inArray(issues.domainNodeId, nodeIds));
      } else {
        conditions.push(eq(issues.domainNodeId, -1));
      }
    } else if (periodId && periodId !== 'all' && periodId !== 'undefined' && periodId !== 'null') {
      const parsedPeriodId = parseInt(periodId as string);
      if (!isNaN(parsedPeriodId)) {
        const treesInPeriod = await db.select({ id: knowledgeTrees.id })
          .from(knowledgeTrees)
          .where(eq(knowledgeTrees.periodId, parsedPeriodId));
        const treeIds = treesInPeriod.map(t => t.id);
        let nodeIds: number[] = [];
        if (treeIds.length > 0) {
          const nodesInPeriod = await db.select({ id: treeNodes.id })
            .from(treeNodes)
            .where(inArray(treeNodes.treeId, treeIds));
          nodeIds = nodesInPeriod.map(n => n.id);
        }
        if (nodeIds.length > 0) {
          conditions.push(or(
            eq(issues.periodId, parsedPeriodId),
            inArray(issues.domainNodeId, nodeIds)
          ));
        } else {
          conditions.push(eq(issues.periodId, parsedPeriodId));
        }
      }
    }

    // ۳. سایر فیلترها
    if (domain) {
      conditions.push(eq(issues.domainNodeId, parseInt(domain as string)));
    }
    if (status && status !== 'all') {
      conditions.push(eq(issues.status, status as any));
    }
    if (priority && priority !== 'all') {
      conditions.push(eq(issues.actionPriority, priority as string));
    }
    if (projectLevel && projectLevel !== 'all') {
      conditions.push(eq(issues.projectLevel, projectLevel as string));
    }
    if (timeFrame) {
      conditions.push(eq(issues.expectedMonths, parseInt(timeFrame as string)));
    }
    if (knowledgeType && knowledgeType !== 'all') {
      conditions.push(eq(issues.knowledgeType, knowledgeType as string));
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
        like(issues.responsibleUnit, searchPattern),
        like(issues.actionsTaken, searchPattern),
        like(issues.bottlenecks, searchPattern),
        like(issues.orders, searchPattern)
      ));
    }
    if (fromDate) {
      conditions.push(gte(issues.approvalDate, fromDate as string));
    }
    if (toDate) {
      conditions.push(lte(issues.approvalDate, toDate as string));
    }

    // ۴. فیلتر پیشرفته سازنده پرس‌وجو (AdvancedQueryBuilder)
    if (advancedFilter) {
      try {
        const parsed = typeof advancedFilter === 'string' ? JSON.parse(advancedFilter) : advancedFilter;
        if (parsed?.rules && Array.isArray(parsed.rules)) {
          const ruleConds: any[] = [];
          for (const rule of parsed.rules) {
            if (!rule.field || rule.value === undefined || rule.value === '') continue;
            const fieldCol = (issues as any)[rule.field];
            if (fieldCol) {
              if (rule.op === 'eq') ruleConds.push(eq(fieldCol, rule.value));
              else if (rule.op === 'neq') ruleConds.push(sql`${fieldCol} != ${rule.value}`);
              else if (rule.op === 'like') ruleConds.push(like(fieldCol, `%${rule.value}%`));
              else if (rule.op === 'in' && Array.isArray(rule.value)) ruleConds.push(inArray(fieldCol, rule.value));
            }
          }
          if (ruleConds.length > 0) {
            if (parsed.condition === 'OR') {
              conditions.push(or(...ruleConds));
            } else {
              conditions.push(and(...ruleConds));
            }
          }
        }
      } catch (e) {
        console.warn('Invalid advancedFilter:', e);
      }
    }

    // محاسبه تعداد کل
    const countQuery = db.select({ count: sql<number>`count(*)` })
      .from(issues)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    const countResult = await countQuery;
    const total = Number(countResult[0]?.count || 0);

    // صفحه بندی
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.max(1, parseInt(limit as string) || 20);
    const offset = (pageNum - 1) * limitNum;

    const dataQuery = db.select()
      .from(issues)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(issues.createdAt))
      .limit(limitNum)
      .offset(offset);

    const issuesList = await dataQuery;

    // استخراج اطلاعات الحاقی (قالب‌ها، تعداد پیوست‌ها، دوره‌ها و گره‌ها)
    const issueIds = issuesList.map(i => i.id);
    let allIssueTemplates: any[] = [];
    let allAttachmentsCount: any[] = [];

    if (issueIds.length > 0) {
      allIssueTemplates = await db.select({
        issueId: issueTemplates.issueId,
        templateId: templates.id,
        templateTitle: templates.title,
      })
      .from(issueTemplates)
      .leftJoin(templates, eq(issueTemplates.templateId, templates.id))
      .where(inArray(issueTemplates.issueId, issueIds));

      allAttachmentsCount = await db.select({
        issueId: issueAttachments.issueId,
        count: sql<number>`count(*)`,
      })
      .from(issueAttachments)
      .where(inArray(issueAttachments.issueId, issueIds))
      .groupBy(issueAttachments.issueId);
    }

    const domainNodeIds = issuesList.map(i => i.domainNodeId).filter(Boolean) as number[];
    let allNodes: any[] = [];
    if (domainNodeIds.length > 0) {
      allNodes = await db.select().from(treeNodes).where(inArray(treeNodes.id, Array.from(new Set(domainNodeIds))));
    }

    const periodIds = issuesList.map(i => i.periodId).filter(Boolean) as number[];
    let allPeriods: any[] = [];
    if (periodIds.length > 0) {
      allPeriods = await db.select().from(periods).where(inArray(periods.id, Array.from(new Set(periodIds))));
    }

    const enrichedIssues = issuesList.map(issue => {
      const dNode = allNodes.find(n => n.id === issue.domainNodeId);
      const prd = allPeriods.find(p => p.id === issue.periodId);
      const issueTemps = allIssueTemplates.filter(t => t.issueId === issue.id).map(t => ({
        id: t.templateId,
        title: t.templateTitle,
      }));
      const attInfo = allAttachmentsCount.find(a => a.issueId === issue.id);

      return {
        ...issue,
        domain: dNode?.title || 'نامشخص',
        period: prd || null,
        templates: issueTemps,
        attachmentsCount: attInfo ? Number(attInfo.count) : 0,
      };
    });

    res.json({
      data: enrichedIssues,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching issues:', error);
    res.status(500).json({ error: 'خطا در دریافت لیست مسائل' });
  }
});

// ============================================
// ۲. دریافت یک مسئله با تمام جزئیات و کنترل دسترسی
// ============================================
crudRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const issueId = parseInt(id);
    const user = (req as AuthRequest).user;

    // بررسی کنترل دسترسی سازمانی (حل نقص اولویت ۱)
    const hasAccess = await hasIssueAccess(user, issueId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'شما دسترسی لازم برای مشاهده این مسئله را ندارید.' });
    }

    const issue = await db.query.issues.findFirst({
      where: eq(issues.id, issueId),
      with: {
        period: true,
        sourceIssue: {
          with: {
            period: true,
          }
        }
      }
    });

    if (!issue) {
      return res.status(404).json({ error: 'مسئله یافت نشد' });
    }

    // دریافت اطلاعات پژوهش مرتبط
    const researchItem = issue.researchItemId
      ? await db.query.researchItems.findFirst({
          where: eq(researchItems.id, issue.researchItemId as number),
        })
      : null;

    const node = issue.domainNodeId
      ? await db.query.treeNodes.findFirst({
          where: eq(treeNodes.id, issue.domainNodeId),
        })
      : (researchItem && researchItem.nodeId
          ? await db.query.treeNodes.findFirst({
              where: eq(treeNodes.id, researchItem.nodeId),
            })
          : null);

    // دریافت قالب‌ها
    const issueTemplatesList = await db.select()
      .from(issueTemplates)
      .where(eq(issueTemplates.issueId, issueId));

    const templateIds = issueTemplatesList.map(it => it.templateId);
    const templatesList = templateIds.length > 0
      ? await db.select().from(templates).where(inArray(templates.id, templateIds))
      : [];

    // دریافت فایل‌های پیوست
    const attachments = await db.select()
      .from(issueAttachments)
      .where(eq(issueAttachments.issueId, issueId));

    // دریافت تاریخچه تغییرات
    const history = await db.select({
      id: issueHistory.id,
      field: issueHistory.field,
      oldValue: issueHistory.oldValue,
      newValue: issueHistory.newValue,
      changedAt: issueHistory.changedAt,
      userId: users.id,
      username: users.username,
      fullName: users.fullName,
    })
    .from(issueHistory)
    .leftJoin(users, eq(issueHistory.changedBy, users.id))
    .where(eq(issueHistory.issueId, issueId))
    .orderBy(desc(issueHistory.changedAt));

    res.json({
      ...issue,
      domain: node?.title || 'نامشخص',
      researchItem,
      node,
      templates: templatesList,
      attachments,
      history,
    });
  } catch (error) {
    console.error('Error fetching issue:', error);
    res.status(500).json({ error: 'خطا در دریافت اطلاعات مسئله' });
  }
});

// ============================================
// ۳. ایجاد مسئله جدید با اعتبارسنجی جامع
// ============================================
crudRouter.post('/', async (req, res) => {
  try {
    const user = (req as AuthRequest).user;
    const userId = user?.id || null;
    const now = new Date().toISOString();

    const parseResult = issueInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.issues[0]?.message || 'داده‌های ارسالی نامعتبر است',
        details: parseResult.error.issues,
      });
    }

    const data = parseResult.data;

    // بررسی دسترسی سازمانی به گره دانشی حوزه
    const canAccessDomain = await canUserAccessNode(user, data.domainNodeId);
    if (!canAccessDomain) {
      return res.status(403).json({ error: 'شما دسترسی لازم برای ثبت مسئله در این حوزه دانشی را ندارید.' });
    }

    // تبدیل گپ به آیتم پژوهشی در صورت ارسال gapId
    if (data.gapId && !data.researchItemId) {
      const gap = await db.query.gaps.findFirst({
        where: eq(gaps.id, data.gapId),
      });

      if (gap) {
        const insertedResearchItem = await db.insert(researchItems).values({
          gapId: data.gapId,
          nodeId: data.domainNodeId,
          priority: gap.priority || 'medium',
          importance: gap.gapType || 'نامشخص',
          metadata: { inheritedFromGap: true, gapMatchScore: gap.matchScore, gapDescription: gap.description },
          createdAt: now,
          updatedAt: now,
        }).returning({ id: researchItems.id });

        if (insertedResearchItem && insertedResearchItem.length > 0) {
          data.researchItemId = insertedResearchItem[0].id;
        }
      }
    }

    // بررسی وجود و دسترسی به آیتم پژوهشی مرتبط
    if (data.researchItemId) {
      const rItem = await db.query.researchItems.findFirst({
        where: eq(researchItems.id, data.researchItemId),
      });
      if (!rItem) {
        return res.status(404).json({ error: 'آیتم پژوهشی مرتبط یافت نشد' });
      }
      const canAccessResearch = await canUserAccessResearchItem(user, data.researchItemId);
      if (!canAccessResearch) {
        return res.status(403).json({ error: 'شما به آیتم پژوهشی انتخاب‌شده دسترسی ندارید.' });
      }
    }

    // تعیین دوره زمانی مسئله
    let issuePeriodId = data.periodId;
    if (!issuePeriodId && data.domainNodeId) {
      const nodeObj = await db.query.treeNodes.findFirst({
        where: eq(treeNodes.id, data.domainNodeId),
      });
      if (nodeObj) {
        const treeObj = await db.query.knowledgeTrees.findFirst({
          where: eq(knowledgeTrees.id, nodeObj.treeId),
        });
        if (treeObj?.periodId) {
          issuePeriodId = treeObj.periodId;
        }
      }
    }
    if (!issuePeriodId) {
      const activeP = await db.query.periods.findFirst({
        where: eq(periods.isActive, 1),
      });
      issuePeriodId = activeP?.id || 1;
    }

    // بررسی وضعیت دوره زمانی (فریز یا خاتمه‌یافته)
    const targetPeriod = await db.query.periods.findFirst({
      where: eq(periods.id, issuePeriodId),
    });
    if (targetPeriod && (targetPeriod.isComplete === 1 || (targetPeriod as any).status === 'completed' || (targetPeriod as any).status === 'archived')) {
      return res.status(400).json({
        error: 'دوره زمانی انتخاب‌شده خاتمه‌یافته یا فریز گردیده است و امکان ثبت مسئله جدید در آن وجود ندارد.'
      });
    }

    // استخراج قالب‌ها
    let templateIds = data.templateIds || [];
    if (templateIds.length === 0 && data.domainNodeId) {
      const node = await db.query.treeNodes.findFirst({
        where: eq(treeNodes.id, data.domainNodeId),
      });
      if (node?.templateIds) {
        templateIds = Array.isArray(node.templateIds) ? node.templateIds : String(node.templateIds).split(',').filter(Boolean);
      }
    }

    // ایجاد مسئله در تراکنش
    const result = db.transaction((tx) => {
      const newIssue = tx.insert(issues).values({
        periodId: issuePeriodId,
        sourceIssueId: data.sourceIssueId || null,
        researchItemId: data.researchItemId || null,
        domainNodeId: data.domainNodeId,
        title: data.title,
        solutionDirection: data.solutionDirection || '',
        responsibleUnit: data.responsibleUnit || '',
        confidentialityLevel: data.confidentialityLevel || 'عمومی',
        actionPriority: data.actionPriority || 'متوسط',
        approvalDate: data.approvalDate || now,
        knowledgeType: data.knowledgeType || 'نظریه',
        projectLevel: data.projectLevel || 'سطح1',
        approvalAuthority: data.approvalAuthority || 'نهاجا',
        researchProjectType: data.researchProjectType || '',
        knowledgeProjectType: data.knowledgeProjectType || '',
        events: data.events || '',
        macroProject: data.macroProject || null,
        scientificDiplomacy: data.scientificDiplomacy || '',
        collaborators: data.collaborators || '',
        collaborationNetwork: data.collaborationNetwork || null,
        referenceDocument: data.referenceDocument || '',
        requiredBudget: data.requiredBudget || 0,
        approvedBudget: data.approvedBudget || 0,
        assignedBudget: data.assignedBudget || 0,
        expectedMonths: data.expectedMonths || 0,
        completionPercent: data.completionPercent || 0,
        actionsTaken: data.actionsTaken || '',
        bottlenecks: data.bottlenecks || '',
        orders: data.orders || '',
        issueResolutionTeam: data.issueResolutionTeam || null,
        needStatement: data.needStatement || null,
        contract: data.contract || null,
        executiveContract: data.executiveContract || null,
        stage20: data.stage20 || null,
        stage50: data.stage50 || null,
        stage100: data.stage100 || null,
        application: data.application || null,
        status: data.status || 'pending',
        category: data.category || '',
        metadata: data.metadata || null,
        createdAt: now,
        updatedAt: now,
      }).returning().get();

      for (const tId of templateIds) {
        if (tId) {
          tx.insert(issueTemplates).values({
            issueId: newIssue.id,
            templateId: parseInt(String(tId)),
          }).run();
        }
      }

      return newIssue;
    });

    logAudit({
      userId,
      action: 'CREATE',
      entityName: 'مسئله',
      entityId: result.id,
      changes: { new: result },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating issue:', error);
    res.status(500).json({ error: 'خطا در ثبت مسئله' });
  }
});

// ============================================
// ۴. ویرایش مسئله با ذخیره قطعی researchItemId و اعتبارسنجی روابط
// ============================================
crudRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const issueId = parseInt(id);
    const user = (req as AuthRequest).user;
    const userId = user?.id || null;
    const now = new Date().toISOString();

    // بررسی دسترسی سازمانی (اولویت ۱)
    const hasAccess = await hasIssueAccess(user, issueId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'شما دسترسی لازم برای ویرایش این مسئله را ندارید.' });
    }

    const oldData = await db.query.issues.findFirst({
      where: eq(issues.id, issueId),
    });
    if (!oldData) {
      return res.status(404).json({ error: 'مسئله یافت نشد' });
    }

    // اعتبارسنجی با schema (اولویت ۷)
    const parseResult = issueUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.issues[0]?.message || 'اطلاعات ارسالی نامعتبر است',
        details: parseResult.error.issues,
      });
    }

    const data = parseResult.data;

    // بررسی فریز بودن دوره زمانی
    if (oldData.periodId) {
      const currentPeriod = await db.query.periods.findFirst({
        where: eq(periods.id, oldData.periodId),
      });
      if (currentPeriod && (currentPeriod.isComplete === 1 || (currentPeriod as any).status === 'completed' || (currentPeriod as any).status === 'archived')) {
        return res.status(400).json({
          error: 'دوره زمانی این مسئله خاتمه‌یافته یا فریز گردیده است و امکان تغییر اطلاعات آن وجود ندارد.'
        });
      }
    }

    if (data.periodId && data.periodId !== oldData.periodId) {
      const targetPeriod = await db.query.periods.findFirst({
        where: eq(periods.id, data.periodId),
      });
      if (targetPeriod && (targetPeriod.isComplete === 1 || (targetPeriod as any).status === 'completed' || (targetPeriod as any).status === 'archived')) {
        return res.status(400).json({
          error: 'دوره مقصد انتخاب‌شده خاتمه‌یافته است و امکان انتقال مسئله به آن وجود ندارد.'
        });
      }
    }

    // همزمانی خوش‌بینانه (Optimistic Concurrency Control)
    if (req.body.updatedAt && oldData.updatedAt !== req.body.updatedAt) {
      return res.status(409).json({
        error: 'مسابقه همزمانی (Race Condition): کاربر دیگری در همین لحظه تغییراتی در این رکورد اعمال کرده است. لطفاً صفحه را تازه‌سازی کنید.',
        conflict: true
      });
    }

    // اعتبارسنجی گره دانشی جدید در صورت تغییر
    if (data.domainNodeId !== undefined && data.domainNodeId !== oldData.domainNodeId) {
      const canAccessNodeBool = await canUserAccessNode(user, data.domainNodeId);
      if (!canAccessNodeBool) {
        return res.status(403).json({ error: 'شما دسترسی لازم برای اتصال مسئله به این حوزه دانشی را ندارید.' });
      }
    }

    // اعتبارسنجی قطعی آیتم پژوهشی (اولویت ۳: پشتیبانی صریح از null و اعتبارسنجی وجود و دسترسی)
    let newResearchItemId = oldData.researchItemId;
    if (data.researchItemId !== undefined) {
      if (data.researchItemId === null || data.researchItemId === 0) {
        newResearchItemId = null;
      } else {
        const rItem = await db.query.researchItems.findFirst({
          where: eq(researchItems.id, data.researchItemId),
        });
        if (!rItem) {
          return res.status(404).json({ error: 'آیتم پژوهشی انتخاب‌شده یافت نشد.' });
        }
        const canAccessResearch = await canUserAccessResearchItem(user, data.researchItemId);
        if (!canAccessResearch) {
          return res.status(403).json({ error: 'شما به آیتم پژوهشی انتخاب‌شده دسترسی ندارید.' });
        }
        newResearchItemId = data.researchItemId;
      }
    }

    const updateData: any = {
      periodId: data.periodId !== undefined ? data.periodId : oldData.periodId,
      domainNodeId: data.domainNodeId !== undefined ? data.domainNodeId : oldData.domainNodeId,
      researchItemId: newResearchItemId, // اعمال صریح در دیتابیس (حل اولویت ۳)
      title: data.title !== undefined ? data.title : oldData.title,
      solutionDirection: data.solutionDirection !== undefined ? data.solutionDirection : oldData.solutionDirection,
      responsibleUnit: data.responsibleUnit !== undefined ? data.responsibleUnit : oldData.responsibleUnit,
      confidentialityLevel: data.confidentialityLevel !== undefined ? data.confidentialityLevel : oldData.confidentialityLevel,
      actionPriority: data.actionPriority !== undefined ? data.actionPriority : oldData.actionPriority,
      approvalDate: data.approvalDate !== undefined ? data.approvalDate : oldData.approvalDate,
      knowledgeType: data.knowledgeType !== undefined ? data.knowledgeType : oldData.knowledgeType,
      projectLevel: data.projectLevel !== undefined ? data.projectLevel : oldData.projectLevel,
      approvalAuthority: data.approvalAuthority !== undefined ? data.approvalAuthority : oldData.approvalAuthority,
      researchProjectType: data.researchProjectType !== undefined ? data.researchProjectType : oldData.researchProjectType,
      knowledgeProjectType: data.knowledgeProjectType !== undefined ? data.knowledgeProjectType : oldData.knowledgeProjectType,
      events: data.events !== undefined ? data.events : oldData.events,
      macroProject: data.macroProject !== undefined ? data.macroProject : oldData.macroProject,
      scientificDiplomacy: data.scientificDiplomacy !== undefined ? data.scientificDiplomacy : oldData.scientificDiplomacy,
      collaborators: data.collaborators !== undefined ? data.collaborators : oldData.collaborators,
      collaborationNetwork: data.collaborationNetwork !== undefined ? data.collaborationNetwork : oldData.collaborationNetwork,
      referenceDocument: data.referenceDocument !== undefined ? data.referenceDocument : oldData.referenceDocument,
      requiredBudget: data.requiredBudget !== undefined ? data.requiredBudget : oldData.requiredBudget,
      approvedBudget: data.approvedBudget !== undefined ? data.approvedBudget : oldData.approvedBudget,
      assignedBudget: data.assignedBudget !== undefined ? data.assignedBudget : oldData.assignedBudget,
      expectedMonths: data.expectedMonths !== undefined ? data.expectedMonths : oldData.expectedMonths,
      completionPercent: data.completionPercent !== undefined ? data.completionPercent : oldData.completionPercent,
      actionsTaken: data.actionsTaken !== undefined ? data.actionsTaken : oldData.actionsTaken,
      bottlenecks: data.bottlenecks !== undefined ? data.bottlenecks : oldData.bottlenecks,
      orders: data.orders !== undefined ? data.orders : oldData.orders,
      issueResolutionTeam: data.issueResolutionTeam !== undefined ? data.issueResolutionTeam : oldData.issueResolutionTeam,
      needStatement: data.needStatement !== undefined ? data.needStatement : oldData.needStatement,
      contract: data.contract !== undefined ? data.contract : oldData.contract,
      executiveContract: data.executiveContract !== undefined ? data.executiveContract : oldData.executiveContract,
      stage20: data.stage20 !== undefined ? data.stage20 : oldData.stage20,
      stage50: data.stage50 !== undefined ? data.stage50 : oldData.stage50,
      stage100: data.stage100 !== undefined ? data.stage100 : oldData.stage100,
      application: data.application !== undefined ? data.application : oldData.application,
      status: data.status !== undefined ? data.status : oldData.status,
      category: data.category !== undefined ? data.category : oldData.category,
      metadata: data.metadata !== undefined ? data.metadata : oldData.metadata,
      sourceIssueId: data.sourceIssueId !== undefined ? data.sourceIssueId : oldData.sourceIssueId,
      updatedAt: now,
    };

    const result = await db.update(issues)
      .set(updateData)
      .where(eq(issues.id, issueId))
      .returning();

    // ثبت تاریخچه تغییرات تنها بر اساس مقادیر واقعاً ذخیره‌شده (حل اولویت ۳)
    const trackedKeys = Object.keys(updateData).filter(k => k !== 'updatedAt');
    for (const key of trackedKeys) {
      const oldVal = (oldData as any)[key];
      const newVal = updateData[key];
      const oldStr = typeof oldVal === 'object' && oldVal !== null ? JSON.stringify(oldVal) : String(oldVal ?? '');
      const newStr = typeof newVal === 'object' && newVal !== null ? JSON.stringify(newVal) : String(newVal ?? '');

      if (oldStr !== newStr) {
        await db.insert(issueHistory).values({
          issueId,
          field: key,
          oldValue: oldStr,
          newValue: newStr,
          changedBy: userId,
          changedAt: now,
        });
      }
    }

    // سینک قالب‌ها
    if (data.templateIds && Array.isArray(data.templateIds)) {
      await db.delete(issueTemplates).where(eq(issueTemplates.issueId, issueId));
      for (const tId of data.templateIds) {
        if (tId) {
          await db.insert(issueTemplates).values({
            issueId,
            templateId: parseInt(String(tId)),
          });
        }
      }
    }

    logAudit({
      userId,
      action: 'UPDATE',
      entityName: 'مسئله',
      entityId: issueId,
      changes: { old: oldData, new: result[0] },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json(result[0]);
  } catch (error) {
    console.error('Error updating issue:', error);
    res.status(500).json({ error: 'خطا در ویرایش مسئله' });
  }
});

// ============================================
// ۵. تغییر وضعیت مسئله با کنترل دسترسی
// ============================================
crudRouter.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const issueId = parseInt(id);
    const { status, note } = req.body;
    const user = (req as AuthRequest).user;
    const userId = user?.id || null;
    const now = new Date().toISOString();

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `وضعیت نامعتبر است. مقادیر مجاز: ${validStatuses.join(', ')}` });
    }

    const hasAccess = await hasIssueAccess(user, issueId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'شما دسترسی لازم برای تغییر وضعیت این مسئله را ندارید.' });
    }

    const oldData = await db.query.issues.findFirst({
      where: eq(issues.id, issueId),
    });
    if (!oldData) {
      return res.status(404).json({ error: 'مسئله یافت نشد' });
    }

    if (oldData.periodId) {
      const currentPeriod = await db.query.periods.findFirst({
        where: eq(periods.id, oldData.periodId),
      });
      if (currentPeriod && (currentPeriod.isComplete === 1 || (currentPeriod as any).status === 'completed' || (currentPeriod as any).status === 'archived')) {
        return res.status(400).json({ error: 'دوره زمانی این مسئله خاتمه‌یافته یا فریز گردیده است و امکان تغییر وضعیت وجود ندارد.' });
      }
    }

    const result = await db.update(issues)
      .set({ status, updatedAt: now })
      .where(eq(issues.id, issueId))
      .returning();

    await db.insert(issueHistory).values({
      issueId,
      field: 'status',
      oldValue: oldData.status || '',
      newValue: status + (note ? ` (توضیح: ${note})` : ''),
      changedBy: userId,
      changedAt: now,
    });

    logAudit({
      userId,
      action: 'UPDATE',
      entityName: 'مسئله - وضعیت',
      entityId: issueId,
      changes: { oldStatus: oldData.status, newStatus: status, note },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json(result[0]);
  } catch (error) {
    console.error('Error changing issue status:', error);
    res.status(500).json({ error: 'خطا در تغییر وضعیت مسئله' });
  }
});

// ============================================
// ۶. حذف مسئله با کنترل دسترسی و پاکسازی کامل
// ============================================
crudRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const issueId = parseInt(id);
    const user = (req as AuthRequest).user;
    const userId = user?.id || null;

    const hasAccess = await hasIssueAccess(user, issueId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'شما دسترسی لازم برای حذف این مسئله را ندارید.' });
    }

    const issue = await db.query.issues.findFirst({
      where: eq(issues.id, issueId),
    });
    if (!issue) {
      return res.status(404).json({ error: 'مسئله یافت نشد' });
    }

    if (issue.periodId) {
      const currentPeriod = await db.query.periods.findFirst({
        where: eq(periods.id, issue.periodId),
      });
      if (currentPeriod && (currentPeriod.isComplete === 1 || (currentPeriod as any).status === 'completed' || (currentPeriod as any).status === 'archived')) {
        return res.status(400).json({ error: 'دوره زمانی این مسئله خاتمه‌یافته یا فریز گردیده است و امکان حذف آن وجود ندارد.' });
      }
    }

    // پاکسازی فایل‌های دیسک
    const attachments = await db.select().from(issueAttachments).where(eq(issueAttachments.issueId, issueId));
    for (const att of attachments) {
      if (fs.existsSync(att.filePath)) {
        try { fs.unlinkSync(att.filePath); } catch (e) {}
      }
    }

    db.transaction((tx) => {
      tx.delete(issueTemplates).where(eq(issueTemplates.issueId, issueId)).run();
      tx.delete(issueAttachments).where(eq(issueAttachments.issueId, issueId)).run();
      tx.delete(issueHistory).where(eq(issueHistory.issueId, issueId)).run();
      tx.delete(issues).where(eq(issues.id, issueId)).run();
    });

    logAudit({
      userId,
      action: 'DELETE',
      entityName: 'مسئله',
      entityId: issueId,
      changes: { deletedIssue: issue },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'مسئله با موفقیت حذف شد' });
  } catch (error) {
    console.error('Error deleting issue:', error);
    res.status(500).json({ error: 'خطا در حذف مسئله' });
  }
});

// ============================================
// ۷. دریافت تاریخچه تغییرات با کنترل دسترسی (اولویت ۱)
// ============================================
crudRouter.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const issueId = parseInt(id);
    const user = (req as AuthRequest).user;

    const hasAccess = await hasIssueAccess(user, issueId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'شما دسترسی لازم برای مشاهده تاریخچه این مسئله را ندارید.' });
    }

    const history = await db.select({
      id: issueHistory.id,
      field: issueHistory.field,
      oldValue: issueHistory.oldValue,
      newValue: issueHistory.newValue,
      changedAt: issueHistory.changedAt,
      userId: users.id,
      username: users.username,
      fullName: users.fullName,
    })
    .from(issueHistory)
    .leftJoin(users, eq(issueHistory.changedBy, users.id))
    .where(eq(issueHistory.issueId, issueId))
    .orderBy(desc(issueHistory.changedAt));

    res.json(history);
  } catch (error) {
    console.error('Error fetching issue history:', error);
    res.status(500).json({ error: 'خطا در دریافت تاریخچه' });
  }
});

// ============================================
// ۸. دریافت زنجیره خط سیر مسئله (Lineage) با کنترل دسترسی (اولویت ۱)
// ============================================
crudRouter.get('/:id/lineage', async (req, res) => {
  try {
    const { id } = req.params;
    const issueId = parseInt(id);
    const user = (req as AuthRequest).user;

    const hasAccess = await hasIssueAccess(user, issueId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'شما دسترسی لازم برای مشاهده خط سیر این مسئله را ندارید.' });
    }

    const target = await db.query.issues.findFirst({
      where: eq(issues.id, issueId),
      with: { period: true },
    });
    if (!target) {
      return res.status(404).json({ error: 'مسئله یافت نشد' });
    }

    const ancestors: any[] = [];
    let currentSourceId = target.sourceIssueId;
    const visited = new Set<number>([target.id]);

    while (currentSourceId && !visited.has(currentSourceId)) {
      visited.add(currentSourceId);
      const parentIssue = await db.query.issues.findFirst({
        where: eq(issues.id, currentSourceId),
        with: { period: true },
      });
      if (parentIssue) {
        ancestors.push({
          id: parentIssue.id,
          title: parentIssue.title,
          periodId: parentIssue.periodId,
          periodName: parentIssue.period?.name || `دوره #${parentIssue.periodId}`,
          status: parentIssue.status,
          completionPercent: parentIssue.completionPercent,
          createdAt: parentIssue.createdAt,
        });
        currentSourceId = parentIssue.sourceIssueId;
      } else {
        break;
      }
    }

    const descendants: any[] = [];
    const directChildren = await db.query.issues.findMany({
      where: eq(issues.sourceIssueId, target.id),
      with: { period: true },
    });

    for (const child of directChildren) {
      descendants.push({
        id: child.id,
        title: child.title,
        periodId: child.periodId,
        periodName: child.period?.name || `دوره #${child.periodId}`,
        status: child.status,
        completionPercent: child.completionPercent,
        createdAt: child.createdAt,
      });
    }

    res.json({
      currentIssue: {
        id: target.id,
        title: target.title,
        periodId: target.periodId,
        periodName: target.period?.name || `دوره #${target.periodId}`,
        status: target.status,
      },
      ancestors: ancestors.reverse(),
      descendants,
      totalChainLength: ancestors.length + 1 + descendants.length,
    });
  } catch (error) {
    console.error('Error fetching issue lineage:', error);
    res.status(500).json({ error: 'خطا در واکشی زنجیره خط سیر مسئله' });
  }
});
