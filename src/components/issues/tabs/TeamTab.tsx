// src/components/issues/tabs/TeamTab.tsx
// تب کارگروه حل نظام مسائل

import React from 'react';
import { Users, Plus, Trash2 } from 'lucide-react';
import { TeamMember } from './types';

interface TeamTabProps {
  teamMembers: TeamMember[];
  handleAddTeamMember: () => void;
  handleRemoveTeamMember: (id: number) => void;
  handleTeamMemberChange: (id: number, field: string, value: string) => void;
}

export const TeamTab: React.FC<TeamTabProps> = ({
  teamMembers,
  handleAddTeamMember,
  handleRemoveTeamMember,
  handleTeamMemberChange,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-gray-700 text-sm">👥 کارگروه حل نظام مسائل</h4>
        <button
          type="button"
          onClick={handleAddTeamMember}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Plus size={14} />
          افزودن عضو
        </button>
      </div>

      {teamMembers.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
          <Users size={32} className="mx-auto mb-2 text-gray-300" />
          <p>هیچ عضوی به کارگروه اضافه نشده است</p>
        </div>
      ) : (
        <div className="space-y-2">
          {teamMembers.map((member, index) => (
            <div key={member.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200 flex-wrap sm:flex-nowrap">
              <span className="text-xs font-bold text-gray-400 w-6">{index + 1}</span>
              <input
                type="text"
                placeholder="👤 نام"
                value={member.name}
                onChange={e => handleTeamMemberChange(member.id, 'name', e.target.value)}
                className="flex-1 min-w-[120px] px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
              <input
                type="text"
                placeholder="🎖️ درجه"
                value={member.rank}
                onChange={e => handleTeamMemberChange(member.id, 'rank', e.target.value)}
                className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
              <input
                type="text"
                placeholder="🏢 یگان"
                value={member.unit}
                onChange={e => handleTeamMemberChange(member.id, 'unit', e.target.value)}
                className="flex-1 min-w-[120px] px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
              <input
                type="text"
                placeholder="📞 تلفن"
                value={member.phone}
                onChange={e => handleTeamMemberChange(member.id, 'phone', e.target.value)}
                className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
              <button
                type="button"
                onClick={() => handleRemoveTeamMember(member.id)}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                title="حذف عضو"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-gray-400">
        📝 شامل: درجه، نام، نشان، یگان، تلفن
      </p>
    </div>
  );
};
