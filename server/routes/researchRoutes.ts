import { AuthRequest } from '../types/AuthRequest.js';
// server/routes/researchRoutes.ts
// مدیریت درختواره پژوهشی - آیتم‌های پژوهشی و ستون‌های تحلیلی

import { Router } from 'express';
import { db } from '../../src/db/index.js';
import {
  researchItems,
  gaps,
  treeNodes,
  knowledgeTrees,
  issues,
} from '../../src/db/schema.js';
import { eq, and, isNull, inArray, or, like, not, sql } from 'drizzle-orm';
import { logAudit } from '../utils/audit.js';
import { format } from 'date-fns-jalali';
import ExcelJS from 'exceljs';

export const researchRoutes = Router();

// ============================================
// ۱. دریافت آیتم‌های پژوهشی با فیلتر
// ============================================

researchRoutes.get('/', async (req, res) => {
  try {
    const { 
      treeId, 
      importance, 
      priority, 
      timeFrame,
      search,
      advancedFilter,
      page = 1,
      limit = 20 
    } = req.query;

    let query = db.select().from(researchItems);
    const conditions: any[] = [];

    
    if (treeId) {
      // دریافت آیتم‌های پژوهشی یک درختواره خاص
      const treeNodesIds = await db.select({ id: treeNodes.id })
        .from(treeNodes)
        .where(eq(treeNodes.treeId, parseInt(treeId as string)));
        
      const nodeIds = treeNodesIds.map(n => n.id);
      if (nodeIds.length > 0) {
        if (nodeIds.length > 500) {
          const chunks = [];
          for (let i = 0; i < nodeIds.length; i += 500) {
            chunks.push(inArray(researchItems.nodeId, nodeIds.slice(i, i + 500)));
          }
          conditions.push(or(...chunks));
        } else {
          conditions.push(inArray(researchItems.nodeId, nodeIds));
        }
      } else {
          conditions.push(eq(researchItems.nodeId, -1)); // No matches
      }
    } else if (req.query.periodId) {
      const periodId = parseInt(req.query.periodId as string);
      
      const treesInPeriod = await db.select({ id: knowledgeTrees.id })
         .from(knowledgeTrees)
         .where(eq(knowledgeTrees.periodId, periodId));
         
      const treeIds = treesInPeriod.map(t => t.id);
      
      if (treeIds.length > 0) {
         const nodesInPeriod = await db.select({ id: treeNodes.id })
            .from(treeNodes)
            .where(inArray(treeNodes.treeId, treeIds));
            
         const nodeIds = nodesInPeriod.map(n => n.id);
         
         if (nodeIds.length > 0) {
            if (nodeIds.length > 500) {
              const chunks = [];
              for (let i = 0; i < nodeIds.length; i += 500) {
                chunks.push(inArray(researchItems.nodeId, nodeIds.slice(i, i + 500)));
              }
              conditions.push(or(...chunks));
            } else {
              conditions.push(inArray(researchItems.nodeId, nodeIds));
            }
         } else {
            conditions.push(eq(researchItems.nodeId, -1)); // No matches
         }
      } else {
         conditions.push(eq(researchItems.nodeId, -1)); // No matches
      }
    }

    if (importance) {
      conditions.push(eq(researchItems.importance, importance as string));
    }
    if (priority) {
      conditions.push(eq(researchItems.priority, priority as string));
    }
    if (timeFrame) {
      conditions.push(eq(researchItems.timeFrame, timeFrame as string));
    }
    if (search) {
      // جستجو در گره‌های مرتبط
      const matchingNodes = await db.select({ id: treeNodes.id })
        .from(treeNodes)
        .where(eq(treeNodes.title, `%${search}%`));
      
      const nodeIds = matchingNodes.map(n => n.id);
      if (nodeIds.length > 0) {
        if (nodeIds.length > 500) {
          const chunks = [];
          for (let i = 0; i < nodeIds.length; i += 500) {
            chunks.push(inArray(researchItems.nodeId, nodeIds.slice(i, i + 500)));
          }
          conditions.push(or(...chunks));
        } else {
          conditions.push(inArray(researchItems.nodeId, nodeIds));
        }
      }
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
                const col = (researchItems as any)[field];
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

    let countQuery = db.select({ count: sql<number>`count(*)` }).from(researchItems);

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
      .orderBy(researchItems.priority);

    // دریافت اطلاعات تکمیلی
    const enrichedItems = await Promise.all(result.map(async (item) => {
      const gap = await db.query.gaps.findFirst({
        where: eq(gaps.id, item.gapId),
      });
      
      const node = await db.query.treeNodes.findFirst({
        where: eq(treeNodes.id, item.nodeId),
      });

      // بررسی وجود مسئله مرتبط
      const issue = await db.query.issues.findFirst({
        where: eq(issues.researchItemId, item.id),
      });

      return {
        ...item,
        gap,
        node,
        hasIssue: !!issue,
        issueId: issue?.id || null,
      };
    }));

    res.json({
      data: enrichedItems,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching research items:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۲. دریافت درختواره پژوهشی کامل
// ============================================

researchRoutes.get('/tree/:treeId', async (req, res) => {
  try {
    const { treeId } = req.params;
    const treeIdNum = parseInt(treeId);

    // دریافت درختواره
    const tree = await db.query.knowledgeTrees.findFirst({
      where: eq(knowledgeTrees.id, treeIdNum),
    });

    if (!tree) {
      return res.status(404).json({ error: 'درختواره یافت نشد' });
    }

    if (tree.type !== 'research') {
      return res.status(400).json({ error: 'این درختواره از نوع پژوهشی نیست' });
    }

    // دریافت تمام گره‌های درختواره
    const nodes = await db.select()
      .from(treeNodes)
      .where(eq(treeNodes.treeId, treeIdNum))
      .orderBy(treeNodes.sortOrder);

    // دریافت آیتم‌های پژوهشی برای هر گره
    const researchItemsList = await db.select()
      .from(researchItems)
      .where(eq(researchItems.nodeId, treeIdNum));

    // ساخت ساختار درختی با اطلاعات پژوهشی
    const nodeMap = new Map();
    nodes.forEach(node => {
      const research = researchItemsList.find(r => r.nodeId === node.id);
      nodeMap.set(node.id, {
        ...node,
        research: research || null,
        children: [],
      });
    });

    const rootNodes: any[] = [];
    nodes.forEach(node => {
      const nodeWithResearch = nodeMap.get(node.id);
      if (node.parentId === null) {
        rootNodes.push(nodeWithResearch);
      } else {
        const parent = nodeMap.get(node.parentId);
        if (parent) {
          parent.children.push(nodeWithResearch);
        }
      }
    });

    // محاسبه آمار
    const totalItems = researchItemsList.length;
    const itemsByPriority = researchItemsList.reduce((acc: any, item) => {
      const priority = item.priority || 'متوسط';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {});

    const itemsByImportance = researchItemsList.reduce((acc: any, item) => {
      const importance = item.importance || 'عملیاتی';
      acc[importance] = (acc[importance] || 0) + 1;
      return acc;
    }, {});

    const itemsByTimeFrame = researchItemsList.reduce((acc: any, item) => {
      const timeFrame = item.timeFrame || 'میان‌مدت';
      acc[timeFrame] = (acc[timeFrame] || 0) + 1;
      return acc;
    }, {});

    res.json({
      tree,
      nodes: rootNodes.length > 0 ? rootNodes[0] : null,
      allNodes: nodes,
      researchItems: researchItemsList,
      stats: {
        total: totalItems,
        byPriority: itemsByPriority,
        byImportance: itemsByImportance,
        byTimeFrame: itemsByTimeFrame,
      },
    });
  } catch (error) {
    console.error('Error fetching research tree:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۳. ایجاد آیتم پژوهشی جدید
// ============================================

researchRoutes.post('/', async (req, res) => {
  try {
    const { 
      gapId,
      nodeId,
      isPartOfSevenYearPlan,
      isPartOfAnnualPlan,
      isPartOfDirectives,
      isPartOfWarExperience,
      importance,
      combatImpact,
      costBenefit,
      priority,
      timeFrame,
      programCoverages,
      metadata 
    } = req.body;

    const now = new Date().toISOString();
    const userId = (req as AuthRequest).user?.id || null;

    // اعتبارسنجی
    if (!gapId || !nodeId) {
      return res.status(400).json({ 
        error: 'شناسه گپ و گره الزامی است' 
      });
    }

    // بررسی وجود گپ
    const gap = await db.query.gaps.findFirst({
      where: eq(gaps.id, parseInt(gapId)),
    });

    if (!gap) {
      return res.status(404).json({ error: 'گپ یافت نشد' });
    }

    // بررسی وجود گره
    const node = await db.query.treeNodes.findFirst({
      where: eq(treeNodes.id, parseInt(nodeId)),
    });

    if (!node) {
      return res.status(404).json({ error: 'گره یافت نشد' });
    }

    // بررسی تکراری نبودن
    const existing = await db.query.researchItems.findFirst({
      where: and(
        eq(researchItems.gapId, parseInt(gapId)),
        eq(researchItems.nodeId, parseInt(nodeId))
      ),
    });

    if (existing) {
      return res.status(409).json({ error: 'این آیتم پژوهشی قبلاً ثبت شده است' });
    }

    const result = await db.insert(researchItems).values({
      gapId: parseInt(gapId),
      nodeId: parseInt(nodeId),
      isPartOfSevenYearPlan: isPartOfSevenYearPlan ? 1 : 0,
      isPartOfAnnualPlan: isPartOfAnnualPlan ? 1 : 0,
      isPartOfDirectives: isPartOfDirectives ? 1 : 0,
      isPartOfWarExperience: isPartOfWarExperience ? 1 : 0,
      importance: importance || 'عملیاتی',
      combatImpact: combatImpact || 5,
      costBenefit: costBenefit || 5,
      priority: priority || 'متوسط',
      timeFrame: timeFrame || 'میان‌مدت',
      programCoverages: programCoverages || [],
      metadata: metadata || null,
      createdAt: now,
      updatedAt: now,
    }).returning();

    logAudit({
      userId,
      action: 'CREATE',
      entityName: 'آیتم پژوهشی',
      entityId: result[0].id,
      changes: result[0],
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating research item:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۴. ویرایش آیتم پژوهشی
// ============================================

researchRoutes.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const itemId = parseInt(id);
    const {
      isPartOfSevenYearPlan,
      isPartOfAnnualPlan,
      isPartOfDirectives,
      isPartOfWarExperience,
      importance,
      combatImpact,
      costBenefit,
      priority,
      timeFrame,
      programCoverages,
      metadata,
    } = req.body;

    const now = new Date().toISOString();
    const userId = (req as AuthRequest).user?.id || null;

    const oldData = await db.query.researchItems.findFirst({
      where: eq(researchItems.id, itemId),
    });

    if (!oldData) {
      return res.status(404).json({ error: 'آیتم پژوهشی یافت نشد' });
    }

    const result = await db.update(researchItems)
      .set({
        isPartOfSevenYearPlan: isPartOfSevenYearPlan !== undefined ? (isPartOfSevenYearPlan ? 1 : 0) : oldData.isPartOfSevenYearPlan,
        isPartOfAnnualPlan: isPartOfAnnualPlan !== undefined ? (isPartOfAnnualPlan ? 1 : 0) : oldData.isPartOfAnnualPlan,
        isPartOfDirectives: isPartOfDirectives !== undefined ? (isPartOfDirectives ? 1 : 0) : oldData.isPartOfDirectives,
        isPartOfWarExperience: isPartOfWarExperience !== undefined ? (isPartOfWarExperience ? 1 : 0) : oldData.isPartOfWarExperience,
        importance: importance !== undefined && importance !== null ? importance : oldData.importance,
        combatImpact: combatImpact !== undefined ? combatImpact : oldData.combatImpact,
        costBenefit: costBenefit !== undefined ? costBenefit : oldData.costBenefit,
        priority: priority !== undefined && priority !== null ? priority : oldData.priority,
        timeFrame: timeFrame !== undefined && timeFrame !== null ? timeFrame : oldData.timeFrame,
        programCoverages: programCoverages !== undefined ? programCoverages : oldData.programCoverages,
        metadata: metadata !== undefined ? metadata : oldData.metadata,
        updatedAt: now,
      })
      .where(eq(researchItems.id, itemId))
      .returning();

    logAudit({
      userId,
      action: 'UPDATE',
      entityName: 'آیتم پژوهشی',
      entityId: itemId,
      changes: { old: oldData, new: result[0] },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json(result[0]);
  } catch (error) {
    console.error('Error updating research item:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۵. تبدیل آیتم پژوهشی به مسئله
// ============================================

researchRoutes.post('/:id/convert-to-issue', async (req, res) => {
  try {
    const { id } = req.params;
    const itemId = parseInt(id);
    const { 
      domain,
      title,
      solutionDirection,
      responsibleUnit,
      confidentialityLevel,
      actionPriority,
      approvalDate,
      knowledgeType,
      projectLevel,
      approvalAuthority,
      ...rest 
    } = req.body;

    const now = new Date().toISOString();
    const userId = (req as AuthRequest).user?.id || null;

    // دریافت آیتم پژوهشی
    const researchItem = await db.query.researchItems.findFirst({
      where: eq(researchItems.id, itemId),
    });

    if (!researchItem) {
      return res.status(404).json({ error: 'آیتم پژوهشی یافت نشد' });
    }

    // دریافت گره مرتبط
    const node = await db.query.treeNodes.findFirst({
      where: eq(treeNodes.id, researchItem.nodeId),
    });

    if (!node) {
      return res.status(404).json({ error: 'گره مرتبط یافت نشد' });
    }

    // ایجاد مسئله
    const issue = await db.insert(issues).values({
      researchItemId: itemId,
      domainNodeId: req.body.domainNodeId || node.id,
      title: title || node.title,
      solutionDirection: solutionDirection || '',
      responsibleUnit: responsibleUnit || '',
      confidentialityLevel: confidentialityLevel || 'عمومی',
      actionPriority: actionPriority || researchItem.priority || 'متوسط',
      approvalDate: approvalDate || now,
      knowledgeType: knowledgeType || 'نظریه',
      projectLevel: projectLevel || 'سطح1',
      approvalAuthority: approvalAuthority || 'نهاجا (رده دانشی و پژوهشی)',
      researchProjectType: rest.researchProjectType || '',
      knowledgeProjectType: rest.knowledgeProjectType || '',
      events: rest.events || '',
      macroProject: rest.macroProject || null,
      scientificDiplomacy: rest.scientificDiplomacy || '',
      collaborators: rest.collaborators || '',
      collaborationNetwork: rest.collaborationNetwork || null,
      referenceDocument: rest.referenceDocument || '',
      requiredBudget: rest.requiredBudget || 0,
      approvedBudget: rest.approvedBudget || 0,
      assignedBudget: rest.assignedBudget || 0,
      expectedMonths: rest.expectedMonths || 0,
      completionPercent: 0,
      actionsTaken: rest.actionsTaken || '',
      bottlenecks: rest.bottlenecks || '',
      orders: rest.orders || '',
      issueResolutionTeam: rest.issueResolutionTeam || null,
      needStatement: rest.needStatement || null,
      contract: rest.contract || null,
      stage20: rest.stage20 || null,
      stage50: rest.stage50 || null,
      stage100: rest.stage100 || null,
      application: rest.application || null,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }).returning();

    // به‌روزرسانی گره
    await db.update(treeNodes)
      .set({
        isGap: 0,
        gapStatus: 'filled',
        updatedAt: now,
      })
      .where(eq(treeNodes.id, node.id));

    // به‌روزرسانی گپ
    if (researchItem.gapId) {
      await db.update(gaps)
        .set({
          status: 'filled',
        })
        .where(eq(gaps.id, researchItem.gapId));
    }

    logAudit({
      userId,
      action: 'CREATE',
      entityName: 'مسئله (تبدیل از پژوهش)',
      entityId: issue[0].id,
      changes: {
        researchItemId: itemId,
        nodeId: node.id,
        title: issue[0].title,
      },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      message: 'آیتم پژوهشی با موفقیت به مسئله تبدیل شد',
      issue: issue[0],
      researchItem: researchItem,
      node: node,
    });
  } catch (error) {
    console.error('Error converting research item to issue:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۶. حذف آیتم پژوهشی
// ============================================

researchRoutes.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const itemId = parseInt(id);
    const userId = (req as AuthRequest).user?.id || null;

    const existing = await db.query.researchItems.findFirst({
      where: eq(researchItems.id, itemId),
    });

    if (!existing) {
      return res.status(404).json({ error: 'آیتم پژوهشی یافت نشد' });
    }

    // بررسی وجود مسئله مرتبط
    const issue = await db.query.issues.findFirst({
      where: eq(issues.researchItemId, itemId),
    });

    if (issue) {
      return res.status(400).json({ 
        error: 'این آیتم پژوهشی به مسئله تبدیل شده است، ابتدا مسئله را حذف کنید',
        issueId: issue.id,
        issueTitle: issue.title,
      });
    }

    await db.delete(researchItems).where(eq(researchItems.id, itemId));

    logAudit({
      userId,
      action: 'DELETE',
      entityName: 'آیتم پژوهشی',
      entityId: itemId,
      changes: existing,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting research item:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ۷. خروجی اکسل درختواره پژوهشی
// ============================================

researchRoutes.get('/export/excel/:treeId', async (req, res) => {
  try {
    const { treeId } = req.params;
    const treeIdNum = parseInt(treeId);
    const userId = (req as AuthRequest).user?.id || null;

    const tree = await db.query.knowledgeTrees.findFirst({
      where: eq(knowledgeTrees.id, treeIdNum),
    });

    if (!tree) {
      return res.status(404).json({ error: 'درختواره یافت نشد' });
    }

    if (tree.type !== 'research') {
      return res.status(400).json({ error: 'این درختواره پژوهشی نیست' });
    }

    const nodes = await db.select()
      .from(treeNodes)
      .where(eq(treeNodes.treeId, treeIdNum))
      .orderBy(treeNodes.sortOrder);

    const nodeIds = nodes.map(n => n.id);
    let researchItemsList: any[] = [];
    if (nodeIds.length > 0) {
      researchItemsList = await db.select()
        .from(researchItems)
        .where(inArray(researchItems.nodeId, nodeIds));
    }

    // ایجاد فایل اکسل
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'سیستم مدیریت دانش (DANA)';
    workbook.created = new Date();
    workbook.modified = new Date();

    // ========== شیت اصلی پژوهشی ==========
    const sheet = workbook.addWorksheet('درختواره پژوهشی', {
      views: [{ rightToLeft: true }],
    });

    // تنظیم ستون‌ها
    sheet.getColumn(1).width = 10;
    sheet.getColumn(2).width = 35;
    sheet.getColumn(3).width = 15;
    sheet.getColumn(4).width = 20;
    sheet.getColumn(5).width = 20;
    sheet.getColumn(6).width = 18;
    sheet.getColumn(7).width = 18;
    sheet.getColumn(8).width = 18;
    sheet.getColumn(9).width = 18;
    sheet.getColumn(10).width = 20;
    sheet.getColumn(11).width = 20;
    sheet.getColumn(12).width = 20;
    sheet.getColumn(13).width = 15;

    // عنوان
    sheet.mergeCells('A1:M1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `🔬 درختواره پژوهشی: ${tree.name}`;
    titleCell.font = { name: 'Vazirmatn', bold: true, size: 18, color: { argb: 'FF1e293b' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('A2:M2');
    const subCell = sheet.getCell('A2');
    subCell.value = `📊 تاریخ: ${format(new Date(), 'yyyy/MM/dd HH:mm')} • ${researchItemsList.length} آیتم پژوهشی`;
    subCell.font = { name: 'Vazirmatn', size: 10, color: { argb: 'FF64748b' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // هدر
    const headers = [
      '#', 'عنوان گره', 'سطح',
      '🎯 اولویت', '🏛️ اهمیت', '⏳ بازه زمانی',
      '📋 برنامه هفتم', '📋 برنامه سالیانه', '📋 تدابیر ابلاغی',
      '📋 تجارب جنگ', '💪 تأثیر رزمی (۱-۱۰)', '💰 هزینه‌فایده (۱-۱۰)',
      '📌 وضعیت'
    ];
    
    const headerRow = sheet.addRow(headers);
    headerRow.font = { name: 'Vazirmatn', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
    headerRow.height = 40;

    // داده‌ها
    for (const item of researchItemsList) {
      const node = nodes.find(n => n.id === item.nodeId);
      
      const gap = await db.query.gaps.findFirst({
        where: eq(gaps.id, item.gapId),
      });
      
      sheet.addRow([
        item.id,
        node?.title || 'نامشخص',
        node?.level || '-',
        item.priority === 'critical' ? '🔥 بحرانی' :
        item.priority === 'high' ? '⬆️ بالا' :
        item.priority === 'medium' ? '➖ متوسط' :
        item.priority === 'low' ? '⬇️ پایین' : 'متوسط',
        item.importance === 'راهبردی' ? '🏛️ راهبردی' :
        item.importance === 'عملیاتی' ? '⚙️ عملیاتی' :
        item.importance === 'تاکتیکی' ? '🎯 تاکتیکی' : 'عملیاتی',
        item.timeFrame === 'کوتاه‌مدت' ? '⏱️ کوتاه‌مدت' :
        item.timeFrame === 'میان‌مدت' ? '⏳ میان‌مدت' :
        item.timeFrame === 'بلندمدت' ? '🗓️ بلندمدت' : 'میان‌مدت',
        item.isPartOfSevenYearPlan === 1 ? '✅ بله' : '❌ خیر',
        item.isPartOfAnnualPlan === 1 ? '✅ بله' : '❌ خیر',
        item.isPartOfDirectives === 1 ? '✅ بله' : '❌ خیر',
        item.isPartOfWarExperience === 1 ? '✅ بله' : '❌ خیر',
        item.combatImpact || 0,
        item.costBenefit || 0,
        gap?.status === 'open' ? '🔴 باز' :
        gap?.status === 'filled' ? '🟢 پر شده' :
        gap?.status === 'partially_filled' ? '🟡 نیمه‌پر' : '✅ تکمیل',
      ]);
    }

    // جمع‌بندی
    const total = researchItemsList.length;
    const summaryRow = sheet.addRow([
      '📊 جمع کل', '', '',
      `🎯 کل: ${total}`,
      `🏛️ راهبردی: ${researchItemsList.filter(i => i.importance === 'راهبردی').length}`,
      `⏳ کوتاه‌مدت: ${researchItemsList.filter(i => i.timeFrame === 'کوتاه‌مدت').length}`,
      `📋 هفتم: ${researchItemsList.filter(i => i.isPartOfSevenYearPlan === 1).length}`,
      `📋 سالیانه: ${researchItemsList.filter(i => i.isPartOfAnnualPlan === 1).length}`,
      `📋 ابلاغی: ${researchItemsList.filter(i => i.isPartOfDirectives === 1).length}`,
      `📋 جنگ: ${researchItemsList.filter(i => i.isPartOfWarExperience === 1).length}`,
      `💪 میانگین: ${Math.round(researchItemsList.reduce((s, i) => s + (i.combatImpact || 0), 0) / (total || 1))}`,
      `💰 میانگین: ${Math.round(researchItemsList.reduce((s, i) => s + (i.costBenefit || 0), 0) / (total || 1))}`,
      '',
    ]);
    summaryRow.font = { name: 'Vazirmatn', bold: true, size: 11 };
    summaryRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };
    summaryRow.height = 35;

    logAudit({
      userId,
      entityName: 'درختواره پژوهشی',
      entityId: treeIdNum,
      action: 'EXPORT', changes: { format: 'excel' },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const filename = `پژوهش_${tree.name}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting research tree:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default researchRoutes;
// دریافت همه آیتم‌های پژوهشی با جزئیات گره
researchRoutes.get('/all/with-nodes', async (req, res) => {
  try {
    const items = await db.select()
      .from(researchItems);
      
    const result = await Promise.all(items.map(async (r) => {
      const node = await db.query.treeNodes.findFirst({ where: eq(treeNodes.id, r.nodeId) });
      const tree = node ? await db.query.knowledgeTrees.findFirst({ where: eq(knowledgeTrees.id, node.treeId) }) : null;
      return {
        ...r,
        node,
        treeName: tree?.name || 'نامشخص'
      };
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching research items:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
