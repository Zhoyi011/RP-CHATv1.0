// client/src/pages/admin/AdminApplications.tsx
import React, { useState, useEffect } from 'react';
import { novelApi } from '../../services/api';
import { authApi, type User } from '../../services/api';
import type { AuthorApplication } from '../../types/novel';
import toast from 'react-hot-toast';
import '../../styles/novel.css';

// 扩展 Application 类型用于显示
interface Application extends AuthorApplication {
  applicantPersonaId: {
    _id: string;
    name: string;
    displayName: string;
    avatar: string;
  };
  applicantUserId: {
    _id: string;
    username: string;
    email: string;
  };
}

const AdminApplications: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  // 检查管理员权限（支持 admin、super_admin、owner）
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const userData = await authApi.getCurrentUser();
        setUser(userData);
        if (userData.role !== 'admin' && userData.role !== 'super_admin' && userData.role !== 'owner') {
          toast.error('无权限访问');
          window.location.href = '/novel';
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
        toast.error('验证权限失败');
        window.location.href = '/novel';
      }
    };
    checkAdmin();
  }, []);

  // 加载申请列表
  const loadApplications = async () => {
    try {
      const res = await novelApi.getPendingApplications();
      // 确保类型正确
      const typedApplications = res.applications as unknown as Application[];
      setApplications(typedApplications);
    } catch (error) {
      console.error('加载申请失败:', error);
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  // 审核申请
  const handleReview = async (applicationId: string, status: 'approved' | 'rejected') => {
    setReviewingId(applicationId);
    try {
      await novelApi.reviewApplication(applicationId, status);
      toast.success(status === 'approved' ? '已通过申请' : '已拒绝申请');
      loadApplications();
    } catch (error) {
      toast.error('操作失败');
    } finally {
      setReviewingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div className="rp-novel-app">
        <div className="loading-placeholder">加载中...</div>
      </div>
    );
  }

  return (
    <div className="rp-novel-app">
      <nav className="navbar">
        <div className="container">
          <div className="logo">
            <i className="fas fa-book-open"></i>
            <h1>墨香阁 - 管理员审核</h1>
          </div>
          <button className="btn-outline" onClick={() => window.location.href = '/novel'}>
            <i className="fas fa-arrow-left"></i> 返回书库
          </button>
        </div>
      </nav>

      <main className="container">
        <div className="admin-container">
          <div className="admin-header">
            <h2><i className="fas fa-user-check"></i> 作者申请审核</h2>
            <p>待处理申请: {applications.filter(a => a.status === 'pending').length} 个</p>
          </div>

          <div className="applications-list">
            {applications.length === 0 ? (
              <div className="no-applications">
                <i className="fas fa-check-circle"></i>
                <p>暂无待审核的申请</p>
              </div>
            ) : (
              applications.map(app => (
                <div key={app._id} className="application-card">
                  <div className="application-info">
                    <div className="applicant-avatar">
                      <img 
                        src={app.applicantPersonaId?.avatar || '/default-avatar.png'} 
                        alt={app.applicantPersonaId?.displayName || app.applicantPersonaId?.name || '未知'}
                      />
                    </div>
                    <div className="applicant-details">
                      <h3>{app.applicantPersonaId?.displayName || app.applicantPersonaId?.name || '未知'}</h3>
                      <p className="applicant-user">
                        <i className="fas fa-user"></i> {app.applicantUserId?.username || '未知'}
                      </p>
                      <p className="applicant-email">
                        <i className="fas fa-envelope"></i> {app.applicantUserId?.email || '未知'}
                      </p>
                      <p className="application-time">
                        <i className="fas fa-clock"></i> 申请时间: {formatDate(app.appliedAt)}
                      </p>
                    </div>
                    <div className="application-cost">
                      <i className="fas fa-gem"></i> 消耗 {app.diamondCost || 10} 钻石
                    </div>
                    <div className={`application-status ${app.status}`}>
                      {app.status === 'pending' && '待审核'}
                      {app.status === 'approved' && '已通过'}
                      {app.status === 'rejected' && '已拒绝'}
                    </div>
                  </div>
                  {app.status === 'pending' && (
                    <div className="application-actions">
                      <button
                        className="btn-approve"
                        onClick={() => handleReview(app._id, 'approved')}
                        disabled={reviewingId === app._id}
                      >
                        <i className="fas fa-check"></i> 通过
                      </button>
                      <button
                        className="btn-reject"
                        onClick={() => handleReview(app._id, 'rejected')}
                        disabled={reviewingId === app._id}
                      >
                        <i className="fas fa-times"></i> 拒绝
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminApplications;