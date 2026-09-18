import { AuthRequest } from '../types/AuthRequest.js';
// server/routes/issueRoutes.ts
// مدیریت کامل نظام مسائل - با ۴۰+ فیلد پویا - نسخه ۳.۰

import { Router } from 'express';
import { db } from '../../src/db/index.js';
import {
  issues,
  issueTemplates,
  issueAttachments,
  issueHistory,
  researchItems,
  treeNodes,
  knowledgeTrees,
  templates,
  users, gaps,
} from '../../src/db/schema.js';
import { eq, and, or, like, isNull, not, desc, inArray, sql } from 'drizzle-orm';
import { logAudit } from '../utils/audit.js';
import { format } from 'date-fns-jalali';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileTypeFromFile } from 'file-type';

// ============================================
// تنظیمات آپلود فایل
// ============================================

const uploadDir = path.join(process.cwd(), 'storage', 'issues');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const issueId = req.params.id || 'general';
    const folder = path.join(process.cwd(), 'storage', 'issues', String(issueId));
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `issue-${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`نوع فایل ${file.mimetype} غیرمجاز است.`));
    }
  }
});

export const issueRoutes = Router();

// Helper برای بررسی دسترسی به مسئله
async function hasIssueAccess(user: any, issueId: number) {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  const issueArr = await db.select().from(issues).where(eq(issues.id, issueId));
  if (issueArr.length === 0) return false;
  const issue = issueArr[0];
  
  if (issue.domainNodeId) {
     const nodeArr = await db.select().from(treeNodes).where(eq(treeNodes.id, issue.domainNodeId));
     if (nodeArr.length > 0) {
        const treeArr = await db.select().from(knowledgeTrees).where(eq(knowledgeTrees.id, nodeArr[0].treeId));
        if (treeArr.length > 0) {
           const tree = treeArr[0];
           if (user.organizationLevel === 'NIROO' && tree.baseId !== user.baseId) return false;
           if (user.organizationLevel === 'RADE' && tree.unitId !== user.unitId) return false;
        }
     }
  }
  return true;
}


// ============================================
// ۱. دریافت لیست مسائل با فیلترهای پیشرفته
// ============================================

issueRoutes.get('/', async (req, res) => {
  try {
    const { 
      domain,
      status,
      priority,
      projectLevel,
      timeFrame,
      knowledgeType,
      search,
      fromDate,
      toDate,
      advancedFilter,
      page = 1,
      limit = 20 
    } = req.query;

    let query = db.select().from(issues);
    
    const conditions: any[] = [];
    
    const treeId = req.query.treeId;
    const periodId = req.query.periodId;

    if (treeId) {
       const treeNodesIds = await db.select({ id: treeNodes.id })
         .from(treeNodes)
         .where(eq(treeNodes.treeId, parseInt(treeId as string)));
       const nodeIds = treeNodesIds.map(n => n.id);
       if (nodeIds.length > 0) {
          conditions.push(inArray(issues.domainNodeId, nodeIds));
       } else {
          conditions.push(eq(issues.domainNodeId, -1));
       }
    } else if (periodId) {
       const treesInPeriod = await db.select({ id: knowledgeTrees.id })
          .from(knowledgeTrees)
          .where(eq(knowledgeTrees.periodId, parseInt(periodId as string)));
       const treeIds = treesInPeriod.map(t => t.id);
       if (treeIds.length > 0) {
          const nodesInPeriod = await db.select({ id: treeNodes.id })
             .from(treeNodes)
             .where(inArray(treeNodes.treeId, treeIds));
          const nodeIds = nodesInPeriod.map(n => n.id);
          if (nodeIds.length > 0) {
             conditions.push(inArray(issues.domainNodeId, nodeIds));
          } else {
             conditions.push(eq(issues.domainNodeId, -1));
          }
       } else {
          conditions.push(eq(issues.domainNodeId, -1));
       }
    }
    
    // فیلترهای مختلف
    if (domain) {
      conditions.push(eq(issues.domainNodeId, parseInt(domain as string)));
    }
    if (status) {
      conditions.push(eq(issues.status, status as string));
    }
    if (priority) {
      conditions.push(eq(issues.actionPriority, priority as string));
    }
        if (timeFrame) {
      const items = await db.select({ id: researchItems.id }).from(researchItems).where(eq(researchItems.timeFrame, timeFrame as string));
      const rIds = items.map(i => i.id);
      if (rIds.length > 0) {
        conditions.push(inArray(issues.researchItemId, rIds));
      } else {
        conditions.push(eq(issues.researchItemId, -1)); // No match
      }
    }
    if (projectLevel) {
      conditions.push(eq(issues.projectLevel, projectLevel as string));
    }
    if (knowledgeType) {
      conditions.push(eq(issues.knowledgeType, knowledgeType as string));
    }
    if (search) {
      conditions.push(or(
        like(issues.title, `%${search}%`),
        like(issues.solutionDirection, `%${search}%`)
      ));
    }
    if (fromDate) {
      conditions.push(eq(issues.approvalDate, `%${fromDate}%`));
    }
    if (toDate) {
      conditions.push(eq(issues.approvalDate, `%${toDate}%`));
    }

    
    if (advancedFilter) {
      try {
        const parsed = JSON.parse(advancedFilter as string);
        
        const buildCondition = (group: any): any => {
          if (!group || !group.rules || !Array.isArray(group.rules) || group.rules.length === 0) return undefined;
          
          const conds = group.rules.map((rule: any) => {
             if (rule.condition) {
                return buildCondition(rule);
             } else {
                const { field, op, value } = rule;
                const col = (issues as any)[field];
                if (!col) return undefined;
                
                if (op === 'eq') return eq(col, value);
                if (op === 'neq') return not(eq(col, value));
                if (op === 'like') return like(col, `%${value}%`);
                if (op === 'in' && Array.isArray(value)) return inArray(col, value);
                return undefined;
             }
          }).filter(Boolean);
          
          if (conds.length === 0) return undefined;
          if (group.condition === 'OR') return or(...conds);
          return and(...conds);
        };

        const advCond = buildCondition(parsed);
        if (advCond) {
          conditions.push(advCond);
        }
      } catch (e) {
        console.error("Advanced filter parse error", e);
      }
    }

    let countQuery = db.select({ count: sql<number>`count(*)` }).from(issues);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
      countQuery = countQuery.where(and(...conditions)) as any;
    }

    const totalResult = await countQuery;
    const total = totalResult[0].count;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const offset = (pageNum - 1) * limitNum;

    const result = await query
      .limit(limitNum)
      .offset(offset)
      .orderBy(desc(issues.createdAt));

    // Fix N+1 Query Bomb
    const researchItemIds = result.map(i => i.researchItemId).filter(Boolean) as number[];
    const domainNodeIds = result.map(i => i.domainNodeId).filter(Boolean) as number[];
    const issueIds = result.map(i => i.id);

    let allResearchItems: any[] = [];
    if (researchItemIds.length > 0) {
      allResearchItems = await db.select().from(researchItems).where(inArray(researchItems.id, researchItemIds));
    }
    
    const nodeIdsFromResearch = allResearchItems.map(ri => ri.nodeId).filter(Boolean) as number[];
    const allNodeIds = Array.from(new Set([...nodeIdsFromResearch, ...domainNodeIds]));
    
    let allNodes: any[] = [];
    if (allNodeIds.length > 0) {
      allNodes = await db.select().from(treeNodes).where(inArray(treeNodes.id, allNodeIds));
    }

    let allIssueTemplates: any[] = [];
    if (issueIds.length > 0) {
      allIssueTemplates = await db.select().from(issueTemplates).where(inArray(issueTemplates.issueId, issueIds));
    }

    const templateIds = allIssueTemplates.map(it => it.templateId).filter(Boolean) as number[];
    let allTemplates: any[] = [];
    if (templateIds.length > 0) {
      allTemplates = await db.select().from(templates).where(inArray(templates.id, templateIds));
    }

    let allAttachments: any[] = [];
    if (issueIds.length > 0) {
      allAttachments = await db.select({ issueId: issueAttachments.issueId, count: sql<number>`count(*)` })
        .from(issueAttachments)
        .where(inArray(issueAttachments.issueId, issueIds))
        .groupBy(issueAttachments.issueId);
    }

    const enrichedIssues = result.map((issue) => {
      const researchItem = allResearchItems.find(ri => ri.id === issue.researchItemId) || null;
      const node = researchItem ? allNodes.find(n => n.id === researchItem.nodeId) || null : null;
      const domainNode = issue.domainNodeId ? allNodes.find(n => n.id === issue.domainNodeId) || null : null;
      
      const issueTempRels = allIssueTemplates.filter(it => it.issueId === issue.id);
      const temps = issueTempRels.map(rel => allTemplates.find(t => t.id === rel.templateId)).filter(Boolean);

      const attachment = allAttachments.find(a => a.issueId === issue.id);

      return {
        ...issue,
        domain: domainNode?.title || 'نامشخص',
        domainNode,
        researchItem,
        node,
        templates: temps,
        attachmentsCount: attachment?.count || 0,
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
    res.status(500).json({ error: 'خطا در دریافت مسائل' });
  }
});

// ============================================
// ۲. دریافت یک مسئله با تمام جزئیات
// ============================================

issueRoutes.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const issueId = parseInt(id);

    const issue = await db.query.issues.findFirst({
      where: eq(issues.id, issueId),
    });

    if (!issue) {
      return res.status(404).json({ error: 'مسئله یافت نشد' });
    }

    // دریافت اطلاعات مرتبط
    const researchItem = await db.query.researchItems.findFirst({
      where: issue.researchItemId ? eq(researchItems.id, issue.researchItemId as number) : undefined,
    });

    const node = researchItem 
      ? await db.query.treeNodes.findFirst({
          where: eq(treeNodes.id, researchItem.nodeId),
        })
      : null;

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
    const history = await db.select()
      .from(issueHistory)
      .where(eq(issueHistory.issueId, issueId))
      .orderBy(issueHistory.changedAt);

    const domainNode = issue.domainNodeId
      ? await db.query.treeNodes.findFirst({ where: eq(treeNodes.id, issue.domainNodeId) })
      : null;

    res.json({
      ...issue,
      domain: domainNode?.title || 'نامشخص',
      domainNode,
      researchItem,
      node,
      templates: templatesList,
      attachments,
      history,
    });
  } catch (error) {
    console.error('Error fetching issue:', error);
    res.status(500).json({ error: 'خطا در دریافت مسئله' });
  }
});

// ============================================
// ۳. ایجاد مسئله جدید (با سینک قالب‌ها)
// ============================================

issueRoutes.post('/', async (req, res) => {
  try {
    // Fix Mass Assignment Vulnerability
    const rawData = req.body;
    const allowedFields = [
      'domainNodeId', 'researchItemId', 'title', 'solutionDirection', 'responsibleUnit', 
      'confidentialityLevel', 'actionPriority', 'knowledgeType', 'projectLevel', 
      'approvalAuthority', 'researchProjectType', 'knowledgeProjectType', 'expectedMonths', 
      'requiredBudget', 'status', 'gapId', 'needStatement', 'templateIds'
    ];
    const data: any = {};
    for (const field of allowedFields) {
      if (rawData[field] !== undefined) data[field] = rawData[field];
    }

    const now = new Date().toISOString();
    const userId = (req as AuthRequest).user?.id || null;

    // اعتبارسنجی
    if (!data.domainNodeId || !data.title) {
      return res.status(400).json({ 
        error: 'حوزه (nodeId) و عنوان مسئله الزامی است' 
      });
    }

    // اگر gapId ارسال شده باشد (تبدیل گپ به مسئله)، ابتدا یک آیتم پژوهشی ایجاد می‌کنیم
    if (data.gapId && !data.researchItemId) {
      const gap = await db.query.gaps.findFirst({
        where: eq(gaps.id, parseInt(data.gapId)),
      });

      const insertedResearchItem = await db.insert(researchItems).values({
        gapId: parseInt(data.gapId),
        nodeId: parseInt(data.domainNodeId),
        priority: gap?.priority || 'medium',
        importance: gap?.gapType || 'نامشخص',
        metadata: gap ? { inheritedFromGap: true, gapMatchScore: gap.matchScore, gapDescription: gap.description } : null,
        createdAt: now,
        updatedAt: now,
      }).returning({ id: researchItems.id });
      
      if (insertedResearchItem && insertedResearchItem.length > 0) {
        data.researchItemId = insertedResearchItem[0].id;
      }
    }

    // بررسی وجود آیتم پژوهشی (در صورت ارسال)
    if (data.researchItemId) {
      const researchItem = await db.query.researchItems.findFirst({
        where: eq(researchItems.id, parseInt(data.researchItemId)),
      });

      if (!researchItem) {
        return res.status(404).json({ error: 'آیتم پژوهشی یافت نشد' });
      }
    }

    let node = null;
    if (data.researchItemId) {
      const researchItem = await db.query.researchItems.findFirst({
        where: eq(researchItems.id, parseInt(data.researchItemId)),
      });
      if (researchItem) {
        node = await db.query.treeNodes.findFirst({
          where: eq(treeNodes.id, researchItem.nodeId),
        });
      }
    }

    // سینک قالب‌ها: اگر قالب‌ها ارسال نشده، از گره دریافت کن
    let templateIds = data.templateIds || [];
    if (templateIds.length === 0 && node?.templateIds) {
      templateIds = (Array.isArray(node.templateIds) ? node.templateIds : (node.templateIds ? String(node.templateIds).split(',').filter(Boolean) : []));
    }

    // ایجاد مسئله درون تراکنش
    const result = db.transaction((tx) => {
      const newIssue = tx.insert(issues).values({
        researchItemId: data.researchItemId ? parseInt(data.researchItemId) : null,
        domainNodeId: parseInt(data.domainNodeId),
        title: data.title,
        solutionDirection: data.solutionDirection || '',
        responsibleUnit: data.responsibleUnit || '',
        confidentialityLevel: data.confidentialityLevel || 'عمومی',
        actionPriority: data.actionPriority || 'متوسط',
        approvalDate: data.approvalDate || now,
        knowledgeType: data.knowledgeType || 'نظریه',
        projectLevel: data.projectLevel || 'سطح1',
        approvalAuthority: data.approvalAuthority || 'نهاجا (رده دانشی و پژوهشی)',
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
        createdAt: now,
        updatedAt: now,
      }).returning().get();

      // افزودن قالب‌ها (سینک شده)
      for (const templateId of templateIds) {
        if (templateId) {
          tx.insert(issueTemplates).values({
            issueId: newIssue.id,
            templateId: parseInt(templateId),
          }).run();
        }
      }

      // ثبت در تاریخچه
      tx.insert(issueHistory).values({
        issueId: newIssue.id,
        field: 'ایجاد',
        oldValue: '',
        newValue: 'مسئله جدید ایجاد شد',
        changedBy: userId,
        changedAt: now,
      }).run();
      
      return newIssue;
    });

    logAudit({
      userId,
      action: 'CREATE',
      entityName: 'مسئله',
      entityId: result.id,
      changes: result,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      ...result,
      templates: templateIds,
    });
  } catch (error) {
    console.error('Error creating issue:', error);
    res.status(500).json({ error: 'خطا در ایجاد مسئله' });
  }
});

// ============================================
// ۴. ویرایش مسئله (با ثبت تاریخچه)
// ============================================

issueRoutes.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const issueId = parseInt(id);
    // Fix Mass Assignment Vulnerability
    const rawData = req.body;
    const allowedFields = [
      'domainNodeId', 'researchItemId', 'title', 'solutionDirection', 'responsibleUnit', 
      'confidentialityLevel', 'actionPriority', 'knowledgeType', 'projectLevel', 
      'approvalAuthority', 'researchProjectType', 'knowledgeProjectType', 'expectedMonths', 
      'requiredBudget', 'status', 'gapId', 'needStatement', 'templateIds'
    ];
    const data: any = {};
    for (const field of allowedFields) {
      if (rawData[field] !== undefined) data[field] = rawData[field];
    }

    const now = new Date().toISOString();
    const userId = (req as AuthRequest).user?.id || null;

    if (!await hasIssueAccess((req as AuthRequest).user, issueId)) {
      return res.status(403).json({ error: 'شما دسترسی لازم برای ویرایش این مسئله را ندارید.' });
    }

    const oldData = await db.query.issues.findFirst({
      where: eq(issues.id, issueId),
    });

    if (!oldData) {
      return res.status(404).json({ error: 'مسئله یافت نشد' });
    }
    
    // ============================================
    // Fix Item 44: Optimistic Concurrency Control
    // ============================================
    if (rawData.updatedAt) {
      if (oldData.updatedAt !== rawData.updatedAt) {
        return res.status(409).json({ 
          error: 'مسابقه همزمانی (Race Condition): کاربر دیگری در همین لحظه تغییراتی در این رکورد اعمال کرده است. لطفاً صفحه را تازه‌سازی کنید.',
          conflict: true
        });
      }
    }

    // به‌روزرسانی
    const updateData: any = {
      domainNodeId: data.domainNodeId !== undefined ? parseInt(data.domainNodeId) : oldData.domainNodeId,
      title: data.title !== undefined && data.title !== null ? data.title : oldData.title,
      solutionDirection: data.solutionDirection !== undefined ? data.solutionDirection : oldData.solutionDirection,
      responsibleUnit: data.responsibleUnit !== undefined ? data.responsibleUnit : oldData.responsibleUnit,
      confidentialityLevel: data.confidentialityLevel !== undefined && data.confidentialityLevel !== null ? data.confidentialityLevel : oldData.confidentialityLevel,
      actionPriority: data.actionPriority !== undefined && data.actionPriority !== null ? data.actionPriority : oldData.actionPriority,
      approvalDate: data.approvalDate !== undefined && data.approvalDate !== null ? data.approvalDate : oldData.approvalDate,
      knowledgeType: data.knowledgeType !== undefined && data.knowledgeType !== null ? data.knowledgeType : oldData.knowledgeType,
      projectLevel: data.projectLevel !== undefined && data.projectLevel !== null ? data.projectLevel : oldData.projectLevel,
      approvalAuthority: data.approvalAuthority !== undefined && data.approvalAuthority !== null ? data.approvalAuthority : oldData.approvalAuthority,
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
      status: data.status !== undefined && data.status !== null ? data.status : oldData.status,
      updatedAt: now,
    };

    const result = await db.update(issues)
      .set(updateData)
      .where(eq(issues.id, issueId))
      .returning();

    // ثبت تاریخچه تغییرات
    const changedFields = Object.keys(data).filter(key => 
      data[key] !== oldData[key as keyof typeof oldData]
    );

    for (const field of changedFields) {
      await db.insert(issueHistory).values({
        issueId,
        field,
        oldValue: String(oldData[field as keyof typeof oldData] || ''),
        newValue: String(data[field] || ''),
        changedBy: userId,
        changedAt: now,
      });
    }

    // به‌روزرسانی قالب‌ها (سینک)
    if (data.templateIds && Array.isArray(data.templateIds)) {
      await db.delete(issueTemplates).where(eq(issueTemplates.issueId, issueId));
      
      for (const templateId of data.templateIds) {
        if (templateId) {
          await db.insert(issueTemplates).values({
            issueId,
            templateId: parseInt(templateId),
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
// ۵. تغییر وضعیت مسئله
// ============================================

issueRoutes.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const issueId = parseInt(id);
    const { status, note } = req.body;
    const now = new Date().toISOString();
    const userId = (req as AuthRequest).user?.id || null;

    if (!await hasIssueAccess((req as AuthRequest).user, issueId)) {
      return res.status(403).json({ error: 'شما دسترسی لازم برای ویرایش این مسئله را ندارید.' });
    }

    const validStatuses = ['pending', 'in_progress', 'completed', 'canceled', 'on_hold'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'وضعیت نامعتبر است' });
    }

    const oldData = await db.query.issues.findFirst({
      where: eq(issues.id, issueId),
    });

    if (!oldData) {
      return res.status(404).json({ error: 'مسئله یافت نشد' });
    }

    const result = await db.update(issues)
      .set({
        status,
        updatedAt: now,
      })
      .where(eq(issues.id, issueId))
      .returning();

    // ثبت تاریخچه
    await db.insert(issueHistory).values({
      issueId,
      field: 'status',
      oldValue: oldData.status,
      newValue: status,
      changedBy: userId,
      changedAt: now,
    });

    if (note) {
      await db.insert(issueHistory).values({
        issueId,
        field: 'note',
        oldValue: '',
        newValue: note,
        changedBy: userId,
        changedAt: now,
      });
    }

    logAudit({
      userId,
      action: 'UPDATE',
      entityName: 'وضعیت مسئله',
      entityId: issueId,
      changes: { oldStatus: oldData.status, newStatus: status, note },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      issue: result[0],
      message: `وضعیت مسئله با موفقیت به "${status}" تغییر یافت`,
    });
  } catch (error) {
    console.error('Error updating issue status:', error);
    res.status(500).json({ error: 'خطا در تغییر وضعیت مسئله' });
  }
});

// ============================================
// ۶. افزودن فایل پیوست به مسئله
// ============================================

issueRoutes.post('/:id/attachment', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const issueId = parseInt(id);
    const userId = (req as AuthRequest).user?.id || null;

    if (!req.file) {
      return res.status(400).json({ error: 'هیچ فایلی ارسال نشده است' });
    }

    const isTextFile = ['text/plain', 'text/csv'].includes(req.file.mimetype);
    if (!isTextFile) {
      const allowed = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ];
      const meta = await fileTypeFromFile(req.file.path);
      if (!meta || !allowed.includes(meta.mime)) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'محتوای فایل نامعتبر است (MIME Spoofing detected)' });
      }
    }

    const issue = await db.query.issues.findFirst({
      where: eq(issues.id, issueId),
    });

    if (!issue) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'مسئله یافت نشد' });
    }

    const result = await db.insert(issueAttachments).values({
      issueId,
      filePath: req.file.path,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
      uploadedBy: userId,
    }).returning();

    logAudit({
      userId,
      action: 'CREATE',
      entityName: 'فایل پیوست مسئله',
      entityId: result[0].id,
      changes: { fileName: req.file.originalname, fileSize: req.file.size },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error adding attachment:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'خطا در آپلود فایل' });
  }
});

// ============================================
// ۷. حذف فایل پیوست
// ============================================

issueRoutes.delete('/:issueId/attachment/:attachmentId', async (req, res) => {
  try {
    const { issueId, attachmentId } = req.params;
    const attachmentIdNum = parseInt(attachmentId);
    const userId = (req as AuthRequest).user?.id || null;

    const attachment = await db.query.issueAttachments.findFirst({
      where: eq(issueAttachments.id, attachmentIdNum),
    });

    if (!attachment) {
      return res.status(404).json({ error: 'فایل پیوست یافت نشد' });
    }

    // حذف فایل از دیسک
    if (fs.existsSync(attachment.filePath)) {
      fs.unlinkSync(attachment.filePath);
    }

    await db.delete(issueAttachments).where(eq(issueAttachments.id, attachmentIdNum));

    logAudit({
      userId,
      action: 'DELETE',
      entityName: 'فایل پیوست مسئله',
      entityId: attachmentIdNum,
      changes: attachment,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ error: 'خطا در حذف فایل' });
  }
});

// ============================================
// ۸. حذف مسئله (با تمام وابسته‌ها)
// ============================================

issueRoutes.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!(await hasIssueAccess((req as AuthRequest).user, parseInt(id)))) return res.status(403).json({ error: 'عدم دسترسی' });
    const issueId = parseInt(id);
    const userId = (req as AuthRequest).user?.id || null;

    const existing = await db.query.issues.findFirst({
      where: eq(issues.id, issueId),
    });

    if (!existing) {
      return res.status(404).json({ error: 'مسئله یافت نشد' });
    }

    const attachments = await db.select()
      .from(issueAttachments)
      .where(eq(issueAttachments.issueId, issueId));

    // استفاده از تراکنش برای حذف رکوردهای مرتبط دیتابیس
    db.transaction((tx) => {
      tx.delete(issueAttachments).where(eq(issueAttachments.issueId, issueId)).run();
      tx.delete(issueTemplates).where(eq(issueTemplates.issueId, issueId)).run();
      tx.delete(issueHistory).where(eq(issueHistory.issueId, issueId)).run();
      tx.delete(issues).where(eq(issues.id, issueId)).run();
    });

    // حذف فایل‌های فیزیکی تنها پس از موفقیت تراکنش دیتابیس
    for (const attachment of attachments) {
      if (fs.existsSync(attachment.filePath)) {
        fs.unlinkSync(attachment.filePath);
      }
    }

    logAudit({
      userId,
      action: 'DELETE',
      entityName: 'مسئله',
      entityId: issueId,
      changes: existing,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting issue:', error);
    res.status(500).json({ error: 'خطا در حذف مسئله' });
  }
});

// ============================================
// ۹. دریافت تاریخچه تغییرات مسئله
// ============================================

issueRoutes.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const issueId = parseInt(id);

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
    .orderBy(issueHistory.changedAt);

    res.json(history);
  } catch (error) {
    console.error('Error fetching issue history:', error);
    res.status(500).json({ error: 'خطا در دریافت تاریخچه' });
  }
});

// ============================================
// ۱۰. دریافت آمار مسائل
// ============================================

issueRoutes.get('/stats', async (req, res) => {
  try {
    const { treeId } = req.query;

    let query = db.select().from(issues);
    
    // اگر treeId ارسال شده، از طریق researchItems فیلتر کن
    if (treeId) {
      const researchItemsList = await db.select({ id: researchItems.id })
        .from(researchItems)
        .where(eq(researchItems.nodeId, parseInt(treeId as string)));
      
      const researchIds = researchItemsList.map(r => r.id);
      if (researchIds.length > 0) {
        if (researchIds.length > 500) {
          const chunks = [];
          for (let i = 0; i < researchIds.length; i += 500) {
            chunks.push(inArray(issues.researchItemId, researchIds.slice(i, i + 500)));
          }
          query = query.where(or(...chunks)) as any;
        } else {
          query = query.where(inArray(issues.researchItemId, researchIds)) as any;
        }
      }
    }

    const allIssues = await query;
    const total = allIssues.length;
    
    const pending = allIssues.filter(i => i.status === 'pending').length;
    const inProgress = allIssues.filter(i => i.status === 'in_progress').length;
    const completed = allIssues.filter(i => i.status === 'completed').length;
    const canceled = allIssues.filter(i => i.status === 'canceled').length;
    const onHold = allIssues.filter(i => i.status === 'on_hold').length;

    // گروه‌بندی بر اساس اولویت
    const byPriority = allIssues.reduce((acc: any, issue) => {
      const priority = issue.actionPriority || 'medium';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {});

    // بودجه کل
    const totalBudget = allIssues.reduce((sum, issue) => sum + (issue.requiredBudget || 0), 0);
    
    // میانگین پیشرفت
    const avgCompletion = total > 0 
      ? Math.round(allIssues.reduce((sum, issue) => sum + (issue.completionPercent || 0), 0) / total) 
      : 0;

    res.json({
      total,
      pending,
      inProgress,
      completed,
      canceled,
      onHold,
      byPriority,
      totalBudget,
      avgCompletion,
    });
  } catch (error) {
    console.error('Error fetching issue stats:', error);
    res.status(500).json({ error: 'خطا در دریافت آمار مسائل' });
  }
});

export default issueRoutes;