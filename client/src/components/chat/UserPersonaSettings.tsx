import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { UserPersonaForAI } from '../../types/ai';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

interface Props {
  myPersona: UserPersonaForAI | null;
  onClose: () => void;
  onUpdate: (updated: UserPersonaForAI) => void;
}

const UserPersonaSettings: React.FC<Props> = ({ myPersona, onClose, onUpdate }) => {
  const [name, setName] = useState(myPersona?.name || '');
  const [description, setDescription] = useState(myPersona?.description || '');
  const [avatar, setAvatar] = useState(myPersona?.avatar || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('请输入你的角色名称');
      return;
    }
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/ai-persona/my-persona`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, description, avatar })
      });
      const data = await res.json();
      if (res.ok) {
        onUpdate(data);
        onClose();
      } else {
        alert(data.error || '保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white">让 AI 认识你</h2>
          <p className="text-blue-100 text-sm">设置你的角色信息，AI 会按照这个设定与你对话</p>
        </div>

        <div className="p-6 space-y-5">
          {/* 角色名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">你的角色名 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="例如：勇者、魔法师、旅人"
            />
          </div>

          {/* 自我介绍 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">自我介绍</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              placeholder="介绍你的角色背景、性格、特点等...&#10;例如：我是一个喜欢冒险的勇者，性格开朗，乐于助人。"
            />
            <p className="text-xs text-gray-400 mt-1">AI 会通过这些信息来了解你</p>
          </div>

          {/* 提示信息 */}
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              💡 提示：设置好你的角色后，AI 会用你设定的名字和背景来称呼你！
            </p>
          </div>

          {/* 按钮 */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className={`flex-1 py-2 rounded-xl text-white font-medium transition ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-600 hover:shadow-lg'
              }`}
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default UserPersonaSettings;