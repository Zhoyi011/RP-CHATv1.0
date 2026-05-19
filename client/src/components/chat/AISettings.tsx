import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

interface AIPersona {
  _id: string;
  name: string;
  avatar?: string;
  description: string;
  personality: string;
  replyStyle: 'short' | 'medium' | 'detailed';
  exampleDialogue?: string;
  isDefault: boolean;
}

interface Props {
  aiPersona: AIPersona | null;
  onClose: () => void;
  onUpdate: (updated: AIPersona) => void;
}

const AISettings: React.FC<Props> = ({ aiPersona, onClose, onUpdate }) => {
  const [name, setName] = useState(aiPersona?.name || '');
  const [description, setDescription] = useState(aiPersona?.description || '');
  const [personality, setPersonality] = useState(aiPersona?.personality || '');
  const [replyStyle, setReplyStyle] = useState<'short' | 'medium' | 'detailed'>(aiPersona?.replyStyle || 'medium');
  const [exampleDialogue, setExampleDialogue] = useState(aiPersona?.exampleDialogue || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('请输入 AI 名称');
      return;
    }
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      let url = `${API_BASE}/ai-persona/personas`;
      let method = 'POST';
      
      if (aiPersona?._id) {
        url = `${API_BASE}/ai-persona/personas/${aiPersona._id}`;
        method = 'PUT';
      }
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, description, personality, replyStyle, exampleDialogue })
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

  const replyStyleOptions = [
    { value: 'short', label: '简短', desc: '1-2句话，适合快速对话' },
    { value: 'medium', label: '适中', desc: '2-3句话，带动作描写' },
    { value: 'detailed', label: '详细', desc: '3-5句话，丰富描写' }
  ];

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
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4 sticky top-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">AI 角色设置</h2>
              <p className="text-purple-100 text-sm">自定义 AI 的性格、回复风格等</p>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* 名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">角色名称 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
              placeholder="例如：温柔学姐、傲娇女仆"
            />
          </div>

          {/* 性格特征 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">性格特征</label>
            <input
              type="text"
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
              placeholder="例如：温柔、善良、有点傲娇"
            />
          </div>

          {/* 角色设定 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">角色设定</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
              placeholder="详细描述 AI 角色的背景、身份、特点等..."
            />
            <p className="text-xs text-gray-400 mt-1">AI 会根据这个设定来回应你</p>
          </div>

          {/* 回复风格 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">回复风格</label>
            <div className="flex gap-2">
              {replyStyleOptions.map(style => (
                <button
                  key={style.value}
                  onClick={() => setReplyStyle(style.value as any)}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition ${
                    replyStyle === style.value
                      ? 'bg-purple-500 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {style.label}
                  <div className="text-[10px] opacity-80">{style.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 示例对话 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">示例对话（可选）</label>
            <textarea
              value={exampleDialogue}
              onChange={(e) => setExampleDialogue(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
              placeholder='用户：你好\nAI：*微笑着* 你好呀，今天过得怎么样？'
            />
            <p className="text-xs text-gray-400 mt-1">AI 会学习这个示例的对话风格</p>
          </div>

          {/* 按钮 */}
          <div className="flex gap-3 pt-4">
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
                  : 'bg-gradient-to-r from-purple-500 to-pink-600 hover:shadow-lg'
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

export default AISettings;