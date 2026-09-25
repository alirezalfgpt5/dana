import express from 'express';
import { db, sqlite } from '../../src/db/index.js';
import { issues, treeNodes, gaps, knowledgeTrees, users, periods } from '../../src/db/schema.js';
import { eq, inArray, desc } from 'drizzle-orm';
import { requireAuth } from '../middleware/rbac.js';
import ExcelJS from 'exceljs';

export const reportRoutes = express.Router();

reportRoutes.get('/org-stats', requireAuth, async (req: any, res) => {
  try {
    const bases = sqlite.prepare('SELECT id, name FROM bases WHERE is_active = 1').all() as any[];
    const trees = sqlite.prepare('SELECT id, base_id FROM knowledge_trees WHERE is_active = 1 AND base_id IS NOT NULL').all() as any[];
    
    const gapsInfo = sqlite.prepare(`
      SELECT g.id, n.tree_id 
      FROM gaps g 
      JOIN tree_nodes n ON g.required_node_id = n.id
    `).all() as any[];
    
    const issuesInfo = sqlite.prepare(`
      SELECT i.id, COALESCE(n1.tree_id, n2.tree_id, n3.tree_id) as tree_id
      FROM issues i
      LEFT JOIN tree_nodes n1 ON i.domain_node_id = n1.id
      LEFT JOIN research_items r ON i.research_item_id = r.id
      LEFT JOIN tree_nodes n2 ON r.node_id = n2.id
      LEFT JOIN gaps g ON r.gap_id = g.id
      LEFT JOIN tree_nodes n3 ON g.required_node_id = n3.id
    `).all() as any[];
    
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

// خروجی اکسل فرمت‌بندی شده و شکیل از وضعیت نظام مسائل
reportRoutes.get('/issues/excel', requireAuth, async (req, res) => {
  try {
    const allIssues = await db.select().from(issues).orderBy(desc(issues.createdAt));
    
    const domainNodeIds = allIssues.map(i => i.domainNodeId).filter(Boolean) as number[];
    let allNodes: any[] = [];
    if (domainNodeIds.length > 0) {
      allNodes = await db.select().from(treeNodes).where(inArray(treeNodes.id, Array.from(new Set(domainNodeIds))));
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'سامانه جامع دانا';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('گزارش وضعیت نظام مسائل', {
      views: [{ rightToLeft: true }],
      pageSetup: { orientation: 'landscape', paperSize: 9 }
    });

    // سرستون‌های گزارش
    sheet.columns = [
      { header: 'ردیف', key: 'index', width: 8 },
      { header: 'کد مسئله', key: 'id', width: 12 },
      { header: 'عنوان مسئله', key: 'title', width: 36 },
      { header: 'دسته‌بندی', key: 'category', width: 18 },
      { header: 'حوزه دانشی', key: 'domain', width: 22 },
      { header: 'وضعیت', key: 'status', width: 16 },
      { header: 'اولویت اقدام', key: 'actionPriority', width: 14 },
      { header: 'درصد پیشرفت', key: 'completionPercent', width: 14 },
      { header: 'واحد متولی', key: 'responsibleUnit', width: 22 },
      { header: 'نوع دانش', key: 'knowledgeType', width: 16 },
      { header: 'سطح پروژه', key: 'projectLevel', width: 14 },
      { header: 'بودجه مورد نیاز (ریال)', key: 'requiredBudget', width: 20 },
      { header: 'بودجه مصوب (ریال)', key: 'approvedBudget', width: 20 },
      { header: 'بودجه واگذار شده (ریال)', key: 'assignedBudget', width: 20 },
      { header: 'زمان انتظار (ماه)', key: 'expectedMonths', width: 16 },
      { header: 'تاریخ تصویب', key: 'approvalDate', width: 16 },
      { header: 'جهت‌گیری راه‌حل', key: 'solutionDirection', width: 32 },
      { header: 'گلوگاه‌ها و چالش‌ها', key: 'bottlenecks', width: 30 },
      { header: 'اقدامات انجام‌شده', key: 'actionsTaken', width: 30 },
      { header: 'تاریخ ثبت', key: 'createdAt', width: 20 },
    ];

    // استایل هدر
    const headerRow = sheet.getRow(1);
    headerRow.height = 32;
    headerRow.font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' } // رنگ سرمه‌ای سازمانی شکیل
    };

    const statusMap: Record<string, string> = {
      pending: 'در انتظار',
      in_progress: 'در حال اجرا',
      completed: 'تکمیل شده',
      on_hold: 'متوقف',
      canceled: 'لغو شده'
    };

    // افزودن ردیف‌های داده
    allIssues.forEach((issue, idx) => {
      const dNode = allNodes.find(n => n.id === issue.domainNodeId);
      const row = sheet.addRow({
        index: idx + 1,
        id: `ISS-${String(issue.id).padStart(4, '0')}`,
        title: issue.title,
        category: issue.category || 'عمومی',
        domain: dNode?.title || 'نامشخص',
        status: statusMap[issue.status || ''] || issue.status || 'در انتظار',
        actionPriority: issue.actionPriority || 'متوسط',
        completionPercent: `${issue.completionPercent || 0}%`,
        responsibleUnit: issue.responsibleUnit || '-',
        knowledgeType: issue.knowledgeType || '-',
        projectLevel: issue.projectLevel || '-',
        requiredBudget: Number(issue.requiredBudget || 0).toLocaleString('fa-IR'),
        approvedBudget: Number(issue.approvedBudget || 0).toLocaleString('fa-IR'),
        assignedBudget: Number(issue.assignedBudget || 0).toLocaleString('fa-IR'),
        expectedMonths: issue.expectedMonths || 0,
        approvalDate: issue.approvalDate || '-',
        solutionDirection: issue.solutionDirection || '-',
        bottlenecks: issue.bottlenecks || '-',
        actionsTaken: issue.actionsTaken || '-',
        createdAt: issue.createdAt ? new Date(issue.createdAt).toLocaleDateString('fa-IR') : '-',
      });

      row.height = 24;
      row.alignment = { vertical: 'middle', horizontal: 'center' };
      row.font = { name: 'Tahoma', size: 10 };

      // متن ردیف‌های طولانی راست‌چین شود
      row.getCell('title').alignment = { vertical: 'middle', horizontal: 'right' };
      row.getCell('solutionDirection').alignment = { vertical: 'middle', horizontal: 'right' };
      row.getCell('bottlenecks').alignment = { vertical: 'middle', horizontal: 'right' };
      row.getCell('actionsTaken').alignment = { vertical: 'middle', horizontal: 'right' };

      // رنگ‌آمیزی سلول وضعیت
      const statusCell = row.getCell('status');
      if (issue.status === 'completed') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; // سبز ملایم
        statusCell.font = { name: 'Tahoma', size: 10, bold: true, color: { argb: 'FF166534' } };
      } else if (issue.status === 'in_progress') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }; // آبی ملایم
        statusCell.font = { name: 'Tahoma', size: 10, bold: true, color: { argb: 'FF1E40AF' } };
      } else if (issue.status === 'on_hold') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // زرد ملایم
        statusCell.font = { name: 'Tahoma', size: 10, bold: true, color: { argb: 'FF92400E' } };
      }

      // خطوط جدول
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });

      // ردیف یکی در میان رنگ پس‌زمینه لطیف
      if (idx % 2 === 1) {
        row.eachCell((cell, colNumber) => {
          if (colNumber !== 6) { // به جز ستون وضعیت
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          }
        });
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="dana_issues_report.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error('Error generating Excel report:', error);
    res.status(500).json({ error: 'خطا در تولید خروجی اکسل' });
  }
});
