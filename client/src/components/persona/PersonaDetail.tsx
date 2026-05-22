import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../../firebase/config';
import { personaApi, type Persona } from '../../services/api';
import { roomApi } from '../../services/api';
import toast from 'react-hot-toast';
import AvatarUpload from '../common/AvatarUpload';
import AvatarFrame from '../common/AvatarFrame';
import PersonaGuardianList from './PersonaGuardianList';
import PersonaRelationships from './PersonaRelationships';
import PersonaPosts from './PersonaPosts';
import PersonaEquipments from './PersonaEquipments';
import AIChat from '../chat/AIChat';
import PersonaSwitchPanel from '../common/PersonaSwitchPanel';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com';

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
  const [showSwitchPanel, setShowSwitchPanel] = useState(false);
  const [availablePersonas, setAvailablePersonas] = useState<Persona[]>([]);
  const switchPanelRef = useRef<HTMLDivElement>(null);
  
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [savingBio, setSavingBio] = useState(false);

  useEffect(() => {
    if (personaId) loadPersona();
    loadAvailablePersonas();
  }, [personaId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (switchPanelRef.current && !switchPanelRef.current.contains(e.target as Node)) {
        setShowSwitchPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadPersona = async () => {
    try {
      setLoading(true);
      const data = await personaApi.getPersonaDetail(personaId!);
      setPersona(data);
      
      // 通过 API 获取当前用户信息（一劳永逸）
      const token = localStorage.getItem('token');
      if (token) {
        const userRes = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (userRes.ok) {
          const currentUser = await userRes.json();
          const isOwner = currentUser && data.userId === currentUser._id;
          setIsCurrentUserPersona(isOwner);
        } else {
          setIsCurrentUserPersona(false);
        }
      } else {
        setIsCurrentUserPersona(false);
      }
    } catch (error) {
      toast.error('角色不存在或已被删除');
      navigate('/persona');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailablePersonas = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/persona/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAvailablePersonas(data.filter((p: Persona) => p.status === 'approved'));
      }
    } catch (error) {
      console.error('加载角色列表失败:', error);
    }
  };

  const handleQuickSwitch = async (selectedPersona: Persona) => {
    try {
      await roomApi.setActivePersona(selectedPersona._id);
      localStorage.setItem('lastUsedPersonaId', selectedPersona._id);
      toast.success(`已切换至 ${selectedPersona.displayName || selectedPersona.name}`);
      navigate(`/persona/${selectedPersona._id}`);
      window.location.reload();
    } catch (error) {
      toast.error('切换失败');
    }
  };

  const handleAvatarUpload = async (url: string) => {
    setPersona(prev => prev ? { ...prev, avatar: url } : null);
    toast.success('头像更新成功');
  };

  const handleSaveBio = async () => {
    if (!persona) return;
    setSavingBio(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/persona/${persona._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ description: editBio })
      });
      
      if (response.ok) {
        setPersona(prev => prev ? { ...prev, description: editBio } : prev);
        setIsEditingBio(false);
        toast.success('简介已更新');
      } else {
        toast.error('保存失败');
      }
    } catch (error) {
      console.error('保存简介失败:', error);
      toast.error('保存失败');
    } finally {
      setSavingBio(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400 dark:text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!persona) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400 dark:text-gray-500">角色不存在</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white">
        <div className="px-4 py-3 flex items-center">
          <button onClick={() => navigate(-1)} className="mr-3 p-1 hover:bg-white/20 rounded-full transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold flex-1">角色主页</h1>
          
          <div className="flex items-center gap-1">
            {/* 更换头像按钮 - 使用 isCurrentUserPersona 控制 */}
            {isCurrentUserPersona && (
              <button 
                onClick={() => setShowAvatarUpload(true)} 
                className="p-1.5 hover:bg-white/20 rounded-full transition" 
                title="更换头像"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
            
            <button onClick={() => setShowAIChat(true)} className="p-1.5 hover:bg-white/20 rounded-full transition" title="AI 对话">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            
            <button onClick={() => setShowCardPreview(true)} className="p-1.5 hover:bg-white/20 rounded-full transition" title="生成角色卡">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mx-4 mb-6 p-6 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
          <div className="flex items-center gap-4">
            <div className="relative">
              <AvatarFrame
                avatarUrl={persona.avatar || `https://ui-avatars.com/api/?name=${persona.name}&background=3b82f6&color=fff&size=96`}
                frameUrl={persona.equipped?.avatarFrame}
                size="xl"
              />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold">{persona.displayName || persona.name}</h2>
                {persona.globalNumber && <span className="text-sm bg-white/20 px-2 py-0.5 rounded-full">#{persona.globalNumber}</span>}
                {persona.sameNameNumber && <span className="text-sm bg-white/20 px-2 py-0.5 rounded-full">同名 #{persona.sameNameNumber}</span>}
                
                {isCurrentUserPersona && availablePersonas.length > 1 && (
                  <div className="relative" ref={switchPanelRef}>
                    <button
                      onClick={() => setShowSwitchPanel(!showSwitchPanel)}
                      className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded-full transition flex items-center gap-1"
                      title="切换角色 (Tab)"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      <span>切换</span>
                    </button>
                    
                    {showSwitchPanel && (
                      <PersonaSwitchPanel
                        personas={availablePersonas}
                        currentPersona={persona}
                        onSelect={handleQuickSwitch}
                        onClose={() => setShowSwitchPanel(false)}
                        position="bottom"
                        align="left"
                      />
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {persona.tags?.slice(0, 5).map((tag, i) => (
                  <span key={i} className="text-xs bg-white/20 px-2 py-0.5 rounded-full">#{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex px-4 pb-2 gap-1 overflow-x-auto">
          {[
            { key: 'info', label: '主页', icon: '🏠' },
            { key: 'guardians', label: '守护榜', badge: persona.totalGuardianAmount, icon: '🛡️' },
            { key: 'relationships', label: '亲密关系', badge: persona.relationships?.length, icon: '💕' },
            { key: 'posts', label: '动态', badge: persona.postsCount, icon: '📝' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-1 px-4 py-2 rounded-t-lg text-sm font-medium transition ${
                activeTab === tab.key ? 'bg-white text-blue-600 shadow-sm' : 'text-white hover:bg-white/10'
              }`}>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge ? <span className="ml-1 text-xs">({tab.badge})</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'info' && (
          <div className="space-y-4">
            <PersonaEquipments persona={persona} isOwner={isCurrentUserPersona} onUpdate={loadPersona} />
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <span>📖</span> 关于我
                </h3>
                {isCurrentUserPersona && !isEditingBio && (
                  <button
                    onClick={() => {
                      setEditBio(persona.description || '');
                      setIsEditingBio(true);
                    }}
                    className="text-sm text-blue-500 hover:text-blue-600 transition"
                  >
                    编辑简介
                  </button>
                )}
              </div>
              
              {isEditingBio ? (
                <div>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    rows={4}
                    className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-none"
                    placeholder="介绍一下这个角色..."
                    maxLength={500}
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleSaveBio}
                      disabled={savingBio}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-cyan-700 transition disabled:opacity-50"
                    >
                      {savingBio ? '保存中...' : '保存'}
                    </button>
                    <button
                      onClick={() => setIsEditingBio(false)}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                    >
                      取消
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">最多500个字符</p>
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                  {persona.description || '这个角色还没有介绍...'}
                </p>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                <span>📊</span> 角色信息
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">创建时间</span>
                  <span className="text-gray-700 dark:text-gray-300">{new Date(persona.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">浏览次数</span>
                  <span className="text-gray-700 dark:text-gray-300">{persona.viewCount || 0}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">获得点赞</span>
                  <span className="text-gray-700 dark:text-gray-300">{persona.likeCount || 0}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">使用次数</span>
                  <span className="text-gray-700 dark:text-gray-300">{persona.usageCount || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">全局编号</span>
                  <span className="text-gray-700 dark:text-gray-300">#{persona.globalNumber || '?'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <motion.button
                onClick={() => setShowCardPreview(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 rounded-xl font-medium shadow-md flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                生成角色卡
              </motion.button>
              
              <motion.button
                onClick={() => setShowAIChat(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white py-3 rounded-xl font-medium shadow-md flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                AI 对话
              </motion.button>
            </div>
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

      <AnimatePresence>
        {showAvatarUpload && (
          <AvatarUpload
            currentAvatar={persona.avatar}
            onUpload={handleAvatarUpload}
            onClose={() => setShowAvatarUpload(false)}
            title={`更换 ${persona.name} 的头像`}
            type="persona"
            personaId={persona._id}
          />
        )}
      </AnimatePresence>

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
              className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-2xl max-w-xl w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">角色卡 · {persona.displayName || persona.name}</h3>
                <button onClick={() => setShowCardPreview(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
              </div>
              <div className="p-0">
                <img 
                  src={`${API_BASE}/persona/${persona._id}/card`}
                  alt="角色卡"
                  className="w-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${persona.name}&background=3b82f6&color=fff&size=600`;
                  }}
                />
              </div>
              <div className="p-4 flex gap-2">
                <button onClick={() => setShowCardPreview(false)} className="flex-1 py-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300">关闭</button>
                <a 
                  href={`${API_BASE}/persona/${persona._id}/card`}
                  download={`${persona.name}_角色卡.png`}
                  className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl text-center font-medium hover:shadow-lg transition"
                >
                  下载角色卡
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAIChat && (
          <AIChat persona={persona} onClose={() => setShowAIChat(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PersonaDetail;