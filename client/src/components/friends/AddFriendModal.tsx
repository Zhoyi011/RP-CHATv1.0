// client/src/components/friends/AddFriendModal.tsx
import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFriend } from '../../contexts/FriendContext';
import { X, Search, UserPlus, Check, Clock, Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddFriendModal: React.FC<AddFriendModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { sendRequest, searchUsers } = useFriend();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  
  // 修复：添加初始值 undefined
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleSearch = useCallback(async (term: string) => {
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    const results = await searchUsers(term);
    setSearchResults(results);
    setSearching(false);
  }, [searchUsers]);

  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    searchTimeout.current = setTimeout(() => handleSearch(term), 500);
  };

  const handleSendRequest = async (toUserId: string, username: string) => {
    setSendingId(toUserId);
    const success = await sendRequest(toUserId, customMessage || undefined);
    setSendingId(null);
    
    if (success) {
      setCustomMessage('');
      setSelectedUser(null);
      setSearchTerm('');
      setSearchResults([]);
      onSuccess?.();
    }
  };

  const handleClose = () => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    setSearchTerm('');
    setSearchResults([]);
    setSelectedUser(null);
    setCustomMessage('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* 遮罩 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/50"
        />
        
        {/* 弹窗 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden"
        >
          {/* 头部 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              添加好友
            </h2>
            <button
              onClick={handleClose}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          {/* 搜索框 */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索用户名..."
                value={searchTerm}
                onChange={onSearchChange}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border-none focus:ring-2 focus:ring-purple-500 text-sm"
                autoFocus
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
              )}
            </div>
          </div>
          
          {/* 搜索结果 */}
          <div className="max-h-96 overflow-y-auto">
            {searchTerm.length >= 2 && searchResults.length === 0 && !searching && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="w-12 h-12 text-gray-400 mb-2" />
                <p className="text-gray-500">未找到相关用户</p>
                <p className="text-xs text-gray-400 mt-1">试试输入完整的用户名</p>
              </div>
            )}
            
            {searchResults.map((user) => (
              <div
                key={user.id}
                className="p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={user.avatar || '/default-avatar.png'}
                    alt={user.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {user.username}
                      </span>
                      {user.isFriend && (
                        <span className="text-xs text-green-500 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          已是好友
                        </span>
                      )}
                      {user.requestStatus === 'sent' && (
                        <span className="text-xs text-yellow-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          已发送申请
                        </span>
                      )}
                      {user.requestStatus === 'received' && (
                        <span className="text-xs text-blue-500 flex items-center gap-1">
                          待处理申请
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                  
                  {!user.isFriend && user.requestStatus !== 'sent' && user.requestStatus !== 'received' ? (
                    selectedUser?.id === user.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="附言（可选）"
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                          className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 border-none w-32"
                          maxLength={100}
                        />
                        <button
                          onClick={() => handleSendRequest(user.id, user.username)}
                          disabled={sendingId === user.id}
                          className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {sendingId === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          发送
                        </button>
                        <button
                          onClick={() => setSelectedUser(null)}
                          className="px-2 py-1.5 text-gray-500 hover:text-gray-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition-colors"
                      >
                        添加好友
                      </button>
                    )
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          
          {/* 提示 */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-xs text-gray-500 text-center">
              添加好友后，双方可以互相发送私聊消息
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};