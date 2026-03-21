import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { adminApi, type User } from '../../services/api';
import { useResponsive } from '../../hooks/useResponsive';

interface Props {
  onSelectUser?: (user: User) => void;
}

const UserList: React.FC<Props> = ({ onSelectUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const currentUser = auth.currentUser;

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getUsers();
      const filtered = data.filter(u => u.email !== currentUser?.email);
      setUsers(filtered);
    } catch (error) {
      console.error('加载用户列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-amber-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 搜索栏 */}
      <div className="p-4 border-b border-gray-100">
        <div className="bg-gray-100 rounded-full px-4 py-2 flex items-center">
          <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索用户..."
            className="bg-transparent flex-1 outline-none text-sm"
          />
        </div>
      </div>

      {/* 用户列表 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-gray-400">加载中...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-400">暂无其他用户</div>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user._id}
              onClick={() => onSelectUser?.(user)}
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 ${getStatusColor(user.status)} rounded-full border-2 border-white`}></div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-medium text-gray-800 truncate">
                      {user.username}
                    </h3>
                    <span className="text-xs text-gray-400 ml-2">
                      {user.role === 'admin' ? '管理员' : user.role === 'owner' ? '所有者' : '用户'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    加入于 {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
                
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UserList;