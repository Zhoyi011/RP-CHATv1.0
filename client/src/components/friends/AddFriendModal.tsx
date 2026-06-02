// client/src/components/friends/AddFriendModal.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFriend } from '../../contexts/FriendContext';
import AvatarFrame from '../common/AvatarFrame';
import { X, Search, Send, Loader2, User, MessageCircle, AlertCircle, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePersonas?: any[]; // 当前用户的所有角色
}

const AddFriendModal: React.FC<AddFriendModalProps> = ({ isOpen, onClose, availablePersonas = [] }) => {
  const { sendRequest, searchPersonas } = useFriend();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<any | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<any | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [cooldownMap, setCooldownMap] = useState<Map<string, number>>(new Map());
  
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 检查冷却时间
  const getRemainingCooldown = (targetId: string): number => {
    const endTime = cooldownMap.get(targetId);
    if (!endTime) return 0;
    const remaining = Math.ceil((endTime - Date.now()) / 1000 / 60);
    return remaining > 0 ? remaining : 0;
  };

  const handleSearch = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const data = await searchPersonas(term);
    setResults(data);
    setSearching(false);
  }, [searchPersonas]);

  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => handleSearch(term), 500);
  };

  const handleOpenConfirm = (target: any) => {
    setSelectedTarget(target);
    setSelectedPersona(null);
    setMessage('');
    setShowConfirmModal(true);
  };

  const handleSendRequest = async () => {
    if (!selectedTarget || !selectedPersona) {
      toast.error('请选择要使用的角色');
      return;
    }

    // 检查冷却
    const remaining = getRemainingCooldown(selectedTarget.id);
    if (remaining > 0) {
      toast.error(`请 ${remaining} 分钟后再次尝试添加好友`);
      return;
    }

    setSending(true);
    const success = await sendRequest(selectedTarget.id, message || undefined);
    setSending(false);

    if (success) {
      // 设置30分钟冷却（1800000毫秒）
      setCooldownMap(prev => new Map(prev).set(selectedTarget.id, Date.now() + 30 * 60 * 1000));
      setShowConfirmModal(false);
      setSelectedTarget(null);
      setSearchTerm('');
      setResults([]);
      onClose();
      toast.success(`已向 ${selectedTarget.displayName || selectedTarget.name} 发送好友申请`);
    }
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* 主弹窗 - 搜索角色 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden"
        >
          {/* 头部 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              添加好友
            </h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* 搜索框 */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索角色名称..."
                value={searchTerm}
                onChange={onSearchChange}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border-none focus:ring-2 focus:ring-purple-500 text-sm"
                autoFocus
              />
              {searching && <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
            </div>
          </div>

          {/* 搜索结果 */}
          <div className="max-h-96 overflow-y-auto">
            {searchTerm.length >= 2 && results.length === 0 && !searching && (
              <div className="text-center py-8 text-gray-500">未找到相关角色</div>
            )}
            {results.map((persona) => {
              const displayName = persona.displayName || persona.name;
              const remainingCooldown = getRemainingCooldown(persona.id);
              const isOnCooldown = remainingCooldown > 0;
              
              return (
                <div key={persona.id} className="p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <AvatarFrame avatarUrl={persona.avatar || ''} frameName={null} size="md" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">{displayName}</div>
                      {persona.sameNameNumber && (
                        <div className="text-xs text-gray-400">#{persona.sameNameNumber}</div>
                      )}
                      {persona.isFriend && (
                        <span className="text-xs text-green-500 mt-1 inline-block">已是好友</span>
                      )}
                      {isOnCooldown && (
                        <span className="text-xs text-orange-500 mt-1 inline-block">冷却中 ({remainingCooldown}分钟)</span>
                      )}
                    </div>
                    {!persona.isFriend && (
                      <button
                        onClick={() => handleOpenConfirm(persona)}
                        disabled={isOnCooldown}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          isOnCooldown
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-md active:scale-95'
                        }`}
                      >
                        {isOnCooldown ? `${remainingCooldown}分钟后` : '添加好友'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* 确认弹窗 - 选择角色 + 申请理由 */}
      <AnimatePresence>
        {showConfirmModal && selectedTarget && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* 头部 */}
              <div className="p-5 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <div className="flex items-center gap-3">
                  <AvatarFrame avatarUrl={selectedTarget.avatar || ''} frameName={null} size="md" />
                  <div>
                    <h3 className="font-bold text-lg">{selectedTarget.displayName || selectedTarget.name}</h3>
                    {selectedTarget.sameNameNumber && (
                      <p className="text-sm text-purple-200">#{selectedTarget.sameNameNumber}</p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-purple-200 mt-2">发送好友申请</p>
              </div>

              {/* 选择角色 */}
              <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  使用哪个角色发送？
                </label>
                <div className="flex flex-wrap gap-2">
                  {availablePersonas.length === 0 ? (
                    <p className="text-sm text-gray-400">加载中...</p>
                  ) : (
                    availablePersonas.map((persona) => {
                      const isSelected = selectedPersona?.id === persona._id;
                      const displayName = persona.displayName || persona.name;
                      return (
                        <button
                          key={persona._id}
                          onClick={() => setSelectedPersona(persona)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                            isSelected
                              ? 'bg-purple-500 text-white shadow-md scale-105'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          <AvatarFrame avatarUrl={persona.avatar || ''} frameName={null} size="sm" />
                          <span className="text-sm">{displayName}</span>
                          {persona.sameNameNumber && (
                            <span className="text-xs opacity-70">#{persona.sameNameNumber}</span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 申请理由 */}
              <div className="p-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  申请理由 <span className="text-gray-400">(选填)</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 100))}
                  placeholder="写几句心里话吧..."
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"
                  rows={3}
                  maxLength={100}
                />
                <p className="text-right text-xs text-gray-400 mt-1">{message.length}/100</p>
              </div>

              {/* 按钮 */}
              <div className="p-5 pt-0 flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSendRequest}
                  disabled={!selectedPersona || sending}
                  className={`flex-1 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                    !selectedPersona || sending
                      ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg active:scale-95'
                  }`}
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  发送申请
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AddFriendModal;