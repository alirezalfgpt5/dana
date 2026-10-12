// server/routes/reportRoutes.ts
// گزارش‌ها و خروجی‌های تحلیلی و اکسل با اعمال کنترل دسترسی سازمانی

import express from 'express';
import { db, sqlite } from '../../src/db/index.js';
import { issues, treeNodes, gaps, knowledgeTrees, periods } from '../../src/db/schema.js';
import { eq, inArray, desc, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/rbac.js';
import { generateIssuesExcel } from '../utils/issueExcelExport.js';
import { getUserOrgScope } from '../utils/orgAccess.js';
import { buildIssueOrgConditions } from './issues/issueAccess.js';

export const reportRoutes = express.Router();

reportRoutes.get('/org-stats', requireAuth, async (req: any, res) => {
  try {
    const parseId = (value: unknown): number | null => {
      if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
      const id = Number(value);
      return Number.isSafeInteger(id) && id > 0 ? id : null;
    };
    const requestedPeriodId = parseId(req.query.periodId);
    const requestedBaseId = parseId(req.query.baseId);
    const requestedUnitId = parseId(req.query.unitId);
    const scope = getUserOrgScope(req.user);

    if ((req.query.baseId && !requestedBaseId) || (req.query.unitId && !requestedUnitId)
      || (req.query.periodId && !requestedPeriodId)) {
      return res.status(400).json({ error: 'فیلتر دوره یا ساختار سازمانی معتبر نیست.' });
    }
    if ((requestedBaseId && !scope.canAccessBase(requestedBaseId))
      || (requestedUnitId && !scope.canAccessUnit(requestedUnitId))) {
      return res.status(403).json({ error: 'به محدودهٔ سازمانی درخواستی دسترسی ندارید.' });
    }

    const effective = scope.getEffectiveFilter(
      requestedBaseId,
      requestedUnitId,
      req.query.mode === 'aggregate'
    );
    const scopeConditions = ['kt.is_active = 1'];
    const scopeParams: number[] = [];
    if (requestedPeriodId) {
      scopeConditions.push('kt.period_id = ?');
      scopeParams.push(requestedPeriodId);
    }
    if (effective.baseIds !== null) {
      if (effective.baseIds.length === 0) scopeConditions.push('1 = 0');
      else {
        scopeConditions.push(`kt.base_id IN (${effective.baseIds.map(() => '?').join(',')})`);
        scopeParams.push(...effective.baseIds);
      }
    }
    if (effective.unitIds !== null && effective.unitIds.length > 0) {
      scopeConditions.push(`kt.unit_id IN (${effective.unitIds.map(() => '?').join(',')})`);
      scopeParams.push(...effective.unitIds);
    } else if (effective.unitIds !== null && effective.unitIds.length === 0 && effective.baseIds === null) {
      scopeConditions.push('1 = 0');
    }

    let visibleBaseIds: number[] | null = requestedBaseId ? [requestedBaseId] : effective.baseIds;
    if (!requestedBaseId && requestedUnitId) {
      const unitBase = sqlite.prepare('SELECT base_id FROM units WHERE id = ?').get(requestedUnitId) as { base_id: number } | undefined;
      visibleBaseIds = unitBase ? [Number(unitBase.base_id)] : [];
    }
    const baseRows = visibleBaseIds === null
      ? sqlite.prepare('SELECT id, name FROM bases WHERE is_active = 1 ORDER BY sort_order, id').all() as Array<{ id: number; name: string }>
      : visibleBaseIds.length > 0
        ? sqlite.prepare(`
          SELECT id, name FROM bases
          WHERE is_active = 1 AND id IN (${visibleBaseIds.map(() => '?').join(',')})
          ORDER BY sort_order, id
        `).all(...visibleBaseIds) as Array<{ id: number; name: string }>
        : [];
    const scopeFilter = scopeConditions.join(' AND ');
    const [treeCounts, gapCounts, issueCounts] = await Promise.all([
      sqlite.prepare(`
        SELECT kt.base_id AS baseId, COUNT(*) AS count
        FROM knowledge_trees kt
        WHERE ${scopeFilter}
        GROUP BY kt.base_id
      `).all(...scopeParams) as Array<{ baseId: number; count: number }>,
      sqlite.prepare(`
        SELECT kt.base_id AS baseId, COUNT(*) AS count
        FROM gaps g
        JOIN tree_nodes n ON n.id = g.required_node_id
        JOIN knowledge_trees kt ON kt.id = n.tree_id
        WHERE ${scopeFilter}
        GROUP BY kt.base_id
      `).all(...scopeParams) as Array<{ baseId: number; count: number }>,
      sqlite.prepare(`
        SELECT kt.base_id AS baseId, COUNT(*) AS count
        FROM issues i
        LEFT JOIN tree_nodes n1 ON i.domain_node_id = n1.id
        LEFT JOIN research_items r ON i.research_item_id = r.id
        LEFT JOIN tree_nodes n2 ON r.node_id = n2.id
        LEFT JOIN gaps g ON r.gap_id = g.id
        LEFT JOIN tree_nodes n3 ON g.required_node_id = n3.id
        JOIN knowledge_trees kt ON kt.id = COALESCE(n1.tree_id, n2.tree_id, n3.tree_id)
        WHERE ${scopeFilter}
        GROUP BY kt.base_id
      `).all(...scopeParams) as Array<{ baseId: number; count: number }>,
    ]);
    const countMap = (rows: Array<{ baseId: number; count: number }>) =>
      new Map(rows.map(row => [Number(row.baseId), Number(row.count) || 0]));
    const treeCountMap = countMap(treeCounts);
    const gapCountMap = countMap(gapCounts);
    const issueCountMap = countMap(issueCounts);
    res.json(baseRows.map(base => ({
      baseId: base.id,
      baseName: base.name,
      treesCount: treeCountMap.get(Number(base.id)) || 0,
      gapsCount: gapCountMap.get(Number(base.id)) || 0,
      issuesCount: issueCountMap.get(Number(base.id)) || 0,
    })));
  } catch (error: any) {
    console.error('Error fetching org stats:', error);
    res.status(500).json({ error: 'خطا در دریافت آمار سازمانی' });
  }
});

reportRoutes.get('/data', requireAuth, async (req, res) => {
  try {
    const source = typeof req.query.source === 'string' ? req.query.source : 'issues';
    if (!['issues', 'gaps', 'nodes'].includes(source)) {
      return res.status(400).json({ error: 'منبع دادهٔ گزارش معتبر نیست.' });
    }
    const periodId = req.query.periodId === undefined ? null : Number(req.query.periodId);
    if (periodId !== null && (!Number.isSafeInteger(periodId) || periodId <= 0)) {
      return res.status(400).json({ error: 'دورهٔ زمانی گزارش معتبر نیست.' });
    }

    const response = { issues: [] as any[], gaps: [] as any[], nodes: [] as any[] };
    if (source === 'issues') {
      const conditions = await buildIssueOrgConditions((req as any).user);
      if (periodId !== null) conditions.push(eq(issues.periodId, periodId));
      const issueRows = await db.select().from(issues)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(issues.createdAt));
      const domainNodeIds = [...new Set(issueRows.map(issue => issue.domainNodeId).filter(Boolean))] as number[];
      const domainNodes = domainNodeIds.length > 0
        ? await db.select({ id: treeNodes.id, title: treeNodes.title })
          .from(treeNodes).where(inArray(treeNodes.id, domainNodeIds))
        : [];
      const domainsById = new Map(domainNodes.map(node => [node.id, node.title]));
      response.issues = issueRows.map(issue => ({
        ...issue,
        domain: domainsById.get(issue.domainNodeId || -1) || 'نامشخص',
        category: issue.category || 'دسته‌بندی نشده',
      }));
    } else {
      const scope = getUserOrgScope((req as any).user);
      const effective = scope.getEffectiveFilter(undefined, undefined, true);
      const conditions = ['1 = 1'];
      const params: number[] = [];
      if (effective.baseIds !== null) {
        if (effective.baseIds.length === 0) conditions.push('1 = 0');
        else {
          conditions.push(`kt.base_id IN (${effective.baseIds.map(() => '?').join(',')})`);
          params.push(...effective.baseIds);
        }
      }
      if (effective.unitIds !== null && effective.unitIds.length > 0) {
        conditions.push(`kt.unit_id IN (${effective.unitIds.map(() => '?').join(',')})`);
        params.push(...effective.unitIds);
      } else if (effective.unitIds !== null && effective.unitIds.length === 0 && effective.baseIds === null) {
        conditions.push('1 = 0');
      }
      if (periodId !== null) {
        conditions.push('kt.period_id = ?');
        params.push(periodId);
      }
      const filter = conditions.join(' AND ');
      if (source === 'nodes') {
        response.nodes = sqlite.prepare(`
          SELECT n.id, n.title, n.level, n.level_id AS levelId
          FROM tree_nodes n
          JOIN knowledge_trees kt ON kt.id = n.tree_id
          WHERE ${filter}
          ORDER BY kt.id, n.sort_order, n.id
        `).all(...params) as any[];
      } else {
        response.gaps = sqlite.prepare(`
          SELECT g.id, g.status, g.gap_type AS gapType, g.priority, g.description, g.created_at AS createdAt
          FROM gaps g
          JOIN tree_nodes n ON n.id = g.required_node_id
          JOIN knowledge_trees kt ON kt.id = n.tree_id
          WHERE ${filter}
          ORDER BY g.id DESC
        `).all(...params) as any[];
      }
    }

    res.json(response);
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
