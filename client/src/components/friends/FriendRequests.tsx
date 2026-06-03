// client/src/components/friends/FriendRequests.tsx
import React, { useState } from 'react';
import { useFriend } from '../../contexts/FriendContext';
import AvatarFrame from '../common/AvatarFrame';
import { Check, X, Clock, UserPlus, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface FriendRequestsProps {
  onClose: () => void;
  onAccept?: (personaId: string, personaName: string, personaAvatar?: string) => void;
  onMessage?: (personaId: string, personaName: string, personaAvatar?: string) => void;
}

const FriendRequests: React.FC<FriendRequestsProps> = ({ onClose, onAccept, onMessage }) => {
  const { requests, acceptRequest, rejectRequest } = useFriend();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAccept = async (request: any) => {
    setProcessingId(request.id);
    const success = await acceptRequest(request.id);
    setProcessingId(null);
    if (success && onAccept) {
      onAccept(request.fromPersona.id, request.fromPersona.displayName || request.fromPersona.name, request.fromPersona.avatar);
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
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          好友申请 ({requests.length})
        </h2>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {requests.length === 0 ? (
          <div className="text-center py-12 text-gray-500">暂无好友申请</div>
        ) : (
          requests.map((request) => {
            const displayName = request.fromPersona.displayName || request.fromPersona.name;
            return (
              <div key={request.id} className="p-4 border-b hover:bg-gray-50">
                <div className="flex items-start gap-3">
                  <AvatarFrame avatarUrl={request.fromPersona.avatar || ''} frameName={null} size="md" />
                  <div className="flex-1">
                    <div className="font-medium">{displayName}</div>
                    {request.fromPersona.sameNameNumber && (
                      <div className="text-xs text-gray-400">#{request.fromPersona.sameNameNumber}</div>
                    )}
                    <p className="text-sm text-gray-500 mt-1">{request.message}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {formatTime(request.createdAt)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(request)}
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
                      className="p-2 rounded-full bg-gray-300 text-gray-700 hover:bg-gray-400 disabled:opacity-50"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    {onMessage && (
                      <button
                        onClick={() => onMessage(request.fromPersona.id, displayName, request.fromPersona.avatar)}
                        className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FriendRequests;