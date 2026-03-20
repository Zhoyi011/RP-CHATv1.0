import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { personaApi } from '../../services/api';

const PersonaCreate = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tags: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 处理标签：按逗号分隔，去除空格和空标签
      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      await personaApi.createRequest({
        name: formData.name,
        description: formData.description,
        tags
      });

      // 成功后跳转到角色管理页
      navigate('/persona');
    } catch (err: any) {
      setError(err.message || '创建失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* 头部 */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/persona')}
            className="text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
          >
            ← 返回角色管理
          </button>
          <h1 className="text-2xl font-bold text-gray-800">申请新角色</h1>
          <p className="text-gray-500 mt-1">填写角色信息，提交后等待管理员审核</p>
        </div>

        {/* 表单 */}
        <div className="bg-white rounded-lg shadow p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 角色名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                角色名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                placeholder="例如：暗夜骑士"
                maxLength={50}
                required
              />
              <p className="text-xs text-gray-400 mt-1">最多50个字符</p>
            </div>

            {/* 角色描述 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                角色描述 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                placeholder="描述你的角色性格、背景故事等..."
                rows={5}
                maxLength={500}
                required
              />
              <p className="text-xs text-gray-400 mt-1">最多500个字符</p>
            </div>

            {/* 标签 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                标签
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                placeholder="勇敢, 正义, 神秘 (用逗号分隔)"
              />
              <p className="text-xs text-gray-400 mt-1">多个标签用逗号分隔</p>
            </div>

            {/* 提交按钮 */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/persona')}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition disabled:opacity-50"
              >
                {loading ? '提交中...' : '提交申请'}
              </button>
            </div>
          </form>

          {/* 提示信息 */}
          <div className="mt-6 p-4 bg-blue-50 rounded">
            <p className="text-sm text-blue-700">
              <strong>审核说明：</strong><br />
              • 角色名称和描述不能包含违规内容<br />
              • 审核通过后即可在聊天室使用该角色<br />
              • 每个角色都是独一无二的，请认真填写
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonaCreate;