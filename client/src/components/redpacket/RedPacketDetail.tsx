// client/src/components/redpacket/RedPacketDetail.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, User, Clock, Crown, Loader2, CheckCircle, Coins } from 'lucide-react';
import { getRedPacketDetail, claimRedPacket, type RedPacketDetailResponse } from '../../services/redpacketApi';
import toast from 'react-hot-toast';
import AvatarFrame from '../common/AvatarFrame';

interface RedPacketDetailProps {
  isOpen: boolean;
  onClose: () => void;
  redPacketId: string;
  onClaimSuccess?: () => void;
}

const getFrameNameFromUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const match = url.match(/\/([^/]+)\.(png|webp|jpg|jpeg|gif|svg)$/i);
  if (match) return match[1].toLowerCase();
  return null;
};

export const RedPacketDetail: React.FC<RedPacketDetailProps> = ({
  isOpen,
  onClose,
  redPacketId,
  onClaimSuccess,
}) => {
  const [data, setData] = useState<RedPacketDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && redPacketId) {
      loadDetail();
    }
  }, [isOpen, redPacketId]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const result = await getRedPacketDetail(redPacketId);
      setData(result);
    } catch (error) {
      console.error('加载红包详情失败:', error);
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const result = await claimRedPacket(redPacketId);
      setClaimedAmount(result.amount);
      toast.success(result.message);
      await loadDetail();
      onClaimSuccess?.();
    } catch (error: any) {
      toast.error(error.message || '领取失败');
    } finally {
      setClaiming(false);
    }
  };

  const getTypeText = () => {
    switch (data?.redPacket.type) {
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

  const canClaim = data && 
    !data.hasClaimed && 
    data.redPacket.status === 'active' && 
    !data.isExpired;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* 头部 - 红包封面 */}
            <div className="relative bg-gradient-to-r from-red-500 to-orange-500 p-6 text-center">
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-1 hover:bg-white/20 rounded-full transition"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              
              <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                <Gift className="w-8 h-8 text-red-500" />
              </div>
              
              <h2 className="text-white text-xl font-bold">{data?.redPacket.message}</h2>
              <p className="text-white/80 text-sm mt-1">
                {data?.redPacket.sender.displayName || data?.redPacket.sender.name}
              </p>
              
              {data?.redPacket.type === 'personal' && data?.redPacket.targetPersona && (
                <p className="text-white/70 text-xs mt-2 flex items-center justify-center gap-1">
                  <User className="w-3 h-3" />
                  专属 {data.redPacket.targetPersona.displayName || data.redPacket.targetPersona.name}
                </p>
              )}
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <>
                  {/* 金额显示 */}
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-gray-800 dark:text-white">
                      💎 {data?.redPacket.totalAmount}
                    </div>
                    <p className="text-gray-400 text-sm">钻石红包</p>
                  </div>

                  {/* 抢红包按钮 */}
                  {claimedAmount !== null ? (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center mb-4">
                      <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="text-green-600 dark:text-green-400 font-medium">
                        恭喜抢到 {claimedAmount} 钻石！
                      </p>
                    </div>
                  ) : data?.hasClaimed ? (
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 text-center mb-4">
                      <p className="text-gray-500">你已经领过这个红包了</p>
                    </div>
                  ) : data?.isExpired ? (
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 text-center mb-4">
                      <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">红包已过期</p>
                    </div>
                  ) : data?.redPacket.status === 'finished' ? (
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 text-center mb-4">
                      <p className="text-gray-500">红包已被抢完</p>
                    </div>
                  ) : canClaim ? (
                    <button
                      onClick={handleClaim}
                      disabled={claiming}
                      className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition disabled:opacity-50 mb-4"
                    >
                      {claiming ? (
                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                      ) : (
                        '開'
                      )}
                    </button>
                  ) : null}

                  {/* 领取记录 */}
                  {data?.records && data.records.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-gray-700 dark:text-gray-300">
                          领取记录
                        </h3>
                        <span className="text-xs text-gray-400">
                          {data.records.length}/{data.redPacket.count}人
                        </span>
                      </div>
                      <div className="space-y-2">
                        {data.records.map((record, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700"
                          >
                            <div className="flex items-center gap-2">
                              {/* 使用 AvatarFrame size="sm" */}
                              {(record as any).avatar ? (
                                <AvatarFrame
                                  avatarUrl={(record as any).avatar}
                                  frameName={getFrameNameFromUrl((record as any).avatarFrame)}
                                  size="sm"
                                  className="flex-shrink-0"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-xs font-bold">
                                  {(record.personaName || '?').charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="text-gray-600 dark:text-gray-400 text-sm">
                                {record.personaName}
                              </span>
                              {record.isLucky && (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                  <Crown className="w-3 h-3" />
                                  手气最佳
                                </span>
                              )}
                            </div>
                            <span className="font-medium text-red-500">
                              💎 {record.amount}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 红包信息 */}
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>类型: {getTypeText()}</span>
                      <span>
                        {data?.redPacket.type !== 'personal' && `${data?.redPacket.remainingCount}/${data?.redPacket.count}`}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      发布于 {new Date(data?.redPacket.createdAt || '').toLocaleString()}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};