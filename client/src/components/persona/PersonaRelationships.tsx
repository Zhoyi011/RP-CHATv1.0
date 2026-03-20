import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { personaApi } from '../../services/api';
import toast from 'react-hot-toast';

interface Relationship {
  targetPersonaId: {
    _id: string;
    name: string;
    avatar?: string;
    globalNumber?: number;
  };
  type: 'friend' | 'couple' | 'soulmate' | 'master' | 'apprentice';
  cardId?: string;
  createdAt: string;
}

interface Props {
  personaId: string;
  relationships: Relationship[];
  isOwner: boolean;
  onUpdate: () => void;
}

const typeIcons = {
  friend: '🤝',
  couple: '💕',
  soulmate: '💞',
  master: '📚',
  apprentice: '🎓'
};

const typeNames = {
  friend: '好友',
  couple: '情侣',
  soulmate: '灵魂伴侣',
  master: '师徒',
  apprentice: '学徒'
};

const PersonaRelationships: React.FC<Props> = ({ personaId, relationships, isOwner, onUpdate }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">亲密关系</h3>
        {isOwner && (
          <button className="text-sm text-green-500 hover:text-green-600">
            + 建立关系
          </button>
        )}
      </div>

      {relationships.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          {isOwner ? '还没有建立任何关系' : '暂无亲密关系'}
        </div>
      ) : (
        <div className="space-y-3">
          {relationships.map((rel, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl">{typeIcons[rel.type]}</div>
              <div
                onClick={() => navigate(`/persona/${rel.targetPersonaId._id}`)}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold cursor-pointer hover:scale-105 transition"
              >
                {rel.targetPersonaId.name?.charAt(0) || '?'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{rel.targetPersonaId.name}</p>
                  {rel.targetPersonaId.globalNumber && (
                    <span className="text-xs text-gray-400">#{rel.targetPersonaId.globalNumber}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full">
                    {typeNames[rel.type]}
                  </span>
                  <span className="text-xs text-gray-400">
                    结缘于 {new Date(rel.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              {rel.cardId && (
                <div className="text-xs text-gray-400">
                  💳 {rel.cardId}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PersonaRelationships;