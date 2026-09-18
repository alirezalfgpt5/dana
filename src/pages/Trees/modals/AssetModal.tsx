import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Trash2, File as FileIcon, Download, Save, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../services/api';

import { ConfirmModal } from '../../../components/ui/ConfirmModal';

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: any;
  templates: any[];
  knowledgeLevels?: any[];
}

export function AssetModal({ isOpen, onClose, node, templates, knowledgeLevels = [] }: AssetModalProps) {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, action: (() => void) | null}>({isOpen: false, action: null});

  useEffect(() => {
    if (isOpen && node?.id) {
      fetchAssets();
    }
  }, [isOpen, node]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/assets?nodeId=${node.id}`);
      setAssets((res as any).data || []);
    } catch (err) {
      toast.error('خطا در دریافت مستندات');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('عنوان مستند الزامی است');
      return;
    }
    if (!file) {
      toast.error('لطفاً یک فایل انتخاب کنید');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('nodeId', String(node.id));
      formData.append('title', title);
      formData.append('description', description);
      if (templateId) formData.append('templateId', templateId);
      if (levelId) formData.append('levelId', levelId);
      formData.append('file', file);

      await api.post('/api/assets', formData);

      toast.success('مستند با موفقیت آپلود شد');
      
      // reset form
      setTitle('');
      setDescription('');
      setTemplateId('');
      setLevelId('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      fetchAssets();
    } catch (err) {
      toast.error('خطا در آپلود مستند');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (assetId: number) => {
    setConfirmModal({
      isOpen: true,
      action: async () => {
        try {
          await api.delete(`/api/assets/${assetId}`);
          toast.success('مستند حذف شد');
          fetchAssets();
        } catch (err) {
          toast.error('خطا در حذف مستند');
        } finally {
          setConfirmModal({ isOpen: false, action: null });
        }
      }
    });
  };

  const handleDownload = (assetId: number, filename: string) => {
    // We can open the download URL in a new tab or use a fetch approach
    window.open(`/api/assets/${assetId}/download`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-green-50 to-emerald-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Upload size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">مستندات گره: {node?.title}</h3>
              <p className="text-xs text-gray-500">آپلود و نگاشت دارایی‌های دانشی به این گره</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden" dir="rtl">
          
          {/* Form */}
          <div className="w-full md:w-1/3 p-4 border-l border-gray-100 bg-gray-50 overflow-y-auto">
            <h4 className="font-semibold text-gray-700 text-sm mb-4 border-b pb-2">آپلود مستند جدید</h4>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">عنوان مستند <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">قالب مربوطه</label>
                <select
                  value={templateId}
                  onChange={e => setTemplateId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">-- انتخاب قالب --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.type} - {t.title}</option>
                  ))}
                </select>
              </div>

              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">سطح دانش</label>
                <select
                  value={levelId}
                  onChange={e => setLevelId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">-- انتخاب سطح دانش --</option>
                  {knowledgeLevels.map((l: any) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">توضیحات</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500 min-h-[60px]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">فایل <span className="text-red-500">*</span></label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-500 file:mr-0 file:ml-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploading ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
                {uploading ? 'در حال آپلود...' : 'آپلود فایل'}
              </button>
            </form>
          </div>

          {/* List */}
          <div className="w-full md:w-2/3 p-4 overflow-y-auto">
            <h4 className="font-semibold text-gray-700 text-sm mb-4 border-b pb-2 flex justify-between items-center">
              <span>مستندات نگاشت شده</span>
              <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{assets.length} مورد</span>
            </h4>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <RefreshCw size={24} className="animate-spin text-gray-400" />
              </div>
            ) : assets.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                <FileIcon size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-400 text-sm">هیچ مستندی برای این گره آپلود نشده است.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assets.map(asset => (
                  <div key={asset.id} className="flex flex-col sm:flex-row gap-3 p-3 border border-gray-200 rounded-xl bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-lg shrink-0">
                      <FileIcon size={24} className="text-blue-500" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-gray-800 text-sm truncate">{asset.title}</h5>
                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                        {asset.template && (
                          <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100">
                            {asset.template.type}
                          </span>
                        )}
                        <span>{new Date(asset.createdAt).toLocaleDateString('fa-IR')}</span>
                        {asset.fileSize && <span>{(asset.fileSize / 1024).toFixed(0)} KB</span>}
                      </div>
                      {asset.description && (
                        <p className="text-xs text-gray-600 mt-2 truncate">{asset.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 sm:self-center">
                      <button
                        onClick={() => handleDownload(asset.id, asset.title)}
                        className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        title="دانلود"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(asset.id)}
                        className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        title="حذف"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, action: null })}
        onConfirm={() => confirmModal.action?.()}
        title="حذف مستند"
        message="آیا از حذف این مستند اطمینان دارید؟"
      />
    </div>
  );
}
