import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { useResponsive } from '../../hooks/useResponsive';
import CreateVoiceRoom from './CreateVoiceRoom';
import type { VoiceRoom } from '../../types/voice';
import { VOICE_CATEGORIES, getCategoryInfo } from '../../types/voice';

const VoiceHall: React.FC = () => {
  const [rooms, setRooms] = useState<VoiceRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const user = auth.currentUser;

  useEffect(() => {
    loadVoiceRooms();
  }, []);

  const loadVoiceRooms = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('https://rp-chatv1-0.onrender.com/api/voice/rooms', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setRooms(data.rooms || []);
    } catch (error) {
      console.error('加载语音房失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms = selectedCategory === 'all' 
    ? rooms 
    : rooms.filter(room => room.category === selectedCategory);

  const getCategoryColor = (catId: string) => {
    const cat = VOICE_CATEGORIES.find(c => c.id === catId);
    return cat?.color || 'from-gray-500 to-gray-600';
  };

  const getCategoryIcon = (catId: string) => {
    const cat = VOICE_CATEGORIES.find(c => c.id === catId);
    return cat?.icon || '🎙️';
  };

  const getCategoryName = (catId: string) => {
    const cat = VOICE_CATEGORIES.find(c => c.id === catId);
    return cat?.name || '其他';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {/* 头部 */}
      <div className="bg-black/30 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/profile')}
              className="p-2 text-gray-400 hover:text-white rounded-lg transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">语音房</h1>
              <p className="text-sm text-gray-400 hidden sm:block">与好友实时语音聊天</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 sm:px-5 py-2.5 rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition shadow-lg flex items-center gap-2 text-sm sm:text-base"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            创建语音房
          </button>
        </div>
      </div>

      {/* 分类筛选 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            key="all"
            onClick={() => setSelectedCategory('all')}
            className={`
              px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap
              ${selectedCategory === 'all' 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md' 
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }
            `}
          >
            <span className="mr-1">🌐</span>
            全部
          </button>
          {VOICE_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`
                px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap
                ${selectedCategory === cat.id 
                  ? `bg-gradient-to-r ${cat.color} text-white shadow-md` 
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }
              `}
            >
              <span className="mr-1">{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* 语音房列表 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-gray-400">加载中...</div>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎙️</div>
            <p className="text-gray-400 mb-4">暂无语音房</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-emerald-400 hover:text-emerald-300"
            >
              创建第一个语音房 →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRooms.map(room => (
              <div
                key={room._id}
                onClick={() => navigate(`/voice/${room._id}`)}
                className="group bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 hover:border-emerald-500/50 transition-all duration-300 cursor-pointer hover:scale-[1.02]"
              >
                {/* 封面区域 */}
                <div className={`relative h-32 bg-gradient-to-r ${getCategoryColor(room.category)}/20`}>
                  <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 text-xs text-white flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    {room.memberCount} 人在线
                  </div>
                  <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 text-xs text-white">
                    {getCategoryIcon(room.category)} {getCategoryName(room.category)}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <div className="bg-black/60 rounded-full p-3">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* 内容区域 */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-white mb-1 line-clamp-1">
                    {room.name}
                  </h3>
                  <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                    {room.description || '暂无描述'}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
                        {room.creatorName?.charAt(0) || '?'}
                      </div>
                      <span className="text-xs text-gray-400">{room.creatorName}</span>
                    </div>
                    <button className="text-sm text-emerald-400 hover:text-emerald-300">
                      加入 →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 创建语音房弹窗 */}
      {showCreateModal && (
        <CreateVoiceRoom
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadVoiceRooms();
          }}
        />
      )}
    </div>
  );
};

export default VoiceHall;