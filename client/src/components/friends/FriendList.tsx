// client/src/components/friends/FriendList.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useFriend } from '../../contexts/FriendContext';
import AvatarFrame from '../common/AvatarFrame';
import { Star, MessageCircle, MoreVertical, Trash2, Search, Users, StarOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface FriendListProps {
  onSelectFriend: (personaId: string, personaName: string, personaAvatar?: string, personaNumber?: number) => void;
  onClose: () => void;
}

const FriendList: React.FC<FriendListProps> = ({ onSelectFriend, onClose }) => {
  const { friends, removeFriend, loading } = useFriend();
  const [searchTerm, setSearchTerm] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const filteredFriends = friends.filter(friend => {
    const name = friend.nickname || friend.friend.displayName || friend.friend.name;
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleRemove = async (friendId: string, name: string) => {
    if (confirm(`确定要删除好友 ${name} 吗？`)) {
      await removeFriend(friendId);
      setMenuOpen(null);
    }
  };

  const getDisplayName = (friend: any) => {
    return friend.nickname || friend.friend.displayName || friend.friend.name;
  };

  if (loading && friends.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* 头部 - 简化，只有标题，没有数量，没有关闭按钮 */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          好友
        </h2>
      </div>

      {/* 搜索 */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索好友..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto">
        {filteredFriends.length === 0 ? (
          <div className="text-center py-12 text-gray-500">暂无好友</div>
        ) : (
          filteredFriends.map((friend) => {
            const displayName = getDisplayName(friend);
            return (
              <motion.div
                key={friend.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800"
              >
                <div 
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                  onClick={() => onSelectFriend(
                    friend.friend.id, 
                    displayName, 
                    friend.friend.avatar,
                    friend.friend.sameNameNumber
                  )}
                >
                  <AvatarFrame avatarUrl={friend.friend.avatar || ''} frameName={null} size="md" />
                  <div>
                    <div className="flex items-center gap-1">
                      {friend.isStarred && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                      <span className="font-medium text-gray-900 dark:text-white">{displayName}</span>
                    </div>
                    {friend.friend.sameNameNumber && (
                      <p className="text-xs text-gray-400">#{friend.friend.sameNameNumber}</p>
                    )}
                    {friend.nickname && (
                      <p className="text-xs text-gray-400">备注: {friend.nickname}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onSelectFriend(
                      friend.friend.id, 
                      displayName, 
                      friend.friend.avatar,
                      friend.friend.sameNameNumber
                    )}
                    className="p-2 rounded-full text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                    title="发消息"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === friend.id ? null : friend.id)}
                      className="p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    {menuOpen === friend.id && (
                      <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border py-1 z-10 min-w-[100px]">
                        <button
                          onClick={() => handleRemove(friend.friend.id, displayName)}
                          className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" /> 删除好友
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FriendList;