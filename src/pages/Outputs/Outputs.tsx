// src/pages/Outputs/Outputs.tsx
// صفحه مدیریت خروجی‌ها - نسخه ۳.۰

import { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, Download, Eye, 
  RefreshCw, Calendar, X,
  FileText, BarChart3, GitBranch,
  Target, Database, Settings,
  HelpCircle,
  Maximize,
  Minimize
} from 'lucide-react';
import { useTree } from '../../hooks/useTree';
import { useOutputs } from '../../hooks/useOutputs';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import DatePicker from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import ExcelIcon from '../../components/icon/ExcelIcon';

import transition from 'react-element-popper/animations/transition';
import toast from 'react-hot-toast';
import { TreeGraphView } from '../Trees/components/TreeGraphView';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';


type OutputType = 'tree' | 'gaps' | 'research' | 'issues' | 'full-report';

export function Outputs() {
  const { trees, fetchTrees, exportTree } = useTree();
  const { exportExcel, getGraphData, loading, graphData } = useOutputs();
  const [fullscreenChart, setFullscreenChart] = useState<string | null>(null);

  const handleFullscreenToggle = (chartId: string) => {
    if (fullscreenChart === chartId) {
      setFullscreenChart(null);
    } else {
      setFullscreenChart(chartId);
    }
  };

  const [selectedTreeId, setSelectedTreeId] = useState<number | null>(null);
  const [outputType, setOutputType] = useState<OutputType>('tree');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [includeTemplates, setIncludeTemplates] = useState(true);
  const [includeLevels, setIncludeLevels] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(false);
  const [fromDate, setFromDate] = useState<any>(null);
  const [toDate, setToDate] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [periods, setPeriods] = useState<any[]>([]);

  useEffect(() => {
    fetchTrees();
   (window.customFetch || window.fetch)('/api/periods')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPeriods(data);
        }
      })
      .catch(err => console.error('Error fetching periods:', err));
  }, []);

  const handleExport = async () => {
    if (!selectedTreeId) {
      toast.error('❌ لطفاً یک درختواره انتخاب کنید');
      return;
    }

    setIsExporting(true);

    try {
      const options = {
        includeTemplates,
        includeLevels,
        includeMetadata,
        periodId: selectedPeriodId || undefined,
        fromDate: fromDate?.toDate?.()?.toISOString(),
        toDate: toDate?.toDate?.()?.toISOString(),
      };

      if (outputType === 'tree') {
        await exportTree(selectedTreeId);
      } else {
        await exportExcel(outputType, selectedTreeId, options);
      }

      toast.success('📥 فایل با موفقیت دانلود شد');
    } catch (error: any) {
      toast.error(error.message || '❌ خطا در خروجی اکسل');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedTreeId) {
      toast.error('❌ لطفاً یک درختواره انتخاب کنید');
      return;
    }

    await getGraphData(selectedTreeId);
    setShowPreview(true);
    toast.success('📊 پیش‌نمایش گراف بارگذاری شد');
  };

  // گزینه‌های درختواره
  const treeOptions = trees.map(t => ({
    value: String(t.id),
    label: `${t.name} (${t.type === 'required' ? 'مورد نیاز' : t.type === 'produced' ? 'تولیدشده' : 'پژوهشی'})`,
  }));

  const outputTypeOptions = [
    { value: 'tree', label: '🌳 درختواره', icon: GitBranch, desc: 'خروجی کامل ساختار درختی' },
    { value: 'gaps', label: '🎯 شکاف‌ها', icon: Target, desc: 'لیست گپ‌های شناسایی شده' },
    { value: 'research', label: '🔬 پژوهش', icon: Database, desc: 'خروجی درختواره پژوهشی' },
    { value: 'issues', label: '🎯 مسائل', icon: FileText, desc: 'خروجی کامل نظام مسائل' },
    { value: 'full-report', label: '📊 گزارش کامل', icon: BarChart3, desc: 'همه بخش‌ها در یک فایل' },
  ];

  const getOutputTypeLabel = (type: OutputType) => {
    return outputTypeOptions.find(o => o.value === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg shadow-blue-200/50">
              <FileSpreadsheet size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">📊 خروجی‌ها</h1>
              <div className="flex items-center gap-3 mt-0.5">
                <p className="text-gray-500 text-sm">استخراج اکسل و نمایش گراف درختواره‌ها</p>
                <button 
                  onClick={() => setShowHelp(!showHelp)}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <HelpCircle size={14} />
                  راهنما
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePreview}
            disabled={!selectedTreeId || loading}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              !selectedTreeId || loading
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200/50'
            }`}
          >
            <Eye size={18} />
            پیش‌نمایش
          </button>
          <button
            onClick={handleExport}
            disabled={!selectedTreeId || isExporting}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              !selectedTreeId || isExporting
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg shadow-blue-200/50'
            }`}
          >
            {isExporting ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <Download size={18} />
            )}
            {isExporting ? '⏳ در حال ایجاد...' : <ExcelIcon  color="#ffff" />}
            
          </button>
        </div>
      </div>

      {/* راهنما */}
      {showHelp && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <span>انتخاب نوع خروجی</span>
            </div>
            <div className="w-px h-6 bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="text-lg">📅</span>
              <span>فیلتر بر اساس دوره و تاریخ</span>
            </div>
            <div className="w-px h-6 bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="text-lg">👁️</span>
              <span>پیش‌نمایش گراف قبل از دانلود</span>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* انتخاب درختواره */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              🌳 درختواره <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={treeOptions}
              value={selectedTreeId ? String(selectedTreeId) : ''}
              onChange={(val) => setSelectedTreeId(val ? parseInt(val as string) : null)}
              placeholder="انتخاب درختواره..."
            />
          </div>

          {/* نوع خروجی */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              📊 نوع خروجی
            </label>
            <select
              value={outputType}
              onChange={e => setOutputType(e.target.value as OutputType)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-sm"
            >
              {outputTypeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} - {opt.desc}
                </option>
              ))}
            </select>
          </div>

          {/* دوره زمانی */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              📅 دوره زمانی (اختیاری)
            </label>
            <SearchableSelect
              options={periods.map(p => ({
                value: String(p.id),
                label: p.name,
              }))}
              value={selectedPeriodId}
              onChange={(val) => setSelectedPeriodId(val ? String(val) : '')}
              placeholder="همه دوره‌ها"
            />
          </div>

          {/* تاریخ از */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              📅 تاریخ از
            </label>
            <div className="relative">
              <DatePicker
                value={fromDate}
                onChange={(date: any) => setFromDate(date)}
                calendar={persian}
                locale={persian_fa}
                animations={[transition()]}
                format="YYYY/MM/DD"
                inputClass="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-right font-sans text-sm pr-10"
                containerClassName="w-full"
                placeholder="از تاریخ..."
              />
              <Calendar size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              {fromDate && (
                <button
                  onClick={() => setFromDate(null)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* تاریخ تا */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              📅 تاریخ تا
            </label>
            <div className="relative">
              <DatePicker
                value={toDate}
                onChange={(date: any) => setToDate(date)}
                calendar={persian}
                locale={persian_fa}
                animations={[transition()]}
                format="YYYY/MM/DD"
                inputClass="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-right font-sans text-sm pr-10"
                containerClassName="w-full"
                placeholder="تا تاریخ..."
              />
              <Calendar size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              {toDate && (
                <button
                  onClick={() => setToDate(null)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* گزینه‌های خروجی */}
          <div className="flex flex-col gap-2 pt-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              ⚙️ گزینه‌های خروجی
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTemplates}
                onChange={e => setIncludeTemplates(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              📋 شامل قالب‌ها
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={includeLevels}
                onChange={e => setIncludeLevels(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              📊 شامل سطوح
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={e => setIncludeMetadata(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              📄 شامل تعاریف
            </label>
          </div>
        </div>

        {/* خلاصه انتخاب */}
        {selectedTreeId && (
          <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200 text-sm text-blue-700">
            <span className="font-bold">📋 خلاصه:</span>
            {' '}
            درختواره: {treeOptions.find(t => t.value === String(selectedTreeId))?.label} • 
            خروجی: {getOutputTypeLabel(outputType)} • 
            {includeTemplates && ' شامل قالب‌ها •'}
            {includeLevels && ' شامل سطوح'}
          </div>
        )}
      </div>

      {/* Preview */}
      {showPreview && graphData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
          <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 size={18} className="text-indigo-600" />
              <h3 className="font-bold text-gray-800">👁️ پیش‌نمایش گراف</h3>
              <span className="text-xs text-gray-400">
                {graphData.tree?.name} 
              </span>
            </div>
            <div className="flex items-center gap-2">
              
              <button
                onClick={() => setShowPreview(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
                    <div className="p-6 bg-gray-50/50">
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                    <span className="text-sm text-gray-500 mb-1">کل گره‌ها</span>
                    <span className="text-2xl font-bold text-gray-800">{graphData.stats?.totalNodes || 0}</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                    <span className="text-sm text-gray-500 mb-1">گره‌های برگ (L 🍃)</span>
                    <span className="text-2xl font-bold text-blue-600">{graphData.stats?.leaves || 0}</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                    <span className="text-sm text-gray-500 mb-1"> 🔴 شکاف‌های شناسایی‌شده</span>
                    <span className="text-2xl font-bold text-red-600">{graphData.stats?.gaps || 0}</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                    <span className="text-sm text-gray-500 mb-1">موارد پژوهشی</span>
                    <span className="text-2xl font-bold text-purple-600">{graphData.stats?.researchItems || 0}</span>
                  </div>
                </div>

                
                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Bar Chart: Nodes by Level */}
                  <div id="chart-bar" className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col transition-all ${fullscreenChart === 'bar' ? 'simulated-fullscreen' : 'h-[380px]'}`}>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-bold text-gray-700">توزیع گره‌ها بر اساس سطح</h4>
                      <button onClick={() => handleFullscreenToggle('bar')} className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-gray-100">
                        {fullscreenChart === 'bar' ? <X size={16} /> : <Maximize size={16} />}
                      </button>
                    </div>
                    <div className="flex-1 min-h-0 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart margin={{ top: 20, right: 10, left: -20, bottom: 20 }} data={[
                          { name: 'ریشه (R)', count: graphData.stats?.byLevel?.['R'] || 0, fill: '#3b82f6' },
                          { name: 'تنه (T)', count: graphData.stats?.byLevel?.['T'] || 0, fill: '#8b5cf6' },
                          { name: 'شاخه (B)', count: graphData.stats?.byLevel?.['B'] || 0, fill: '#10b981' },
                          { name: 'زیرشاخه (SB)', count: graphData.stats?.byLevel?.['SB'] || 0, fill: '#f59e0b' },
                          { name: 'برگ (L)', count: graphData.stats?.byLevel?.['L'] || 0, fill: '#6366f1' },
                          { name: 'سوال (Q)', count: graphData.stats?.byLevel?.['Q'] || 0, fill: '#ec4899' },
                        ].filter(d => d.count > 0)}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis tickMargin={5} dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-55} textAnchor="end" height={50} dx={-5} />
                          <YAxis tickMargin={15} allowDecimals={false} tick={{ fontSize: 11 }} />
                          <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {
                              [
                                { name: 'ریشه (R)', count: graphData.stats?.byLevel?.['R'] || 0, fill: '#3b82f6' },
                                { name: 'تنه (T)', count: graphData.stats?.byLevel?.['T'] || 0, fill: '#8b5cf6' },
                                { name: 'شاخه (B)', count: graphData.stats?.byLevel?.['B'] || 0, fill: '#10b981' },
                                { name: 'زیرشاخه (SB)', count: graphData.stats?.byLevel?.['SB'] || 0, fill: '#f59e0b' },
                                { name: 'برگ (L)', count: graphData.stats?.byLevel?.['L'] || 0, fill: '#6366f1' },
                                { name: 'سوال (Q)', count: graphData.stats?.byLevel?.['Q'] || 0, fill: '#ec4899' },
                              ].filter(d => d.count > 0).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))
                            }
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Pie Chart: Gaps Status */}
                  <div id="chart-pie-gaps" className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col transition-all ${fullscreenChart === 'pie-gaps' ? 'simulated-fullscreen' : 'h-[380px]'}`}>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-bold text-gray-700">وضعیت شکاف‌ها</h4>
                      <button onClick={() => handleFullscreenToggle('pie-gaps')} className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-gray-100">
                        {fullscreenChart === 'pie-gaps' ? <X size={16} /> : <Maximize size={16} />}
                      </button>
                    </div>
                    <div className="flex-1 min-h-0 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                          <Pie
                            data={[
                              { name: ' دارای گپ', value: graphData.stats?.gaps || 0, color: '#ef4444' },
                              { name: ' بدون گپ', value: (graphData.stats?.totalNodes || 0) - (graphData.stats?.gaps || 0), color: '#22c55e' },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {
                              [
                                { name: 'دارای گپ', value: graphData.stats?.gaps || 0, color: '#ef4444' },
                                { name: 'بدون گپ', value: (graphData.stats?.totalNodes || 0) - (graphData.stats?.gaps || 0), color: '#22c55e' },
                              ].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))
                            }
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Legend iconType="circle" verticalAlign="bottom" height={40} wrapperStyle={{ paddingTop: '20px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Pie Chart: Templates */}
                  <div id="chart-pie-templates" className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col transition-all ${fullscreenChart === 'pie-templates' ? 'simulated-fullscreen' : 'h-[380px]'}`}>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-bold text-gray-700">آمار قالب‌های تخصیص‌یافته</h4>
                      <button onClick={() => handleFullscreenToggle('pie-templates')} className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-gray-100">
                        {fullscreenChart === 'pie-templates' ? <X size={16} /> : <Maximize size={16} />}
                      </button>
                    </div>
                    <div className="flex-1 min-h-0 w-full">
                      {(() => {
                        const nodesWithTemplates = graphData.nodes?.filter(n => n.templateIds && n.templateIds.length > 0).length || 0;
                        const nodesWithoutTemplates = (graphData.stats?.totalNodes || 0) - nodesWithTemplates;
                        return (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                              <Pie
                                data={[
                                  { name: ' دارای قالب', value: nodesWithTemplates, color: '#8b5cf6' },
                                  { name: 'بدون قالب', value: nodesWithoutTemplates, color: '#cbd5e1' },
                                ]}
                                cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value"
                              >
                                <Cell fill="#8b5cf6" />
                                <Cell fill="#cbd5e1" />
                              </Pie>
                              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                              <Legend iconType="circle" verticalAlign="bottom" height={40} wrapperStyle={{ paddingTop: '20px' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* SVG Graph TreeView */}
                <div id="chart-svg" className={`mt-6 border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white flex flex-col transition-all ${fullscreenChart === 'svg' ? 'simulated-fullscreen' : ''}`}>
                  <div className="bg-gray-50 border-b px-4 py-3 flex justify-between items-center">
                    <h4 className="font-bold text-gray-700">نمای گرافیکی درختواره (SVG)</h4>
                    <button onClick={() => handleFullscreenToggle('svg')} className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-gray-200">
                        {fullscreenChart === 'svg' ? <X size={16} /> : <Maximize size={16} />}
                    </button>
                  </div>
                  <div className={`w-full ${fullscreenChart === 'svg' ? 'flex-1' : 'h-[600px]'}`}>
                    <TreeGraphView nodes={graphData.nodes || []} treeName={graphData.tree?.name || ''} showLabels={true} />
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Info */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Settings size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="font-bold text-blue-800 text-sm">📋 راهنمای خروجی‌ها:</p>
            <ul className="mt-1 space-y-0.5 text-sm text-blue-700">
              <li>• <span className="font-medium">🌳 درختواره:</span> خروجی کامل ساختار درختی با تمام گره‌ها</li>
              <li>• <span className="font-medium">🎯 شکاف‌ها:</span> لیست گپ‌های شناسایی شده با وضعیت و اولویت</li>
              <li>• <span className="font-medium">🔬 پژوهش:</span> خروجی درختواره پژوهشی با ستون‌های تحلیلی</li>
              <li>• <span className="font-medium">🎯 مسائل:</span> خروجی کامل نظام مسائل با تمام فیلدها</li>
              <li>• <span className="font-medium">📊 گزارش کامل:</span> همه بخش‌ها در یک فایل با ۶ شیت جداگانه</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Outputs;