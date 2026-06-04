// client/src/components/redpacket/RedPacketMessage.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Gift, Users, User, Clock, Coins } from 'lucide-react';

interface RedPacketMessageProps {
  redPacketId: string;
  senderName: string;
  senderAvatar?: string;
  type: 'random' | 'fixed' | 'personal';
  totalAmount: number;
  count: number;
  remainingCount: number;
  message: string;
  targetPersonaName?: string;
  isExpired?: boolean;
  isFinished?: boolean;
  hasClaimed?: boolean;
  onClick: () => void;
}

export const RedPacketMessage: React.FC<RedPacketMessageProps> = ({
  redPacketId,
  senderName,
  senderAvatar,
  type,
  totalAmount,
  count,
  remainingCount,
  message,
  targetPersonaName,
  isExpired,
  isFinished,
  hasClaimed,
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);

  const getTypeIcon = () => {
    switch (type) {
      case 'personal':
        return <User className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const getTypeText = () => {
    switch (type) {
      case 'random':
        return '随机红包';
      case 'fixed':
        return '固定红包';
      case 'personal':
        return '专属红包';
      default:
        return '红包';
    }
  };

  const getStatusText = () => {
    if (isExpired) return '已过期';
    if (isFinished) return '已抢完';
    if (hasClaimed) return '已领取';
    return `${remainingCount}/${count}个可抢`;
  };

  const getStatusColor = () => {
    if (isExpired || isFinished) return 'text-gray-400';
    if (hasClaimed) return 'text-green-400';
    return 'text-yellow-300';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="relative cursor-pointer max-w-sm bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-3 shadow-lg hover:shadow-xl transition-all"
    >
      {/* 装饰 */}
      <div className="absolute -top-2 -left-2">
        <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
          <Gift className="w-4 h-4 text-red-500" />
        </div>
      </div>

      {/* 内容 */}
      <div className="ml-4">
        {/* 发送者 */}
        <div className="flex items-center gap-2 mb-2">
          {senderAvatar && !imageError && (
            <img
              src={senderAvatar}
              alt=""
              className="w-5 h-5 rounded-full object-cover"
              onError={() => setImageError(true)}
            />
          )}
          <span className="text-white/80 text-xs">{senderName}</span>
          <span className="text-white/60 text-xs">发起了</span>
          <span className="text-yellow-200 text-xs flex items-center gap-1">
            {getTypeIcon()}
            {getTypeText()}
          </span>
        </div>

        {/* 祝福语 */}
        <p className="text-white font-medium text-sm mb-2 line-clamp-1">
          {message}
        </p>

        {/* 金额信息 */}
        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-white text-xl font-bold">💎 {totalAmount}</span>
          <span className="text-white/70 text-xs">钻石</span>
        </div>

        {/* 红包详情 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {type === 'personal' && targetPersonaName && (
              <span className="text-white/70 text-xs flex items-center gap-1">
                <User className="w-3 h-3" />
                专属 {targetPersonaName}
              </span>
            )}
            {type !== 'personal' && (
              <span className="text-white/70 text-xs flex items-center gap-1">
                <Users className="w-3 h-3" />
                {count}个
              </span>
            )}
          </div>
          <span className={`text-xs font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* 右下角装饰 */}
      <div className="absolute -bottom-2 -right-2 opacity-20">
        <Coins className="w-12 h-12 text-white" />
      </div>
    </motion.div>
  );
};