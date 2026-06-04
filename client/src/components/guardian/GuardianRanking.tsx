// client/src/components/guardian/GuardianRanking.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Heart, Gift, Trophy, Medal, Star, ChevronRight, Loader2 } from 'lucide-react';
import { getGuardianRanking, getPersonaGuardians, getMySentGuardian } from '../../services/guardianApi';
import type { GuardianRankingItem } from '../../types/gift';
import AvatarFrame from '../common/AvatarFrame';
import toast from 'react-hot-toast';

interface GuardianRankingProps {
  personaId?: string;  // 可选：如果传入，显示该角色的守护者列表
  onClose?: () => void;
}

const getFrameNameFromUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const match = url.match(/\/([^/]+)\.(png|webp|jpg|jpeg|gif|svg)$/i);
  if (match) return match[1].toLowerCase();
  return null;
};

// 排名徽章组件
const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
  if (rank === 1) {
    return <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg"><Crown className="w-4 h-4 text-white" /></div>;
  }
  if (rank === 2) {
    return <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center shadow-lg"><Medal className="w-4 h-4 text-white" /></div>;
  }
  if (rank === 3) {
    return <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center shadow-lg"><Medal className="w-4 h-4 text-white" /></div>;
  }
  return <div className="w-8 h-8 bg-gray-700 dark:bg-gray-600 rounded-full flex items-center justify-center text-white text-sm font-bold">#{rank}</div>;
};

