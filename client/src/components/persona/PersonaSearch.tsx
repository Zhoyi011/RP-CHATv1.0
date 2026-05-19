import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { personaApi, type Persona } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import { smartConvert, isTraditional } from '../../services/translateApi';

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
  const [using, setUsing] = useState(false);
  const [converting, setConverting] = useState(false);
  
  const navigate = useNavigate();
  const debouncedSearch = useDebounce(searchTerm, 500);

  // 简繁转换函数
  const normalizeSearchTerm = useCallback(async (term: string): Promise<string> => {
    if (!term.trim()) return term;
    
    // 检测当前输入是简体还是繁体，生成另一个版本
    const isTraditionalChar = isTraditional(term);
    
    if (isTraditionalChar) {
      // 输入的是繁体，转成简体用于搜索
      const simplified = await smartConvert(term);
      console.log(`🔍 [PersonaSearch] 繁体 "${term}" → 简体 "${simplified}"`);
      return simplified;
    } else {
      // 输入的是简体，转成繁体用于搜索
      const traditional = await smartConvert(term);
      console.log(`🔍 [PersonaSearch] 简体 "${term}" → 繁体 "${traditional}"`);
      return traditional;
    }
  }, []);

  // 扩展搜索词（同时搜索简体和繁体）
  const getSearchVariants = useCallback(async (term: string): Promise<string[]> => {
    if (!term.trim()) return [term];
    
    const variants = [term];
    
    // 检测当前输入类型，添加转换版本
    const isTraditionalChar = isTraditional(term);
    
    if (isTraditionalChar) {
      // 繁体输入：添加简体版本
      const simplified = await smartConvert(term);
      if (simplified !== term) variants.push(simplified);
    } else {
      // 简体输入：添加繁体版本
      const traditional = await smartConvert(term);
      if (traditional !== term) variants.push(traditional);
    }
    
    // 去重
    return [...new Set(variants)];
  }, []);

  const search = useCallback(async () => {
    if (!debouncedSearch.trim()) {
      setPersonas([]);
      return;
    }
    
    try {
      setLoading(true);
      
      // 获取搜索词的简繁变体
      const searchVariants = await getSearchVariants(debouncedSearch);
      console.log(`🔍 [PersonaSearch] 搜索变体:`, searchVariants);
      
      // 使用第一个变体进行搜索（后端可以处理简繁）
      // 同时将变体信息传递给后端（可选）
      const data = await personaApi.searchPersonas(debouncedSearch, page);
      
      // 前端二次过滤：确保结果包含简繁匹配
      let filteredPersonas = data.personas;
      
      // 如果后端搜索不够精确，前端再过滤一次
      if (searchVariants.length > 1) {
        const lowerSearchTerms = searchVariants.map(v => v.toLowerCase());
        filteredPersonas = data.personas.filter(persona => {
          const name = (persona.displayName || persona.name).toLowerCase();
          const description = (persona.description || '').toLowerCase();
          const tags = (persona.tags || []).join(' ').toLowerCase();
          
          return lowerSearchTerms.some(term => 
            name.includes(term) || description.includes(term) || tags.includes(term)
          );
        });
      }
      
      setPersonas(filteredPersonas);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, getSearchVariants]);

  useEffect(() => {
    search();
  }, [search]);

  const handleUsePersona = async (persona: Persona) => {
    setUsing(true);
    try {
      await personaApi.usePersona(persona._id);
      alert(`已获得角色 ${persona.displayName || persona.name}！`);
      if (onSelect) onSelect(persona);
      if (onClose) onClose();
      navigate('/persona');
    } catch (error: any) {
      alert(error.message || '使用失败');
    } finally {
      setUsing(false);
    }
  };

  // 添加简繁转换按钮的处理
  const handleConvertSearch = async () => {
    if (!searchTerm.trim()) return;
    setConverting(true);
    try {
      const converted = await smartConvert(searchTerm);
      setSearchTerm(converted);
    } catch (error) {
      console.error('转换失败:', error);
    } finally {
      setConverting(false);
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'from-blue-400 to-cyan-500',
      'from-indigo-400 to-blue-500',
      'from-purple-400 to-indigo-500',
      'from-pink-400 to-rose-500',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            搜索角色
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 搜索框 */}
        <div className="p-4 border-b dark:border-gray-700">
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索角色名称、标签或描述... (支持简繁转换)"
                className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                autoFocus
              />
            </div>
            
            {/* 简繁转换按钮 */}
            <button
              onClick={handleConvertSearch}
              disabled={converting || !searchTerm.trim()}
              className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-50"
              title="简繁转换"
            >
              {converting ? (
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <span className="text-sm">简⇄繁</span>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            💡 支持简体/繁体自动转换搜索，输入简体也能找到繁体名称的角色
          </p>
        </div>

        {/* 结果列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">搜索中...</div>
          ) : personas.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              {debouncedSearch ? '未找到相关角色' : '输入关键词搜索角色'}
            </div>
          ) : (
            personas.map((persona, index) => (
              <motion.div
                key={persona._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 hover:shadow-md transition"
              >
                <div className="flex items-start gap-4">
                  {/* 头像 */}
                  <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${getAvatarColor(persona.name)} flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-md`}>
                    {persona.name.charAt(0).toUpperCase()}
                  </div>
                  
                  {/* 信息 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200">{persona.displayName || persona.name}</h3>
                      {persona.globalNumber && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">#{persona.globalNumber}</span>
                      )}
                      {persona.usageCount !== undefined && persona.usageCount > 0 && (
                        <span className="text-xs text-gray-400">🎭 {persona.usageCount}次使用</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{persona.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {persona.tags?.slice(0, 3).map((tag, i) => (
                        <span key={i} className="text-xs text-gray-400 dark:text-gray-500 bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* 使用按钮 */}
                  <button
                    onClick={() => handleUsePersona(persona)}
                    disabled={using}
                    className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-blue-600 hover:to-cyan-700 transition disabled:opacity-50 whitespace-nowrap shadow-md"
                  >
                    {using ? '使用中...' : '+ 使用此角色'}
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="p-4 border-t dark:border-gray-700 flex justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              上一页
            </button>
            <span className="px-3 py-1 text-gray-600 dark:text-gray-400">
              第 {page} / {totalPages} 页
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              下一页
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default PersonaSearch;