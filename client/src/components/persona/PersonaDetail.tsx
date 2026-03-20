import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { personaApi, type Persona } from '../../services/api';
import { usePermissions } from '../../hooks/usePermissions';
import toast from 'react-hot-toast';
import AvatarUpload from '../common/AvatarUpload';

// 子组件
import PersonaGuardianList from './PersonaGuardianList';
import PersonaRelationships from './PersonaRelationships';
import PersonaPosts from './PersonaPosts';
import PersonaEquipments from './PersonaEquipments';

const PersonaDetail = () => {
  const { personaId } = useParams<{ personaId: string }>();
  const navigate = useNavigate();
  const { isOwner } = usePermissions();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'guardians' | 'relationships' | 'posts'>('info');
  const [isCurrentUserPersona, setIsCurrentUserPersona] = useState(false);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);

  useEffect(() => {
    if (personaId) {
      loadPersona();
    }
  }, [personaId]);

  const loadPersona = async () => {
    try {
      setLoading(true);
      const data = await personaApi.getPersonaDetail(personaId!);
      setPersona(data);
      
      // 检查是否是当前用户的角色
      const currentUser = auth.currentUser;
      if (currentUser && data.createdBy?._id === currentUser.uid) {
        setIsCurrentUserPersona(true);
      }
    } catch (error) {
      console.error('加载角色失败:', error);
      toast.error('角色不存在或已被删除');
      navigate('/persona');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (url: string) => {
    try {
      // TODO: 调用后端更新头像 API
      // await personaApi.updateAvatar(personaId!, url);
      setPersona(prev => prev ? { ...prev, avatar: url } : null);
      toast.success('头像更新成功');
    } catch (error) {
      toast.error('头像更新失败');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (!persona) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">角色不存在</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部背景 */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
        <div className="px-4 py-3 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-3 p-1 hover:bg-white/20 rounded-full transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold flex-1">角色主页</h1>
          {isCurrentUserPersona && (
            <button
              onClick={() => navigate(`/persona/${personaId}/edit`)}
              className="p-1 hover:bg-white/20 rounded-full transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
        </div>

        {/* 角色信息卡片 */}
        <div className="mx-4 mb-6 p-6 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
          <div className="flex items-center gap-4">
            {/* 头像 - 可点击上传 */}
            <div 
              className="relative cursor-pointer group" 
              onClick={() => isCurrentUserPersona && setShowAvatarUpload(true)}
            >
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
                <img
                  src={persona.avatar || `https://ui-avatars.com/api/?name=${persona.name}&background=10b981&color=fff&size=96`}
                  alt={persona.name}
                  className="w-full h-full object-cover group-hover:opacity-80 transition"
                />
              </div>
              {isCurrentUserPersona && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold">{persona.name}</h2>
                {persona.globalNumber && (
                  <span className="text-sm bg-white/20 px-2 py-0.5 rounded-full">
                    #{persona.globalNumber}
                  </span>
                )}
              </div>
              <p className="text-sm opacity-90 mt-1 line-clamp-2">{persona.description}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {persona.tags?.map((tag, i) => (
                  <span key={i} className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 标签页 */}
        <div className="flex px-4 pb-2 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition ${
              activeTab === 'info' ? 'bg-white text-green-600' : 'text-white hover:bg-white/10'
            }`}
          >
            主页
          </button>
          <button
            onClick={() => setActiveTab('guardians')}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition ${
              activeTab === 'guardians' ? 'bg-white text-green-600' : 'text-white hover:bg-white/10'
            }`}
          >
            守护榜
            {persona.totalGuardianAmount && persona.totalGuardianAmount > 0 && (
              <span className="ml-1 text-xs">({persona.totalGuardianAmount})</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('relationships')}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition ${
              activeTab === 'relationships' ? 'bg-white text-green-600' : 'text-white hover:bg-white/10'
            }`}
          >
            亲密关系
            {persona.relationships && persona.relationships.length > 0 && (
              <span className="ml-1 text-xs">({persona.relationships.length})</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition ${
              activeTab === 'posts' ? 'bg-white text-green-600' : 'text-white hover:bg-white/10'
            }`}
          >
            动态
            {persona.postsCount && persona.postsCount > 0 && (
              <span className="ml-1 text-xs">({persona.postsCount})</span>
            )}
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-4">
        {activeTab === 'info' && (
          <div className="space-y-4">
            {/* 装备展示 */}
            <PersonaEquipments persona={persona} isOwner={isCurrentUserPersona} />
            
            {/* 角色简介 */}
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold mb-2">关于我</h3>
              <p className="text-gray-600 whitespace-pre-wrap">
                {persona.description || '这个角色还没有介绍...'}
              </p>
            </div>

            {/* 角色信息 */}
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold mb-2">角色信息</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">创建时间</span>
                  <span>{new Date(persona.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">浏览次数</span>
                  <span>{persona.viewCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">获得点赞</span>
                  <span>{persona.likeCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">使用次数</span>
                  <span>{persona.usageCount || 1}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'guardians' && (
          <PersonaGuardianList
            personaId={persona._id}
            guardians={persona.guardians || []}
            totalAmount={persona.totalGuardianAmount || 0}
            isOwner={isCurrentUserPersona}
            onUpdate={loadPersona}
          />
        )}

        {activeTab === 'relationships' && (
          <PersonaRelationships
            personaId={persona._id}
            relationships={persona.relationships || []}
            isOwner={isCurrentUserPersona}
            onUpdate={loadPersona}
          />
        )}

        {activeTab === 'posts' && (
          <PersonaPosts
            personaId={persona._id}
            isOwner={isCurrentUserPersona}
          />
        )}
      </div>

      {/* 头像上传弹窗 */}
      {showAvatarUpload && (
        <AvatarUpload
          currentAvatar={persona.avatar}
          onUpload={handleAvatarUpload}
          onClose={() => setShowAvatarUpload(false)}
        />
      )}
    </div>
  );
};

export default PersonaDetail;