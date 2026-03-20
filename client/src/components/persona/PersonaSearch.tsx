// client/src/components/persona/PersonaSearch.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { personaApi, type Persona } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';

interface Props {
  onSelect?: (persona: Persona) => void;
  onClose?: () => void;
}

const PersonaSearch: React.FC<Props> = ({ onSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [using, setUsing] = useState(false);
  
  const navigate = useNavigate();
  const debouncedSearch = useDebounce(searchTerm, 500);

  const search = useCallback(async () => {
    if (!debouncedSearch.trim()) {
      setPersonas([]);
      return;
    }
    
    try {
      setLoading(true);
      const data = await personaApi.searchPersonas(debouncedSearch, page);
      setPersonas(data.personas);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    search();
  }, [search]);

  const handleUsePersona = async (persona: Persona) => {
    setUsing(true);
    try {
      await personaApi.usePersona(persona._id);
      alert(`已获得角色 ${persona.name}！`);
      if (onSelect) onSelect(persona);
      if (onClose) onClose();
      navigate('/persona');
    } catch (error: any) {
      alert(error.message || '使用失败');
    } finally {
      setUsing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'approved') return '✅ 已审核';
    if (status === 'pending') return '⏳ 审核中';
    return '❌ 已拒绝';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">搜索角色</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        {/* 搜索框 */}
        <div className="p-4 border-b">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索角色名称、标签或描述..."
            className="w-full px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            autoFocus
          />
        </div>

        {/* 结果列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-gray-400">搜索中...</div>
          ) : personas.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              {debouncedSearch ? '未找到相关角色' : '输入关键词搜索角色'}
            </div>
          ) : (
            personas.map(persona => (
              <div
                key={persona._id}
                className="bg-gray-50 rounded-xl p-4 hover:shadow-md transition"
              >
                <div className="flex items-start gap-4">
                  {/* 头像 */}
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                    {persona.name.charAt(0)}
                  </div>
                  
                  {/* 信息 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">{persona.name}</h3>
                      <span className="text-xs text-gray-400">
                        #{persona.globalNumber || '?'}
                      </span>
                      <span className="text-xs text-gray-400">
                        已使用 {persona.usageCount} 次
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {persona.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {persona.tags?.slice(0, 3).map((tag, i) => (
                        <span key={i} className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* 使用按钮 */}
                  <button
                    onClick={() => handleUsePersona(persona)}
                    disabled={using}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 transition disabled:opacity-50 whitespace-nowrap"
                  >
                    {using ? '使用中...' : '使用此角色'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="p-4 border-t flex justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              上一页
            </button>
            <span className="px-3 py-1">
              第 {page} / {totalPages} 页
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonaSearch;