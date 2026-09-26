// src/components/issues/KanbanBoard.tsx
// تابلوی وضعیت نظام مسائل (Kanban Board) با پشتیبانی کامل از تمامی وضعیت‌ها و فیلدهای دانشی

import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Edit, Trash2, Building2, Folder, Coins, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { formatCurrency, formatNumber } from '../../utils/numberFormat';
import toast from 'react-hot-toast';

interface KanbanBoardProps {
  issues: any[];
  onIssueUpdate: (id: number, status: string) => void;
  onEditClick: (issue: any) => void;
  onDeleteClick: (id: number) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  issues,
  onIssueUpdate,
  onEditClick,
  onDeleteClick,
}) => {
  const columns = [
    {
      id: 'pending',
      title: '⏳ در انتظار',
      color: 'bg-yellow-50',
      headerColor: 'bg-yellow-100/80 text-yellow-800',
      borderColor: 'border-yellow-200',
      badgeColor: 'bg-yellow-200 text-yellow-800',
    },
    {
      id: 'in_progress',
      title: '🔄 در حال اجرا',
      color: 'bg-blue-50',
      headerColor: 'bg-blue-100/80 text-blue-800',
      borderColor: 'border-blue-200',
      badgeColor: 'bg-blue-200 text-blue-800',
    },
    {
      id: 'on_hold',
      title: '⏸️ متوقف',
      color: 'bg-amber-50',
      headerColor: 'bg-amber-100/80 text-amber-800',
      borderColor: 'border-amber-200',
      badgeColor: 'bg-amber-200 text-amber-800',
    },
    {
      id: 'completed',
      title: '✅ تکمیل شده',
      color: 'bg-green-50',
      headerColor: 'bg-green-100/80 text-green-800',
      borderColor: 'border-green-200',
      badgeColor: 'bg-green-200 text-green-800',
    },
    {
      id: 'canceled',
      title: '❌ لغو شده',
      color: 'bg-rose-50',
      headerColor: 'bg-rose-100/80 text-rose-800',
      borderColor: 'border-rose-200',
      badgeColor: 'bg-rose-200 text-rose-800',
    },
  ];

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;

    if (source.droppableId !== destination.droppableId) {
      const issueId = parseInt(draggableId, 10);
      const newStatus = destination.droppableId;
      const prevStatus = source.droppableId;

      // به‌روزرسانی سریع در رابط کاربری
      onIssueUpdate(issueId, newStatus);

      try {
        await api.put(`/issues/${issueId}`, { status: newStatus });
        toast.success(`وضعیت مسئله به "${columns.find(c => c.id === newStatus)?.title || newStatus}" تغییر یافت`, {
          id: `kanban-status-${issueId}`,
        });
      } catch (e: any) {
        console.error('Error updating issue status:', e);
        toast.error('خطا در به‌روزرسانی وضعیت در سرور');
        onIssueUpdate(issueId, prevStatus);
      }
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'خیلی زیاد':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'زیاد':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'متوسط':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'کم':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 h-full min-h-[550px]">
        {columns.map((col) => {
          const colIssues = issues.filter((i: any) => (i.status || 'pending') === col.id);

          return (
            <div
              key={col.id}
              className={`flex-1 min-w-[310px] max-w-[360px] rounded-2xl border ${col.borderColor} ${col.color} flex flex-col shadow-sm`}
            >
              {/* هدر ستون کانبان */}
              <div
                className={`p-3.5 ${col.headerColor} rounded-t-2xl border-b ${col.borderColor} font-bold text-sm flex justify-between items-center`}
              >
                <span>{col.title}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${col.badgeColor}`}>
                  {formatNumber(colIssues.length)}
                </span>
              </div>

              {/* لیست کارت‌ها */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 p-3 space-y-3 transition-colors ${
                      snapshot.isDraggingOver ? 'bg-white/60' : ''
                    }`}
                  >
                    {colIssues.map((issue: any, index: number) => {
                      const completion = issue.completionPercent || 0;

                      return (
                        <Draggable key={issue.id} draggableId={String(issue.id)} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white p-3.5 rounded-xl border shadow-sm transition-all text-right ${
                                snapshot.isDragging
                                  ? 'shadow-lg border-purple-500 scale-[1.02] ring-2 ring-purple-200'
                                  : 'border-gray-200 hover:border-gray-300 hover:shadow'
                              }`}
                            >
                              {/* بج‌ها و تگ‌های بالایی */}
                              <div className="flex items-center justify-between gap-1.5 mb-2 flex-wrap">
                                <span
                                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${getPriorityBadge(
                                    issue.actionPriority || 'متوسط'
                                  )}`}
                                >
                                  {issue.actionPriority || 'متوسط'}
                                </span>

                                {issue.projectLevel && (
                                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                                    {issue.projectLevel}
                                  </span>
                                )}

                                {issue.templates && issue.templates.length > 0 && (
                                  <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-full">
                                    📋 {issue.templates.length}
                                  </span>
                                )}
                              </div>

                              {/* عنوان مسئله */}
                              <h4 className="font-bold text-gray-800 text-sm mb-1.5 line-clamp-2 leading-snug">
                                {issue.title}
                              </h4>

                              {/* حوزه دانشی و دستگاه مسئول */}
                              <div className="space-y-1 mb-2.5 text-xs text-gray-500">
                                {issue.domain && (
                                  <div className="flex items-center gap-1.5 text-slate-600 truncate">
                                    <Folder size={13} className="text-purple-500 shrink-0" />
                                    <span className="truncate">{issue.domain}</span>
                                  </div>
                                )}
                                {issue.responsibleUnit && (
                                  <div className="flex items-center gap-1.5 text-slate-500 truncate">
                                    <Building2 size={13} className="text-blue-500 shrink-0" />
                                    <span className="truncate">{issue.responsibleUnit}</span>
                                  </div>
                                )}
                              </div>

                              {/* جهت‌گیری راه‌حل / خلاصه */}
                              {issue.solutionDirection && (
                                <p className="text-xs text-gray-600 line-clamp-2 mb-2.5 bg-gray-50 p-2 rounded-lg leading-relaxed">
                                  🧭 {issue.solutionDirection}
                                </p>
                              )}

                              {/* نوار پیشرفت */}
                              <div className="mb-2.5">
                                <div className="flex justify-between items-center text-[11px] text-gray-500 mb-1">
                                  <span>پیشرفت</span>
                                  <span className="font-bold">{formatNumber(completion)}٪</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      completion >= 80
                                        ? 'bg-green-500'
                                        : completion >= 40
                                        ? 'bg-blue-500'
                                        : 'bg-amber-500'
                                    }`}
                                    style={{ width: `${completion}%` }}
                                  />
                                </div>
                              </div>

                              {/* فوتر کارت: بودجه و دکمه‌های عملیات */}
                              <div className="flex justify-between items-center pt-2.5 border-t border-gray-100 text-xs">
                                <div className="flex items-center gap-1 text-emerald-700 font-medium text-[11px]">
                                  <Coins size={13} className="text-emerald-600" />
                                  <span>{formatCurrency(issue.requiredBudget || 0, true)}</span>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => onEditClick(issue)}
                                    className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                    title="ویرایش مسئله"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() => onDeleteClick(issue.id)}
                                    className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                    title="حذف مسئله"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};
export default KanbanBoard;
