// client/src/components/chat/PatPanel.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

interface PatAction {
  id: string;
  name: string;
  icon: string;
  defaultPattern: string;
}

interface PatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  targetPersonaId: string;
  targetPersonaName: string;
  roomId: string;
  onSuccess?: () => void;
}

// 面板动画变体 - 修复类型
const panelVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0, 
    transition: { type: 'spring' as const, damping: 25, stiffness: 300 } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 20, 
    transition: { duration: 0.2 } 
  }
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};

const actionVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { delay: 0.1 } },
  tap: { scale: 0.95 }
};

const PatPanel: React.FC<PatPanelProps> = ({
  isOpen,
  onClose,
  targetPersonaId,
  targetPersonaName,
  roomId,
  onSuccess
}) => {
  const [actions, setActions] = useState<PatAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState('');
  const [preview, setPreview] = useState('');

  // 获取当前角色名
  const getCurrentPersonaName = () => {
    const saved = localStorage.getItem('currentPersonaDisplay');
    return saved || '我';
  };

  // 加载预设动作
  useEffect(() => {
    if (!isOpen) return;
    
    const loadActions = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/pat/actions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setActions(data.actions);
      } catch (error) {
        console.error('加载动作失败:', error);
        toast.error('加载失败');
      } finally {
        setLoading(false);
      }
    };
    
    loadActions();
  }, [isOpen]);

  // 更新预览
  useEffect(() => {
    if (customMode) {
      const actorName = getCurrentPersonaName();
      let previewText = customText
        .replace(/{actor}/g, actorName)
        .replace(/{target}/g, targetPersonaName);
      setPreview(previewText);
    }
  }, [customText, customMode, targetPersonaName]);

  // 发送拍一拍
  const sendPat = async (actionId?: string, customPattern?: string) => {
    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/pat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roomId,
          targetPersonaId,
          actionId,
          customPattern
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message, { icon: '👋', duration: 2000 });
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(data.error || '发送失败');
      }
    } catch (error) {
      toast.error('发送失败');
    } finally {
      setSending(false);
    }
  };

  // 处理自定义发送
  const handleCustomSend = () => {
    if (!customText.trim()) {
      toast.error('请填写拍一拍内容');
      return;
    }
    if (!customText.includes('{actor}') && !customText.includes('{target}')) {
      toast.error('请使用 {actor} 和 {target} 占位符');
      return;
    }
    sendPat(undefined, customText);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* 遮罩层动画 */}
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* 面板动画 */}
          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-md max-h-[85vh] overflow-y-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50"
          >
            {/* 头部 */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <motion.span 
                    initial={{ rotate: -20, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ type: 'spring', delay: 0.1 }}
                    className="text-2xl"
                  >
                    👋
                  </motion.span>
                  <h2 className="text-white font-semibold text-lg">
                    拍了拍 {targetPersonaName}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-white/80 text-xs mt-1">双击头像触发 · 选择想要的动作</p>
            </div>
            
            {/* 内容 */}
            <div className="p-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* 预设动作网格 */}
                  {!customMode && (
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      {actions.map(action => (
                        <motion.button
                          key={action.id}
                          variants={actionVariants}
                          initial="hidden"
                          animate="visible"
                          whileTap="tap"
                          onClick={() => sendPat(action.id)}
                          disabled={sending}
                          className="flex flex-col items-center gap-1 p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition group"
                        >
                          <span className="text-2xl group-hover:scale-110 transition">
                            {action.icon}
                          </span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {action.name}
                          </span>
                        </motion.button>
                      ))}
                      
                      {/* 自定义按钮 */}
                      <motion.button
                        variants={actionVariants}
                        initial="hidden"
                        animate="visible"
                        whileTap="tap"
                        onClick={() => setCustomMode(true)}
                        className="flex flex-col items-center gap-1 p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition"
                      >
                        <span className="text-2xl">✏️</span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">自定义</span>
                      </motion.button>
                    </div>
                  )}
                  
                  {/* 自定义模式 */}
                  {customMode && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="space-y-4"
                    >
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3">
                        <p className="text-sm text-purple-600 dark:text-purple-400 mb-2">
                          格式说明：
                        </p>
                        <ul className="text-xs text-gray-500 space-y-1">
                          <li>• <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{'{actor}'}</code> = 你</li>
                          <li>• <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{'{target}'}</code> = 对方</li>
                        </ul>
                        <p className="text-xs text-gray-500 mt-2">示例：</p>
                        <ul className="text-xs text-gray-500 space-y-1">
                          <li>• {`{actor} 亲了亲 {target} 的额头`}</li>
                          <li>• {`{actor} 轻轻抱住了 {target}`}</li>
                          <li>• {`{actor} 戳了戳 {target} 的脸颊`}</li>
                        </ul>
                      </div>
                      
                      <textarea
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        placeholder="输入你想要的动作..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                      />
                      
                      {/* 预览 */}
                      {preview && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3"
                        >
                          <p className="text-xs text-gray-500 mb-1">预览：</p>
                          <p className="text-sm text-purple-600 dark:text-purple-400">
                            {preview}
                          </p>
                        </motion.div>
                      )}
                      
                      <div className="flex gap-3">
                        <button
                          onClick={() => setCustomMode(false)}
                          className="flex-1 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                        >
                          返回
                        </button>
                        <button
                          onClick={handleCustomSend}
                          disabled={sending || !customText.trim()}
                          className="flex-1 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50"
                        >
                          {sending ? (
                            <span className="flex items-center justify-center gap-1">
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                              </svg>
                              发送中...
                            </span>
                          ) : '发送'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </>
              )}
            </div>
            
            {/* 提示 */}
            <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-3 bg-gray-50/50 dark:bg-gray-800/50">
              <p className="text-xs text-gray-400 text-center">
                💡 拍一拍消息会显示在聊天中，所有人都能看到
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PatPanel;