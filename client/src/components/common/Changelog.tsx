import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../../firebase/config';
import { usePermissions } from '../../hooks/usePermissions';

interface CommitEntry {
  _id?: string;
  type: 'auto' | 'manual';
  sha?: string;
  message?: string;           // 原始消息
  formattedMessage?: string;  // 格式化后的消息
  title?: string;
  content?: string;
  date: string;
  author: string;
  url?: string;
  commitType?: string;        // feat, fix, docs, manual 等
}

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

const Changelog: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, isOwner } = usePermissions();
  const [entries, setEntries] = useState<CommitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchChangelog();
  }, []);

  const fetchChangelog = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/changelog`);
      const data = await response.json();
      setEntries(data.entries || []);
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
      const response = await fetch(`${API_BASE}/changelog/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: manualTitle,
          content: manualContent
        })
      });

      if (response.ok) {
        setManualTitle('');
        setManualContent('');
        setShowManualForm(false);
        fetchChangelog();
        alert('添加成功');
      } else {
        const data = await response.json();
        alert(data.error || '添加失败');
      }
    } catch (error) {
      console.error('添加失败:', error);
      alert('添加失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncGitHub = async () => {
    setSyncing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/changelog/sync-github`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      alert(data.message || '同步完成');
      fetchChangelog();
    } catch (error) {
      console.error('同步失败:', error);
      alert('同步失败');
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteManual = async (id: string) => {
    if (!confirm('确定要删除这条更新吗？')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/changelog/manual/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        alert('删除成功');
        fetchChangelog();
      } else {
        alert('删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCommitIcon = (commitType?: string) => {
    const icons: Record<string, string> = {
      feat: '✨',
      add: '➕',
      fix: '🐛',
      docs: '📝',
      style: '🎨',
      refactor: '♻️',
      chore: '🔧',
      perf: '⚡',
      test: '🧪',
      manual: '📢',
      other: '💬'
    };
    return icons[commitType || 'other'] || '💬';
  };

  const getCommitColor = (commitType?: string) => {
    const colors: Record<string, string> = {
      feat: 'text-green-500',
      add: 'text-green-500',
      fix: 'text-red-500',
      docs: 'text-blue-500',
      style: 'text-purple-500',
      refactor: 'text-cyan-500',
      chore: 'text-gray-500',
      perf: 'text-orange-500',
      test: 'text-emerald-500',
      manual: 'text-purple-500',
      other: 'text-gray-400'
    };
    return colors[commitType || 'other'] || 'text-gray-400';
  };

  const getCommitBg = (commitType?: string) => {
    const bgColors: Record<string, string> = {
      feat: 'bg-green-50 dark:bg-green-900/20',
      add: 'bg-green-50 dark:bg-green-900/20',
      fix: 'bg-red-50 dark:bg-red-900/20',
      docs: 'bg-blue-50 dark:bg-blue-900/20',
      style: 'bg-purple-50 dark:bg-purple-900/20',
      manual: 'bg-purple-50 dark:bg-purple-900/20',
      other: 'bg-gray-50 dark:bg-gray-800'
    };
    return bgColors[commitType || 'other'] || 'bg-gray-50 dark:bg-gray-800';
  };

  const getCommitLabel = (commitType?: string) => {
    const labels: Record<string, string> = {
      feat: '新功能',
      add: '新增',
      fix: '修复',
      docs: '文档',
      style: '样式',
      refactor: '重构',
      chore: '调整',
      perf: '性能',
      test: '测试',
      manual: '公告',
      other: '更新'
    };
    return labels[commitType || 'other'] || '更新';
  };

  // 获取显示的消息内容
  const getDisplayMessage = (entry: CommitEntry) => {
    if (entry.type === 'manual') {
      return entry.title || '';
    }
    return entry.formattedMessage || entry.message || '';
  };

  // 获取显示的详细内容
  const getDisplayContent = (entry: CommitEntry) => {
    if (entry.type === 'manual') {
      return entry.content || '';
    }
    // auto 类型：如果有格式化消息就用它，否则用原始消息
    const msg = entry.formattedMessage || entry.message || '';
    // 如果消息太长，截断
    if (msg.length > 100) {
      return msg.substring(0, 97) + '...';
    }
    return msg;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white sticky top-0 z-10 shadow-md">
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
            <div className="flex gap-1">
              <button
                onClick={handleSyncGitHub}
                disabled={syncing}
                className="p-1.5 hover:bg-white/20 rounded-full transition"
                title="同步 GitHub"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => setShowManualForm(!showManualForm)}
                className="p-1.5 hover:bg-white/20 rounded-full transition"
                title="手动添加"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 手动添加表单 */}
      <AnimatePresence>
        {showManualForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-3xl mx-auto px-4 pt-4"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 border border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                <span className="text-xl">📝</span> 手动添加更新
              </h3>
              <input
                type="text"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="标题（如：🎉 新功能上线）"
                className="w-full p-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
              <textarea
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
                placeholder="详细内容..."
                rows={3}
                className="w-full p-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleAddManual}
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-600 text-white py-2.5 rounded-xl font-medium hover:from-blue-600 hover:to-cyan-700 transition disabled:opacity-50 shadow-md"
                >
                  {submitting ? '添加中...' : '添加更新'}
                </button>
                <button
                  onClick={() => setShowManualForm(false)}
                  className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  取消
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 内容列表 */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">加载中...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            <div className="text-4xl mb-2">📭</div>
            暂无更新日志
            {(isAdmin || isOwner) && (
              <button
                onClick={handleSyncGitHub}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
              >
                同步 GitHub 记录
              </button>
            )}
          </div>
        ) : (
          entries.map((entry, index) => (
            <motion.div
              key={entry._id || entry.sha || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-200 ${getCommitBg(entry.commitType)}`}
            >
              <div className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className={`text-2xl flex-shrink-0 ${getCommitColor(entry.commitType)}`}>
                    {getCommitIcon(entry.commitType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getCommitBg(entry.commitType)} ${getCommitColor(entry.commitType)}`}>
                          {getCommitLabel(entry.commitType)}
                        </span>
                        {entry.type === 'auto' && entry.sha && (
                          <code className="text-xs font-mono text-gray-400 dark:text-gray-500">
                            {entry.sha.slice(0, 7)}
                          </code>
                        )}
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {formatDate(entry.date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {entry.author}
                        </span>
                        {(isAdmin || isOwner) && entry.type === 'manual' && (
                          <button
                            onClick={() => handleDeleteManual(entry._id!)}
                            className="text-xs text-red-400 hover:text-red-600 transition"
                            title="删除"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {getDisplayMessage(entry)}
                    </p>
                    
                    {entry.type === 'manual' && entry.content && (
                      <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 leading-relaxed">
                        {entry.content}
                      </p>
                    )}

                    {entry.type === 'auto' && entry.url && (
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-xs text-blue-500 hover:underline"
                      >
                        查看详情 →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}

        {/* 底部 */}
        <div className="text-center py-6">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            📦 数据来自 GitHub 提交记录<br />
            自动展示 feat/fix/docs/style 等类型的 commit
          </p>
          <div className="mt-4 flex justify-center gap-3 flex-wrap">
            <a
              href="https://github.com/Zhoyi011/RP-CHATv1.0/commits/main"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:text-blue-600 transition"
            >
              GitHub 提交记录 →
            </a>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <button
              onClick={() => navigate('/')}
              className="text-sm text-blue-500 hover:text-blue-600 transition"
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