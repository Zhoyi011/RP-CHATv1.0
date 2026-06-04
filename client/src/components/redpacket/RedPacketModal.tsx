// client/src/components/redpacket/RedPacketModal.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Send, Loader2, Users, User, Coins, MessageCircle, HelpCircle } from 'lucide-react';
import { sendRedPacket } from '../../services/redpacketApi';
import { friendApi } from '../../services/friendApi';
import toast from 'react-hot-toast';
import AvatarFrame from '../common/AvatarFrame';

interface RedPacketModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  onSuccess?: () => void;
}

type PacketType = 'random' | 'fixed' | 'personal';

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
}

const getFrameNameFromUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const match = url.match(/\/([^/]+)\.(png|webp|jpg|jpeg|gif|svg)$/i);
  if (match) return match[1].toLowerCase();
  return null;
};

export const RedPacketModal: React.FC<RedPacketModalProps> = ({
  isOpen,
  onClose,
  roomId,
  onSuccess,
}) => {
  const [packetType, setPacketType] = useState<PacketType>('random');
  const [totalAmount, setTotalAmount] = useState<number>(10);
  const [count, setCount] = useState<number>(5);
  const [message, setMessage] = useState('恭喜发财，大吉大利');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 计算固定红包平均金额
  const fixedPerAmount = packetType === 'fixed' && count > 0 
    ? Math.floor(totalAmount / count) 
    : 0;
  const remainder = packetType === 'fixed' && count > 0 
    ? totalAmount % count 
    : 0;

  // 加载好友列表（用于个人红包）
  useEffect(() => {
    if (isOpen && packetType === 'personal') {
      loadFriends();
    }
  }, [isOpen, packetType]);

  const loadFriends = async () => {
    setLoadingFriends(true);
    try {
      const response = await friendApi.getFriends();
      setFriends(response.data || []);
    } catch (error) {
      console.error('加载好友列表失败:', error);
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleSend = async () => {
    if (totalAmount < 1) {
      toast.error('红包金额必须大于0');
      return;
    }

    if (packetType !== 'personal') {
      if (count < 1) {
        toast.error('红包个数必须大于0');
        return;
      }
      if (count > totalAmount) {
        toast.error('红包个数不能超过总金额');
        return;
      }
    }

    if (packetType === 'personal' && !selectedFriend) {
      toast.error('请选择要发送的好友');
      return;
    }

    setSending(true);
    try {
      const result = await sendRedPacket({
        roomId,
        type: packetType,
        totalAmount,
        count: packetType !== 'personal' ? count : undefined,
        message: message.trim() || undefined,
        targetPersonaId: packetType === 'personal' ? selectedFriend?.friend.id : undefined,
      });

      toast.success(result.message);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error.message || '发送失败');
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
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {/* 头部 */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <Gift className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                  发红包
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 红包类型选择 */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 mb-3">红包类型</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPacketType('random')}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                    packetType === 'random'
                      ? 'bg-red-500 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  🎲 随机红包
                </button>
                <button
                  onClick={() => setPacketType('fixed')}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                    packetType === 'fixed'
                      ? 'bg-red-500 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  📦 固定红包
                </button>
                <button
                  onClick={() => setPacketType('personal')}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                    packetType === 'personal'
                      ? 'bg-red-500 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  👤 个人红包
                </button>
              </div>
            </div>

            {/* 金额 */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <label className="text-sm text-gray-500 mb-2 block">
                总金额（钻石）💎
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(Math.max(1, parseInt(e.target.value) || 0))}
                  min={1}
                  step={1}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-lg font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <span className="text-yellow-500 text-xl">💎</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                只能使用充值钻石发红包
              </p>
            </div>

            {/* 个数（非个人红包） */}
            {packetType !== 'personal' && (
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <label className="text-sm text-gray-500 mb-2 block">
                  红包个数
                </label>
                <input
                  type="number"
                  value={count}
                  onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  max={totalAmount}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-lg font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                {packetType === 'fixed' && (
                  <p className="text-xs text-gray-400 mt-2">
                    每人 {fixedPerAmount} 钻石
                    {remainder > 0 && `，最后一个人多领 ${remainder} 钻石`}
                  </p>
                )}
                {packetType === 'random' && (
                  <p className="text-xs text-gray-400 mt-2">
                    随机金额，手气最佳者会有特殊标记
                  </p>
                )}
              </div>
            )}

            {/* 祝福语 */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <label className="text-sm text-gray-500 mb-2 block">
                祝福语
              </label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 50))}
                maxLength={50}
                placeholder="恭喜发财，大吉大利"
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <p className="text-right text-xs text-gray-400 mt-1">
                {message.length}/50
              </p>
            </div>

            {/* 选择好友（个人红包） */}
            {packetType === 'personal' && (
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <label className="text-sm text-gray-500 mb-2 block">
                  选择好友
                </label>
                <input
                  type="text"
                  placeholder="搜索好友..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {loadingFriends ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  ) : filteredFriends.length === 0 ? (
                    <p className="text-center text-gray-400 py-4">
                      {searchTerm ? '没有找到相关好友' : '暂无好友，先去添加好友吧~'}
                    </p>
                  ) : (
                    filteredFriends.map((friend) => {
                      const persona = friend.friend;
                      const frameName = getFrameNameFromUrl(persona.avatarFrame || persona.equipped?.avatarFrame);
                      const isSelected = selectedFriend?.id === friend.id;
                      
                      return (
                        <button
                          key={friend.id}
                          onClick={() => setSelectedFriend(friend)}
                          className={`w-full flex items-center gap-3 p-2 rounded-xl transition ${
                            isSelected
                              ? 'bg-red-50 dark:bg-red-900/20'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
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
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
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
              </div>
            )}

            {/* 底部按钮 */}
            <div className="flex gap-3 p-4 border-t border-gray-100 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                取消
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className={`flex-1 px-4 py-2 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
                  sending
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:shadow-lg'
                }`}
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    发送中...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    塞钱进红包
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