// client/src/components/gift/GiftModal.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Send, Loader2, Heart, MessageCircle } from 'lucide-react';
import { sendGift } from '../../services/giftApi';
import { friendApi } from '../../services/friendApi';
import toast from 'react-hot-toast';
import AvatarFrame from '../common/AvatarFrame';

interface GiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  itemImage: string;
  itemPrice: number;
  onSuccess?: () => void;
}

interface Friend {
  id: string;
  friend: {
    id: string;
    name: string;
    displayName?: string;
    avatar?: string;
    sameNameNumber?: number;
    avatarFrame?: string;
    equipped?: { avatarFrame?: string };
  };
  createdAt: string;
}

const getFrameNameFromUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const match = url.match(/\/([^/]+)\.(png|webp|jpg|jpeg|gif|svg)$/i);
  if (match) return match[1].toLowerCase();
  return null;
};

export const GiftModal: React.FC<GiftModalProps> = ({
  isOpen,
  onClose,
  itemId,
  itemName,
  itemImage,
  itemPrice,
  onSuccess,
}) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadFriends();
    }
  }, [isOpen]);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const response = await friendApi.getFriends();
      const friendsData = response.data || [];
      setFriends(friendsData);
    } catch (error) {
      console.error('加载好友列表失败:', error);
      toast.error('加载好友列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSendGift = async () => {
    if (!selectedFriend) {
      toast.error('请选择要赠送的好友');
      return;
    }

    setSending(true);
    try {
      const result = await sendGift({
        toPersonaId: selectedFriend.friend.id,
        itemId,
        message: message.trim() || undefined,
      });

      toast.success(result.message);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error.message || '赠送失败');
    } finally {
      setSending(false);
    }
  };

  const filteredFriends = friends.filter(friend =>
    (friend.friend.displayName || friend.friend.name)
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-pink-500" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                  赠送礼物
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 礼物预览 */}
            <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center shadow-md">
                  <img
                    src={itemImage}
                    alt={itemName}
                    className="w-12 h-12 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.png';
                    }}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 dark:text-white">{itemName}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-yellow-500">💎</span>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {itemPrice}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">赠送后增加对方守护值</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 搜索好友 */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <input
                type="text"
                placeholder="搜索好友..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            {/* 好友列表 */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  {searchTerm ? '没有找到相关好友' : '暂无好友，先去添加好友吧~'}
                </div>
              ) : (
                filteredFriends.map((friend) => {
                  const persona = friend.friend;
                  const frameName = getFrameNameFromUrl(persona.avatarFrame || persona.equipped?.avatarFrame);
                  const isSelected = selectedFriend?.id === friend.id;
                  
                  return (
                    <button
                      key={friend.id}
                      onClick={() => setSelectedFriend(friend)}
                      className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition ${
                        isSelected ? 'bg-pink-50 dark:bg-pink-900/20' : ''
                      }`}
                    >
                      <AvatarFrame
                        avatarUrl={persona.avatar || ''}
                        frameName={frameName}
                        size="sm"
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 text-left">
                        <div className="font-medium text-gray-800 dark:text-white">
                          {persona.displayName || persona.name}
                        </div>
                        {persona.sameNameNumber && (
                          <div className="text-xs text-gray-400">#{persona.sameNameNumber}</div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* 留言输入 */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-700">
              <div className="relative">
                <MessageCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="留言（选填）"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={100}
                  className="w-full pl-9 pr-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <div className="text-right text-xs text-gray-400 mt-1">
                {message.length}/100
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="flex gap-3 p-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                取消
              </button>
              <button
                onClick={handleSendGift}
                disabled={!selectedFriend || sending}
                className={`flex-1 px-4 py-2 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
                  !selectedFriend || sending
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:shadow-lg'
                }`}
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    赠送中...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    赠送
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};