import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce';

interface SearchResult {
  type: 'persona' | 'room';
  _id: string;
  name: string;
  displayName?: string;
  avatar?: string;
  description?: string;
  memberCount?: number;
  tags?: string[];
  globalNumber?: number;
  usageCount?: number;
  creatorName?: string;
}

const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'persona' | 'room'>('persona');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 500);
  const navigate = useNavigate();

  useEffect(() => {
    if (debouncedSearch.length >= 1) {
      search();
    } else {
      setResults([]);
      setHasSearched(false);
    }
  }, [debouncedSearch, activeTab]);

  const search = async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      const token = localStorage.getItem('token');
      let url = '';
      if (activeTab === 'persona') {
        url = `https://rp-chatv1-0.onrender.com/api/search/personas?q=${encodeURIComponent(debouncedSearch)}`;
      } else {
        url = `https://rp-chatv1-0.onrender.com/api/search/rooms?q=${encodeURIComponent(debouncedSearch)}`;
      }
      
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (activeTab === 'persona') {
        setResults(data.personas?.map((p: any) => ({ ...p, type: 'persona' })) || []);
      } else {
        setResults(data.rooms?.map((r: any) => ({ ...r, type: 'room' })) || []);
      }
    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'persona') {
      navigate(`/persona/${result._id}`);
    } else {
      navigate(`/join/${result._id}`);
    }
  };

  const getHighlightedText = (text: string, highlight: string) => {
    if (!highlight || !text) return text;
    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} className="bg-yellow-200 rounded px-0.5">{part}</mark> : part
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 头部 */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded-lg transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索角色或群组..."
              className="w-full bg-gray-100 rounded-full pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder-gray-400"
              autoFocus
            />
          </div>
        </div>

        {/* 分类切换 */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setActiveTab('persona')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              activeTab === 'persona'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🎭 角色
          </button>
          <button
            onClick={() => setActiveTab('room')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              activeTab === 'room'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            💬 群组
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-4">
        {/* 搜索提示 */}
        {!hasSearched && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-400">输入关键词搜索角色或群组</p>
            <p className="text-xs text-gray-400 mt-2">支持模糊搜索、简繁转换</p>
          </div>
        )}

        {/* 加载状态 */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* 无结果 */}
        {!loading && hasSearched && results.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">😢</div>
            <p className="text-gray-500">没有找到相关结果</p>
            <p className="text-xs text-gray-400 mt-2">试试其他关键词</p>
          </div>
        )}

        {/* 结果列表 */}
        {!loading && results.length > 0 && (
          <div className="space-y-3">
            {/* 结果数量 */}
            <p className="text-xs text-gray-400 px-1">找到 {results.length} 个结果</p>
            
            {results.map((result, index) => (
              <div
                key={result._id || index}
                onClick={() => handleResultClick(result)}
                className="bg-white rounded-xl shadow p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition active:bg-gray-50"
              >
                {/* 头像 */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
                  {result.displayName?.charAt(0) || result.name?.charAt(0) || '?'}
                </div>
                
                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-800">
                      {getHighlightedText(result.displayName || result.name, searchTerm)}
                    </h3>
                    {result.type === 'persona' && result.globalNumber && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        #{result.globalNumber}
                      </span>
                    )}
                    {result.type === 'room' && result.memberCount !== undefined && (
                      <span className="text-xs text-gray-400">
                        {result.memberCount}人
                      </span>
                    )}
                  </div>
                  
                  {result.description && (
                    <p className="text-sm text-gray-500 truncate mt-1">
                      {getHighlightedText(result.description, searchTerm)}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    {result.type === 'persona' && result.usageCount !== undefined && (
                      <span>使用 {result.usageCount} 次</span>
                    )}
                    {result.type === 'room' && result.creatorName && (
                      <span>创建者: {result.creatorName}</span>
                    )}
                  </div>
                  
                  {/* 标签 */}
                  {result.type === 'persona' && result.tags && result.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {result.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="text-xs text-gray-400">#{tag}</span>
                      ))}
                      {result.tags.length > 3 && (
                        <span className="text-xs text-gray-400">+{result.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
                
                {/* 箭头 */}
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;