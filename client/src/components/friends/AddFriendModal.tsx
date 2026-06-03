// client/src/components/friends/AddFriendModal.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useFriend } from '../../contexts/FriendContext';
import AvatarFrame from '../common/AvatarFrame';
import { X, Search, UserPlus, Check, Clock, Send, Loader2, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePersonas?: any[]; // 可选，当前用户的所有角色
}

const AddFriendModal: React.FC<AddFriendModalProps> = ({ isOpen, onClose, availablePersonas = [] }) => {
  const { sendRequest, searchPersonas } = useFriend();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<any | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<any | null>(null);
  const [step, setStep] = useState<'search' | 'confirm'>('search');
  
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 重置状态
  useEffect(() => {
    if (!isOpen) {
      // 弹窗关闭时重置
      setTimeout(() => {
        setStep('search');
        setSelectedTarget(null);
        setSelectedPersona(null);
        setMessage('');
        setSearchTerm('');
        setResults([]);
      }, 300);
    }
  }, [isOpen]);

  const handleSearch = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const data = await searchPersonas(term);
    setResults(data);
    setSearching(false);
  }, [searchPersonas]);

  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => handleSearch(term), 500);
  };

  const handleSelectTarget = (persona: any) => {
    setSelectedTarget(persona);
    // 如果只有一个角色可用，自动选中
    if (availablePersonas.length === 1) {
      setSelectedPersona(availablePersonas[0]);
    }
    setStep('confirm');
  };

  const handleSend = async () => {
    if (!selectedTarget || !selectedPersona) {
      toast.error('请选择要使用的角色');
      return;
    }
    
    const toPersonaId = selectedTarget.id;
    const targetName = selectedTarget.displayName || selectedTarget.name;
    
    setSendingId(toPersonaId);
    const success = await sendRequest(toPersonaId, message || undefined);
    setSendingId(null);
    
    if (success) {
      setStep('search');
      setSelectedTarget(null);
      setSelectedPersona(null);
      setMessage('');
      setSearchTerm('');
      setResults([]);
      onClose();
      toast.success(`已向 ${targetName} 发送好友申请`);
    }
  };

  const handleBack = () => {
    setStep('search');
    setSelectedTarget(null);
    setSelectedPersona(null);
    setMessage('');
  };

  if (!isOpen) return null;

  // 搜索步骤
  if (step === 'search') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              添加好友
            </h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索角色..."
                value={searchTerm}
                onChange={onSearchChange}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                autoFocus
              />
              {searching && <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {searchTerm.length >= 2 && results.length === 0 && !searching && (
              <div className="text-center py-8 text-gray-500">未找到相关角色</div>
            )}
            {results.map((persona) => {
              const displayName = persona.displayName || persona.name;
              const isSelected = selectedTarget?.id === persona.id;
              
              return (
                <div
                  key={persona.id}
                  className={`p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition cursor-pointer ${
                    isSelected ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                  }`}
                  onClick={() => handleSelectTarget(persona)}
                >
                  <div className="flex items-center gap-3">
                    <AvatarFrame avatarUrl={persona.avatar || ''} frameName={null} size="md" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">{displayName}</div>
                      {persona.sameNameNumber && (
                        <div className="text-xs text-gray-400">#{persona.sameNameNumber}</div>
                      )}
                    </div>
                    {persona.isFriend && (
                      <span className="text-xs text-green-500 flex items-center gap-1">
                        <Check className="w-3 h-3" />已是好友
                      </span>
                    )}
                    {persona.requestStatus === 'sent' && (
                      <span className="text-xs text-yellow-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />已发送
                      </span>
                    )}
                    {persona.requestStatus === 'received' && (
                      <span className="text-xs text-blue-500">待处理</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    );
  }

  // 确认步骤：选择角色 + 填写理由
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden"
      >
        {/* 头部 */}
        <div className="p-5 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="p-1 rounded-full hover:bg-white/20 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <AvatarFrame avatarUrl={selectedTarget?.avatar || ''} frameName={null} size="md" />
            <div>
              <h3 className="font-bold text-lg">{selectedTarget?.displayName || selectedTarget?.name}</h3>
              {selectedTarget?.sameNameNumber && (
                <p className="text-sm text-purple-200">#{selectedTarget.sameNameNumber}</p>
              )}
            </div>
          </div>
          <p className="text-sm text-purple-200 mt-2 ml-9">选择角色并填写申请理由</p>
        </div>

        {/* 选择角色 */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            使用哪个角色发送申请？
          </label>
          <div className="flex flex-wrap gap-2">
            {availablePersonas.length === 0 ? (
              <p className="text-sm text-gray-400">加载中...</p>
            ) : (
              availablePersonas.map((persona) => {
                const isSelected = selectedPersona?._id === persona._id;
                const displayName = persona.displayName || persona.name;
                return (
                  <button
                    key={persona._id}
                    onClick={() => setSelectedPersona(persona)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-purple-500 text-white shadow-md scale-105'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <AvatarFrame avatarUrl={persona.avatar || ''} frameName={null} size="sm" />
                    <span className="text-sm">{displayName}</span>
                    {persona.sameNameNumber && (
                      <span className="text-xs opacity-70">#{persona.sameNameNumber}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 申请理由 */}
        <div className="p-5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            申请理由 <span className="text-gray-400">(选填)</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 100))}
            placeholder="写几句心里话吧..."
            className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"
            rows={3}
            maxLength={100}
          />
          <p className="text-right text-xs text-gray-400 mt-1">{message.length}/100</p>
        </div>

        {/* 按钮 */}
        <div className="p-5 pt-0 flex gap-3">
          <button
            onClick={handleBack}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            返回
          </button>
          <button
            onClick={handleSend}
            disabled={!selectedPersona || sendingId !== null}
            className={`flex-1 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              !selectedPersona || sendingId !== null
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg active:scale-95'
            }`}
          >
            {sendingId !== null ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            发送申请
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AddFriendModal;