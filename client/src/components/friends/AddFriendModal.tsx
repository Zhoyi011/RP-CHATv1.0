// client/src/components/friends/AddFriendModal.tsx
import React, { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useFriend } from '../../contexts/FriendContext';
import AvatarFrame from '../common/AvatarFrame';
import { X, Search, UserPlus, Check, Clock, Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddFriendModal: React.FC<AddFriendModalProps> = ({ isOpen, onClose }) => {
  const { sendRequest, searchPersonas } = useFriend();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [selectedPersona, setSelectedPersona] = useState<any | null>(null);
  
  // ✅ 修复：添加 undefined 初始值
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

  const handleSend = async (toId: string, name: string) => {
    setSendingId(toId);
    const success = await sendRequest(toId, message || undefined);
    setSendingId(null);
    if (success) {
      setMessage('');
      setSelectedPersona(null);
      setSearchTerm('');
      setResults([]);
      onClose();
      toast.success(`已向 ${name} 发送好友申请`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            添加好友
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 当前角色提示 - 不显示用户信息 */}
        <div className="px-4 pt-3 text-xs text-gray-500">
          使用当前角色发送申请
        </div>

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

        <div className="max-h-96 overflow-y-auto">
          {searchTerm.length >= 2 && results.length === 0 && !searching && (
            <div className="text-center py-8 text-gray-500">未找到相关角色</div>
          )}
          {results.map((persona) => {
            const displayName = persona.displayName || persona.name;
            return (
              <div key={persona.id} className="p-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <AvatarFrame avatarUrl={persona.avatar || ''} frameName={null} size="md" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">{displayName}</div>
                    {persona.sameNameNumber && (
                      <div className="text-xs text-gray-400">#{persona.sameNameNumber}</div>
                    )}
                  </div>
                  {persona.isFriend ? (
                    <span className="text-xs text-green-500 flex items-center gap-1"><Check className="w-3 h-3" />已是好友</span>
                  ) : persona.requestStatus === 'sent' ? (
                    <span className="text-xs text-yellow-500 flex items-center gap-1"><Clock className="w-3 h-3" />已发送</span>
                  ) : persona.requestStatus === 'received' ? (
                    <span className="text-xs text-blue-500">待处理</span>
                  ) : selectedPersona?.id === persona.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="附言（可选）"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 w-28"
                        maxLength={100}
                      />
                      <button onClick={() => handleSend(persona.id, displayName)} className="px-2 py-1 bg-purple-500 text-white rounded-lg text-sm">
                        <Send className="w-3 h-3 inline mr-1" />发送
                      </button>
                      <button onClick={() => setSelectedPersona(null)}><X className="w-4 h-4 text-gray-500" /></button>
                    </div>
                  ) : (
                    <button onClick={() => setSelectedPersona(persona)} className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm">
                      添加好友
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default AddFriendModal;