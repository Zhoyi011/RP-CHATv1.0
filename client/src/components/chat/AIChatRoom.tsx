import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type AIPersona,type UserPersonaForAI,type AIMessage } from '../../types/ai';
import AISettings from './AISettings';
import UserPersonaSettings from './UserPersonaSettings';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

interface Props {
  onClose?: () => void;  // 手机端返回用
}

const AIChatRoom: React.FC<Props> = ({ onClose }) => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentAI, setCurrentAI] = useState<AIPersona | null>(null);
  const [myPersona, setMyPersona] = useState<UserPersonaForAI | null>(null);
  const [showAISettings, setShowAISettings] = useState(false);
  const [showMySettings, setShowMySettings] = useState(false);
  const [aiList, setAiList] = useState<AIPersona[]>([]);
  const [showAISelector, setShowAISelector] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadData = async () => {
    const token = localStorage.getItem('token');
    try {
      // 加载默认 AI
      const defaultRes = await fetch(`${API_BASE}/ai-persona/default`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const defaultAI = await defaultRes.json();
      setCurrentAI(defaultAI);

      // 加载 AI 列表
      const listRes = await fetch(`${API_BASE}/ai-persona/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const list = await listRes.json();
      setAiList(list);

      // 加载用户自己的角色
      const myRes = await fetch(`${API_BASE}/ai-persona/my-persona`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const myData = await myRes.json();
      setMyPersona(myData);

      // 加载历史消息（可选，从 localStorage 读取）
      const savedMessages = localStorage.getItem(`ai_chat_${defaultAI._id}`);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      } else {
        // 欢迎消息
        setMessages([{
          role: 'ai',
          content: `你好！我是 ${defaultAI.name}，${defaultAI.description || '很高兴认识你！'} 有什么想聊的吗？`,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('加载 AI 数据失败:', error);
    }
  };

  // 保存消息到 localStorage
  const saveMessages = useCallback((newMessages: AIMessage[]) => {
    if (currentAI) {
      localStorage.setItem(`ai_chat_${currentAI._id}`, JSON.stringify(newMessages));
    }
  }, [currentAI]);

  const handleSend = async () => {
    if (!inputValue.trim() || loading || !currentAI) return;

    const userMsg: AIMessage = { role: 'user', content: inputValue, timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    saveMessages(newMessages);
    setInputValue('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const history = messages.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }));

      const res = await fetch(`${API_BASE}/ai/chat-with-persona`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          aiPersonaId: currentAI._id,
          message: inputValue,
          history,
          userPersona: myPersona
        })
      });

      const data = await res.json();
      
      const aiMsg: AIMessage = {
        role: 'ai',
        content: data.reply || '(AI 暂时无法回应)',
        timestamp: new Date()
      };
      const finalMessages = [...newMessages, aiMsg];
      setMessages(finalMessages);
      saveMessages(finalMessages);
    } catch (error) {
      console.error('发送失败:', error);
      const errorMsg: AIMessage = {
        role: 'ai',
        content: '(网络错误，请稍后再试)',
        timestamp: new Date()
      };
      const finalMessages = [...newMessages, errorMsg];
      setMessages(finalMessages);
      saveMessages(finalMessages);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm('确定要清空聊天记录吗？')) {
      setMessages([]);
      if (currentAI) {
        localStorage.removeItem(`ai_chat_${currentAI._id}`);
      }
    }
  };

  const handleSwitchAI = async (ai: AIPersona) => {
    setCurrentAI(ai);
    setShowAISelector(false);
    // 加载该 AI 的历史消息
    const savedMessages = localStorage.getItem(`ai_chat_${ai._id}`);
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    } else {
      setMessages([{
        role: 'ai',
        content: `你好！我是 ${ai.name}，${ai.description || '很高兴认识你！'} 有什么想聊的吗？`,
        timestamp: new Date()
      }]);
    }
  };

  const getReplyStyleLabel = (style: string) => {
    switch (style) {
      case 'short': return '简短';
      case 'medium': return '适中';
      case 'detailed': return '详细';
      default: return '适中';
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
      {/* 头部 */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center gap-3 flex-shrink-0 shadow-sm">
        {onClose && (
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        
        {/* AI 头像和名称 */}
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold shadow-md">
            {currentAI?.name?.charAt(0) || 'A'}
          </div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
        </div>
        
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setShowAISelector(!showAISelector)}>
          <div className="flex items-center gap-2">
            <h2 className="font-medium text-gray-800 dark:text-gray-200 truncate">
              {currentAI?.name || 'AI 助手'}
            </h2>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {getReplyStyleLabel(currentAI?.replyStyle || 'short')} · {currentAI?.personality?.substring(0, 20) || 'AI 角色'}
          </p>
        </div>

        {/* 设置按钮组 */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleClearHistory}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
            title="清空聊天记录"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            onClick={() => setShowMySettings(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
            title="我的角色设置"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
          <button
            onClick={() => setShowAISettings(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
            title="AI 角色设置"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* AI 选择器下拉 */}
      <AnimatePresence>
        {showAISelector && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 left-4 right-4 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 max-h-64 overflow-y-auto"
          >
            {aiList.map(ai => (
              <button
                key={ai._id}
                onClick={() => handleSwitchAI(ai)}
                className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition ${
                  currentAI?._id === ai._id ? 'bg-purple-50 dark:bg-purple-900/30' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                  {ai.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 dark:text-gray-200">{ai.name}</span>
                    {ai.isDefault && <span className="text-[10px] bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">默认</span>}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{ai.personality || ai.description?.substring(0, 30)}</p>
                </div>
                {currentAI?._id === ai._id && (
                  <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-500 py-8">
            <div className="text-6xl mb-4">🤖</div>
            <p>开始和 {currentAI?.name} 对话吧！</p>
            <p className="text-sm mt-2">AI 会记住你们的对话内容~</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start gap-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                    : 'bg-gradient-to-br from-purple-400 to-pink-500'
                }`}>
                  {msg.role === 'user' ? (myPersona?.name?.charAt(0) || '我') : (currentAI?.name?.charAt(0) || 'A')}
                </div>
                <div className={`px-4 py-2 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-tr-none'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none shadow-sm'
                }`}>
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  <div className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-none px-4 py-2 shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="border-t border-gray-100 dark:border-gray-700 p-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-end gap-2">
          <div className="flex-1 min-w-0">
            <input
              ref={input => input?.focus()}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              placeholder={`和 ${currentAI?.name || 'AI'} 聊天...`}
              className="w-full rounded-2xl px-4 py-2.5 text-sm bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
              disabled={loading}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || loading}
            className={`px-5 py-2.5 rounded-2xl text-sm font-medium transition flex items-center gap-1.5 ${
              inputValue.trim() && !loading
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md hover:shadow-lg'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span className="hidden sm:inline">发送</span>
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-2 text-center">
          AI 会记住对话内容 · 回复风格: {getReplyStyleLabel(currentAI?.replyStyle || 'short')}
        </p>
      </div>

      {/* 设置弹窗 */}
      {showAISettings && (
        <AISettings
          aiPersona={currentAI}
          onClose={() => setShowAISettings(false)}
          onUpdate={(updated: AIPersona) => {
            setCurrentAI(updated);
            loadData(); // 刷新列表
          }}
        />
      )}
      {showMySettings && (
        <UserPersonaSettings
          myPersona={myPersona}
          onClose={() => setShowMySettings(false)}
          onUpdate={(updated) => setMyPersona(updated)}
        />
      )}
    </div>
  );
};

export default AIChatRoom;