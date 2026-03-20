import React from 'react';
import type { Persona } from '../../services/api';  // 使用 type-only import

interface Props {
  persona: Persona;
  isOwner: boolean;
}

const PersonaEquipments: React.FC<Props> = ({ persona, isOwner }) => {
  const equipments = [
    { key: 'avatarFrame', name: '头像框', icon: '🖼️', color: 'purple' },
    { key: 'ring', name: '戒指', icon: '💍', color: 'pink' },
    { key: 'relationshipCard', name: '关系卡', icon: '💌', color: 'blue' }
  ];

  const getEquipmentStatus = (key: string) => {
    return persona.equipped?.[key as keyof typeof persona.equipped];
  };

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">当前装备</h3>
        {isOwner && (
          <button className="text-sm text-green-500 hover:text-green-600">
            更换装备
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {equipments.map(eq => {
          const isEquipped = getEquipmentStatus(eq.key);
          return (
            <div key={eq.key} className="text-center">
              <div className={`w-16 h-16 mx-auto bg-${eq.color}-100 rounded-lg flex items-center justify-center mb-1 ${
                isEquipped ? `ring-2 ring-${eq.color}-400` : 'opacity-50'
              }`}>
                <span className="text-2xl">{eq.icon}</span>
              </div>
              <p className="text-xs text-gray-600">{eq.name}</p>
              {isEquipped && (
                <p className="text-xs text-green-500">已装备</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PersonaEquipments;