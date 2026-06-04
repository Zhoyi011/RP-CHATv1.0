// client/src/components/gift/GiftMessage.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Gift, Heart, MessageCircle } from 'lucide-react';
import AvatarFrame from '../common/AvatarFrame';

interface GiftMessageProps {
  fromPersonaName: string;
  fromPersonaAvatar?: string;
  itemName: string;
  itemImage?: string;
  guardValue: number;
  message?: string;
  timestamp: string;
}

const getFrameNameFromUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const match = url.match(/\/([^/]+)\.(png|webp|jpg|jpeg|gif|svg)$/i);
  if (match) return match[1].toLowerCase();
  return null;
};

export const GiftMessage: React.FC<GiftMessageProps> = ({
  fromPersonaName,
  fromPersonaAvatar,
  itemName,
  itemImage,
  guardValue,
  message,
  timestamp,
}) => {
  const [imageError, setImageError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative max-w-sm bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-2xl p-3 shadow-md"
    >
      {/* 装饰 */}
      <div className="absolute -top-2 -left-2">
        <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center shadow-lg">
          <Gift className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* 内容 */}
      <div className="flex items-start gap-3 mt-2">
        {/* 赠送者头像 */}
        <AvatarFrame
          avatarUrl={fromPersonaAvatar || ''}
          frameName={null}
          size="sm"
          className="flex-shrink-0"
        />

        <div className="flex-1 min-w-0">
          {/* 赠送者信息 */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="font-medium text-gray-800 dark:text-white">
              {fromPersonaName}
            </span>
            <span className="text-gray-400 text-sm">赠送了</span>
            <span className="font-semibold text-pink-600 dark:text-pink-400">
              {itemName}
            </span>
          </div>

          {/* 礼物图片 */}
          {itemImage && !imageError && (
            <div className="mt-2 flex justify-center">
              <div className="w-16 h-16 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center shadow-sm">
                <img
                  src={itemImage}
                  alt={itemName}
                  className="w-12 h-12 object-contain"
                  onError={() => setImageError(true)}
                />
              </div>
            </div>
          )}

          {/* 留言 */}
          {message && (
            <div className="mt-2 flex items-start gap-1 text-sm text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-800/50 rounded-lg p-2">
              <MessageCircle className="w-3 h-3 flex-shrink-0 mt-0.5 text-gray-400" />
              <span className="break-words">{message}</span>
            </div>
          )}

          {/* 守护值 */}
          <div className="mt-2 flex items-center gap-1 text-xs">
            <Heart className="w-3 h-3 text-pink-500" />
            <span className="text-gray-500 dark:text-gray-400">
              增加 <span className="text-pink-500 font-medium">{guardValue}</span> 守护值
            </span>
          </div>

          {/* 时间 */}
          <div className="mt-1 text-[10px] text-gray-400">
            {new Date(timestamp).toLocaleString()}
          </div>
        </div>
      </div>
    </motion.div>
  );
};