import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { usePermissions } from '../../hooks/usePermissions';

interface CommitEntry {
  type: 'auto' | 'manual';
  sha?: string;
  message?: string;
  title?: string;
  content?: string;
  date: string;
  author: string;
  url?: string;
}

const Changelog: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, isOwner } = usePermissions();
  const [entries, setEntries] = useState<CommitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchChangelog();
  }, []);

  const fetchChangelog = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://rp-chatv1-0.onrender.com/api/changelog');
      const data = await response.json();
      setEntries(data.entries);
    } catch (error) {
      console.error('获取更新日志失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddManual = async () => {
    if (!manualTitle || !manualContent) {
      alert('请填写标题和内容');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://rp-chatv1-0.onrender.com/api/changelog/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: manualTitle,
          content: manualContent,
          type: 'manual'
        })
      });

      if (response.ok) {
        setManualTitle('');
        setManualContent('');
        setShowManualForm(false);
        fetchChangelog();
      } else {
        alert('添加失败');
      }
    } catch (error) {
      console.error('添加失败:', error);
      alert('添加失败');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getEntryIcon = (type: string, message?: string) => {
    if (type === 'manual') return '📢';
    if (message?.toLowerCase().startsWith('feat')) return '✨';
    if (message?.toLowerCase().startsWith('fix')) return '🐛';
    if (message?.toLowerCase().startsWith('docs')) return '📝';
    if (message?.toLowerCase().startsWith('style')) return '🎨';
    if (message?.toLowerCase().startsWith('refactor')) return '♻️';
    return '💬';
  };

  const getEntryColor = (type: string, message?: string) => {
    if (type === 'manual') return 'text-purple-600';
    if (message?.toLowerCase().startsWith('feat')) return 'text-green-600';
    if (message?.toLowerCase().startsWith('fix')) return 'text-red-600';
    return 'text-blue-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-3 p-1 hover:bg-white/20 rounded-full transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold flex-1">更新日志</h1>
          {(isAdmin || isOwner) && (
            <button
              onClick={() => setShowManualForm(!showManualForm)}
              className="p-1 hover:bg-white/20 rounded-full transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 手动添加表单 */}
      {showManualForm && (
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="bg-white rounded-2xl shadow p-4 border border-gray-200">
            <h3 className="font-semibold mb-3">手动添加更新</h3>
            <input
              type="text"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="标题（如：🎉 新功能上线）"
              className="w-full p-2 border rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <textarea
              value={manualContent}
              onChange={(e) => setManualContent(e.target.value)}
              placeholder="详细内容..."
              rows={3}
              className="w-full p-2 border rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddManual}
                disabled={submitting}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
              >
                {submitting ? '添加中...' : '添加'}
              </button>
              <button
                onClick={() => setShowManualForm(false)}
                className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 内容 */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <div className="text-center py-12 text-gray-400">加载中...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-gray-400">暂无更新日志</div>
        ) : (
          entries.map((entry, index) => (
            <div
              key={entry.sha || index}
              className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition"
            >
              <div className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className={`text-2xl ${getEntryColor(entry.type, entry.message)}`}>
                    {getEntryIcon(entry.type, entry.message)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        {entry.type === 'auto' ? (
                          <span className="text-sm font-mono text-gray-400">
                            {entry.sha?.slice(0, 7)}
                          </span>
                        ) : (
                          <span className="text-sm bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                            手动
                          </span>
                        )}
                        <span className="text-sm text-gray-400">
                          {formatDate(entry.date)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {entry.author}
                      </span>
                    </div>
                    
                    {entry.type === 'auto' ? (
                      <p className="text-gray-700">
                        {entry.message}
                        {entry.url && (
                          <a
                            href={entry.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-xs text-green-500 hover:underline"
                          >
                            [查看]
                          </a>
                        )}
                      </p>
                    ) : (
                      <>
                        <h3 className="font-semibold text-gray-800">{entry.title}</h3>
                        <p className="text-gray-600 mt-1">{entry.content}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {/* 底部 */}
        <div className="text-center py-6">
          <p className="text-sm text-gray-400">
            📦 数据来自 GitHub 提交记录<br />
            自动展示 feats/fix 等类型的 commit
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <a
              href="https://github.com/Zhoyi011/RP-CHATv1.0/commits"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-green-600 hover:text-green-700"
            >
              GitHub 提交记录
            </a>
            <span className="text-gray-300">•</span>
            <button
              onClick={() => navigate('/')}
              className="text-sm text-green-600 hover:text-green-700"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Changelog;