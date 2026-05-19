import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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

const typeColors = {
  friend: 'from-blue-400 to-cyan-500',
  couple: 'from-pink-400 to-rose-500',
  soulmate: 'from-purple-400 to-indigo-500',
  master: 'from-amber-400 to-orange-500',
  apprentice: 'from-green-400 to-emerald-500'
};

const PersonaRelationships: React.FC<Props> = ({ personaId, relationships, isOwner, onUpdate }) => {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const getAvatarColor = (name: string) => {
    const colors = [
      'from-blue-400 to-cyan-500',
      'from-indigo-400 to-blue-500',
      'from-purple-400 to-indigo-500',
      'from-pink-400 to-rose-500',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <span>💕</span> 亲密关系
        </h3>
        {isOwner && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="text-sm text-blue-500 hover:text-blue-600 transition flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            建立关系
          </button>
        )}
      </div>

      {relationships.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          {isOwner ? '还没有建立任何关系' : '暂无亲密关系'}
        </div>
      ) : (
        <div className="space-y-3">
          {relationships.map((rel, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:shadow-sm transition"
            >
              <div className="text-2xl">{typeIcons[rel.type]}</div>
              <div
                onClick={() => navigate(`/persona/${rel.targetPersonaId._id}`)}
                className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarColor(rel.targetPersonaId.name)} flex items-center justify-center text-white font-bold cursor-pointer hover:scale-105 transition shadow-md`}
              >
                {rel.targetPersonaId.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-gray-800 dark:text-gray-200">{rel.targetPersonaId.name}</p>
                  {rel.targetPersonaId.globalNumber && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">#{rel.targetPersonaId.globalNumber}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${typeColors[rel.type]} text-white`}>
                    {typeNames[rel.type]}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    结缘于 {new Date(rel.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              {rel.cardId && (
                <div className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded-full">
                  💳 {rel.cardId}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PersonaRelationships;