import { useEffect, useState } from 'react';
import { auth } from '../firebase/config';
import { authApi, type User } from '../services/api';

type UserRole = 'owner' | 'admin' | 'user';

interface UserPermissions {
  role: UserRole;
  isOwner: boolean;
  isAdmin: boolean;
  canManageUsers: boolean;
  canManageInvites: boolean;
  canManageRoles: boolean;
  canManageCoins: boolean;
  loading: boolean;
  user: User | null;
}

export const usePermissions = (): UserPermissions => {
  const [role, setRole] = useState<UserRole>('user');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const currentUser = auth.currentUser;
        
        // 如果没有登录，设为默认 user
        if (!currentUser) {
          console.log('No user logged in');
          setRole('user');
          setLoading(false);
          return;
        }

        // 从 localStorage 获取 token
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('No token found');
          setRole('user');
          setLoading(false);
          return;
        }

        console.log('Fetching user data for:', currentUser.email);

        // 从后端获取用户信息
        const userData = await authApi.getCurrentUser();
        console.log('User data from server:', userData);
        
        setUser(userData);
        
        // 设置角色（后端返回的 role 应该是 'owner', 'admin', 或 'user'）
        if (userData.role === 'owner') {
          setRole('owner');
        } else if (userData.role === 'admin') {
          setRole('admin');
        } else {
          setRole('user');
        }
        
      } catch (error) {
        console.error('获取用户角色失败:', error);
        
        // 降级方案：如果获取失败，用邮箱判断
        const currentUser = auth.currentUser;
        if (currentUser?.email === 'zhoyi.lee@gmail.com') {
          console.log('Fallback: setting role to owner based on email');
          setRole('owner');
        } else {
          setRole('user');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  return {
    role,
    isOwner: role === 'owner',
    isAdmin: role === 'admin' || role === 'owner',
    canManageUsers: role === 'owner' || role === 'admin',
    canManageInvites: role === 'owner' || role === 'admin',
    canManageRoles: role === 'owner', // 只有 owner 可以审核角色
    canManageCoins: role === 'owner' || role === 'admin', // 管理员可以调整金币
    loading,
    user
  };
};