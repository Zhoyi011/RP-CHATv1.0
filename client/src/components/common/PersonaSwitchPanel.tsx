// client/src/components/common/PersonaSwitchPanel.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { type Persona } from '../../services/api';
import AvatarFrame from '../common/AvatarFrame';

interface Props {
  personas: Persona[];
  currentPersona: Persona | null;
  onSelect: (persona: Persona) => void;
  onClose: () => void;
  position?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'left' | 'right';
}

const getFrameNameFromUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const match = url.match(/\/([^/]+)\.(png|webp|jpg|jpeg|gif|svg)$/i);
  if (match) return match[1].toLowerCase();
  return null;
};

const PersonaSwitchPanel: React.FC<Props> = ({ 
  personas, 
  currentPersona, 
  onSelect, 
  onClose,
  position = 'bottom',
  align = 'left'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [recentPersonas, setRecentPersonas] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('recentPersonas');
    if (saved) {
      setRecentPersonas(JSON.parse(saved));
    }
  }, []);

  const saveRecent = (personaId: string) => {
    const newRecent = [personaId, ...recentPersonas.filter(id => id !== personaId)].slice(0, 5);
    setRecentPersonas(newRecent);
    localStorage.setItem('recentPersonas', JSON.stringify(newRecent));
  };

  const filteredPersonas = personas.filter(p =>
    (p.displayName || p.name).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedPersonas = [...filteredPersonas].sort((a, b) => {
    const aIndex = recentPersonas.indexOf(a._id);
    const bIndex = recentPersonas.indexOf(b._id);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  const positionClass = `persona-switch-panel ${position} ${align === 'right' ? 'right-align' : 'left-align'}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className={positionClass}
    >
      {/* 头部 */}
      <div className="panel-header">
        <span>切换角色 ({personas.length})</span>
        <span className="shortcut-badge">Tab 快捷键</span>
      </div>

      {/* 搜索框 */}
      <div className="panel-search">
        <input
          type="text"
          placeholder="搜索角色..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
        />
      </div>

      {/* 角色列表 */}
      <div className="panel-list">
        {sortedPersonas.length === 0 ? (
          <div className="panel-empty">暂无匹配角色</div>
        ) : (
          sortedPersonas.map(persona => {
            const isCurrent = currentPersona?._id === persona._id;
            const frameName = getFrameNameFromUrl(persona.avatarFrame || persona.equipped?.avatarFrame);
            return (
              <button
                key={persona._id}
                className={`panel-item ${isCurrent ? 'active' : ''}`}
                onClick={() => {
                  saveRecent(persona._id);
                  onSelect(persona);
                  onClose();
                }}
              >
                <div className="panel-item-avatar">
                  <AvatarFrame
                    avatarUrl={persona.avatar || ''}
                    frameName={frameName}
                    size="sm"
                  />
                </div>
                <div className="panel-item-info">
                  <div className="panel-item-name">{persona.displayName || persona.name}</div>
                  <div className="panel-item-number">#{persona.sameNameNumber || '?'}</div>
                </div>
                {isCurrent && (
                  <div className="panel-item-check">
                    <i className="fas fa-check"></i>
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* 底部提示 */}
      <div className="panel-footer">
        <i className="fas fa-lightbulb"></i> 点击切换角色，按 Tab 键快速切换
      </div>
    </motion.div>
  );
};

export default PersonaSwitchPanel;