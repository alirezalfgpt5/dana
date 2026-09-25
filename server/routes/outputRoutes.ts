import { AuthRequest } from '../types/AuthRequest.js';
// server/routes/outputRoutes.ts
// مدیریت خروجی‌ها - اکسل و گراف - نسخه نهایی ۳.۰

import { Router } from 'express';
import { db } from '../../src/db/index.js';
import {
  knowledgeTrees,
  treeNodes,
  gaps,
  researchItems,
  issues,
  knowledgeAssets,
  templates,
  knowledgeLevels,
  programCoverages,
  periods,
} from '../../src/db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import { logAudit } from '../utils/audit.js';
import { format } from 'date-fns-jalali';
import ExcelJS from 'exceljs';

export const outputRoutes = Router();

// ============================================
// 📊 ۱. خروجی گراف درختواره (JSON برای D3.js)
// ============================================

outputRoutes.get('/tree/:treeId/graph', async (req, res) => {
  try {
    const { treeId } = req.params;
    const treeIdNum = parseInt(treeId);

    const tree = await db.query.knowledgeTrees.findFirst({
      where: eq(knowledgeTrees.id, treeIdNum),
    });

    if (!tree) {
      return res.status(404).json({ error: 'درختواره یافت نشد' });
    }

    const nodes = await db.select()
      .from(treeNodes)
      .where(eq(treeNodes.treeId, treeIdNum))
      .orderBy(treeNodes.sortOrder);

    // دریافت اطلاعات گپ‌ها و پژوهش برای هایلایت
    let gapsData: any[] = [];
    let researchData: any[] = [];

    const nodeIds = nodes.map(n => n.id);

    if (tree.type === 'research' && nodeIds.length > 0) {
      gapsData = await db.select()
        .from(gaps)
        // Note: checking requiredNodeId against research tree nodes might not yield results if gaps point to required tree.
        // Assuming the original intent was to find gaps for the nodes.
        .where(inArray(gaps.requiredNodeId, nodeIds));
      
      researchData = await db.select()
        .from(researchItems)
        .where(inArray(researchItems.nodeId, nodeIds));
    }

    // ساخت داده‌های گراف با رنگ‌بندی سطوح
    const graphData = {
      tree: {
        id: tree.id,
        name: tree.name,
        type: tree.type,
      },
      nodes: nodes.map(node => ({
        id: node.id,
        title: node.title,
        level: node.level,
        parentId: node.parentId,
        isGap: node.isGap === 1,
        gapStatus: node.gapStatus,
        hasResearch: researchData.some(r => r.nodeId === node.id),
        templateIds: (Array.isArray(node.templateIds) ? node.templateIds : (node.templateIds ? String(node.templateIds).split(',').filter(Boolean) : [])) || [],
        sortOrder: node.sortOrder,
        // رنگ‌بندی بر اساس سطح
        color: node.level === 'R' ? '#3b82f6' :
               node.level === 'T' ? '#8b5cf6' :
               node.level === 'B' ? '#10b981' :
               node.level === 'SB' ? '#f59e0b' :
               node.level === 'L' ? '#6366f1' :
               node.level === 'Q' ? '#ec4899' : '#6b7280',
      })),
      links: nodes
        .filter(node => node.parentId)
        .map(node => ({
          source: node.parentId,
          target: node.id,
        })),
      stats: {
        totalNodes: nodes.length,
        leaves: nodes.filter(n => n.level === 'L').length,
        quality: nodes.filter(n => n.level === 'Q').length,
        gaps: nodes.filter(n => n.isGap === 1).length,
        researchItems: researchData.length,
        byLevel: nodes.reduce((acc: any, n) => {
          acc[n.level] = (acc[n.level] || 0) + 1;
          return acc;
        }, {}),
      },
    };

    res.json(graphData);
  } catch (error) {
    console.error('Error generating graph data:', error);
    res.status(500).json({ error: 'خطا در تولید داده‌های گراف' });
  }
});

// ============================================
// 📥 ۲. خروجی اکسل درختواره
// ============================================

