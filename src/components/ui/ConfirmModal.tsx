import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
  title: string;
  message: string;
  type?: 'danger' | 'warning' | 'info' | string;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  isLoading,
  type = 'danger',
  confirmText,
  cancelText = 'انصراف'
}: ConfirmModalProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } catch (err) {
      console.error('Error in onConfirm', err);
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  const isDanger = type === 'danger';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden bg-white rounded-2xl shadow-xl">
        <div className={`flex items-center justify-between p-4 ${isDanger ? 'bg-red-50/50 border-b border-red-100' : 'bg-amber-50/50 border-b border-amber-100'}`}>
          <div className={`flex items-center gap-2 ${isDanger ? 'text-red-600' : 'text-amber-600'}`}>
            <AlertTriangle size={20} />
            <h3 className="font-bold">{title}</h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isDeleting || isLoading}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5 text-sm text-gray-600">
          {message}
        </div>
        
        <div className="flex items-center justify-end gap-3 p-4 bg-gray-50 border-t border-gray-100">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            disabled={isDeleting || isLoading}
          >
            {cancelText}
          </button>
          <button 
            onClick={handleConfirm} 
            disabled={isDeleting || isLoading} 
            className={`px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm disabled:opacity-70 disabled:cursor-not-allowed transition-colors ${
              isDanger 
                ? 'bg-red-600 hover:bg-red-700 shadow-red-200' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
            }`}
          >
            {isDeleting ? 'در حال انجام...' : (confirmText || (isDanger ? 'بله، حذف شود' : 'تایید'))}
          </button>
        </div>
      </div>
    </div>
  );
}