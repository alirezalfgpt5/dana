// server/routes/issues/issueAccess.ts
// کنترل دسترسی سازمانی به مسائل و انطباق با سطوح آجا، نیرو و رده

import { db, sqlite } from '../../../src/db/index.js';
import { issues, treeNodes, knowledgeTrees, researchItems } from '../../../src/db/schema.js';
import { eq, inArray, or } from 'drizzle-orm';
import { getUserOrgScope, UserOrgScope } from '../../utils/orgAccess.js';

/**
 * بررسی دسترسی کاربر به یک مسئله خاص بر اساس ساختار سازمانی
 */
export async function hasIssueAccess(user: any, issueId: number): Promise<boolean> {
  if (!user) return false;
  const orgScope = getUserOrgScope(user);
  if (orgScope.isSuperAdmin || orgScope.level === 'AJA') return true;

  const issueArr = await db.select().from(issues).where(eq(issues.id, issueId));
  if (issueArr.length === 0) return false;
  const issue = issueArr[0];

  // ۱. اگر مسئله به یک گره درختی متصل است، درخت آن باید در محدوده دسترسی کاربر باشد
  if (issue.domainNodeId) {
    const nodeArr = await db.select().from(treeNodes).where(eq(treeNodes.id, issue.domainNodeId));
    if (nodeArr.length > 0) {
      const treeArr = await db.select().from(knowledgeTrees).where(eq(knowledgeTrees.id, nodeArr[0].treeId));
      if (treeArr.length > 0) {
        const tree = treeArr[0];
        if (tree.unitId && !orgScope.canAccessUnit(tree.unitId)) return false;
        if (tree.baseId && !orgScope.canAccessBase(tree.baseId)) return false;
      }
    }
  }

  // ۲. بررسی واحد متولی برای سطح رده
  if (issue.responsibleUnit && orgScope.level === 'RADE' && orgScope.unitId) {
    const u = sqlite.prepare('SELECT name FROM units WHERE id = ?').get(orgScope.unitId) as { name: string } | undefined;
    if (u && issue.responsibleUnit !== u.name && !issue.domainNodeId) {
      return false;
    }
  }

  // ۳. بررسی دسترسی پایگاه برای سطح نیرو
  if (orgScope.level === 'NIROO' && orgScope.baseId) {
    if (issue.domainNodeId) {
      const nodeArr = await db.select().from(treeNodes).where(eq(treeNodes.id, issue.domainNodeId));
      if (nodeArr.length > 0) {
        const treeArr = await db.select().from(knowledgeTrees).where(eq(knowledgeTrees.id, nodeArr[0].treeId));
        if (treeArr.length > 0 && treeArr[0].baseId && Number(treeArr[0].baseId) !== Number(orgScope.baseId)) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * بررسی دسترسی کاربر به یک گره دانشی
 */
export async function canUserAccessNode(user: any, nodeId: number): Promise<boolean> {
  if (!user) return false;
  const orgScope = getUserOrgScope(user);
  if (orgScope.isSuperAdmin || orgScope.level === 'AJA') return true;

  const nodeArr = await db.select().from(treeNodes).where(eq(treeNodes.id, nodeId));
  if (nodeArr.length === 0) return false;
  const treeArr = await db.select().from(knowledgeTrees).where(eq(knowledgeTrees.id, nodeArr[0].treeId));
  if (treeArr.length === 0) return false;
  const tree = treeArr[0];

  if (tree.unitId && !orgScope.canAccessUnit(tree.unitId)) return false;
  if (tree.baseId && !orgScope.canAccessBase(tree.baseId)) return false;
  return true;
}

/**
 * بررسی دسترسی کاربر به یک آیتم پژوهشی
 */
export async function canUserAccessResearchItem(user: any, researchItemId: number): Promise<boolean> {
  if (!user) return false;
  const orgScope = getUserOrgScope(user);
  if (orgScope.isSuperAdmin || orgScope.level === 'AJA') return true;

  const rItem = await db.query.researchItems.findFirst({
    where: eq(researchItems.id, researchItemId),
  });
  if (!rItem) return false;
  if (rItem.nodeId) {
    return canUserAccessNode(user, rItem.nodeId);
  }
  return true;
}

/**
 * ساخت شرایط شرطی دسترسی سازمانی برای کوئری مسائل
 * اگر کاربر دسترسی نداشته باشد یا برای محدوده وی درختی یافت نشود، شرایطی بازگردانده می‌شود که هیچ رکوردی برنگردد
 */
export async function buildIssueOrgConditions(
  user: any,
  options: {
    baseId?: number | null;
    unitId?: number | null;
    mode?: string;
  } = {}
): Promise<any[]> {
  const orgScope = getUserOrgScope(user);
  if (orgScope.isSuperAdmin || orgScope.level === 'AJA') {
    // آجا می‌تواند اختیاری بر اساس baseId یا unitId فیلتر کند
    const conditions: any[] = [];
    if (options.unitId) {
      const unitTrees = await db.select({ id: knowledgeTrees.id })
        .from(knowledgeTrees)
        .where(eq(knowledgeTrees.unitId, options.unitId));
      const treeIds = unitTrees.map(t => t.id);
      const unit = sqlite.prepare('SELECT name FROM units WHERE id = ?').get(options.unitId) as { name: string } | undefined;
      let nodeIds: number[] = [];
      if (treeIds.length > 0) {
        const nodes = await db.select({ id: treeNodes.id }).from(treeNodes).where(inArray(treeNodes.treeId, treeIds));
        nodeIds = nodes.map(n => n.id);
      }
      const orClauses: any[] = [];
      if (nodeIds.length > 0) orClauses.push(inArray(issues.domainNodeId, nodeIds));
      if (unit?.name) orClauses.push(eq(issues.responsibleUnit, unit.name));
      if (orClauses.length > 0) {
        conditions.push(or(...orClauses));
      } else {
        conditions.push(eq(issues.id, -1));
      }
    } else if (options.baseId) {
      const baseTrees = await db.select({ id: knowledgeTrees.id })
        .from(knowledgeTrees)
        .where(eq(knowledgeTrees.baseId, options.baseId));
      const treeIds = baseTrees.map(t => t.id);
      if (treeIds.length > 0) {
        const nodes = await db.select({ id: treeNodes.id }).from(treeNodes).where(inArray(treeNodes.treeId, treeIds));
        const nodeIds = nodes.map(n => n.id);
        if (nodeIds.length > 0) {
          conditions.push(inArray(issues.domainNodeId, nodeIds));
        } else {
          conditions.push(eq(issues.id, -1));
        }
      } else {
        conditions.push(eq(issues.id, -1));
      }
    }
    return conditions;
  }

  const isAggregate = options.mode === 'aggregate';
  const effective = orgScope.getEffectiveFilter(
    options.baseId || null,
    options.unitId || null,
    isAggregate
  );

  const conditions: any[] = [];

  if (effective.unitIds && effective.unitIds.length > 0) {
    const unitTrees = await db.select({ id: knowledgeTrees.id })
      .from(knowledgeTrees)
      .where(inArray(knowledgeTrees.unitId, effective.unitIds));
    const treeIds = unitTrees.map(t => t.id);

    const unitNames = sqlite.prepare(
      `SELECT name FROM units WHERE id IN (${effective.unitIds.map(() => '?').join(',')})`
    ).all(...effective.unitIds).map((u: any) => u.name);

    let nodeIds: number[] = [];
    if (treeIds.length > 0) {
      const nodes = await db.select({ id: treeNodes.id }).from(treeNodes).where(inArray(treeNodes.treeId, treeIds));
      nodeIds = nodes.map(n => n.id);
    }

    const orgConds: any[] = [];
    if (nodeIds.length > 0) {
      orgConds.push(inArray(issues.domainNodeId, nodeIds));
    }
    if (unitNames.length > 0) {
      orgConds.push(inArray(issues.responsibleUnit, unitNames));
    }

    if (orgConds.length > 0) {
      conditions.push(or(...orgConds));
    } else {
      // اگر درختی برای این یگان‌ها یافت نشد، حتماً شرط مسدودکننده بگذار
      conditions.push(eq(issues.id, -1));
    }
  } else if (effective.baseIds && effective.baseIds.length > 0) {
    const baseTrees = await db.select({ id: knowledgeTrees.id })
      .from(knowledgeTrees)
      .where(inArray(knowledgeTrees.baseId, effective.baseIds));
    const treeIds = baseTrees.map(t => t.id);

    if (treeIds.length > 0) {
      const nodes = await db.select({ id: treeNodes.id }).from(treeNodes).where(inArray(treeNodes.treeId, treeIds));
      const nodeIds = nodes.map(n => n.id);
      if (nodeIds.length > 0) {
        conditions.push(inArray(issues.domainNodeId, nodeIds));
      } else {
        // پایگاه درختی با گره ندارد، پس مسدود کن
        conditions.push(eq(issues.id, -1));
      }
    } else {
      // پایگاه هیچ درختی ندارد، پس مسدود کن (حل باگ عدم فیلتر پایگاه بدون درخت)
      conditions.push(eq(issues.id, -1));
    }
  } else {
    // کاربر رده یا نیرو بدون پایگاه/یگان معتبر
    conditions.push(eq(issues.id, -1));
  }

  return conditions;
}
