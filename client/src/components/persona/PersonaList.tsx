import React from 'react';
import { motion } from 'framer-motion';
import { type Persona } from '../../services/api';
import { useNavigate } from 'react-router-dom';

interface Props {
  personas: Persona[];
  onSelect?: (persona: Persona) => void;
  selectedId?: string;
  showActions?: boolean;
}

const PersonaList: React.FC<Props> = ({ personas, onSelect, selectedId, showActions = true }) => {
  const navigate = useNavigate();

  const getStatusBadge = (status: string) => {
    const config = {
      approved: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', label: '✓ 已通过' },
      pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400', label: '⏳ 审核中' },
      rejected: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', label: '✗ 已拒绝' }
    };
    const c = config[status as keyof typeof config] || config.approved;
    return (
      <span className={`text-xs px-2 py-1 rounded-full ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'from-pink-400 to-rose-500',
      'from-purple-400 to-indigo-500',
      'from-blue-400 to-cyan-500',
      'from-emerald-400 to-teal-500',
      'from-amber-400 to-orange-500',
      'from-violet-400 to-purple-500',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (personas.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎭</div>
        <p className="text-gray-400 dark:text-gray-500">还没有角色</p>
        <button
          onClick={() => navigate('/persona/create')}
          className="mt-4 px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition"
        >
          创建第一个角色 →
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {personas.map((persona, index) => (
        <motion.div
          key={persona._id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onSelect?.(persona)}
          className={`group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 ${
            selectedId === persona._id
              ? 'ring-2 ring-blue-500 shadow-lg'
              : 'hover:shadow-lg hover:-translate-y-0.5 shadow-sm'
          }`}
        >
          {/* 头像区域 */}
          <div className="relative h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
            <div className={`absolute -bottom-8 left-4 w-16 h-16 rounded-full bg-gradient-to-br ${getAvatarColor(persona.name)} flex items-center justify-center text-white text-2xl font-bold shadow-lg border-4 border-white dark:border-gray-800`}>
              {persona.name.charAt(0).toUpperCase()}
            </div>
            {/* 状态徽章 */}
            <div className="absolute top-3 right-3">
              {getStatusBadge(persona.status)}
            </div>
            {/* 使用次数/浏览量（如果有） */}
            {(persona.usageCount || persona.viewCount) && (
              <div className="absolute bottom-3 right-3 flex gap-2">
                {persona.usageCount !== undefined && persona.usageCount > 0 && (
                  <span className="text-xs bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full">
                    🎭 {persona.usageCount}
                  </span>
                )}
                {persona.viewCount !== undefined && persona.viewCount > 0 && (
                  <span className="text-xs bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full">
                    👁 {persona.viewCount}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 内容区域 */}
          <div className="p-4 pt-10">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {persona.displayName || persona.name}
                </h3>
                {persona.displayName && (
                  <p className="text-xs text-gray-400 truncate">
                    @{persona.name}
                    {persona.sameNameNumber && <span>#{persona.sameNameNumber}</span>}
                  </p>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
              {persona.description || '暂无简介'}
            </p>

            {/* 标签 */}
            {persona.tags && persona.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {persona.tags.slice(0, 3).map((tag, idx) => (
                  <span key={idx} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">
                    #{tag}
                  </span>
                ))}
                {persona.tags.length > 3 && (
                  <span className="text-xs px-2 py-0.5 text-gray-400">
                    +{persona.tags.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* 操作按钮 */}
            {showActions && (
              <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/persona/${persona._id}`);
                  }}
                  className="flex-1 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                >
                  查看详情
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/persona/${persona._id}/edit`);
                  }}
                  className="flex-1 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  编辑
                </button>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default PersonaList;