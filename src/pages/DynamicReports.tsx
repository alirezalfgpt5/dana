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
      const res = await api.get('/reports/data');
      setData(res.data);
    } catch (error) {
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

    if (exportData.length === 0) return toast.error('داده‌ای برای خروجی وجود ندارد');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('گزارش');
    
    // Add Headers
    const headers = Object.keys(exportData[0]);
    worksheet.addRow(headers);
    
    // Add Data
    exportData.forEach(item => {
      worksheet.addRow(Object.values(item));
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `گزارش_${dataSource}.xlsx`);
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
          <h1 className="text-2xl font-bold text-gray-900">گزارش‌ساز پویا</h1>
          <p className="mt-1 text-sm text-gray-500">
            ساخت نمودارها و گزارش‌های سفارشی بر اساس داده‌های سیستم
          </p>
        </div>
        <button
          onClick={exportToExcel}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Download className="w-4 h-4 ml-2" />
          خروجی اکسل داده‌های خام
        </button>
      </div>

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
                  <option value="actionPriority">اولویت اقدام</option>
                  <option value="knowledgeType">نوع دانش</option>
                </>
              )}
              {dataSource === 'gaps' && (
                <>
                  <option value="status">وضعیت شکاف</option>
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
