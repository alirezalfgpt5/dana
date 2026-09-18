import React, { useState } from 'react';
import { Search, FileText, LayoutTemplate, Layers, AlertCircle, File as FileIcon } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export const DeepSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    nodes: any[];
    issues: any[];
    gaps: any[];
    trees: any[];
    files: any[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(query)}`);
      setResults(res.data);
      if (
        res.data.nodes.length === 0 &&
        res.data.issues.length === 0 &&
        res.data.gaps.length === 0 &&
        res.data.trees.length === 0 &&
        res.data.files.length === 0
      ) {
        toast.error('نتیجه‌ای یافت نشد');
      }
    } catch (err) {
      toast.error('خطا در جستجوی عمیق');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">جستجوی عمیق</h1>
          <p className="mt-1 text-sm text-gray-500">
            جستجوی سراسری در تمام گره‌ها، مسائل، شکاف‌ها و فایل‌های سیستم
          </p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="relative max-w-3xl">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="عبارت مورد نظر را تایپ کنید..."
          className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg shadow-sm"
        />
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <button 
            type="submit" 
            disabled={loading}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </form>

      {loading && (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {results && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {results.issues.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold flex items-center mb-4">
                <AlertCircle className="w-5 h-5 ml-2 text-red-500" />
                مسائل (Issues) ({results.issues.length})
              </h2>
              <ul className="space-y-3">
                {results.issues.map(issue => (
                  <li key={issue.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                    <div className="font-semibold">{issue.title}</div>
                    <div className="text-sm text-gray-500 mt-1 line-clamp-2">{issue.description}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {results.nodes.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold flex items-center mb-4">
                <Layers className="w-5 h-5 ml-2 text-blue-500" />
                گره‌های دانشی ({results.nodes.length})
              </h2>
              <ul className="space-y-3">
                {results.nodes.map(node => (
                  <li key={node.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                    <div className="font-semibold">{node.title}</div>
                    <div className="text-xs text-gray-400 mt-1">{node.code}</div>
                    <div className="text-sm text-gray-500 mt-1 line-clamp-2">{node.description}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {results.gaps.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold flex items-center mb-4">
                <LayoutTemplate className="w-5 h-5 ml-2 text-orange-500" />
                شکاف‌ها (Gaps) ({results.gaps.length})
              </h2>
              <ul className="space-y-3">
                {results.gaps.map(gap => (
                  <li key={gap.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                    <div className="font-semibold">وضعیت: {gap.status === 'identified' ? 'شناسایی شده' : 'بررسی شده'}</div>
                    <div className="text-sm text-gray-500 mt-1 line-clamp-2">{gap.description}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {results.trees.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold flex items-center mb-4">
                <FileText className="w-5 h-5 ml-2 text-indigo-500" />
                درخت‌ها ({results.trees.length})
              </h2>
              <ul className="space-y-3">
                {results.trees.map(tree => (
                  <li key={tree.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                    <div className="font-semibold">{tree.name}</div>
                    <div className="text-sm text-gray-500 mt-1 line-clamp-2">{tree.description}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {results.files.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold flex items-center mb-4">
                <FileIcon className="w-5 h-5 ml-2 text-green-500" />
                فایل‌ها ({results.files.length})
              </h2>
              <ul className="space-y-3">
                {results.files.map(file => (
                  <li key={file.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                    <div className="font-semibold">{file.name}</div>
                    <div className="text-sm text-gray-500 mt-1 line-clamp-2">{file.path}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
