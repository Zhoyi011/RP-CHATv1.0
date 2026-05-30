import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAFK } from '../../contexts/AFKContext';
import { socketService } from '../../services/socket';

interface ConnectionStatusProps {
  className?: string;
  showText?: boolean;
}

type StatusType = 'online' | 'afk' | 'offline' | 'error';

interface StatusConfig {
  color: string;
  bgColor: string;
  text: string;
  icon: React.ReactNode;
  pulse: boolean;
}

const statusConfig: Record<StatusType, StatusConfig> = {
  online: {
    color: 'bg-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    text: '在线',
    icon: (
      <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="10" />
      </svg>
    ),
    pulse: true,
  },
  afk: {
    color: 'bg-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    text: '挂机中',
    icon: (
      <svg className="w-3 h-3 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    pulse: false,
  },
  offline: {
    color: 'bg-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    text: '离线',
    icon: (
      <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636L5.636 18.364M5.636 5.636l12.728 12.728" />
      </svg>
    ),
    pulse: false,
  },
  error: {
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    text: '异常',
    icon: (
      <svg className="w-3 h-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    pulse: false,
  },
};

// 错误类型定义
interface ErrorDetail {
  type: 'network' | 'socket' | 'api' | 'auth' | 'unknown';
  message: string;
  timestamp: Date;
  code?: number;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  className = '', 
  showText = true 
}) => {
  const { isAFK } = useAFK();
  const [status, setStatus] = useState<StatusType>('online');
  const [lastError, setLastError] = useState<ErrorDetail | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [socketConnected, setSocketConnected] = useState(true);
  const [apiHealthy, setApiHealthy] = useState(true);

  // 检查 API 健康状态
  const checkApiHealth = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch('/api/test', { 
        signal: controller.signal,
        cache: 'no-cache'
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        setApiHealthy(true);
        if (status === 'error') {
          setLastError(null);
        }
      } else {
        setApiHealthy(false);
        setLastError({
          type: 'api',
          message: 'API 服务响应异常',
          timestamp: new Date(),
          code: response.status
        });
      }
    } catch (error: any) {
      setApiHealthy(false);
      setLastError({
        type: 'network',
        message: error.name === 'AbortError' ? 'API 请求超时' : '无法连接到服务器',
        timestamp: new Date(),
        code: error.name === 'AbortError' ? 408 : 0
      });
    }
  };

  // 监听 Socket.IO 连接状态
  useEffect(() => {
    const handleConnect = () => {
      setSocketConnected(true);
      if (status === 'offline' || status === 'error') {
        setStatus('online');
        setLastError(null);
      }
    };

    const handleDisconnect = (reason: string) => {
      setSocketConnected(false);
      let errorMessage = '';
      let errorType: ErrorDetail['type'] = 'socket';
      
      switch (reason) {
        case 'io server disconnect':
          errorMessage = '服务器主动断开连接';
          break;
        case 'io client disconnect':
          errorMessage = '客户端主动断开';
          break;
        case 'ping timeout':
          errorMessage = '连接超时，请检查网络';
          break;
        case 'transport close':
          errorMessage = '传输层连接关闭';
          break;
        default:
          errorMessage = `连接断开: ${reason}`;
      }
      
      setLastError({
        type: errorType,
        message: errorMessage,
        timestamp: new Date()
      });
    };

    const handleConnectError = (error: any) => {
      setSocketConnected(false);
      setLastError({
        type: 'socket',
        message: error.message || 'Socket 连接错误',
        timestamp: new Date()
      });
    };

    const handleError = (error: any) => {
      setLastError({
        type: 'socket',
        message: error?.message || '发生未知错误',
        timestamp: new Date()
      });
    };

    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);
    socketService.on('connect_error', handleConnectError);
    socketService.on('error', handleError);

    // 定期检查 API 健康
    const interval = setInterval(checkApiHealth, 30000);
    checkApiHealth();

    return () => {
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
      socketService.off('connect_error', handleConnectError);
      socketService.off('error', handleError);
      clearInterval(interval);
    };
  }, []);

  // 根据状态更新显示
  useEffect(() => {
    if (!socketConnected || !apiHealthy) {
      setStatus('offline');
    } else if (isAFK) {
      setStatus('afk');
    } else {
      setStatus('online');
    }
  }, [isAFK, socketConnected, apiHealthy]);

  const currentConfig = statusConfig[status];

  // 获取详细错误信息（用于 tooltip）
  const getErrorDetails = () => {
    if (!lastError) return null;
    
    const details = [];
    if (!socketConnected) {
      details.push('• WebSocket 连接失败');
    }
    if (!apiHealthy) {
      details.push('• API 服务响应异常');
    }
    if (lastError.message) {
      details.push(`• ${lastError.message}`);
    }
    if (lastError.code) {
      details.push(`• 错误码: ${lastError.code}`);
    }
    
    return {
      title: status === 'offline' ? '网络连接异常' : '系统异常',
      details,
      timestamp: lastError.timestamp,
    };
  };

  const errorInfo = getErrorDetails();

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <div 
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${currentConfig.bgColor} transition-all duration-300 cursor-help`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="relative">
          <div className={`w-2.5 h-2.5 ${currentConfig.color} rounded-full ${currentConfig.pulse ? 'animate-pulse' : ''}`} />
        </div>
        {showText && (
          <span className={`text-xs font-medium ${
            status === 'online' ? 'text-green-600 dark:text-green-400' :
            status === 'afk' ? 'text-amber-600 dark:text-amber-400' :
            status === 'offline' ? 'text-red-600 dark:text-red-400' :
            'text-purple-600 dark:text-purple-400'
          }`}>
            {currentConfig.text}
          </span>
        )}
        {status === 'offline' && (
          <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )}
        {status === 'error' && (
          <svg className="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>

      {/* 错误详情 Tooltip */}
      <AnimatePresence>
        {showTooltip && (status === 'offline' || status === 'error') && errorInfo && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-72 bg-gray-900 text-white rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <span className="font-semibold text-sm">{errorInfo.title}</span>
              </div>
            </div>
            <div className="px-4 py-3 space-y-2">
              <p className="text-xs text-gray-300 leading-relaxed">
                检测到以下问题：
              </p>
              <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                {errorInfo.details.map((detail, idx) => (
                  <li key={idx}>{detail}</li>
                ))}
              </ul>
              <div className="pt-2 mt-2 border-t border-gray-700">
                <p className="text-xs text-amber-400">
                  💡 请截图此界面，前往 Discord 的 #bug-反馈 频道反馈
                </p>
                <button
                  onClick={() => {
                    // 复制错误信息到剪贴板
                    const errorText = `时间: ${errorInfo.timestamp.toLocaleString()}\n${errorInfo.details.join('\n')}`;
                    navigator.clipboard.writeText(errorText);
                    // 触发 Discord 反馈（可以打开反馈链接）
                    window.open('https://discord.gg/your-invite-code', '_blank');
                  }}
                  className="mt-2 w-full py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 13c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z"/>
                  </svg>
                  复制错误信息并反馈
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 挂机中 Tooltip */}
      <AnimatePresence>
        {showTooltip && status === 'afk' && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full left-0 mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50 whitespace-nowrap"
          >
            用户暂时离开，回复后自动恢复
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};