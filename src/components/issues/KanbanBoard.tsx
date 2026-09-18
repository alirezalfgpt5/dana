import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { api } from '../../services/api';

export const KanbanBoard = ({ issues, onIssueUpdate, onEditClick, onDeleteClick }: any) => {
  const columns = [
    { id: 'open', title: 'باز', color: 'bg-blue-100', borderColor: 'border-blue-200' },
    { id: 'in_progress', title: 'در حال بررسی', color: 'bg-amber-100', borderColor: 'border-amber-200' },
    { id: 'resolved', title: 'حل شده', color: 'bg-green-100', borderColor: 'border-green-200' },
    { id: 'closed', title: 'بسته شده', color: 'bg-gray-100', borderColor: 'border-gray-200' },
  ];

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    
    if (source.droppableId !== destination.droppableId) {
      const issue = issues.find((i: any) => i.id.toString() === draggableId);
      if (issue) {
        onIssueUpdate(issue.id, destination.droppableId);
        try {
          await api.put(`/issues/${issue.id}`, { status: destination.droppableId });
        } catch (e) {
          console.error('Error updating status', e);
          onIssueUpdate(issue.id, source.droppableId);
        }
      }
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 h-full min-h-[500px]">
        {columns.map(col => {
          const colIssues = issues.filter((i: any) => (i.status || 'open') === col.id);
          return (
            <div key={col.id} className={`flex-1 min-w-[300px] rounded-xl border ${col.borderColor} bg-gray-50/50 flex flex-col`}>
              <div className={`p-3 ${col.color} border-b ${col.borderColor} font-bold text-gray-700 flex justify-between items-center`}>
                <span>{col.title}</span>
                <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs">{colIssues.length}</span>
              </div>
              <Droppable droppableId={col.id}>
                {(provided) => (
                  <div 
                    ref={provided.innerRef} 
                    {...provided.droppableProps}
                    className="flex-1 p-3 space-y-3"
                  >
                    {colIssues.map((issue: any, index: number) => (
                      <Draggable key={issue.id} draggableId={issue.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white p-3 rounded-lg border shadow-sm ${snapshot.isDragging ? 'shadow-md border-blue-400 scale-[1.02]' : 'border-gray-200'} transition-all`}
                          >
                            <h4 className="font-bold text-gray-800 text-sm mb-2">{issue.title}</h4>
                            <div className="text-xs text-gray-500 line-clamp-2 mb-3">{issue.description || 'بدون توضیحات'}</div>
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                               <span className={`text-xs px-2 py-1 rounded-full ${issue.priority === 'critical' ? 'bg-red-100 text-red-700' : issue.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                 {issue.priority === 'critical' ? 'بحرانی' : issue.priority === 'high' ? 'بالا' : issue.priority === 'medium' ? 'متوسط' : 'پایین'}
                               </span>
                               <div className="flex gap-1">
                                 <button onClick={() => onEditClick(issue)} className="p-1 hover:bg-blue-50 text-blue-600 rounded">✎</button>
                                 <button onClick={() => onDeleteClick(issue.id)} className="p-1 hover:bg-red-50 text-red-600 rounded">🗑</button>
                               </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
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
