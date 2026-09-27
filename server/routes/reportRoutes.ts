// server/routes/reportRoutes.ts
// گزارش‌ها و خروجی‌های تحلیلی و اکسل با اعمال کنترل دسترسی سازمانی

import express from 'express';
import { db, sqlite } from '../../src/db/index.js';
import { issues, treeNodes, gaps, knowledgeTrees, periods } from '../../src/db/schema.js';
import { eq, inArray, desc } from 'drizzle-orm';
import { requireAuth } from '../middleware/rbac.js';
import { generateIssuesExcel } from '../utils/issueExcelExport.js';

export const reportRoutes = express.Router();

reportRoutes.get('/org-stats', requireAuth, async (req: any, res) => {
  try {
    const periodId = req.query.periodId ? parseInt(req.query.periodId as string) : null;
    const bases = sqlite.prepare('SELECT id, name FROM bases WHERE is_active = 1').all() as any[];
    
    let trees: any[] = [];
    let gapsInfo: any[] = [];
    let issuesInfo: any[] = [];

    if (periodId) {
      trees = sqlite.prepare('SELECT id, base_id FROM knowledge_trees WHERE is_active = 1 AND base_id IS NOT NULL AND period_id = ?').all(periodId) as any[];
      gapsInfo = sqlite.prepare(`
        SELECT g.id, n.tree_id 
        FROM gaps g 
        JOIN tree_nodes n ON g.required_node_id = n.id
        WHERE g.period_id = ? OR n.tree_id IN (SELECT id FROM knowledge_trees WHERE period_id = ?)
      `).all(periodId, periodId) as any[];
      issuesInfo = sqlite.prepare(`
        SELECT i.id, COALESCE(n1.tree_id, n2.tree_id, n3.tree_id) as tree_id
        FROM issues i
        LEFT JOIN tree_nodes n1 ON i.domain_node_id = n1.id
        LEFT JOIN research_items r ON i.research_item_id = r.id
        LEFT JOIN tree_nodes n2 ON r.node_id = n2.id
        LEFT JOIN gaps g ON r.gap_id = g.id
        LEFT JOIN tree_nodes n3 ON g.required_node_id = n3.id
        WHERE i.period_id = ? OR COALESCE(n1.tree_id, n2.tree_id, n3.tree_id) IN (SELECT id FROM knowledge_trees WHERE period_id = ?)
      `).all(periodId, periodId) as any[];
    } else {
      trees = sqlite.prepare('SELECT id, base_id FROM knowledge_trees WHERE is_active = 1 AND base_id IS NOT NULL').all() as any[];
      gapsInfo = sqlite.prepare(`
        SELECT g.id, n.tree_id 
        FROM gaps g 
        JOIN tree_nodes n ON g.required_node_id = n.id
      `).all() as any[];
      issuesInfo = sqlite.prepare(`
        SELECT i.id, COALESCE(n1.tree_id, n2.tree_id, n3.tree_id) as tree_id
        FROM issues i
        LEFT JOIN tree_nodes n1 ON i.domain_node_id = n1.id
        LEFT JOIN research_items r ON i.research_item_id = r.id
        LEFT JOIN tree_nodes n2 ON r.node_id = n2.id
        LEFT JOIN gaps g ON r.gap_id = g.id
        LEFT JOIN tree_nodes n3 ON g.required_node_id = n3.id
      `).all() as any[];
    }
    
    const statsByBase = bases.map(base => {
      const baseTrees = trees.filter(t => t.base_id === base.id).map(t => t.id);
      const baseGapsCount = gapsInfo.filter(g => baseTrees.includes(g.tree_id)).length;
      const baseIssuesCount = issuesInfo.filter(i => baseTrees.includes(i.tree_id)).length;
      
      return {
        baseId: base.id,
        baseName: base.name,
        treesCount: baseTrees.length,
        gapsCount: baseGapsCount,
        issuesCount: baseIssuesCount
      };
    });
    
    res.json(statsByBase);
  } catch (error: any) {
    console.error('Error fetching org stats:', error);
    res.status(500).json({ error: 'خطا در دریافت آمار سازمانی' });
  }
});

reportRoutes.get('/data', requireAuth, async (req, res) => {
  try {
    const allIssues = await db.select().from(issues).orderBy(desc(issues.createdAt));
    
    const domainNodeIds = allIssues.map(i => i.domainNodeId).filter(Boolean) as number[];
    let allNodes: any[] = [];
    if (domainNodeIds.length > 0) {
      allNodes = await db.select().from(treeNodes).where(inArray(treeNodes.id, Array.from(new Set(domainNodeIds))));
    }

    const issuesData = allIssues.map(i => {
      const dNode = allNodes.find(n => n.id === i.domainNodeId);
      return {
        ...i,
        domain: dNode?.title || 'نامشخص',
        category: i.category || 'دسته‌بندی نشده',
      };
    });

    const gapsData = await db.select({
      id: gaps.id,
      status: gaps.status,
      gapType: gaps.gapType,
      priority: gaps.priority,
      description: gaps.description,
      createdAt: gaps.createdAt,
    }).from(gaps);

    const nodesData = await db.select({
      id: treeNodes.id,
      title: treeNodes.title,
      level: treeNodes.level,
      levelId: treeNodes.levelId,
    }).from(treeNodes);

    res.json({
      issues: issuesData,
      gaps: gapsData,
      nodes: nodesData,
    });
  } catch (error: any) {
    console.error('Error in /api/reports/data:', error);
    res.status(500).json({ error: 'خطا در دریافت اطلاعات گزارش‌ساز' });
  }
});

// خروجی اکسل فرمت‌بندی شده و شکیل از وضعیت نظام مسائل با اعمال کنترل دسترسی سازمانی (حل اولویت ۲ و ۱۲)
reportRoutes.get(['/issues/excel', '/export-excel'], requireAuth, async (req: any, res) => {
  try {
    const workbook = await generateIssuesExcel(req.user, req.query);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="dana_issues_official_report.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error('Error generating Excel report:', error);
    res.status(500).json({ error: 'خطا در تولید خروجی اکسل' });
  }
});
