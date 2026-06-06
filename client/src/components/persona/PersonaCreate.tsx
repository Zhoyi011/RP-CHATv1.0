// client/src/components/persona/PersonaCreate.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { personaApi } from '../../services/api';
import { useResponsive } from '../../hooks/useResponsive';
import AvatarUpload from '../common/AvatarUpload';
import AvatarFrame from '../common/AvatarFrame';
import toast from 'react-hot-toast';

const PersonaCreate = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tags: '',
    avatar: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const navigate = useNavigate();
  const { isMobile } = useResponsive();

  // 验证标签
  const validateTags = (tagsString: string): { valid: boolean; tags: string[]; error?: string } => {
    if (!tagsString.trim()) {
      return { valid: true, tags: [] };
    }
    
    const tags = tagsString.split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    if (tags.length > 5) {
      return { valid: false, tags: [], error: '标签最多5个' };
    }
    
    for (const tag of tags) {
      if (tag.length > 15) {
        return { valid: false, tags: [], error: '单个标签不能超过15个字符' };
      }
      if (!/^[\u4e00-\u9fa5a-zA-Z0-9_\u3000-\u303F]+$/.test(tag)) {
        return { valid: false, tags: [], error: '标签只能包含中文、英文、数字和下划线' };
      }
    }
    
    return { valid: true, tags };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAvatarError(false);
    
    // 🔥 头像必填验证
    if (!formData.avatar) {
      setAvatarError(true);
      toast.error('请上传角色头像');
      return;
    }
    
    // 验证名称
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      toast.error('角色名称至少需要2个字符');
      return;
    }
    
    // 验证描述
    if (!formData.description.trim() || formData.description.trim().length < 10) {
      toast.error('角色描述至少需要10个字符');
      return;
    }
    
    // 验证标签
    const tagValidation = validateTags(formData.tags);
    if (!tagValidation.valid) {
      toast.error(tagValidation.error);
      return;
    }
    
    setLoading(true);
    
    try {
      await personaApi.createRequest({
        name: formData.name.trim(),
        description: formData.description.trim(),
        tags: tagValidation.tags,
        avatar: formData.avatar  // 🔥 传递头像 URL
      });
      
      toast.success('角色申请已提交，等待审核');
      navigate('/persona');
    } catch (err: any) {
      setError(err.message || '创建失败，请稍后重试');
      toast.error(err.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = (url: string) => {
    setFormData({ ...formData, avatar: url });
    setAvatarError(false);
    toast.success('头像上传成功');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* 头部 */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/persona')}
            className="mb-4 flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>返回角色管理</span>
          </button>
          <h1 className={`font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
            申请新角色
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">填写角色信息，提交后等待管理员审核</p>
        </div>

        {/* 表单 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-blue-500 to-cyan-600"></div>
          
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 🔥 头像选择（必填） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  角色头像 <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <AvatarFrame
                      avatarUrl={formData.avatar || ''}
                      frameName={null}
                      size="lg"
                    />
                    {!formData.avatar && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                        <span className="text-white text-xs">无头像</span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAvatarUpload(true)}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                  >
                    {formData.avatar ? '更换头像' : '上传头像'}
                  </button>
                </div>
                {avatarError && (
                  <p className="text-xs text-red-500 mt-1">请上传角色头像</p>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">建议使用 1:1 比例的图片，支持 JPG、PNG、GIF</p>
              </div>

              {/* 角色名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  角色名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition dark:text-white"
                  placeholder="例如：暗夜骑士"
                  maxLength={50}
                  required
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">最多50个字符</p>
              </div>

              {/* 角色描述 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  角色描述 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none dark:text-white"
                  placeholder="描述你的角色性格、背景故事等...（至少10个字符）"
                  rows={5}
                  maxLength={500}
                  required
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {formData.description.length}/500 字符
                </p>
              </div>

              {/* 标签 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  标签
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition dark:text-white"
                  placeholder="勇敢, 正义, 神秘 (用逗号分隔，最多5个)"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  最多5个标签，每个标签最多15个字符
                </p>
              </div>

              {/* 提交按钮 */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/persona')}
                  className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-600 text-white px-4 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-cyan-700 transition disabled:opacity-50 shadow-md"
                >
                  {loading ? '提交中...' : '提交申请'}
                </button>
              </div>
            </form>

            {/* 提示信息 */}
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                <strong>📋 审核说明：</strong><br />
                • 角色名称和描述不能包含任何违规内容<br />
                • 审核通过后即可在聊天室使用该角色<br />
                • 每个角色都是独一无二的，请认真填写<br />
                • 请勿重复申请同名角色！
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 头像上传弹窗 */}
      <AnimatePresence>
        {showAvatarUpload && (
          <AvatarUpload
            currentAvatar={formData.avatar}
            onUpload={handleAvatarUpload}
            onClose={() => setShowAvatarUpload(false)}
            title={`上传 ${formData.name || '角色'} 的头像`}
            type="persona"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PersonaCreate;