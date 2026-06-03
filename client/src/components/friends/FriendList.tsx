// client/src/components/friends/FriendList.tsx
import React, { useState } from 'react';
import { useFriend } from '../../contexts/FriendContext';
import AvatarFrame from '../common/AvatarFrame';
import { Search, Users, MessageCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface FriendListProps {
  onSelectFriend: (personaId: string, personaName: string, personaAvatar?: string, personaNumber?: number) => void;
  onClose: () => void;
}

const FriendList: React.FC<FriendListProps> = ({ onSelectFriend, onClose }) => {
  const { friends, removeFriend } = useFriend();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFriends = friends.filter(f => {
    const name = f.friend.displayName || f.friend.name;
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleRemove = async (friendId: string, name: string) => {
    if (confirm(`确定删除好友 ${name} 吗？`)) {
      await removeFriend(friendId);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          好友 ({friends.length})
        </h2>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索好友..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredFriends.length === 0 ? (
          <div className="text-center py-12 text-gray-500">暂无好友</div>
        ) : (
          filteredFriends.map((friend) => {
            const displayName = friend.friend.displayName || friend.friend.name;
            return (
              <div key={friend.id} className="flex items-center justify-between p-3 border-b hover:bg-gray-50">
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
                    <div className="font-medium">{displayName}</div>
                    {friend.friend.sameNameNumber && (
                      <div className="text-xs text-gray-400">#{friend.friend.sameNameNumber}</div>
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
                    className="p-2 rounded-full text-gray-400 hover:text-purple-500 hover:bg-purple-50"
                    title="发消息"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleRemove(friend.friend.id, displayName)}
                    className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50"
                    title="删除"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FriendList;