import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { type Persona } from '../../services/api';

interface Props {
  personas: Persona[];
  currentPersona: Persona | null;
  onSelect: (persona: Persona) => void;
  onClose: () => void;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const PersonaSwitchPanel: React.FC<Props> = ({ 
  personas, 
  currentPersona, 
  onSelect, 
  onClose,
  position = 'bottom'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [recentPersonas, setRecentPersonas] = useState<string[]>([]);

  // 加载最近使用的角色
  useEffect(() => {
    const saved = localStorage.getItem('recentPersonas');
    if (saved) {
      setRecentPersonas(JSON.parse(saved));
    }
  }, []);

  // 保存最近使用
  const saveRecent = (personaId: string) => {
    const newRecent = [personaId, ...recentPersonas.filter(id => id !== personaId)].slice(0, 5);
    setRecentPersonas(newRecent);
    localStorage.setItem('recentPersonas', JSON.stringify(newRecent));
  };

  const filteredPersonas = personas.filter(p =>
    (p.displayName || p.name).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 按最近使用排序
  const sortedPersonas = [...filteredPersonas].sort((a, b) => {
    const aIndex = recentPersonas.indexOf(a._id);
    const bIndex = recentPersonas.indexOf(b._id);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  const getPositionClasses = () => {
    switch (position) {
      case 'top': return 'bottom-full mb-2';
      case 'bottom': return 'top-full mt-2';
      case 'left': return 'right-full mr-2';
      case 'right': return 'left-full ml-2';
      default: return 'top-full mt-2';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className={`absolute ${getPositionClasses()} left-0 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden`}
    >
      {/* 头部 */}
      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          切换角色 ({personas.length})
        </span>
        <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
          Tab 快捷键
        </span>
      </div>

      {/* 搜索框 */}
      <div className="px-3 pt-2 pb-1">
        <input
          type="text"
          placeholder="搜索角色..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-2 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
        />
      </div>

      {/* 角色列表 */}
      <div className="max-h-64 overflow-y-auto">
        {sortedPersonas.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-gray-400">
            暂无匹配角色
          </div>
        ) : (
          sortedPersonas.map(persona => {
            const isCurrent = currentPersona?._id === persona._id;
            return (
              <button
                key={persona._id}
                onClick={() => {
                  saveRecent(persona._id);
                  onSelect(persona);
                  onClose();
                }}
                className={`
                  w-full px-3 py-2 flex items-center gap-3 text-left transition-colors
                  hover:bg-gray-50 dark:hover:bg-gray-700
                  ${isCurrent ? 'bg-blue-50 dark:bg-blue-900/30' : ''}
                `}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {persona.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                    {persona.displayName || persona.name}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    #{persona.sameNameNumber || '?'}
                  </p>
                </div>
                {isCurrent && (
                  <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* 底部提示 */}
      <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700 text-[10px] text-gray-400">
        💡 点击切换角色，按 Tab 键快速切换
      </div>
    </motion.div>
  );
};

export default PersonaSwitchPanel;