export const GuardianRanking: React.FC<GuardianRankingProps> = ({ personaId, onClose }) => {
  const [ranking, setRanking] = useState<GuardianRankingItem[]>([]);
  const [guardians, setGuardians] = useState<any[]>([]);
  const [mySent, setMySent] = useState<{ totalSent: number; totalGifts: number; sentList: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'global' | 'my'>('global');
  const [selectedPersonaGuardians, setSelectedPersonaGuardians] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [personaId]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (personaId) {
        // 加载特定角色的守护者
        const guardiansData = await getPersonaGuardians(personaId);
        setGuardians(guardiansData.guardians);
        setSelectedPersonaGuardians({
          totalGuardValue: guardiansData.totalGuardValue,
          totalGuardians: guardiansData.totalGuardians
        });
        setActiveTab('global');
      } else {
        // 加载全局守护榜
        const rankingData = await getGuardianRanking(50);
        setRanking(rankingData.ranking);
        
        // 加载我送出的守护
        try {
          const mySentData = await getMySentGuardian();
          setMySent(mySentData);
        } catch (e) {
          console.error('加载我的守护统计失败:', e);
        }
      }
    } catch (error) {
      console.error('加载守护榜失败:', error);
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 如果是特定角色的守护者页面
  if (personaId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* 头部 */}
        <div className="sticky top-0 z-20 bg-gradient-to-r from-pink-500 to-purple-600 text-white">
          <div className="px-4 py-3 flex items-center">
            {onClose && (
              <button onClick={onClose} className="mr-3 p-1 hover:bg-white/20 rounded-full transition">
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
            )}
            <h1 className="text-lg font-semibold flex-1">守护榜</h1>
          </div>
        </div>

        {/* 统计卡片 */}
        {selectedPersonaGuardians && (
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm text-center">
                <Heart className="w-5 h-5 text-pink-500 mx-auto mb-1" />
                <div className="text-xl font-bold text-gray-800 dark:text-white">
                  {selectedPersonaGuardians.totalGuardValue}
                </div>
                <div className="text-xs text-gray-400">总守护值</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm text-center">
                <Gift className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                <div className="text-xl font-bold text-gray-800 dark:text-white">
                  {selectedPersonaGuardians.totalGuardians}
                </div>
                <div className="text-xs text-gray-400">守护者人数</div>
              </div>
            </div>
          </div>
        )}

        {/* 守护者列表 */}
        <div className="px-4 pb-8">
          <h2 className="font-medium text-gray-700 dark:text-gray-300 mb-3">守护者列表</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : guardians.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              暂无守护者，快去送礼物成为第一个吧~
            </div>
          ) : (
            <div className="space-y-2">
              {guardians.map((guardian, index) => {
                const frameName = getFrameNameFromUrl(guardian.avatarFrame);
                return (
                  <div
                    key={guardian.personaId}
                    className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm flex items-center gap-3"
                  >
                    <div className="w-8 text-center">
                      {index < 3 ? (
                        index === 0 ? <Crown className="w-5 h-5 text-yellow-500" />
                          : index === 1 ? <Medal className="w-5 h-5 text-gray-400" />
                          : <Medal className="w-5 h-5 text-amber-600" />
                      ) : (
                        <span className="text-gray-400 text-sm">{index + 1}</span>
                      )}
                    </div>
                    <AvatarFrame
                      avatarUrl={guardian.avatar || ''}
                      frameName={frameName}
                      size="sm"
                      className="flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 dark:text-white truncate">
                        {guardian.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        送礼 {guardian.giftCount} 次
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-pink-500">
                        💎 {guardian.totalAmount}
                      </div>
                      <div className="text-xs text-gray-400">守护值</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 全局守护榜页面
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 头部 */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-pink-500 to-purple-600 text-white">
        <div className="px-4 py-3 flex items-center">
          {onClose && (
            <button onClick={onClose} className="mr-3 p-1 hover:bg-white/20 rounded-full transition">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
          )}
          <h1 className="text-lg font-semibold flex-1">守护榜</h1>
          <Trophy className="w-5 h-5 text-yellow-300" />
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <button
          onClick={() => setActiveTab('global')}
          className={`flex-1 py-3 text-sm font-medium transition relative ${
            activeTab === 'global'
              ? 'text-pink-600 dark:text-pink-400'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          全站守护榜
          {activeTab === 'global' && (
            <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-pink-500 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`flex-1 py-3 text-sm font-medium transition relative ${
            activeTab === 'my'
              ? 'text-pink-600 dark:text-pink-400'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          我的守护
          {activeTab === 'my' && (
            <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-pink-500 rounded-full" />
          )}
        </button>
      </div>

      {/* 内容 */}
      <div className="p-4 pb-8">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : activeTab === 'global' ? (
          <>
            {/* 榜單前三名特殊展示 */}
            {ranking.length > 0 && (
              <div className="flex justify-around items-end mb-6">
                {/* 第二名 */}
                {ranking[1] && (
                  <div className="text-center">
                    <div className="relative">
                      <div className="w-16 h-16 mx-auto mb-2">
                        <AvatarFrame
                          avatarUrl={ranking[1].avatar || ''}
                          frameName={getFrameNameFromUrl(ranking[1].avatarFrame)}
                          size="lg"
                          className="mx-auto"
                        />
                      </div>
                      <Medal className="w-6 h-6 text-gray-400 absolute -top-2 left-1/2 transform -translate-x-1/2" />
                    </div>
                    <div className="font-medium text-sm text-gray-800 dark:text-white truncate max-w-[80px]">
                      {ranking[1].displayName || ranking[1].name}
                    </div>
                    <div className="text-xs text-pink-500">💎 {ranking[1].guardianValue}</div>
                    <div className="text-xs text-gray-400">亚军</div>
                  </div>
                )}

                {/* 第一名 */}
                {ranking[0] && (
                  <div className="text-center -mt-4">
                    <div className="relative">
                      <div className="w-20 h-20 mx-auto mb-2">
                        <AvatarFrame
                          avatarUrl={ranking[0].avatar || ''}
                          frameName={getFrameNameFromUrl(ranking[0].avatarFrame)}
                          size="xl"
                          className="mx-auto ring-4 ring-yellow-400 rounded-full"
                        />
                      </div>
                      <Crown className="w-8 h-8 text-yellow-500 absolute -top-4 left-1/2 transform -translate-x-1/2" />
                    </div>
                    <div className="font-bold text-gray-800 dark:text-white truncate max-w-[100px]">
                      {ranking[0].displayName || ranking[0].name}
                    </div>
                    <div className="text-sm text-pink-500 font-bold">💎 {ranking[0].guardianValue}</div>
                    <div className="text-xs text-gray-400">冠军</div>
                  </div>
                )}

                {/* 第三名 */}
                {ranking[2] && (
                  <div className="text-center">
                    <div className="relative">
                      <div className="w-16 h-16 mx-auto mb-2">
                        <AvatarFrame
                          avatarUrl={ranking[2].avatar || ''}
                          frameName={getFrameNameFromUrl(ranking[2].avatarFrame)}
                          size="lg"
                          className="mx-auto"
                        />
                      </div>
                      <Medal className="w-6 h-6 text-amber-600 absolute -top-2 left-1/2 transform -translate-x-1/2" />
                    </div>
                    <div className="font-medium text-sm text-gray-800 dark:text-white truncate max-w-[80px]">
                      {ranking[2].displayName || ranking[2].name}
                    </div>
                    <div className="text-xs text-pink-500">💎 {ranking[2].guardianValue}</div>
                    <div className="text-xs text-gray-400">季军</div>
                  </div>
                )}
              </div>
            )}

            {/* 榜單列表 */}
            <div className="space-y-2">
              {ranking.slice(3).map((item, index) => {
                const frameName = getFrameNameFromUrl(item.avatarFrame);
                const rank = index + 4;
                return (
                  <div
                    key={item._id}
                    className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm flex items-center gap-3"
                  >
                    <RankBadge rank={rank} />
                    <AvatarFrame
                      avatarUrl={item.avatar || ''}
                      frameName={frameName}
                      size="sm"
                      className="flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 dark:text-white truncate">
                        {item.displayName || item.name}
                      </div>
                      {item.giftCount > 0 && (
                        <div className="text-xs text-gray-400">
                          {item.giftCount} 人送礼
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-pink-500">
                        💎 {item.guardianValue}
                      </div>
                      <div className="text-xs text-gray-400">守护值</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {ranking.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                暂无守护榜数据
              </div>
            )}
          </>
        ) : (
          // 我的守护标签页
          <div>
            {/* 统计卡片 */}
            {mySent && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm text-center">
                  <Heart className="w-5 h-5 text-pink-500 mx-auto mb-1" />
                  <div className="text-xl font-bold text-gray-800 dark:text-white">
                    {mySent.totalSent}
                  </div>
                  <div className="text-xs text-gray-400">总送出守护值</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm text-center">
                  <Gift className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                  <div className="text-xl font-bold text-gray-800 dark:text-white">
                    {mySent.totalGifts}
                  </div>
                  <div className="text-xs text-gray-400">送礼次数</div>
                </div>
              </div>
            )}

            {/* 我守护的角色列表 */}
            <h2 className="font-medium text-gray-700 dark:text-gray-300 mb-3">我守护的角色</h2>
            {mySent?.sentList.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                还没有送过礼物，快去商城挑选礼物吧~
              </div>
            ) : (
              <div className="space-y-2">
                {mySent?.sentList.map((item, index) => {
                  const frameName = getFrameNameFromUrl(item.avatarFrame);
                  return (
                    <div
                      key={item.personaId}
                      className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm flex items-center gap-3"
                    >
                      <div className="w-8 text-center">
                        <Star className="w-4 h-4 text-pink-500" />
                      </div>
                      <AvatarFrame
                        avatarUrl={item.avatar || ''}
                        frameName={frameName}
                        size="sm"
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 dark:text-white truncate">
                          {item.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          最后送礼: {new Date(item.lastGiftAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-pink-500">
                          💎 {item.totalAmount}
                        </div>
                        <div className="text-xs text-gray-400">{item.giftCount} 次</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};