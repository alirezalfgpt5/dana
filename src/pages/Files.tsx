// src/pages/Files.tsx
// مدیریت فایل‌های سیستمی

import React, { useState, useEffect, useMemo } from 'react';
import {
  Folder, File as FileIcon, Download, Trash2, Image, FileText, Archive,
  Search, RefreshCw, HardDrive, FolderOpen, Grid3x3, List,
  FileJson, FileSpreadsheet, FileCode, Music, Video, Package,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Clock, Calendar, Filter, X, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns-jalali';

interface FileItem {
  id: number;
  name: string;
  path: string;
  size: number;
  type: string;
  mimeType: string;
  module: string;
  moduleId: number | null;
  createdAt: string;
  updatedAt: string;
}

export function FilesManagement() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterModule, setFilterModule] = useState<string>('all');
  const [totalSize, setTotalSize] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await(window.customFetch || window.fetch)('/api/files');
      const data = await res.json();
      setFiles(data.files || []);
      setTotalSize(data.totalSize || 0);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('خطا در دریافت لیست فایل‌ها');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`آیا از حذف فایل "${name}" اطمینان دارید؟`)) return;
    try {
      const res = await(window.customFetch || window.fetch)(`/api/files/${name}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('فایل با موفقیت حذف شد');
        fetchFiles();
      } else {
        const error = await res.json();
        toast.error(error.error || 'خطا در حذف فایل');
      }
    } catch (error) {
      toast.error('خطا در اتصال به سرور');
    }
  };

  const handleDownload = (path: string, name: string) => {
    window.open(`/api/files/download/${name}`, '_blank');
  };

  const getFileIcon = (type: string, name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (type === 'image') return <Image size={20} className="text-blue-500" />;
    if (type === 'archive') return <Package size={20} className="text-amber-500" />;
    if (ext === 'pdf') return <FileText size={20} className="text-red-500" />;
    if (['doc', 'docx'].includes(ext || '')) return <FileText size={20} className="text-blue-600" />;
    if (['xls', 'xlsx'].includes(ext || '')) return <FileSpreadsheet size={20} className="text-green-600" />;
    if (['json', 'xml'].includes(ext || '')) return <FileCode size={20} className="text-purple-500" />;
    if (['mp3', 'wav', 'flac'].includes(ext || '')) return <Music size={20} className="text-pink-500" />;
    if (['mp4', 'avi', 'mkv'].includes(ext || '')) return <Video size={20} className="text-orange-500" />;
    return <FileIcon size={20} className="text-gray-400" />;
  };

  const getFileColor = (type: string, name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (type === 'image') return 'border-blue-200 bg-blue-50/30';
    if (type === 'archive') return 'border-amber-200 bg-amber-50/30';
    if (ext === 'pdf') return 'border-red-200 bg-red-50/30';
    if (['doc', 'docx'].includes(ext || '')) return 'border-blue-200 bg-blue-50/30';
    if (['xls', 'xlsx'].includes(ext || '')) return 'border-green-200 bg-green-50/30';
    return 'border-gray-200 bg-gray-50/30';
  };

  const getFileTypeLabel = (type: string, name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (type === 'image') return 'تصویر';
    if (type === 'archive') return 'فشرده';
    if (ext === 'pdf') return 'PDF';
    if (['doc', 'docx'].includes(ext || '')) return 'Word';
    if (['xls', 'xlsx'].includes(ext || '')) return 'Excel';
    if (['json', 'xml'].includes(ext || '')) return 'داده';
    return 'سایر';
  };

  const formatDate = (dateStr: string) => {
    try { return format(new Date(dateStr), 'yyyy/MM/dd HH:mm'); } catch { return dateStr; }
  };

  const modules = ['all', ...new Set(files.map(f => f.module))];

  const sortedFiles = useMemo(() => {
    let filtered = files;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(f => f.name.toLowerCase().includes(term) || f.path.toLowerCase().includes(term));
    }
    if (filterType !== 'all') filtered = filtered.filter(f => f.type === filterType);
    if (filterModule !== 'all') filtered = filtered.filter(f => f.module === filterModule);

    return filtered.sort((a, b) => {
      let compare = 0;
      switch (sortBy) {
        case 'name': compare = a.name.localeCompare(b.name); break;
        case 'size': compare = a.size - b.size; break;
        case 'date': compare = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
      }
      return sortOrder === 'asc' ? compare : -compare;
    });
  }, [files, searchTerm, filterType, filterModule, sortBy, sortOrder]);

  const totalPages = Math.ceil(sortedFiles.length / pageSize);
  const paginatedFiles = sortedFiles.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = {
    total: files.length,
    images: files.filter(f => f.type === 'image').length,
    documents: files.filter(f => f.type === 'document').length,
    archives: files.filter(f => f.type === 'archive').length,
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg shadow-blue-200/50"><FolderOpen size={24} className="text-white" /></div>
            <div><h1 className="text-2xl font-bold text-gray-800">مدیریت فایل‌ها</h1><p className="text-gray-500 text-sm mt-0.5">مدیریت فایل‌های ذخیره شده در سیستم</p></div>
          </div>
        </div>
        <button onClick={fetchFiles} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg shadow-blue-200/50">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> بروزرسانی
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg"><HardDrive size={20} className="text-blue-600" /></div>
          <div><p className="text-xs text-gray-400">کل فایل‌ها</p><p className="text-2xl font-bold text-gray-800">{stats.total}</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-green-200 p-4 flex items-center gap-4">
          <div className="p-3 bg-green-50 rounded-lg"><FolderOpen size={20} className="text-green-600" /></div>
          <div><p className="text-xs text-gray-400">حجم کل</p><p className="text-2xl font-bold text-gray-800">{(totalSize / 1024 / 1024).toFixed(2)} MB</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-purple-200 p-4 flex items-center gap-4">
          <div className="p-3 bg-purple-50 rounded-lg"><Image size={20} className="text-purple-600" /></div>
          <div><p className="text-xs text-gray-400">تصاویر</p><p className="text-2xl font-bold text-purple-600">{stats.images}</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg"><FileText size={20} className="text-amber-600" /></div>
          <div><p className="text-xs text-gray-400">مدارک</p><p className="text-2xl font-bold text-amber-600">{stats.documents}</p></div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="جستجو در نام فایل‌ها..." className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-gray-50/50 focus:bg-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={16} /></button>}
          </div>
          <select className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 min-w-[130px]" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">همه فایل‌ها</option><option value="image">🖼️ تصاویر</option><option value="document">📄 مدارک</option><option value="archive">📦 فشرده</option>
          </select>
          <select className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 min-w-[130px]" value={filterModule} onChange={e => setFilterModule(e.target.value)}>
            <option value="all">همه ماژول‌ها</option>
            {modules.filter(m => m !== 'all').map(m => <option key={m} value={m}>{m === 'issues' ? 'مسائل' : m === 'assets' ? 'دارایی‌ها' : m === 'trees' ? 'درختواره' : m === 'exports' ? 'خروجی‌ها' : m}</option>)}
          </select>
          <select className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 min-w-[110px]" value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
            <option value="date">تاریخ</option><option value="name">نام</option><option value="size">حجم</option>
          </select>
          <button onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title={sortOrder === 'asc' ? 'صعودی' : 'نزولی'}>{sortOrder === 'asc' ? '↑' : '↓'}</button>
          <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`} title="نمایش لیستی"><List size={18} /></button>
          <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`} title="نمایش شبکه‌ای"><Grid3x3 size={18} /></button>
        </div>
        {searchTerm && <div className="text-xs text-gray-400 mt-2 mr-1">{sortedFiles.length} نتیجه یافت شد</div>}
      </div>

      {/* Files */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500"><RefreshCw size={40} className="animate-spin mx-auto mb-4 text-gray-300" /><p className="text-sm font-medium">در حال بارگذاری فایل‌ها...</p></div>
        ) : sortedFiles.length === 0 ? (
          <div className="p-16 text-center text-gray-400"><div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><Folder size={48} className="text-gray-300" /></div><p className="text-lg font-medium text-gray-600">هیچ فایلی یافت نشد</p></div>
        ) : viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gradient-to-r from-gray-50 to-white border-b">
                <tr><th className="px-6 py-3.5 text-xs font-semibold text-gray-600">نام فایل</th><th className="px-6 py-3.5 text-xs font-semibold text-gray-600">نوع</th><th className="px-6 py-3.5 text-xs font-semibold text-gray-600">ماژول</th><th className="px-6 py-3.5 text-xs font-semibold text-gray-600">حجم</th><th className="px-6 py-3.5 text-xs font-semibold text-gray-600">تاریخ آپلود</th><th className="px-6 py-3.5 text-xs font-semibold text-gray-600 text-center">عملیات</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedFiles.map((file) => (
                  <tr key={file.id} className={`hover:bg-gray-50/80 transition-colors group ${getFileColor(file.type, file.name)}`}>
                    <td className="px-6 py-3.5"><div className="flex items-center gap-3"><div className="flex-shrink-0">{getFileIcon(file.type, file.name)}</div><p className="text-sm font-medium text-gray-800 truncate" dir="ltr">{file.name}</p></div></td>
                    <td className="px-6 py-3.5"><span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-medium ${file.type === 'image' ? 'bg-blue-100 text-blue-700' : file.type === 'document' ? 'bg-green-100 text-green-700' : file.type === 'archive' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{getFileTypeLabel(file.type, file.name)}</span></td>
                    <td className="px-6 py-3.5 text-xs text-gray-500">{file.module || '-'}</td>
                    <td className="px-6 py-3.5 text-sm text-gray-600 font-mono">{(file.size / 1024).toFixed(1)} KB</td>
                    <td className="px-6 py-3.5 text-sm text-gray-500"><div className="flex items-center gap-1.5"><Calendar size={14} className="text-gray-400" /><span>{formatDate(file.createdAt)}</span></div></td>
                    <td className="px-6 py-3.5"><div className="flex items-center justify-center gap-1.5"><button onClick={() => handleDownload(file.path, file.name)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="دانلود"><Download size={16} /></button><button onClick={() => handleDelete(file.id, file.name)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="حذف"><Trash2 size={16} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
            {paginatedFiles.map((file) => (
              <div key={file.id} className={`group relative p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${getFileColor(file.type, file.name)}`}>
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-xl bg-white shadow-sm flex items-center justify-center mb-3">{getFileIcon(file.type, file.name)}</div>
                  <p className="text-xs font-medium text-gray-800 truncate w-full" dir="ltr">{file.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                  <span className={`mt-2 px-2 py-0.5 rounded-full text-[9px] font-medium ${file.type === 'image' ? 'bg-blue-100 text-blue-700' : file.type === 'document' ? 'bg-green-100 text-green-700' : file.type === 'archive' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{getFileTypeLabel(file.type, file.name)}</span>
                </div>
                <div className="absolute top-2 left-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleDownload(file.path, file.name)} className="p-1 bg-white rounded-lg shadow-sm text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="دانلود"><Download size={14} /></button>
                  <button onClick={() => handleDelete(file.id, file.name)} className="p-1 bg-white rounded-lg shadow-sm text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="حذف"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && sortedFiles.length > 0 && (
          <div className="p-4 border-t bg-gray-50/50 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-gray-400 flex items-center gap-4"><span>تعداد: {sortedFiles.length} فایل</span><span className="w-px h-4 bg-gray-300"></span><span>حجم کل: {(sortedFiles.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(2)} MB</span></div>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"><ChevronsRight size={16} /></button>
              <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"><ChevronRight size={16} /></button>
              <span className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded-lg">{currentPage}</span>
              <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"><ChevronLeft size={16} /></button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"><ChevronsLeft size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}