outputRoutes.get('/tree/:treeId/excel', async (req, res) => {
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

    const nodes = await db.select()
      .from(treeNodes)
      .where(eq(treeNodes.treeId, treeIdNum))
      .orderBy(treeNodes.sortOrder);

    // دریافت دارایی‌ها
    const nodeIds = nodes.map(n => n.id);
    const assets: any[] = [];
    if (nodeIds.length > 0) {
      for (let i = 0; i < nodeIds.length; i += 500) {
        const chunk = nodeIds.slice(i, i + 500);
        const chunkAssets = await db.select()
          .from(knowledgeAssets)
          .where(inArray(knowledgeAssets.nodeId, chunk));
        assets.push(...chunkAssets);
      }
    }

    // دریافت قالب‌ها و سطوح
    const allTemplates = await db.select().from(templates);
    const allLevels = await db.select().from(knowledgeLevels);

    // ایجاد فایل اکسل
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'سیستم مدیریت دانش (DANA)';
    workbook.created = new Date();
    workbook.modified = new Date();

    // ========== شیت ۱: درختواره ==========
    const sheet1 = workbook.addWorksheet('درختواره', {
      views: [{ rightToLeft: true }],
    });

    // تنظیم ستون‌ها
    sheet1.getColumn(1).width = 10;
    sheet1.getColumn(2).width = 35;
    sheet1.getColumn(3).width = 15;
    sheet1.getColumn(4).width = 35;
    sheet1.getColumn(5).width = 20;
    sheet1.getColumn(6).width = 30;
    sheet1.getColumn(7).width = 20;

    // عنوان
    sheet1.mergeCells('A1:G1');
    const titleCell = sheet1.getCell('A1');
    titleCell.value = `🌳 درختواره: ${tree.name}`;
    titleCell.font = { name: 'Vazirmatn', bold: true, size: 18, color: { argb: 'FF1e293b' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    sheet1.mergeCells('A2:G2');
    const subCell = sheet1.getCell('A2');
    subCell.value = `📊 نوع: ${tree.type === 'required' ? 'مورد نیاز' : tree.type === 'produced' ? 'تولیدشده' : 'پژوهشی'} • 📅 تاریخ: ${format(new Date(), 'yyyy/MM/dd HH:mm')}`;
    subCell.font = { name: 'Vazirmatn', size: 10, color: { argb: 'FF64748b' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // هدر
    const headers = ['#', 'عنوان گره', 'سطح', 'والد', 'وضعیت گپ', 'قالب‌ها', 'تعداد دارایی'];
    const headerRow = sheet1.addRow(headers);
    headerRow.font = { name: 'Vazirmatn', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    headerRow.height = 35;

    // داده‌ها با رنگ‌بندی سطوح
    const levelColors: Record<string, string> = {
      'R': 'FFDBEAFE',
      'T': 'FFEDE9FE',
      'B': 'FFD1FAE5',
      'SB': 'FFFEF3C7',
      'L': 'FFE0E7FF',
      'Q': 'FFFCE7F3',
    };

    for (const node of nodes) {
      const nodeAssets = assets.filter(a => a.nodeId === node.id);
      const templatesList = (Array.isArray(node.templateIds) ? node.templateIds : (node.templateIds ? String(node.templateIds).split(',').filter(Boolean) : [])) || [];
      const templateNames = templatesList.map(id => {
        const t = allTemplates.find(t => t.id === parseInt(id));
        return t ? `${t.type} - ${t.title}` : '';
      }).filter(Boolean).join(', ') || 'بدون قالب';
      
      const parentTitle = nodes.find(n => n.id === node.parentId)?.title || 'ریشه';
      
      const row = sheet1.addRow([
        node.id,
        node.title,
        node.level === 'R' ? 'ریشه' :
        node.level === 'T' ? 'تنه' :
        node.level === 'B' ? 'شاخه' :
        node.level === 'SB' ? 'زیرشاخه' :
        node.level === 'L' ? 'برگ' :
        node.level === 'Q' ? 'کیفیت' : node.level,
        parentTitle,
        node.gapStatus === 'open' ? 'باز' :
        node.gapStatus === 'filled' ? 'پر شده' :
        node.gapStatus === 'partially_filled' ? 'نیمه‌پر' : 'بدون گپ',
        templateNames,
        nodeAssets.length,
      ]);
      row.alignment = { vertical: 'middle' };
      row.height = 25;
      
      // رنگ‌بندی بر اساس سطح
      const color = levelColors[node.level] || 'FFFFFFFF';
      row.eachCell((cell: any) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
      });
    }

    // جمع‌بندی
    const summaryRow = sheet1.addRow([
      '📊 جمع کل',
      '',
      '',
      '',
      `✅ گره‌ها: ${nodes.length}`,
      `🍃 برگ‌ها: ${nodes.filter(n => n.level === 'L').length}`,
      `⭐ کیفیت: ${nodes.filter(n => n.level === 'Q').length}`,
    ]);
    summaryRow.font = { name: 'Vazirmatn', bold: true, size: 12 };
    summaryRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };
    summaryRow.height = 35;

    // ========== شیت ۲: دارایی‌ها ==========
    if (assets.length > 0) {
      const sheet2 = workbook.addWorksheet('دارایی‌ها', {
        views: [{ rightToLeft: true }],
      });

      sheet2.getColumn(1).width = 10;
      sheet2.getColumn(2).width = 35;
      sheet2.getColumn(3).width = 30;
      sheet2.getColumn(4).width = 25;
      sheet2.getColumn(5).width = 25;
      sheet2.getColumn(6).width = 20;

      sheet2.mergeCells('A1:F1');
      const title2 = sheet2.getCell('A1');
      title2.value = '📎 دارایی‌های دانشی';
      title2.font = { name: 'Vazirmatn', bold: true, size: 16, color: { argb: 'FF1e293b' } };
      title2.alignment = { horizontal: 'center', vertical: 'middle' };

      const headers2 = ['#', 'عنوان دارایی', 'گره مرتبط', 'قالب', 'سطح دانش', 'فایل'];
      const headerRow2 = sheet2.addRow(headers2);
      headerRow2.font = { name: 'Vazirmatn', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      headerRow2.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRow2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
      headerRow2.height = 35;

      for (const asset of assets) {
        const node = nodes.find(n => n.id === asset.nodeId);
        const template = allTemplates.find(t => t.id === asset.templateId);
        const level = allLevels.find(l => l.id === asset.levelId);
        
        sheet2.addRow([
          asset.id,
          asset.title,
          node?.title || 'نامشخص',
          template ? `${template.type} - ${template.title}` : 'بدون قالب',
          level?.name || 'بدون سطح',
          asset.filePath ? '📄 دارد' : '❌ ندارد',
        ]);
      }
    }

    // ثبت لاگ
    logAudit({
      userId,
      entityName: 'درختواره',
      entityId: treeIdNum,
      action: 'EXPORT', changes: { format: 'excel' },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const filename = `درختواره_${tree.name}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting tree excel:', error);
    res.status(500).json({ error: 'خطا در خروجی اکسل' });
  }
});

// ============================================
// 📥 ۳. خروجی اکسل پژوهشی با ۹ ستون تحلیلی
// ============================================

outputRoutes.get('/research/:treeId/excel', async (req, res) => {
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

    // دریافت نام‌های پوشش برنامه‌ای
    const allProgramCoverages = await db.select().from(programCoverages);
    const coveragesMap = new Map(allProgramCoverages.map(c => [c.id, c.name]));

    // تنظیم ستون‌ها - ۱۰ ستون
    sheet.getColumn(1).width = 10;   // شناسه
    sheet.getColumn(2).width = 35;   // عنوان گره
    sheet.getColumn(3).width = 15;   // سطح
    sheet.getColumn(4).width = 20;   // اولویت
    sheet.getColumn(5).width = 20;   // اهمیت
    sheet.getColumn(6).width = 18;   // بازه زمانی
    sheet.getColumn(7).width = 30;   // پوشش برنامه‌ای
    sheet.getColumn(8).width = 20;   // تأثیر رزمی
    sheet.getColumn(9).width = 20;   // هزینه‌فایده
    sheet.getColumn(10).width = 15;  // وضعیت

    // عنوان
    sheet.mergeCells('A1:J1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `🔬 درختواره پژوهشی: ${tree.name}`;
    titleCell.font = { name: 'Vazirmatn', bold: true, size: 18, color: { argb: 'FF1e293b' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('A2:J2');
    const subCell = sheet.getCell('A2');
    subCell.value = `📊 تاریخ: ${format(new Date(), 'yyyy/MM/dd HH:mm')} • ${researchItemsList.length} آیتم پژوهشی`;
    subCell.font = { name: 'Vazirmatn', size: 10, color: { argb: 'FF64748b' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // هدر 
    const headers = [
      '#', 'عنوان گره', 'سطح',
      '🎯 اولویت', '🏛️ اهمیت', '⏳ بازه زمانی',
      '📋 پوشش برنامه‌ای', '💪 تأثیر رزمی (۱-۱۰)', '💰 هزینه‌فایده (۱-۱۰)',
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
      
      // پیدا کردن گپ مرتبط برای وضعیت
      const gap = await db.query.gaps.findFirst({
        where: eq(gaps.id, item.gapId),
      });

      let coveragesStr = '-';
      if (item.programCoverages && Array.isArray(item.programCoverages)) {
        coveragesStr = item.programCoverages.map((id: any) => coveragesMap.get(id)).filter(Boolean).join('، ');
      }
      
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
        coveragesStr,
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
      '📊 جمع کل',
      '',
      '',
      `🎯 کل: ${total}`,
      `🏛️ راهبردی: ${researchItemsList.filter(i => i.importance === 'راهبردی').length}`,
      `⏳ کوتاه‌مدت: ${researchItemsList.filter(i => i.timeFrame === 'کوتاه‌مدت').length}`,
      '',
      `💪 میانگین: ${Math.round(researchItemsList.reduce((s, i) => s + (i.combatImpact || 0), 0) / total)}`,
      `💰 میانگین: ${Math.round(researchItemsList.reduce((s, i) => s + (i.costBenefit || 0), 0) / total)}`,
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
    console.error('Error exporting research excel:', error);
    res.status(500).json({ error: 'خطا در خروجی اکسل' });
  }
});

// ============================================
// 📥 ۴. خروجی اکسل کامل (گزارش کامل با ۶ شیت)
// ============================================

outputRoutes.get('/full-report', async (req, res) => {
  try {
    const { treeId, includeTemplates, includeLevels, periodId, fromDate, toDate } = req.query;
    const userId = (req as AuthRequest).user?.id || null;

    if (!treeId) {
      return res.status(400).json({ error: 'شناسه درختواره الزامی است' });
    }

    const treeIdNum = parseInt(treeId as string);

    // دریافت داده‌ها
    const tree = await db.query.knowledgeTrees.findFirst({
      where: eq(knowledgeTrees.id, treeIdNum),
    });

    if (!tree) {
      return res.status(404).json({ error: 'درختواره یافت نشد' });
    }

    const nodes = await db.select()
      .from(treeNodes)
      .where(eq(treeNodes.treeId, treeIdNum))
      .orderBy(treeNodes.sortOrder);

    const nodeIds = nodes.map(n => n.id);
    
    // دریافت گپ‌ها
    const gapsData: any[] = [];
    if (nodeIds.length > 0) {
      for (let i = 0; i < nodeIds.length; i += 500) {
        const chunk = nodeIds.slice(i, i + 500);
        const chunkGaps = await db.select()
          .from(gaps)
          .where(inArray(gaps.requiredNodeId, chunk));
        gapsData.push(...chunkGaps);
      }
    }

    // دریافت آیتم‌های پژوهشی
    const researchData: any[] = [];
    if (nodeIds.length > 0) {
      for (let i = 0; i < nodeIds.length; i += 500) {
        const chunk = nodeIds.slice(i, i + 500);
        const chunkResearch = await db.select()
          .from(researchItems)
          .where(inArray(researchItems.nodeId, chunk));
        researchData.push(...chunkResearch);
      }
    }

    // دریافت مسائل
    const researchIds = researchData.map(r => r.id);
    const issuesData: any[] = [];
    if (researchIds.length > 0) {
      for (let i = 0; i < researchIds.length; i += 500) {
        const chunk = researchIds.slice(i, i + 500);
        const chunkIssues = await db.select()
          .from(issues)
          .where(inArray(issues.researchItemId, chunk));
        issuesData.push(...chunkIssues);
      }
    }

    // دریافت دارایی‌ها
    const assets: any[] = [];
    if (nodeIds.length > 0) {
      for (let i = 0; i < nodeIds.length; i += 500) {
        const chunk = nodeIds.slice(i, i + 500);
        const chunkAssets = await db.select()
          .from(knowledgeAssets)
          .where(inArray(knowledgeAssets.nodeId, chunk));
        assets.push(...chunkAssets);
      }
    }

    // دریافت قالب‌ها و سطوح
    const allTemplates = await db.select().from(templates);
    const allLevels = await db.select().from(knowledgeLevels);

    // ایجاد فایل اکسل با ۶ شیت
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'سیستم مدیریت دانش (DANA)';
    workbook.created = new Date();
    workbook.modified = new Date();

    // ========== شیت ۱: اطلاعات کلی ==========
    const sheet1 = workbook.addWorksheet('اطلاعات کلی', {
      views: [{ rightToLeft: true }],
    });
    sheet1.getColumn(1).width = 30;
    sheet1.getColumn(2).width = 40;

    const infoData = [
      ['📊 گزارش کامل سیستم مدیریت دانش', ''],
      ['', ''],
      ['🌳 نام سیستم', 'DANA - سیستم مدیریت دانش و نظام مسائل'],
      ['📅 تاریخ تهیه', format(new Date(), 'yyyy/MM/dd HH:mm')],
      ['', ''],
      ['📋 اطلاعات درختواره', ''],
      ['نام درختواره', tree.name],
      ['نوع درختواره', tree.type === 'required' ? 'مورد نیاز' : tree.type === 'produced' ? 'تولیدشده' : 'پژوهشی'],
      ['تعداد گره‌ها', nodes.length],
      ['تعداد برگ‌ها (L)', nodes.filter(n => n.level === 'L').length],
      ['تعداد کیفیت (Q)', nodes.filter(n => n.level === 'Q').length],
      ['', ''],
      ['📊 آمار کلی', ''],
      ['تعداد گپ‌ها', gapsData.length],
      ['گپ‌های باز', gapsData.filter(g => g.status === 'open').length],
      ['گپ‌های پر شده', gapsData.filter(g => g.status === 'filled').length],
      ['گپ‌های نیمه‌پر', gapsData.filter(g => g.status === 'partially_filled').length],
      ['', ''],
      ['🔬 آمار پژوهشی', ''],
      ['تعداد آیتم‌های پژوهشی', researchData.length],
      ['راهبردی', researchData.filter(r => r.importance === 'راهبردی').length],
      ['عملیاتی', researchData.filter(r => r.importance === 'عملیاتی').length],
      ['تاکتیکی', researchData.filter(r => r.importance === 'تاکتیکی').length],
      ['', ''],
      ['🎯 آمار مسائل', ''],
      ['تعداد مسائل', issuesData.length],
      ['در انتظار', issuesData.filter(i => i.status === 'pending').length],
      ['در حال اجرا', issuesData.filter(i => i.status === 'in_progress').length],
      ['تکمیل شده', issuesData.filter(i => i.status === 'completed').length],
      ['لغو شده', issuesData.filter(i => i.status === 'canceled').length],
      ['متوقف', issuesData.filter(i => i.status === 'on_hold').length],
      ['', ''],
      ['💰 بودجه کل', new Intl.NumberFormat('fa-IR').format(issuesData.reduce((s, i) => s + (i.requiredBudget || 0), 0)) + ' ریال'],
      ['📈 میانگین پیشرفت', issuesData.length > 0 ? Math.round(issuesData.reduce((s, i) => s + (i.completionPercent || 0), 0) / issuesData.length) + '%' : '۰%'],
    ];

    for (const [label, value] of infoData) {
      const row = sheet1.addRow([label, value]);
      row.alignment = { vertical: 'middle' };
      if (String(label).includes('گزارش') || String(label).includes('آمار') || String(label).includes('اطلاعات')) {
        row.font = { name: 'Vazirmatn', bold: true, size: 13, color: { argb: 'FF4F46E5' } };
      }
      if (label === '' || label === '') {
        row.height = 10;
      }
    }

    // ========== شیت ۲: درختواره ==========
    const sheet2 = workbook.addWorksheet('درختواره', {
      views: [{ rightToLeft: true }],
    });
    sheet2.getColumn(1).width = 10;
    sheet2.getColumn(2).width = 35;
    sheet2.getColumn(3).width = 15;
    sheet2.getColumn(4).width = 35;
    sheet2.getColumn(5).width = 20;

    const headers2 = ['#', 'عنوان گره', 'سطح', 'والد', 'وضعیت گپ'];
    const headerRow2 = sheet2.addRow(headers2);
    headerRow2.font = { name: 'Vazirmatn', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    headerRow2.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    headerRow2.height = 35;

    for (const node of nodes) {
      sheet2.addRow([
        node.id,
        node.title,
        node.level,
        nodes.find(n => n.id === node.parentId)?.title || 'ریشه',
        node.gapStatus === 'open' ? '🔴 باز' :
        node.gapStatus === 'filled' ? '🟢 پر شده' :
        node.gapStatus === 'partially_filled' ? '🟡 نیمه‌پر' : '✅ بدون گپ',
      ]);
    }

    // ========== شیت ۳: شکاف‌ها ==========
    if (gapsData.length > 0) {
      const sheet3 = workbook.addWorksheet('شکاف‌ها', {
        views: [{ rightToLeft: true }],
      });
      sheet3.getColumn(1).width = 10;
      sheet3.getColumn(2).width = 35;
      sheet3.getColumn(3).width = 20;
      sheet3.getColumn(4).width = 20;
      sheet3.getColumn(5).width = 15;
      sheet3.getColumn(6).width = 20;

      const headers3 = ['#', 'گره مورد نیاز', 'وضعیت', 'نوع', 'امتیاز تطابق', 'اولویت'];
      const headerRow3 = sheet3.addRow(headers3);
      headerRow3.font = { name: 'Vazirmatn', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      headerRow3.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRow3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } };
      headerRow3.height = 35;

      for (const gap of gapsData) {
        const node = nodes.find(n => n.id === gap.requiredNodeId);
        sheet3.addRow([
          gap.id,
          node?.title || 'نامشخص',
          gap.status === 'open' ? '🔴 باز' : gap.status === 'filled' ? '🟢 پر شده' : '🟡 نیمه‌پر',
          gap.gapType === 'fuzzy' ? 'تطابق فازی' :
          gap.gapType === 'partial' ? 'تطابق جزئی' :
          gap.gapType === 'complete' ? 'کامل' : '-',
          `${Math.round((gap.matchScore || 0) * 100)}%`,
          gap.priority === 'critical' ? '🔥 بحرانی' :
          gap.priority === 'high' ? '⬆️ بالا' :
          gap.priority === 'medium' ? '➖ متوسط' : '⬇️ پایین',
        ]);
      }
    }

    // ========== شیت ۴: پژوهش ==========
    if (researchData.length > 0) {
      const sheet4 = workbook.addWorksheet('پژوهش', {
        views: [{ rightToLeft: true }],
      });
      sheet4.getColumn(1).width = 10;
      sheet4.getColumn(2).width = 30;
      sheet4.getColumn(3).width = 18;
      sheet4.getColumn(4).width = 18;
      sheet4.getColumn(5).width = 18;
      sheet4.getColumn(6).width = 30;
      sheet4.getColumn(7).width = 18;
      sheet4.getColumn(8).width = 18;

      const headers4 = ['#', 'عنوان گره', 'اهمیت', 'اولویت', 'بازه زمانی', 'پوشش برنامه‌ای', 'تأثیر رزمی', 'هزینه‌فایده'];
      const headerRow4 = sheet4.addRow(headers4);
      headerRow4.font = { name: 'Vazirmatn', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      headerRow4.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRow4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
      headerRow4.height = 35;

      const allProgramCoverages = await db.select().from(programCoverages);
      const coveragesMap = new Map(allProgramCoverages.map(c => [c.id, c.name]));

      for (const item of researchData) {
        const node = nodes.find(n => n.id === item.nodeId);
        
        let coveragesStr = '-';
        if (item.programCoverages && Array.isArray(item.programCoverages)) {
          coveragesStr = item.programCoverages.map((id: any) => coveragesMap.get(id)).filter(Boolean).join('، ');
        }
        
        sheet4.addRow([
          item.id,
          node?.title || 'نامشخص',
          item.importance === 'راهبردی' ? '🏛️ راهبردی' : item.importance === 'عملیاتی' ? '⚙️ عملیاتی' : '🎯 تاکتیکی',
          item.priority === 'critical' ? '🔥 بحرانی' : item.priority === 'high' ? '⬆️ بالا' : item.priority === 'medium' ? '➖ متوسط' : '⬇️ پایین',
          item.timeFrame === 'کوتاه‌مدت' ? '⏱️ کوتاه‌مدت' : item.timeFrame === 'میان‌مدت' ? '⏳ میان‌مدت' : '🗓️ بلندمدت',
          coveragesStr,
          item.combatImpact || 0,
          item.costBenefit || 0,
        ]);
      }
    }

    // ========== شیت ۵: مسائل ==========
    if (issuesData.length > 0) {
      const sheet5 = workbook.addWorksheet('مسائل', {
        views: [{ rightToLeft: true }],
      });


      const headers5 = [
        '#', 'عنوان', 'راستای راه‌حل', 'یگان متولی', 'سطح محرمانگی', 'اولویت اقدام',
        'تاریخ تصویب', 'نوع دانش', 'سطح کلان پروژه', 'مرجع تصویب', 'نوع پروژه پژوهشی',
        'نوع پروژه دانشی', 'رویدادها', 'کلان پروژه (پویا)', 'دیپلماسی علمی', 'همکاران',
        'شبکه همکاران (پویا)', 'سند بالادستی', 'بودجه مورد نیاز', 'بودجه مصوب', 'بودجه تخصیص یافته',
        'زمان مورد انتظار (ماه)', 'درصد پیشرفت', 'اقدامات انجام شده', 'گلوگاه‌ها', 'دستورات',
        'تیم حل مسئله', 'بیان مسئله', 'اطلاعات قرارداد', 'مقطع ۲۰ درصد', 'مقطع ۵۰ درصد',
        'مقطع ۱۰۰ درصد', 'کاربست', 'وضعیت'
      ];
      sheet5.columns = headers5.map(h => ({ header: h, width: 20 }));

      const headerRow5 = sheet5.addRow(headers5);
      headerRow5.font = { name: 'Vazirmatn', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      headerRow5.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRow5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B5CF6' } };
      headerRow5.height = 35;

      const parseJsonObj = (obj: any) => {
        if (!obj) return null;
        if (typeof obj === 'string') {
          try { return JSON.parse(obj); } catch { return null; }
        }
        return obj;
      };

      for (const issue of issuesData) {
        const mp = parseJsonObj(issue.macroProject);
        const cn = parseJsonObj(issue.collaborationNetwork);
        const team = parseJsonObj(issue.issueResolutionTeam);
        const ns = parseJsonObj(issue.needStatement);
        const ctr = parseJsonObj(issue.contract);
        const s20 = parseJsonObj(issue.stage20);
        const s50 = parseJsonObj(issue.stage50);
        const s100 = parseJsonObj(issue.stage100);
        const app = parseJsonObj(issue.application);

        sheet5.addRow([
          issue.id,
          issue.title || '',
          issue.solutionDirection || '',
          issue.responsibleUnit || '',
          issue.confidentialityLevel || '',
          issue.actionPriority || '',
          issue.approvalDate || '',
          issue.knowledgeType || '',
          issue.projectLevel || '',
          issue.approvalAuthority || '',
          issue.researchProjectType || '',
          issue.knowledgeProjectType || '',
          issue.events || '',
          mp ? `عنوان: ${mp.title || '-'} | مدیر: ${mp.manager || '-'} | توضیحات: ${mp.description || mp.text || '-'}` : '',
          issue.scientificDiplomacy || '',
          issue.collaborators || '',
          cn ? `داخلی: ${cn.internal || '-'} | خارجی: ${cn.external || '-'} | توضیحات: ${cn.description || cn.text || '-'}` : '',
          issue.referenceDocument || '',
          new Intl.NumberFormat('fa-IR').format(issue.requiredBudget || 0),
          new Intl.NumberFormat('fa-IR').format(issue.approvedBudget || 0),
          new Intl.NumberFormat('fa-IR').format(issue.assignedBudget || 0),
          issue.expectedMonths || 0,
          `${issue.completionPercent || 0}%`,
          issue.actionsTaken || '',
          issue.bottlenecks || '',
          issue.orders || '',
          Array.isArray(team) ? team.map((m: any) => `${m.name} (${m.rank})`).join('، ') : '',
          ns ? `کاربر: ${ns.user || '-'} | مسئله: ${ns.problem || '-'} | فایل: ${ns.file?.name || 'ندارد'}` : '',
          ctr ? `شماره: ${ctr.number || '-'} | مجری: ${ctr.executor || '-'} | فایل: ${ctr.file?.name || 'ندارد'}` : '',
          s20 ? `دفاع: ${s20.defenseDate || '-'} | مبلغ: ${s20.paidAmount || 0} | فایل: ${s20.file?.name || 'ندارد'}` : '',
          s50 ? `دفاع: ${s50.defenseDate || '-'} | مبلغ: ${s50.paidAmount || 0} | فایل: ${s50.file?.name || 'ندارد'}` : '',
          s100 ? `دفاع: ${s100.defenseDate || '-'} | مبلغ: ${s100.paidAmount || 0} | فایل: ${s100.file?.name || 'ندارد'}` : '',
          app ? `بازتاب: ${app.resultReflection || '-'} | نوع: ${app.applicationType || '-'}` : '',
          issue.status === 'pending' ? '⏳ در انتظار' :
          issue.status === 'in_progress' ? '🔄 در حال اجرا' :
          issue.status === 'completed' ? '✅ تکمیل شده' :
          issue.status === 'canceled' ? '❌ لغو شده' : '⏸️ متوقف',
        ]);
      }
    }

    // ========== شیت ۶: دارایی‌ها ==========
    if (assets.length > 0) {
      const sheet6 = workbook.addWorksheet('دارایی‌ها', {
        views: [{ rightToLeft: true }],
      });
      sheet6.getColumn(1).width = 10;
      sheet6.getColumn(2).width = 30;
      sheet6.getColumn(3).width = 30;
      sheet6.getColumn(4).width = 25;
      sheet6.getColumn(5).width = 20;

      const headers6 = ['#', 'عنوان دارایی', 'گره مرتبط', 'قالب', 'فایل'];
      const headerRow6 = sheet6.addRow(headers6);
      headerRow6.font = { name: 'Vazirmatn', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      headerRow6.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRow6.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
      headerRow6.height = 35;

      for (const asset of assets) {
        const node = nodes.find(n => n.id === asset.nodeId);
        const template = allTemplates.find(t => t.id === asset.templateId);
        sheet6.addRow([
          asset.id,
          asset.title,
          node?.title || 'نامشخص',
          template ? `${template.type} - ${template.title}` : 'بدون قالب',
          asset.filePath ? '📄 دارد' : '❌ ندارد',
        ]);
      }
    }

    logAudit({
      userId,
      entityName: 'گزارش کامل',
      entityId: treeIdNum,
      action: 'EXPORT', changes: { format: 'excel' },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const filename = `گزارش_کامل_${tree.name}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting full report:', error);
    res.status(500).json({ error: 'خطا در خروجی گزارش کامل' });
  }
});


// ========== خروجی اکسل گپ‌ها ==========
outputRoutes.get('/gaps/:treeId/excel', async (req, res) => {
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

    // گرفتن تمام گره‌های این درختواره
    const nodes = await db.select().from(treeNodes).where(eq(treeNodes.treeId, treeIdNum));
    const nodeIds = nodes.map(n => n.id);

    // گرفتن گپ‌های مربوط به این گره‌ها
    let gapsData: any[] = [];
    if (nodeIds.length > 0) {
      gapsData = await db.select().from(gaps).where(inArray(gaps.requiredNodeId, nodeIds));
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('تحلیل شکاف', {
      views: [{ rightToLeft: true }],
    });

    sheet.getColumn(1).width = 10; // Gap ID (Hidden but necessary)
    sheet.getColumn(2).width = 15; // Node ID (Hidden but necessary)
    sheet.getColumn(3).width = 30; // Node Title
    sheet.getColumn(4).width = 40; // Description
    sheet.getColumn(5).width = 15; // Status
    sheet.getColumn(6).width = 15; // Priority
    sheet.getColumn(7).width = 20; // Last Update
    sheet.getColumn(8).width = 20; // Gap Type
    sheet.getColumn(9).width = 15; // Match Score
    
    // مخفی کردن ستون‌های آیدی برای جلوگیری از تغییر دستی
    sheet.getColumn(1).hidden = true;
    sheet.getColumn(2).hidden = true;

    const headers = ['شناسه گپ', 'شناسه گره', 'عنوان گره مورد نیاز', 'توضیحات (راهکار)', 'وضعیت', 'اولویت', 'تاریخ آخرین بروزرسانی', 'نوع تطابق', 'امتیاز تطابق'];
    const headerRow = sheet.addRow(headers);
    headerRow.font = { name: 'Vazirmatn', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } }; // Red-500
    headerRow.height = 35;

    for (const gap of gapsData) {
      const node = nodes.find(n => n.id === gap.requiredNodeId);
      sheet.addRow([
        gap.id,
        gap.requiredNodeId,
        node?.title || 'نامشخص',
        gap.description || '',
        gap.status === 'filled' ? 'پر شده' : gap.status === 'partially_filled' ? 'نیمه‌پر' : 'باز (گپ)',
        gap.priority === 'critical' ? 'بحرانی' : gap.priority === 'high' ? 'بالا' : gap.priority === 'medium' ? 'متوسط' : 'پایین',
        gap.updatedAt || gap.createdAt || '',
        gap.gapType === 'fuzzy' ? 'تطابق فازی' : gap.gapType === 'partial' ? 'تطابق جزئی' : gap.gapType === 'complete' ? 'کامل' : '-',
        (gap.matchScore || 0) * 100
      ]);
    }

    logAudit({
      userId,
      entityName: 'تحلیل شکاف',
      entityId: treeIdNum,
      action: 'EXPORT', changes: { format: 'excel' },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const filename = `گپ‌های_درختواره_${tree.name}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting gaps excel:', error);
    res.status(500).json({ error: 'خطا در خروجی اکسل گپ‌ها' });
  }
});

// ========== ایمپورت اکسل گپ‌ها ==========
import { fileTypeFromBuffer } from 'file-type';
import multer from 'multer';
const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`نوع فایل ${file.mimetype} مجاز نیست. فقط فایل‌های اکسل و CSV.`));
    }
  }
});

outputRoutes.post('/gaps/:treeId/excel-import', upload.single('file'), async (req, res) => {
  try {
    const { treeId } = req.params;
    const treeIdNum = parseInt(treeId);
    const userId = (req as AuthRequest).user?.id || null;

    if (!req.file) {
      return res.status(400).json({ error: 'فایلی ارسال نشده است' });
    }

    const isTextFile = ['text/csv'].includes(req.file.mimetype);
    if (!isTextFile) {
      const allowed = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      const meta = await fileTypeFromBuffer(req.file.buffer);
      if (!meta || !allowed.includes(meta.mime)) {
        return res.status(400).json({ error: 'محتوای فایل نامعتبر است (MIME Spoofing detected)' });
      }
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return res.status(400).json({ error: 'فایل اکسل نامعتبر است (شیت یافت نشد)' });
    }

    let updatedCount = 0;
    const now = new Date().toISOString();

    
    const promises: any[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const gapId = row.getCell(1).value;
      const desc = row.getCell(4).value;
      const statusText = row.getCell(5).value;
      const priorityText = row.getCell(6).value;

      if (!gapId) return;

      let parsedStatus = 'open';
      if (statusText === 'پر شده') parsedStatus = 'filled';
      else if (statusText === 'نیمه‌پر') parsedStatus = 'partially_filled';

      let parsedPriority = 'medium';
      if (priorityText === 'بحرانی') parsedPriority = 'critical';
      else if (priorityText === 'بالا') parsedPriority = 'high';
      else if (priorityText === 'پایین') parsedPriority = 'low';

      promises.push((async () => {
        const reqNodeIdStr = row.getCell(2).value?.toString();
        if (reqNodeIdStr) {
          const nodeIdNum = parseInt(reqNodeIdStr);
          
          // اعتبارسنجی: بررسی اینکه آیا گره مورد نظر متعلق به همین درختواره است یا خیر
          const node = await db.query.treeNodes.findFirst({
            where: and(eq(treeNodes.id, nodeIdNum), eq(treeNodes.treeId, treeIdNum))
          });

          if (node) {
            // به‌روزرسانی در دیتابیس
            await db.update(gaps).set({
              description: desc ? String(desc) : '',
              status: parsedStatus,
              priority: parsedPriority,
              updatedAt: now
            }).where(eq(gaps.id, parseInt(gapId.toString())));

            await db.update(treeNodes).set({
               isGap: parsedStatus === 'filled' ? 0 : 1,
               gapStatus: parsedStatus,
               updatedAt: now
            }).where(eq(treeNodes.id, nodeIdNum));
            
            updatedCount++;
          }
        }
      })());
    });
    await Promise.all(promises);


    logAudit({
      userId,
      entityName: 'تحلیل شکاف',
      entityId: treeIdNum,
      action: 'IMPORT', changes: { format: 'excel', updatedCount },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, updatedCount, message: `تعداد ${updatedCount} گپ با موفقیت بروزرسانی شد.` });
  } catch (error) {
    console.error('Error importing gaps excel:', error);
    res.status(500).json({ error: 'خطا در خواندن فایل اکسل گپ‌ها' });
  }
});

// ============================================
// 📥 خروجی جامع اکسل نظام مسائل و بودجه
// ============================================
outputRoutes.get('/issues/excel', async (req, res) => {
  try {
    const { periodId, category, status, priority, search, unitId, responsibleUnit } = req.query;
    const userId = (req as AuthRequest).user?.id || null;

    // بازیابی تمام مسائل بر اساس فیلترها
    let allIssues = await db.select().from(issues);

    if (periodId && periodId !== 'all') {
      const pId = parseInt(periodId as string);
      allIssues = allIssues.filter(i => i.periodId === pId);
    }
    if (status && status !== 'all') {
      allIssues = allIssues.filter(i => i.status === status);
    }
    if (priority && priority !== 'all') {
      allIssues = allIssues.filter(i => i.actionPriority === priority);
    }
    if (category && category !== 'all') {
      const cat = String(category).trim().toLowerCase();
      allIssues = allIssues.filter(i => 
        (i.knowledgeType && i.knowledgeType.toLowerCase().includes(cat)) ||
        (i.researchProjectType && i.researchProjectType.toLowerCase().includes(cat)) ||
        (i.knowledgeProjectType && i.knowledgeProjectType.toLowerCase().includes(cat))
      );
    }
    if (responsibleUnit) {
      allIssues = allIssues.filter(i => i.responsibleUnit === responsibleUnit);
    }
    if (search) {
      const s = String(search).trim().toLowerCase();
      allIssues = allIssues.filter(i => 
        (i.title && i.title.toLowerCase().includes(s)) ||
        (i.solutionDirection && i.solutionDirection.toLowerCase().includes(s)) ||
        (i.responsibleUnit && i.responsibleUnit.toLowerCase().includes(s))
      );
    }

    // بازیابی اطلاعات تکمیلی: دوره‌ها و گره‌ها
    const allPeriods = await db.select().from(periods);
    const periodsMap = new Map(allPeriods.map(p => [p.id, p.name]));

    const nodeIds = allIssues.map(i => i.domainNodeId).filter(Boolean) as number[];
    let nodeMap = new Map<number, string>();
    if (nodeIds.length > 0) {
      const nodes = await db.select({ id: treeNodes.id, title: treeNodes.title })
        .from(treeNodes)
        .where(inArray(treeNodes.id, nodeIds));
      nodeMap = new Map(nodes.map(n => [n.id, n.title]));
    }

    // ایجاد کتاب کار اکسل
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'سیستم مدیریت دانش (DANA)';
    workbook.created = new Date();

    // ===============================
    // شیت ۱: فهرست جامع مسائل و بودجه
    // ===============================
    const sheet1 = workbook.addWorksheet('فهرست جامع مسائل', {
      views: [{ rightToLeft: true, showGridLines: true }],
    });

    // استایل‌های فونت و حاشیه
    const FONT_NAME = 'Vazirmatn';
    const borderStyle: any = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };

    // سرستون‌های گزارش
    sheet1.columns = [
      { header: 'ردیف', key: 'rowNum', width: 8 },
      { header: 'شناسه', key: 'id', width: 10 },
      { header: 'عنوان مسئله', key: 'title', width: 35 },
      { header: 'یگان متولی / مسئول', key: 'responsibleUnit', width: 22 },
      { header: 'حوزه دانشی', key: 'domain', width: 24 },
      { header: 'دوره زمانی', key: 'periodName', width: 16 },
      { header: 'سطح پروژه', key: 'projectLevel', width: 14 },
      { header: 'نوع دانش', key: 'knowledgeType', width: 16 },
      { header: 'نوع پروژه پژوهشی', key: 'researchProjectType', width: 18 },
      { header: 'وضعیت', key: 'statusLabel', width: 15 },
      { header: 'اولویت اقدام', key: 'actionPriority', width: 14 },
      { header: 'بودجه مورد نیاز (ریال)', key: 'requiredBudget', width: 22 },
      { header: 'بودجه مصوب (ریال)', key: 'approvedBudget', width: 22 },
      { header: 'بودجه واگذار شده (ریال)', key: 'assignedBudget', width: 22 },
      { header: 'مانده بودجه (ریال)', key: 'remainingBudget', width: 22 },
      { header: 'پیشرفت (%)', key: 'completionPercent', width: 14 },
      { header: 'مدت (ماه)', key: 'expectedMonths', width: 12 },
      { header: 'مرجع تصویب', key: 'approvalAuthority', width: 18 },
      { header: 'تاریخ تصویب', key: 'approvalDate', width: 15 },
      { header: 'جهت‌گیری راه‌کار', key: 'solutionDirection', width: 35 },
    ];

    // استایل هدر
    const headerRow = sheet1.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' }, // سرمه‌ای رسمی
      };
      cell.font = { name: FONT_NAME, bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = borderStyle;
    });

    const statusMap: Record<string, string> = {
      pending: 'در انتظار بررسی',
      in_progress: 'در حال اجرا',
      completed: 'تکمیل شده',
      on_hold: 'متوقف شده',
      canceled: 'لغو شده',
    };

    let totalReq = 0;
    let totalApp = 0;
    let totalAss = 0;

    allIssues.forEach((issue, idx) => {
      const reqB = Number(issue.requiredBudget || 0);
      const appB = Number(issue.approvedBudget || 0);
      const assB = Number(issue.assignedBudget || 0);
      const remB = appB > 0 ? (appB - assB) : (reqB - assB);

      totalReq += reqB;
      totalApp += appB;
      totalAss += assB;

      const row = sheet1.addRow({
        rowNum: idx + 1,
        id: issue.id,
        title: issue.title,
        responsibleUnit: issue.responsibleUnit || '-',
        domain: (issue.domainNodeId ? nodeMap.get(issue.domainNodeId) : null) || '-',
        periodName: (issue.periodId ? periodsMap.get(issue.periodId) : null) || 'عمومی',
        projectLevel: issue.projectLevel || '-',
        knowledgeType: issue.knowledgeType || '-',
        researchProjectType: issue.researchProjectType || '-',
        statusLabel: statusMap[issue.status || 'pending'] || issue.status,
        actionPriority: issue.actionPriority || 'متوسط',
        requiredBudget: reqB,
        approvedBudget: appB,
        assignedBudget: assB,
        remainingBudget: remB,
        completionPercent: issue.completionPercent || 0,
        expectedMonths: issue.expectedMonths || 0,
        approvalAuthority: issue.approvalAuthority || '-',
        approvalDate: issue.approvalDate || '-',
        solutionDirection: issue.solutionDirection || '-',
      });

      row.height = 24;
      const isEven = idx % 2 === 0;
      row.eachCell((cell, colNum) => {
        cell.font = { name: FONT_NAME, size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: colNum >= 12 && colNum <= 17 ? 'center' : 'right' };
        cell.border = borderStyle;
        if (isEven) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' },
          };
        }
        // فرمت اعداد بودجه با جداکننده هزارگان
        if (colNum >= 12 && colNum <= 15) {
          cell.numFmt = '#,##0';
        }
        if (colNum === 16) {
          cell.numFmt = '0"%"';
        }
      });
    });

    // ردیف جمع کل (Summary Row)
    const summaryRow = sheet1.addRow({
      rowNum: 'مجموع',
      id: '',
      title: `تعداد کل مسائل: ${allIssues.length}`,
      responsibleUnit: '',
      domain: '',
      periodName: '',
      projectLevel: '',
      knowledgeType: '',
      researchProjectType: '',
      statusLabel: '',
      actionPriority: '',
      requiredBudget: totalReq,
      approvedBudget: totalApp,
      assignedBudget: totalAss,
      remainingBudget: (totalApp > 0 ? totalApp : totalReq) - totalAss,
      completionPercent: allIssues.length > 0 ? Math.round(allIssues.reduce((a, b) => a + (b.completionPercent || 0), 0) / allIssues.length) : 0,
      expectedMonths: '',
      approvalAuthority: '',
      approvalDate: '',
      solutionDirection: '',
    });
    summaryRow.height = 28;
    summaryRow.eachCell((cell, colNum) => {
      cell.font = { name: FONT_NAME, bold: true, size: 11, color: { argb: 'FF1E293B' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' },
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF475569' } },
        bottom: { style: 'double', color: { argb: 'FF475569' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if (colNum >= 12 && colNum <= 15) {
        cell.numFmt = '#,##0';
      }
      if (colNum === 16) {
        cell.numFmt = '0"%"';
      }
    });

    // ===============================
    // شیت ۲: خلاصه وضعیت و بودجه
    // ===============================
    const sheet2 = workbook.addWorksheet('خلاصه آمار و بودجه', {
      views: [{ rightToLeft: true, showGridLines: true }],
    });
    sheet2.columns = [
      { header: 'شاخص', key: 'metric', width: 28 },
      { header: 'مقدار / تعداد', key: 'count', width: 18 },
      { header: 'مجموع بودجه مصوب (ریال)', key: 'budget', width: 26 },
      { header: 'توضیحات', key: 'note', width: 30 },
    ];
    const s2Header = sheet2.getRow(1);
    s2Header.height = 28;
    s2Header.eachCell(c => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
      c.font = { name: FONT_NAME, bold: true, color: { argb: 'FFFFFFFF' } };
      c.alignment = { vertical: 'middle', horizontal: 'center' };
      c.border = borderStyle;
    });

    // آمار وضعیت‌ها
    Object.entries(statusMap).forEach(([k, label]) => {
      const items = allIssues.filter(i => (i.status || 'pending') === k);
      const bSum = items.reduce((sum, i) => sum + Number(i.approvedBudget || i.requiredBudget || 0), 0);
      const r = sheet2.addRow({
        metric: `وضعیت: ${label}`,
        count: items.length,
        budget: bSum,
        note: `${Math.round((items.length / (allIssues.length || 1)) * 100)}% کل مسائل`,
      });
      r.getCell(2).numFmt = '#,##0';
      r.getCell(3).numFmt = '#,##0';
      r.eachCell(c => {
        c.font = { name: FONT_NAME, size: 10 };
        c.border = borderStyle;
      });
    });

    // آمار مالی کل
    const rSep = sheet2.addRow({ metric: '--- جمع کل شاخص‌های مالی ---', count: '', budget: '', note: '' });
    rSep.eachCell(c => { c.font = { bold: true }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; });

    const rTotReq = sheet2.addRow({ metric: 'مجموع بودجه مورد نیاز', count: `${allIssues.length} مسئله`, budget: totalReq, note: 'محاسبه خودکار کل بودجه درخواستی' });
    rTotReq.getCell(3).numFmt = '#,##0';
    rTotReq.eachCell(c => { c.font = { name: FONT_NAME }; c.border = borderStyle; });

    const rTotApp = sheet2.addRow({ metric: 'مجموع بودجه مصوب', count: `${allIssues.length} مسئله`, budget: totalApp, note: 'کل اعتبارات مصوب' });
    rTotApp.getCell(3).numFmt = '#,##0';
    rTotApp.eachCell(c => { c.font = { name: FONT_NAME }; c.border = borderStyle; });

    const rTotAss = sheet2.addRow({ metric: 'مجموع بودجه واگذار شده', count: `${allIssues.length} مسئله`, budget: totalAss, note: 'اعتبارات تخصیص یافته' });
    rTotAss.getCell(3).numFmt = '#,##0';
    rTotAss.eachCell(c => { c.font = { name: FONT_NAME }; c.border = borderStyle; });

    // ثبت لاگ
    logAudit({
      userId,
      entityName: 'نظام مسائل',
      entityId: 0,
      action: 'EXPORT',
      changes: { format: 'excel', count: allIssues.length },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const filename = `گزارش_جامع_نظام_مسائل_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting issues excel:', error);
    res.status(500).json({ error: 'خطا در صدور خروجی اکسل نظام مسائل' });
  }
});

export default outputRoutes;