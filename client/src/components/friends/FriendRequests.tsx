// client/src/components/friends/FriendRequests.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFriend } from '../../contexts/FriendContext';
import { Check, X, Clock, UserPlus, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

interface FriendRequestsProps {
  onAccept?: (friendId: string, username: string) => void;
}

export const FriendRequests: React.FC<FriendRequestsProps> = ({ onAccept }) => {
  const { friendRequests, acceptRequest, rejectRequest, loading } = useFriend();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAccept = async (requestId: string, fromUser: any) => {
    setProcessingId(requestId);
    const success = await acceptRequest(requestId);
    setProcessingId(null);
    if (success && onAccept) {
      onAccept(fromUser.id, fromUser.username);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    await rejectRequest(requestId);
    setProcessingId(null);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  if (loading && friendRequests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-3"></div>
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  if (friendRequests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <UserPlus className="w-16 h-16 text-gray-400 mb-3" />
        <p className="text-gray-500 mb-2">暂无好友申请</p>
        <p className="text-sm text-gray-400">添加好友后，申请会显示在这里</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          好友申请
          <span className="text-sm font-normal text-gray-500">
            ({friendRequests.length})
          </span>
        </h2>
        <p className="text-xs text-gray-400 mt-1">7天内未处理的申请将自动过期</p>
      </div>

      {/* 申请列表 */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {friendRequests.map((request) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* 头像 */}
                <img
                  src={request.fromUser?.avatar || '/default-avatar.png'}
                  alt={request.fromUser?.username}
                  className="w-12 h-12 rounded-full object-cover"
                />
                
                {/* 申请信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {request.fromUser?.username}
                    </span>
                    {request.fromUser?.role === 'admin' && (
                      <span className="px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        管理员
                      </span>
                    )}
                    {request.fromUser?.role === 'super_admin' && (
                      <span className="px-1.5 py-0.5 text-xs rounded bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                        超级管理员
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {request.message}
                  </p>
                  
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(request.createdAt)}
                    </span>
                    {request.expiresAt && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        过期时间: {new Date(request.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* 操作按钮 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(request.id, request.fromUser)}
                    disabled={processingId === request.id}
                    className={`p-2 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors ${
                      processingId === request.id ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title="同意"
                  >
                    {processingId === request.id ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleReject(request.id)}
                    disabled={processingId === request.id}
                    className={`p-2 rounded-full bg-gray-300 text-gray-700 hover:bg-gray-400 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 ${
                      processingId === request.id ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title="拒绝"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};