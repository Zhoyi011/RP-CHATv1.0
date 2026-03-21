import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce';

interface SearchResult {
  type: 'persona' | 'room';
  _id: string;
  name: string;
  avatar?: string;
  description?: string;
  memberCount?: number;
  tags?: string[];
  displayName?: string;
  globalNumber?: number;
}

const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'persona' | 'room'>('persona');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 500);
  const navigate = useNavigate();

  useEffect(() => {
    if (debouncedSearch.length >= 1) {
      search();
    } else {
      setResults([]);
    }
  }, [debouncedSearch, activeTab]);

  const search = async () => {
    setLoading(true);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索角色或群组..."
            className="flex-1 bg-gray-100 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            autoFocus
          />
        </div>

        <div className="flex gap-4 mt-3">
          <button
            onClick={() => setActiveTab('persona')}
            className={`px-3 py-1 rounded-full text-sm ${
              activeTab === 'persona'
                ? 'bg-green-500 text-white'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            🎭 角色
          </button>
          <button
            onClick={() => setActiveTab('room')}
            className={`px-3 py-1 rounded-full text-sm ${
              activeTab === 'room'
                ? 'bg-green-500 text-white'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            💬 群组
          </button>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-center py-8 text-gray-400">搜索中...</div>
        ) : results.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            {searchTerm ? '没有找到相关结果' : '输入关键词搜索角色或群组'}
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={index}
                onClick={() => handleResultClick(result)}
                className="bg-white rounded-xl shadow p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                  {result.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{result.displayName || result.name}</h3>
                    {result.type === 'persona' && result.globalNumber && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        #{result.globalNumber}
                      </span>
                    )}
                    {result.type === 'room' && result.memberCount && (
                      <span className="text-xs text-gray-400">{result.memberCount}人</span>
                    )}
                  </div>
                  {result.description && (
                    <p className="text-sm text-gray-500 truncate mt-1">{result.description}</p>
                  )}
                  {result.type === 'persona' && result.tags && result.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {result.tags.slice(0, 2).map((tag, i) => (
                        <span key={i} className="text-xs text-gray-400">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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