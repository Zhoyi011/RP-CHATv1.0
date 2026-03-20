import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { personaApi, type Persona } from '../../services/api';
import { usePermissions } from '../../hooks/usePermissions';
import PersonaSearch from './PersonaSearch';

const PersonaManager = () => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my' | 'pending'>('my');
  const [pendingPersonas, setPendingPersonas] = useState<Persona[]>([]);
  const [reviewLoading, setReviewLoading] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  
  const navigate = useNavigate();
  const { isAdmin, isOwner } = usePermissions();
  const user = auth.currentUser;

  useEffect(() => {
    loadMyPersonas();
    if (isAdmin || isOwner) {
      loadPendingPersonas();
    }
  }, [isAdmin, isOwner]);

  const loadMyPersonas = async () => {
    try {
      setLoading(true);
      const data = await personaApi.getMyPersonas();
      setPersonas(data);
    } catch (error) {
      console.error('加载角色失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingPersonas = async () => {
    try {
      const data = await personaApi.getPending();
      setPendingPersonas(data);
    } catch (error) {
      console.error('加载待审核角色失败:', error);
    }
  };

  const handleReview = async (personaId: string, status: 'approved' | 'rejected', comment?: string) => {
    setReviewLoading(personaId);
    try {
      await personaApi.reviewPersona(personaId, status, comment);
      await loadPendingPersonas();
      await loadMyPersonas();
      alert(`角色已${status === 'approved' ? '通过' : '拒绝'}`);
    } catch (error) {
      console.error('审核失败:', error);
      alert('审核失败，请重试');
    } finally {
      setReviewLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      approved: 'bg-green-100 text-green-600',
      pending: 'bg-yellow-100 text-yellow-600',
      rejected: 'bg-red-100 text-red-600'
    };
    const texts = {
      approved: '已通过',
      pending: '审核中',
      rejected: '已拒绝'
    };
    return (
      <span className={`text-xs px-2 py-1 rounded-full ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-600'}`}>
        {texts[status as keyof typeof texts] || status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/chat')}
                className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                返回聊天
              </button>
              <h1 className="text-2xl font-bold text-gray-800">角色管理</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSearch(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                搜索角色
              </button>
              <button
                onClick={() => navigate('/persona/create')}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                申请新角色
              </button>
            </div>
          </div>

          {/* 标签页 */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setActiveTab('my')}
              className={`px-4 py-2 font-medium rounded-lg transition ${
                activeTab === 'my'
                  ? 'bg-green-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              我的角色
              {personas.length > 0 && (
                <span className="ml-2 text-xs bg-white bg-opacity-20 px-2 py-0.5 rounded-full">
                  {personas.length}
                </span>
              )}
            </button>
            
            {(isAdmin || isOwner) && (
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-2 font-medium rounded-lg transition relative ${
                  activeTab === 'pending'
                    ? 'bg-green-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                待审核
                {pendingPersonas.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {pendingPersonas.length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div className="p-6">
        {activeTab === 'my' && (
          <div>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-gray-400">加载中...</div>
              </div>
            ) : personas.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 mb-4">你还没有创建任何角色</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowSearch(true)}
                    className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition inline-flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    搜索已有角色
                  </button>
                  <button
                    onClick={() => navigate('/persona/create')}
                    className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition inline-flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    创建第一个角色
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {personas.map((persona) => (
                  <div key={persona._id} className="bg-white rounded-lg shadow hover:shadow-md transition p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          onClick={() => navigate(`/persona/${persona._id}`)}
                          className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-lg cursor-pointer hover:scale-105 transition"
                        >
                          {persona.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">{persona.name}</h3>
                            {persona.globalNumber && (
                              <span className="text-xs text-gray-400">
                                #{persona.globalNumber}
                              </span>
                            )}
                          </div>
                          <div className="mt-1">{getStatusBadge(persona.status)}</div>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{persona.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {persona.tags?.map((tag, index) => (
                        <span key={index} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    
                    <div className="text-xs text-gray-400 flex items-center justify-between">
                      <span>创建于 {new Date(persona.createdAt).toLocaleDateString()}</span>
                      {persona.usageCount && persona.usageCount > 1 && (
                        <span>使用次数: {persona.usageCount}</span>
                      )}
                      {persona.status === 'rejected' && persona.reviewComment && (
                        <span className="text-red-400" title={persona.reviewComment}>
                          有备注
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {(isAdmin || isOwner) && activeTab === 'pending' && (
          <div>
            {pendingPersonas.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-500">暂无待审核的角色</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingPersonas.map((persona) => (
                  <div key={persona._id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                      {/* 左侧：角色信息 */}
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {persona.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">{persona.name}</h3>
                            <p className="text-sm text-gray-500">
                              申请人：{persona.createdBy?.username}
                            </p>
                          </div>
                        </div>
                        
                        <p className="text-gray-600 mb-4 whitespace-pre-wrap">{persona.description}</p>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                          {persona.tags?.map((tag, index) => (
                            <span key={index} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                        
                        <p className="text-xs text-gray-400">
                          申请时间：{new Date(persona.createdAt).toLocaleString()}
                        </p>
                      </div>

                      {/* 右侧：审核按钮 */}
                      <div className="flex lg:flex-col gap-2">
                        <button
                          onClick={() => {
                            const comment = window.prompt('请输入通过备注（可选）');
                            handleReview(persona._id, 'approved', comment || undefined);
                          }}
                          disabled={reviewLoading === persona._id}
                          className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition disabled:opacity-50 flex items-center justify-center gap-2 min-w-[100px]"
                        >
                          {reviewLoading === persona._id ? (
                            <>处理中...</>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              通过
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={() => {
                            const comment = window.prompt('请输入拒绝原因（必填）');
                            if (comment) {
                              handleReview(persona._id, 'rejected', comment);
                            } else {
                              alert('请输入拒绝原因');
                            }
                          }}
                          disabled={reviewLoading === persona._id}
                          className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2 min-w-[100px]"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          拒绝
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 搜索弹窗 */}
      {showSearch && (
        <PersonaSearch
          onClose={() => setShowSearch(false)}
          onSelect={() => {
            loadMyPersonas();
            setShowSearch(false);
          }}
        />
      )}
    </div>
  );
};

export default PersonaManager;