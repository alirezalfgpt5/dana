import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const DynamicReports: React.FC = () => {
  const [data, setData] = useState<{ issues: any[]; gaps: any[]; nodes: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'issues' | 'gaps' | 'nodes'>('issues');
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [groupByField, setGroupByField] = useState('status');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/reports/data') as any;
      const responseData = res?.issues ? res : res?.data ? res.data : null;
      setData(responseData);
    } catch (error) {
      console.error('Error fetching reports data:', error);
      toast.error('خطا در دریافت اطلاعات گزارش‌ساز');
    } finally {
      setLoading(false);
    }
  };

  const getChartData = () => {
    if (!data) return [];
    
    let sourceData = [];
    if (dataSource === 'issues') sourceData = data.issues;
    if (dataSource === 'gaps') sourceData = data.gaps;
    if (dataSource === 'nodes') sourceData = data.nodes;

    const grouped = sourceData.reduce((acc: any, item: any) => {
      let key = item[groupByField] || 'نامشخص';
      
      // Map common status values for better readability
      if (key === 'open') key = 'باز';
      if (key === 'in_progress') key = 'در حال بررسی';
      if (key === 'resolved') key = 'حل شده';
      if (key === 'identified') key = 'شناسایی شده';
      if (key === 'low') key = 'پایین';
      if (key === 'medium') key = 'متوسط';
      if (key === 'high') key = 'بالا';
      if (key === 'critical') key = 'بحرانی';
      
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.keys(grouped).map(key => ({
      name: key,
      مقدار: grouped[key]
    }));
  };

  const chartData = getChartData();
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const exportToExcel = async () => {
    if (!data) return;
    
    let exportData = [];
    if (dataSource === 'issues') exportData = data.issues;
    if (dataSource === 'gaps') exportData = data.gaps;
    if (dataSource === 'nodes') exportData = data.nodes;

    if (!exportData || exportData.length === 0) return toast.error('داده‌ای برای خروجی وجود ندارد');

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'سامانه جامع دانا';
    workbook.created = new Date();

    const FONT_NAME = 'Tahoma';
    const borderStyle: any = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };

    // ============================================
    // شیت ۱: داده‌های تجمیعی نمودار (Aggregated Chart Data)
    // ============================================
    const chartSheet = workbook.addWorksheet('تحلیل تجمیعی نمودار', {
      views: [{ rightToLeft: true, showGridLines: true }],
    });

    const dataSourceLabels: Record<string, string> = {
      issues: 'نظام مسائل',
      gaps: 'شکاف‌های دانشی',
      nodes: 'گره‌های دانشی',
    };

    const groupByLabels: Record<string, string> = {
      status: 'وضعیت',
      category: 'دسته‌بندی',
      actionPriority: 'اولویت اقدام',
      knowledgeType: 'نوع دانش',
      projectLevel: 'سطح پروژه',
      priority: 'اولویت شکاف',
      gapType: 'نوع شکاف',
      level: 'نوع گره',
      levelId: 'سطح دانش',
    };

    // هدر مشخصات گزارش نمودار
    const titleRow = chartSheet.addRow([`گزارش تحلیلی و تجمیعی نمودار - سامانه مدیریت دانش دانا`]);
    chartSheet.mergeCells('A1:D1');
    titleRow.height = 32;
    titleRow.font = { name: FONT_NAME, bold: true, size: 13, color: { argb: 'FF1E3A8A' } };
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };

    chartSheet.addRow([
      `منبع داده: ${dataSourceLabels[dataSource] || dataSource}`,
      `شاخص گروه‌بندی: ${groupByLabels[groupByField] || groupByField}`,
      `تعداد کل رکوردها: ${exportData.length}`,
      `تاریخ گزارش: ${new Date().toLocaleDateString('fa-IR')}`
    ]);
    chartSheet.getRow(2).font = { name: FONT_NAME, size: 9, color: { argb: 'FF475569' } };
    chartSheet.getRow(2).alignment = { vertical: 'middle' };
    chartSheet.addRow([]); // Blank row

    chartSheet.columns = [
      { header: 'ردیف', key: 'idx', width: 10 },
      { header: `عنوان شاخص (${groupByLabels[groupByField] || groupByField})`, key: 'category', width: 35 },
      { header: 'تعداد / فراوانی', key: 'count', width: 20 },
      { header: 'درصد از کل (%)', key: 'percentage', width: 20 },
    ];

    const cHeaderRow = chartSheet.getRow(4);
    cHeaderRow.values = ['ردیف', `عنوان شاخص (${groupByLabels[groupByField] || groupByField})`, 'تعداد / فراوانی', 'درصد از کل (%)'];
    cHeaderRow.height = 28;
    cHeaderRow.font = { name: FONT_NAME, bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
    cHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
    cHeaderRow.eachCell(c => c.border = borderStyle);

    const totalCount = chartData.reduce((sum: number, item: any) => sum + Number(item.مقدار || 0), 0);

    chartData.forEach((item: any, idx: number) => {
      const count = Number(item.مقدار || 0);
      const pct = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) + '%' : '۰%';
      const row = chartSheet.addRow({
        idx: idx + 1,
        category: item.name || 'نامشخص',
        count: count,
        percentage: pct,
      });
      row.height = 24;
      row.font = { name: FONT_NAME, size: 10 };
      row.alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('category').alignment = { vertical: 'middle', horizontal: 'right' };
      row.eachCell((cell, colNum) => {
        cell.border = borderStyle;
        if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
        if (colNum === 3) cell.numFmt = '#,##0';
      });
    });

    // ردیف جمع کل
    const chartTotalRow = chartSheet.addRow({
      idx: 'جمع کل',
      category: '-',
      count: totalCount,
      percentage: '۱۰۰%',
    });
    chartTotalRow.height = 26;
    chartTotalRow.font = { name: FONT_NAME, bold: true, size: 10, color: { argb: 'FF1E293B' } };
    chartTotalRow.alignment = { vertical: 'middle', horizontal: 'center' };
    chartTotalRow.eachCell(c => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      c.border = { top: { style: 'medium' }, bottom: { style: 'double' } };
    });

    // ============================================
    // شیت ۲: ریز داده‌ها با ستون‌های استاندارد فارسی
    // ============================================
    if (dataSource === 'issues') {
      const worksheet = workbook.addWorksheet('ریز داده‌های مسائل', {
        views: [{ rightToLeft: true, showGridLines: true }],
      });

      worksheet.columns = [
        { header: 'ردیف', key: 'index', width: 8 },
        { header: 'کد مسئله', key: 'id', width: 12 },
        { header: 'عنوان مسئله', key: 'title', width: 35 },
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
        { header: 'زمان انتظار (ماه)', key: 'expectedMonths', width: 16 },
        { header: 'جهت‌گیری راه‌حل', key: 'solutionDirection', width: 30 },
        { header: 'گلوگاه‌ها و چالش‌ها', key: 'bottlenecks', width: 30 },
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.height = 30;
      headerRow.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' }
      };

      const statusMap: Record<string, string> = {
        pending: 'در انتظار',
        in_progress: 'در حال اجرا',
        completed: 'تکمیل شده',
        canceled: 'لغو شده',
        on_hold: 'متوقف',
      };

      exportData.forEach((issue: any, idx: number) => {
        const row = worksheet.addRow({
          index: idx + 1,
          id: `ISS-${String(issue.id).padStart(4, '0')}`,
          title: issue.title || '-',
          category: issue.category || 'عمومی',
          domain: issue.domain || 'نامشخص',
          status: statusMap[issue.status] || issue.status || 'در انتظار',
          actionPriority: issue.actionPriority || 'متوسط',
          completionPercent: `${issue.completionPercent || 0}%`,
          responsibleUnit: issue.responsibleUnit || '-',
          knowledgeType: issue.knowledgeType || '-',
          projectLevel: issue.projectLevel || '-',
          requiredBudget: Number(issue.requiredBudget || 0).toLocaleString('fa-IR'),
          approvedBudget: Number(issue.approvedBudget || 0).toLocaleString('fa-IR'),
          expectedMonths: issue.expectedMonths || 0,
          solutionDirection: issue.solutionDirection || '-',
          bottlenecks: issue.bottlenecks || '-',
        });

        row.height = 22;
        row.alignment = { vertical: 'middle', horizontal: 'center' };
        row.font = { name: FONT_NAME, size: 9 };
        row.getCell('title').alignment = { vertical: 'middle', horizontal: 'right' };
        row.getCell('solutionDirection').alignment = { vertical: 'middle', horizontal: 'right' };
        row.getCell('bottlenecks').alignment = { vertical: 'middle', horizontal: 'right' };

        const statusCell = row.getCell('status');
        if (issue.status === 'completed') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
          statusCell.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: 'FF166534' } };
        } else if (issue.status === 'in_progress') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
          statusCell.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: 'FF1E40AF' } };
        }

        row.eachCell((cell) => {
          cell.border = borderStyle;
        });

        if (idx % 2 === 1) {
          row.eachCell((cell, colNumber) => {
            if (colNumber !== 6) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            }
          });
        }
      });
    } else if (dataSource === 'gaps') {
      const worksheet = workbook.addWorksheet('ریز داده‌های شکاف‌ها', {
        views: [{ rightToLeft: true, showGridLines: true }],
      });

      worksheet.columns = [
        { header: 'ردیف', key: 'index', width: 8 },
        { header: 'شناسه شکاف', key: 'id', width: 14 },
        { header: 'شناسه گره', key: 'requiredNodeId', width: 14 },
        { header: 'نوع شکاف', key: 'gapType', width: 18 },
        { header: 'وضعیت', key: 'status', width: 16 },
        { header: 'اولویت', key: 'priority', width: 14 },
        { header: 'امتیاز تطابق', key: 'matchScore', width: 14 },
        { header: 'توضیحات / شرح راهکار', key: 'description', width: 35 },
        { header: 'تاریخ ثبت', key: 'createdAt', width: 18 },
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.height = 30;
      headerRow.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };

      const statusMap: Record<string, string> = {
        open: 'باز',
        filled: 'پر شده',
        partially_filled: 'نیمه‌پر',
        resolved: 'رفع شده',
      };
      const priorityMap: Record<string, string> = {
        critical: 'بحرانی',
        high: 'بالا',
        medium: 'متوسط',
        low: 'پایین',
      };

      exportData.forEach((gap: any, idx: number) => {
        const row = worksheet.addRow({
          index: idx + 1,
          id: gap.id ? `GAP-${String(gap.id).padStart(4, '0')}` : '-',
          requiredNodeId: gap.requiredNodeId || '-',
          gapType: gap.gapType || 'عمومی',
          status: statusMap[gap.status] || gap.status || 'باز',
          priority: priorityMap[gap.priority] || gap.priority || 'متوسط',
          matchScore: gap.matchScore ? `${gap.matchScore}%` : '۰%',
          description: gap.description || '-',
          createdAt: gap.createdAt ? new Date(gap.createdAt).toLocaleDateString('fa-IR') : '-',
        });

        row.height = 22;
        row.font = { name: FONT_NAME, size: 9 };
        row.alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('description').alignment = { vertical: 'middle', horizontal: 'right' };

        row.eachCell(c => {
          c.border = borderStyle;
          if (idx % 2 === 1) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        });
      });
    } else {
      const worksheet = workbook.addWorksheet('ریز داده‌های گره‌ها', {
        views: [{ rightToLeft: true, showGridLines: true }],
      });

      worksheet.columns = [
        { header: 'ردیف', key: 'index', width: 8 },
        { header: 'شناسه گره', key: 'id', width: 14 },
        { header: 'عنوان گره دانشی', key: 'title', width: 35 },
        { header: 'سطح / نوع گره', key: 'level', width: 16 },
        { header: 'وضعیت گپ', key: 'gapStatus', width: 16 },
        { header: 'شناسه والد', key: 'parentId', width: 14 },
        { header: 'نوع دانش', key: 'knowledgeType', width: 18 },
        { header: 'توضیحات', key: 'description', width: 35 },
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.height = 30;
      headerRow.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };

      const levelMap: Record<string, string> = {
        L: 'برگ (دارایی دانش)',
        Q: 'کیفیت (شاخه)',
        branch: 'شاخه',
        leaf: 'برگ',
      };
      const gapStatusMap: Record<string, string> = {
        open: '🔴 گپ باز',
        filled: '🟢 پر شده',
        partially_filled: '🟡 نیمه‌پر',
        none: '✅ بدون گپ',
      };

      exportData.forEach((node: any, idx: number) => {
        const row = worksheet.addRow({
          index: idx + 1,
          id: node.id || '-',
          title: node.title || '-',
          level: levelMap[node.level] || node.level || '-',
          gapStatus: gapStatusMap[node.gapStatus] || (node.isGap ? 'دارای گپ' : 'بدون گپ'),
          parentId: node.parentId || 'ریشه',
          knowledgeType: node.knowledgeType || '-',
          description: node.description || '-',
        });

        row.height = 22;
        row.font = { name: FONT_NAME, size: 9 };
        row.alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('title').alignment = { vertical: 'middle', horizontal: 'right' };
        row.getCell('description').alignment = { vertical: 'middle', horizontal: 'right' };

        row.eachCell(c => {
          c.border = borderStyle;
          if (idx % 2 === 1) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        });
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `گزارش_تحلیلی_نمودار_${dataSource}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('خروجی اکسل تحلیلی نمودار و داده‌ها با موفقیت ایجاد شد');
  };

  const renderChart = () => {
    if (chartData.length === 0) return <div className="text-center p-8 text-gray-500">داده‌ای برای نمایش وجود ندارد</div>;

    if (chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
              outerRadius={150}
              fill="#8884d8"
              dataKey="مقدار"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="مقدار" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">گزارش‌ساز پویا و تحلیل وضعیت مسائل</h1>
          <p className="mt-1 text-sm text-gray-500">
            ساخت نمودارها و دریافت خروجی‌های فرمت‌بندی شده اکسل از وضعیت نظام مسائل
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                toast.loading('در حال دریافت خروجی کامل اکسل از سرور...', { id: 'srv-excel' });
                const res = await api.get('/api/reports/issues/excel', { responseType: 'blob' });
                const blob = res instanceof Blob ? res : new Blob([res as any], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                saveAs(blob, `گزارش_رسمی_وضعیت_مسائل_${new Date().toISOString().slice(0,10)}.xlsx`);
                toast.success('گزارش رسمی اکسل دانلود شد', { id: 'srv-excel' });
              } catch (e) {
                toast.error('خطا در دریافت خروجی اکسل', { id: 'srv-excel' });
              }
            }}
            className="flex items-center px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 shadow-xs text-sm font-medium"
          >
            <Download className="w-4 h-4 ml-2" />
            دانلود گزارش رسمی و فرمت‌بندی شده اکسل
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            title="خروجی شامل دو شیت: تحلیل تجمیعی نمودار و ریز رکوردهای تفصیلی"
          >
            <Download className="w-4 h-4 ml-2" />
            خروجی اکسل تحلیلی نمودار و داده‌ها
          </button>
        </div>
      </div>

      {dataSource === 'issues' && data?.issues && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <span className="text-xs text-gray-400">تعداد کل مسائل</span>
            <p className="text-2xl font-bold text-gray-800">{data.issues.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-xl border border-green-200">
            <span className="text-xs text-green-600 font-medium">تکمیل شده</span>
            <p className="text-2xl font-bold text-green-700">{data.issues.filter(i => i.status === 'completed').length}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
            <span className="text-xs text-blue-600 font-medium">در حال اجرا</span>
            <p className="text-2xl font-bold text-blue-700">{data.issues.filter(i => i.status === 'in_progress').length}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
            <span className="text-xs text-yellow-600 font-medium">در انتظار</span>
            <p className="text-2xl font-bold text-yellow-700">{data.issues.filter(i => i.status === 'pending').length}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">منبع داده</label>
            <select
              value={dataSource}
              onChange={(e) => {
                setDataSource(e.target.value as any);
                setGroupByField(e.target.value === 'issues' ? 'status' : e.target.value === 'nodes' ? 'level' : 'status');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="issues">نظام مسائل</option>
              <option value="gaps">شکاف‌ها</option>
              <option value="nodes">گره‌های دانشی</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">گروه‌بندی بر اساس</label>
            <select
              value={groupByField}
              onChange={(e) => setGroupByField(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {dataSource === 'issues' && (
                <>
                  <option value="status">وضعیت</option>
                  <option value="category">دسته‌بندی مسئله</option>
                  <option value="actionPriority">اولویت اقدام</option>
                  <option value="knowledgeType">نوع دانش</option>
                  <option value="projectLevel">سطح پروژه</option>
                </>
              )}
              {dataSource === 'gaps' && (
                <>
                  <option value="status">وضعیت شکاف</option>
                  <option value="priority">اولویت شکاف</option>
                  <option value="gapType">نوع شکاف</option>
                </>
              )}
              {dataSource === 'nodes' && (
                <>
                  <option value="level">نوع گره</option>
                  <option value="levelId">سطح دانش</option>
                </>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">نوع نمودار</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="bar">نمودار ستونی</option>
              <option value="pie">نمودار دایره‌ای</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="mt-8">
            {renderChart()}
          </div>
        )}
      </div>
    </div>
  );
};
