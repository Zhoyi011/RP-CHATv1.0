import React from 'react';
import type { Persona } from '../../services/api';

interface Props {
  persona: Persona;
  isOwner: boolean;
  onUpdate?: () => void;  // 添加这个
}

const PersonaEquipments: React.FC<Props> = ({ persona, isOwner, onUpdate }) => {
  const equipments = [
    { key: 'avatarFrame', name: '头像框', icon: '🖼️', color: 'blue' },
    { key: 'ring', name: '戒指', icon: '💍', color: 'pink' },
    { key: 'relationshipCard', name: '关系卡', icon: '💌', color: 'purple' }
  ];

  const getEquipmentStatus = (key: string) => {
    return persona.equipped?.[key as keyof typeof persona.equipped];
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <span>🎒</span> 当前装备
        </h3>
        {isOwner && (
          <button className="text-sm text-blue-500 hover:text-blue-600 transition">
            前往商城
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {equipments.map(eq => {
          const isEquipped = getEquipmentStatus(eq.key);
          const colorMap: Record<string, string> = {
            blue: 'from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30',
            pink: 'from-pink-100 to-pink-200 dark:from-pink-900/30 dark:to-pink-800/30',
            purple: 'from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30',
          };
          return (
            <div key={eq.key} className="text-center">
              <div className={`w-20 h-20 mx-auto bg-gradient-to-br ${colorMap[eq.color]} rounded-xl flex items-center justify-center mb-2 transition-all ${
                isEquipped ? 'ring-2 ring-blue-400 shadow-md' : 'opacity-60'
              }`}>
                <span className="text-3xl">{eq.icon}</span>
              </div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{eq.name}</p>
              {isEquipped && (
                <p className="text-xs text-blue-500 mt-0.5">✓ 已装备</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PersonaEquipments;