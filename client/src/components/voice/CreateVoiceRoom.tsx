import React, { useState } from 'react';
import { auth } from '../../firebase/config';
import { VOICE_CATEGORIES, getCategoryInfo } from '../../types/voice';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateVoiceRoom: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'chat',
    isPublic: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const user = auth.currentUser;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('请输入房间名称');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://rp-chatv1-0.onrender.com/api/voice/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (res.ok) {
        onSuccess();
      } else {
        setError(data.error || '创建失败');
      }
    } catch (error) {
      console.error('创建失败:', error);
      setError('创建失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (catId: string) => {
    const cat = VOICE_CATEGORIES.find(c => c.id === catId);
    return cat?.color || 'from-gray-500 to-gray-600';
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
        
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">创建语音房</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                房间名称 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-white placeholder-gray-400"
                placeholder="例如：深夜电台"
                maxLength={30}
                required
              />
              <p className="text-xs text-gray-500 mt-1">最多30个字符</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                房间描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-white placeholder-gray-400 resize-none"
                rows={3}
                placeholder="介绍一下你的语音房..."
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">最多200个字符</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                房间分类
              </label>
              <div className="grid grid-cols-3 gap-2">
                {VOICE_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat.id })}
                    className={`
                      py-2 rounded-xl text-sm font-medium transition-all
                      ${formData.category === cat.id
                        ? `bg-gradient-to-r ${cat.color} text-white shadow-md scale-[1.02]`
                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                      }
                    `}
                  >
                    <span className="mr-1">{cat.icon}</span>
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-gray-300">公开房间</span>
                  <p className="text-xs text-gray-500 mt-0.5">公开后可在大厅被搜索到</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isPublic: !formData.isPublic })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${
                    formData.isPublic ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-200 ${
                      formData.isPublic ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition disabled:opacity-50 shadow-lg"
            >
              {loading ? '创建中...' : '创建语音房'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateVoiceRoom;