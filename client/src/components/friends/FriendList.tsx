// client/src/components/friends/FriendList.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFriend } from '../../contexts/FriendContext';
import { 
  UserCircle, 
  Star, 
  MessageCircle, 
  MoreVertical, 
  Trash2, 
  Edit2, 
  X,
  Search,
  Users,
  UserCheck,
  StarOff
} from 'lucide-react';

interface FriendListProps {
  onSelectFriend: (friendId: string, username: string, avatar?: string) => void;
}

export const FriendList: React.FC<FriendListProps> = ({ onSelectFriend }) => {
  const { friends, removeFriend, updateFriend, loading } = useFriend();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [editingFriend, setEditingFriend] = useState<string | null>(null);
  const [editNickname, setEditNickname] = useState('');

  // 获取所有分组
  const groups = ['all', ...new Set(friends.map(f => f.group))];
  
  // 筛选好友
  const filteredFriends = friends.filter(friend => {
    const displayName = friend.nickname || friend.friend.username;
    const matchesSearch = displayName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = selectedGroup === 'all' || friend.group === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  // 按分组整理
  const groupedFriends = selectedGroup === 'all' 
    ? groups.filter(g => g !== 'all').reduce((acc, group) => {
        acc[group] = filteredFriends.filter(f => f.group === group);
        return acc;
      }, {} as Record<string, typeof friends>)
    : { [selectedGroup]: filteredFriends };

  const handleRemoveFriend = async (friendId: string, username: string) => {
    if (confirm(`确定要删除好友 ${username} 吗？`)) {
      await removeFriend(friendId);
      setMenuOpen(null);
    }
  };

  const handleEditNickname = (friend: any) => {
    setEditingFriend(friend.id);
    setEditNickname(friend.nickname || friend.friend.username);
    setMenuOpen(null);
  };

  const handleSaveNickname = async (friendId: string) => {
    if (editNickname.trim() && editNickname.trim().length <= 20) {
      await updateFriend(friendId, { nickname: editNickname.trim() });
    }
    setEditingFriend(null);
  };

  const handleToggleStar = async (friend: any) => {
    await updateFriend(friend.id, { isStarred: !friend.isStarred });
  };

  if (loading && friends.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-3"></div>
        <p className="text-gray-500">加载好友列表中...</p>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="w-16 h-16 text-gray-400 mb-3" />
        <p className="text-gray-500 mb-2">暂无好友</p>
        <p className="text-sm text-gray-400">点击顶部 + 按钮添加好友</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* 搜索栏 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索好友..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>
      </div>

      {/* 分组筛选 */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <div className="flex gap-2">
          {groups.map(group => (
            <button
              key={group}
              onClick={() => setSelectedGroup(group)}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-all ${
                selectedGroup === group
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {group === 'all' ? '全部' : group}
              {group !== 'all' && (
                <span className="ml-1 text-xs opacity-75">
                  ({friends.filter(f => f.group === group).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 好友列表 */}
      <div className="flex-1 overflow-y-auto">
        {selectedGroup === 'all' ? (
          // 分组显示
          Object.entries(groupedFriends).map(([group, groupFriends]) => (
            groupFriends.length > 0 && (
              <div key={group} className="mb-4">
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{group}</h3>
                </div>
                {groupFriends.map(friend => renderFriendItem(friend))}
              </div>
            )
          ))
        ) : (
          // 单组显示
          filteredFriends.map(friend => renderFriendItem(friend))
        )}
      </div>
    </div>
  );

  function renderFriendItem(friend: any) {
    const displayName = friend.nickname || friend.friend.username;
    const isEditing = editingFriend === friend.id;

    return (
      <motion.div
        key={friend.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -100 }}
        className="relative group border-b border-gray-100 dark:border-gray-800"
      >
        <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
          {/* 好友信息 */}
          <div 
            className="flex items-center gap-3 flex-1 cursor-pointer"
            onClick={() => onSelectFriend(friend.friend.id, displayName, friend.friend.avatar)}
          >
            <div className="relative">
              <img
                src={friend.friend.avatar || '/default-avatar.png'}
                alt={displayName}
                className="w-12 h-12 rounded-full object-cover"
              />
              {/* 在线状态点 */}
              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-900 ${
                friend.isOnline ? 'bg-green-500' : 'bg-gray-400'
              }`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {friend.isStarred && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
                {isEditing ? (
                  <input
                    type="text"
                    value={editNickname}
                    onChange={(e) => setEditNickname(e.target.value)}
                    onBlur={() => handleSaveNickname(friend.id)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveNickname(friend.id)}
                    className="text-sm font-medium bg-gray-100 dark:bg-gray-700 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-purple-500"
                    autoFocus
                    maxLength={20}
                  />
                ) : (
                  <span className="font-medium text-gray-900 dark:text-white truncate">
                    {displayName}
                  </span>
                )}
              </div>
              {friend.nickname && (
                <p className="text-xs text-gray-400 truncate">
                  @{friend.friend.username}
                </p>
              )}
              {!friend.nickname && (
                <p className="text-xs text-gray-400 truncate">
                  {friend.friend.username}
                </p>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onSelectFriend(friend.friend.id, displayName, friend.friend.avatar)}
              className="p-2 rounded-full text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
              title="发消息"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
            
            <div className="relative">
              <button
                onClick={() => setMenuOpen(menuOpen === friend.id ? null : friend.id)}
                className="p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              
              {menuOpen === friend.id && (
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10 min-w-[120px]">
                  <button
                    onClick={() => handleToggleStar(friend)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    {friend.isStarred ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                    {friend.isStarred ? '取消星标' : '设为星标'}
                  </button>
                  <button
                    onClick={() => handleEditNickname(friend)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    修改备注
                  </button>
                  <hr className="my-1 border-gray-200 dark:border-gray-700" />
                  <button
                    onClick={() => handleRemoveFriend(friend.id, displayName)}
                    className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除好友
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
};