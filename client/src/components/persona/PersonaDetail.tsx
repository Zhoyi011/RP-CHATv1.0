import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../../firebase/config';
import { personaApi, type Persona } from '../../services/api';
import toast from 'react-hot-toast';
import AvatarUpload from '../common/AvatarUpload';
import PersonaGuardianList from './PersonaGuardianList';
import PersonaRelationships from './PersonaRelationships';
import PersonaPosts from './PersonaPosts';
import PersonaEquipments from './PersonaEquipments';
import AIChat from '../chat/AIChat';

const PersonaDetail = () => {
  const { personaId } = useParams<{ personaId: string }>();
  const navigate = useNavigate();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'guardians' | 'relationships' | 'posts'>('info');
  const [isCurrentUserPersona, setIsCurrentUserPersona] = useState(false);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showCardPreview, setShowCardPreview] = useState(false);

  useEffect(() => {
    if (personaId) loadPersona();
  }, [personaId]);

  const loadPersona = async () => {
    try {
      setLoading(true);
      const data = await personaApi.getPersonaDetail(personaId!);
      setPersona(data);
      
      const currentUser = auth.currentUser;
      if (currentUser && data.userId === currentUser.uid) {
        setIsCurrentUserPersona(true);
      }
    } catch (error) {
      toast.error('角色不存在或已被删除');
      navigate('/persona');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (url: string) => {
    setPersona(prev => prev ? { ...prev, avatar: url } : null);
    toast.success('头像更新成功');
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

  const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
        <div className="px-4 py-3 flex items-center">
          <button onClick={() => navigate(-1)} className="mr-3 p-1 hover:bg-white/20 rounded-full transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold flex-1">角色主页</h1>
          
          {/* 操作按钮组 */}
          <div className="flex items-center gap-1">
            {/* AI 对话按钮 */}
            <button onClick={() => setShowAIChat(true)} className="p-1.5 hover:bg-white/20 rounded-full transition" title="AI 对话">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
            
            {/* 角色卡按钮 */}
            <button onClick={() => setShowCardPreview(true)} className="p-1.5 hover:bg-white/20 rounded-full transition" title="生成角色卡">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>

            {isCurrentUserPersona && (
              <button onClick={() => setShowAvatarUpload(true)} className="p-1.5 hover:bg-white/20 rounded-full transition" title="更换头像">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* 角色信息卡片 */}
        <div className="mx-4 mb-6 p-6 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
          <div className="flex items-center gap-4">
            <div className="relative cursor-pointer group" onClick={() => isCurrentUserPersona && setShowAvatarUpload(true)}>
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
                <img
                  src={persona.avatar || `https://ui-avatars.com/api/?name=${persona.name}&background=10b981&color=fff&size=96`}
                  alt={persona.name}
                  className="w-full h-full object-cover group-hover:opacity-80 transition"
                />
              </div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold">{persona.displayName || persona.name}</h2>
                {persona.globalNumber && <span className="text-sm bg-white/20 px-2 py-0.5 rounded-full">#{persona.globalNumber}</span>}
                {persona.sameNameNumber && <span className="text-sm bg-white/20 px-2 py-0.5 rounded-full">同名 #{persona.sameNameNumber}</span>}
              </div>
              <p className="text-sm opacity-90 mt-1 line-clamp-2">{persona.description}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {persona.tags?.map((tag, i) => (
                  <span key={i} className="text-xs bg-white/20 px-2 py-0.5 rounded-full">#{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 标签页 */}
        <div className="flex px-4 pb-2 gap-1 overflow-x-auto">
          {[
            { key: 'info', label: '主页' },
            { key: 'guardians', label: '守护榜', badge: persona.totalGuardianAmount },
            { key: 'relationships', label: '亲密关系', badge: persona.relationships?.length },
            { key: 'posts', label: '动态', badge: persona.postsCount },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium transition ${
                activeTab === tab.key ? 'bg-white text-green-600' : 'text-white hover:bg-white/10'
              }`}>
              {tab.label}
              {tab.badge ? <span className="ml-1 text-xs">({tab.badge})</span> : null}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-4">
        {activeTab === 'info' && (
          <div className="space-y-4">
            <PersonaEquipments persona={persona} isOwner={isCurrentUserPersona} />
            
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold mb-2">关于我</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{persona.description || '这个角色还没有介绍...'}</p>
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold mb-2">角色信息</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">创建时间</span><span>{new Date(persona.createdAt).toLocaleDateString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">浏览次数</span><span>{persona.viewCount || 0}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">获得点赞</span><span>{persona.likeCount || 0}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">同名编号</span><span>#{persona.sameNameNumber || '?'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">全局编号</span><span>#{persona.globalNumber || '?'}</span></div>
              </div>
            </div>

            {/* 生成角色卡按钮 */}
            <motion.button
              onClick={() => setShowCardPreview(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 rounded-xl font-medium shadow-md flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              生成角色卡
            </motion.button>
            
            {/* AI 对话按钮 */}
            <motion.button
              onClick={() => setShowAIChat(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-xl font-medium shadow-md flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              和 {persona.displayName || persona.name} 对话 (AI)
            </motion.button>
          </div>
        )}

        {activeTab === 'guardians' && (
          <PersonaGuardianList personaId={persona._id} guardians={persona.guardians || []} totalAmount={persona.totalGuardianAmount || 0} isOwner={isCurrentUserPersona} onUpdate={loadPersona} />
        )}

        {activeTab === 'relationships' && (
          <PersonaRelationships personaId={persona._id} relationships={persona.relationships || []} isOwner={isCurrentUserPersona} onUpdate={loadPersona} />
        )}

        {activeTab === 'posts' && (
          <PersonaPosts personaId={persona._id} isOwner={isCurrentUserPersona} />
        )}
      </div>

      {/* 头像上传弹窗 */}
      {showAvatarUpload && (
        <AvatarUpload currentAvatar={persona.avatar} onUpload={handleAvatarUpload} onClose={() => setShowAvatarUpload(false)} />
      )}

      {/* 角色卡预览弹窗 */}
      <AnimatePresence>
        {showCardPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCardPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="bg-white rounded-2xl overflow-hidden shadow-2xl max-w-xl w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="font-semibold">角色卡 · {persona.displayName || persona.name}</h3>
                <button onClick={() => setShowCardPreview(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="p-0">
                <img 
                  src={`${API_BASE}/persona/${persona._id}/card`}
                  alt="角色卡"
                  className="w-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${persona.name}&background=667eea&color=fff&size=600`;
                  }}
                />
              </div>
              <div className="p-4 flex gap-2">
                <button onClick={() => setShowCardPreview(false)} className="flex-1 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition">关闭</button>
                <a 
                  href={`${API_BASE}/persona/${persona._id}/card`}
                  download={`${persona.name}_角色卡.png`}
                  className="flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-center font-medium hover:shadow-lg transition"
                >
                  下载角色卡
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI 聊天弹窗 */}
      <AnimatePresence>
        {showAIChat && (
          <AIChat persona={persona} onClose={() => setShowAIChat(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PersonaDetail;