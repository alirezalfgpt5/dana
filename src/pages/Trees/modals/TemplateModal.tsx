// src/pages/Trees/modals/TemplateModal.tsx
// مودال اتصال قالب به برگ

import React from 'react';
import { X, Save, Tag } from 'lucide-react';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  selectedTemplates: string[];
  setSelectedTemplates: (ids: string[]) => void;
  templates: any[];
}

export function TemplateModal({ isOpen, onClose, onSave, selectedTemplates, setSelectedTemplates, templates }: TemplateModalProps) {
  const rootTemplates = templates.filter(t => t.parentId === null);
  const concreteTemplates = templates.filter(t => t.parentId !== null);
  const groupedTemplates = rootTemplates.reduce((acc: any, root) => {
    const children = concreteTemplates.filter(t => t.parentId === root.id);
    acc[root.title] = { root, children };
    return acc;
  }, {});

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><Tag size={18} className="text-blue-600" /></div>
            <div><h3 className="font-bold text-gray-800">اتصال قالب به برگ</h3><p className="text-xs text-gray-500">انتخاب قالب‌های مرتبط با این برگ</p></div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">قالب‌های زیر را برای برگ انتخاب کنید:</p>

          <div className="space-y-3 p-3 border border-gray-200 rounded-xl max-h-48 overflow-y-auto scrollbar-hide bg-gray-50/50">
            {Object.keys(groupedTemplates).length > 0 ? (
              Object.entries(groupedTemplates).map(([type, group]: [string, any]) => {
                const rootChecked = selectedTemplates.includes(String(group.root.id)) || false;
                return (
                <div key={type} className="space-y-1.5 bg-white p-2.5 rounded-lg border border-gray-200">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rootChecked}
                      onChange={() => {
                        const ids = selectedTemplates;
                        const exists = ids.includes(String(group.root.id));
                        setSelectedTemplates(exists ? ids.filter(id => id !== String(group.root.id)) : [...ids, String(group.root.id)]);
                      }}
                      className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-gray-700">{type}</span>
                    <span className="text-[10px] text-gray-400 font-normal mr-auto bg-gray-100 px-1.5 py-0.5 rounded">
                      نوع قالب
                    </span>
                  </label>
                  {group.children.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-100">
                      {group.children.map((template: any) => {
                        const isChecked = selectedTemplates.includes(String(template.id)) || false;
                        return (
                          <label
                            key={template.id}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] cursor-pointer transition-all
                              ${isChecked
                                 ? 'bg-blue-100 border border-blue-300 text-blue-700'
                                 : 'bg-gray-50 border border-gray-200 text-gray-600 hover:border-blue-300'
                              }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                const ids = selectedTemplates;
                                const exists = ids.includes(String(template.id));
                                setSelectedTemplates(exists ? ids.filter(id => id !== String(template.id)) : [...ids, String(template.id)]);
                              }}
                              className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span>{template.title}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )})
            ) : <span className="text-sm text-gray-400">هیچ قالبی تعریف نشده است.</span>}
          </div>

          <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">💡 قالب‌ها در نظام مسائل نیز با همین برگ سینک می‌شوند</div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium">انصراف</button>
            <button onClick={onSave} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-lg shadow-blue-200/50">
              <Save size={16} /> ذخیره قالب‌ها
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}