import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
  title: string;
  message: string;
}

export function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  isLoading 
}: ConfirmModalProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleConfirm = async () => {
    console.log('Calling onConfirm inside ConfirmModal');
    setIsDeleting(true);
    try {
      await onConfirm();
      console.log('onConfirm finished');
    } catch (err) {
      console.error('Error in onConfirm', err);
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-between p-4 bg-red-50/50 border-b border-red-100">
          <div className="flex items-center gap-2 text-red-600">
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
            انصراف
          </button>
          <button 
            onClick={handleConfirm} 
            disabled={isDeleting || isLoading} 
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-sm shadow-red-200 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
          >
            {isDeleting ? 'در حال حذف...' : 'بله، حذف شود'}
          </button>
        </div>
      </div>
    </div>
  );
}