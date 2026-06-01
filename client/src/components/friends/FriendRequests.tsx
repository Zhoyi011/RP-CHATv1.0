// client/src/components/friends/FriendRequests.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useFriend } from '../../contexts/FriendContext';
import AvatarFrame from '../common/AvatarFrame';
import { Check, X, Clock, UserPlus } from 'lucide-react';

interface FriendRequestsProps {
  onClose: () => void;
  onAccept?: (personaId: string, personaName: string, personaAvatar?: string) => void;
}

const FriendRequests: React.FC<FriendRequestsProps> = ({ onClose, onAccept }) => {
  const { friendRequests, acceptRequest, rejectRequest, loading } = useFriend();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAccept = async (requestId: string, fromPersona: any) => {
    setProcessingId(requestId);
    const success = await acceptRequest(requestId);
    setProcessingId(null);
    if (success && onAccept && fromPersona) {
      onAccept(fromPersona.id, fromPersona.displayName || fromPersona.name, fromPersona.avatar);
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
    if (days === 0) return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString();
  };

  if (loading && friendRequests.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          好友申请 ({friendRequests.length})
        </h2>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto">
        {friendRequests.length === 0 ? (
          <div className="text-center py-12 text-gray-500">暂无好友申请</div>
        ) : (
          friendRequests.map((request) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 border-b border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-start gap-3">
                <AvatarFrame avatarUrl={request.fromPersona?.avatar || ''} frameName={null} size="md" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {request.fromPersona?.displayName || request.fromPersona?.name}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{request.message}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {formatTime(request.createdAt)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(request.id, request.fromPersona)}
                    disabled={processingId === request.id}
                    className="p-2 rounded-full bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
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
                    className="p-2 rounded-full bg-gray-300 text-gray-700 hover:bg-gray-400 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default FriendRequests;