import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Check } from 'lucide-react';

export type Operator = 'eq' | 'neq' | 'like' | 'in';

export interface FilterRule {
  id: string;
  field: string;
  op: Operator;
  value: string | string[];
}

export interface FilterGroup {
  id: string;
  condition: 'AND' | 'OR';
  rules: (FilterRule | FilterGroup)[];
}

export interface FieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'select' | 'multi-select';
  options?: { label: string; value: string }[];
}

interface AdvancedQueryBuilderProps {
  fields: FieldDefinition[];
  onChange: (filter: FilterGroup | null) => void;
  initialFilter?: FilterGroup;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const AdvancedQueryBuilder: React.FC<AdvancedQueryBuilderProps> = ({ fields, onChange, initialFilter }) => {
  const [filterGroup, setFilterGroup] = useState<FilterGroup>(
    initialFilter || { id: generateId(), condition: 'AND', rules: [] }
  );
  
  const [isOpen, setIsOpen] = useState(false);

  const updateGroup = (newGroup: FilterGroup) => {
    setFilterGroup(newGroup);
    onChange(newGroup.rules.length > 0 ? newGroup : null);
  };

  const addRule = (group: FilterGroup) => {
    const newGroup = { ...group };
    newGroup.rules.push({
      id: generateId(),
      field: fields[0]?.name || '',
      op: 'eq',
      value: ''
    });
    updateGroup(newGroup);
  };

  const addGroup = (group: FilterGroup) => {
    const newGroup = { ...group };
    newGroup.rules.push({
      id: generateId(),
      condition: 'AND',
      rules: []
    });
    updateGroup(newGroup);
  };

  const renderGroup = (group: FilterGroup, isRoot = false, parentGroup?: FilterGroup, indexInParent?: number) => {
    return (
      <div key={group.id} className={`p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 ${isRoot ? '' : 'mt-4'}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex bg-slate-100 dark:bg-slate-700 rounded-md p-1">
            <button
              onClick={() => {
                group.condition = 'AND';
                updateGroup({ ...filterGroup });
              }}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${group.condition === 'AND' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              AND (همه)
            </button>
            <button
              onClick={() => {
                group.condition = 'OR';
                updateGroup({ ...filterGroup });
              }}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${group.condition === 'OR' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              OR (حداقل یک)
            </button>
          </div>
          
          <div className="flex-1"></div>
          
          <button 
            onClick={() => addRule(group)}
            className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-1.5 rounded-md"
          >
            <Plus className="w-4 h-4" /> قانون
          </button>
          
          <button 
            onClick={() => addGroup(group)}
            className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-1.5 rounded-md"
          >
            <Plus className="w-4 h-4" /> گروه
          </button>
          
          {!isRoot && parentGroup && indexInParent !== undefined && (
             <button 
                onClick={() => {
                   parentGroup.rules.splice(indexInParent, 1);
                   updateGroup({ ...filterGroup });
                }}
                className="text-red-500 hover:bg-red-50 p-1.5 rounded-md"
             >
                <Trash2 className="w-4 h-4" />
             </button>
          )}
        </div>

        <div className="space-y-3">
          {group.rules.map((ruleOrGroup, index) => {
             if ('condition' in ruleOrGroup) {
                return renderGroup(ruleOrGroup as FilterGroup, false, group, index);
             } else {
                const rule = ruleOrGroup as FilterRule;
                const fieldDef = fields.find(f => f.name === rule.field) || fields[0];
                
                return (
                  <div key={rule.id} className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <select 
                       value={rule.field}
                       onChange={(e) => {
                          rule.field = e.target.value;
                          rule.value = '';
                          updateGroup({ ...filterGroup });
                       }}
                       className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm flex-1 min-w-[150px]"
                    >
                       {fields.map(f => <option key={f.name} value={f.name}>{f.label}</option>)}
                    </select>

                    <select 
                       value={rule.op}
                       onChange={(e) => {
                          rule.op = e.target.value as Operator;
                          updateGroup({ ...filterGroup });
                       }}
                       className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm"
                    >
                       <option value="eq">برابر با</option>
                       <option value="neq">نابرابر با</option>
                       <option value="like">شامل</option>
                    </select>

                    <div className="flex-1 min-w-[200px]">
                       {fieldDef?.type === 'select' ? (
                          <select
                             value={rule.value as string}
                             onChange={(e) => {
                                rule.value = e.target.value;
                                updateGroup({ ...filterGroup });
                             }}
                             className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm"
                          >
                             <option value="">انتخاب کنید...</option>
                             {fieldDef.options?.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                             ))}
                          </select>
                       ) : (
                          <input 
                             type="text"
                             value={rule.value as string}
                             onChange={(e) => {
                                rule.value = e.target.value;
                                updateGroup({ ...filterGroup });
                             }}
                             placeholder="مقدار..."
                             className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm"
                          />
                       )}
                    </div>

                    <button 
                       onClick={() => {
                          group.rules.splice(index, 1);
                          updateGroup({ ...filterGroup });
                       }}
                       className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-md transition-colors"
                    >
                       <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
             }
          })}
          {group.rules.length === 0 && (
             <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-500">
                هیچ قانونی در این گروه وجود ندارد.
             </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mb-6">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors w-full"
      >
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        جستجوی پیشرفته (AND/OR)
        {filterGroup.rules.length > 0 && !isOpen && (
           <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs mr-2">
              {filterGroup.rules.length} قانون فعال
           </span>
        )}
      </button>
      
      {isOpen && (
         <div className="mt-4 animate-in slide-in-from-top-4 fade-in duration-200">
            {renderGroup(filterGroup, true)}
            <div className="flex justify-end mt-4">
              <button 
                onClick={() => {
                  setFilterGroup({ id: generateId(), condition: 'AND', rules: [] });
                  onChange(null);
                }}
                className="text-sm px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md"
              >
                پاک کردن فیلترها
              </button>
            </div>
         </div>
      )}
    </div>
  );
};
