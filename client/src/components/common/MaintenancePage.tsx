// client/src/components/common/MaintenancePage.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface MaintenancePageProps {
  message?: string;
  endTime?: string | null;
}

const MaintenancePage: React.FC<MaintenancePageProps> = ({ message, endTime }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  } | null>(null);
  
  const [formattedEndTime, setFormattedEndTime] = useState<string>('');

  useEffect(() => {
    if (!endTime) return;
    
    // 格式化预计恢复时间显示
    const endDate = new Date(endTime);
    setFormattedEndTime(
      `${endDate.getFullYear()}年${endDate.getMonth() + 1}月${endDate.getDate()}日 ${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`
    );
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const diff = end - now;
      
      if (diff <= 0) {
        setTimeLeft(null);
        clearInterval(interval);
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft({ days, hours, minutes, seconds, total: diff });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [endTime]);

  // 格式化时间数字（两位数）
  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* 背景动画粒子 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-2000"></div>
      </div>
      
      {/* 旋转齿轮背景 */}
      <div className="absolute top-20 left-10 opacity-5">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="text-9xl"
        >
          ⚙️
        </motion.div>
      </div>
      <div className="absolute bottom-20 right-10 opacity-5">
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="text-7xl"
        >
          🔧
        </motion.div>
      </div>
      <div className="absolute top-1/3 right-20 opacity-5">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="text-5xl"
        >
          🛠️
        </motion.div>
      </div>
      
      {/* 主内容 */}
      <div className="relative text-center max-w-md z-10">
        {/* 图标动画 */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", duration: 0.8, bounce: 0.5 }}
          className="mb-8"
        >
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-2xl">
            <motion.span
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-6xl"
            >
              🔧
            </motion.span>
          </div>
        </motion.div>
        
        {/* 标题 */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl font-bold text-white mb-4"
        >
          服务器维护中
        </motion.h1>
        
        {/* 提示消息 */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-white/70 text-lg mb-6 leading-relaxed"
        >
          {message || '服务器正在维护中，请稍后再试。'}
        </motion.p>
        
        {/* 预计恢复时间 */}
        {formattedEndTime && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35 }}
            className="mb-6 p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20 inline-block mx-auto"
          >
            <p className="text-white/60 text-sm">预计恢复时间</p>
            <p className="text-white font-medium">{formattedEndTime}</p>
          </motion.div>
        )}
        
        {/* 倒计时 */}
        {timeLeft && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <div className="bg-white/5 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
              <p className="text-white/50 text-sm mb-3 flex items-center justify-center gap-2">
                <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                距离恢复还有
              </p>
              <div className="flex justify-center gap-4">
                {timeLeft.days > 0 && (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                      <span className="text-2xl font-bold text-white">{formatNumber(timeLeft.days)}</span>
                    </div>
                    <p className="text-xs text-white/50 mt-2">天</p>
                  </div>
                )}
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                    <span className="text-2xl font-bold text-white">{formatNumber(timeLeft.hours)}</span>
                  </div>
                  <p className="text-xs text-white/50 mt-2">小时</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                    <span className="text-2xl font-bold text-white">{formatNumber(timeLeft.minutes)}</span>
                  </div>
                  <p className="text-xs text-white/50 mt-2">分钟</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                    <motion.span
                      key={timeLeft.seconds}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      className="text-2xl font-bold text-white"
                    >
                      {formatNumber(timeLeft.seconds)}
                    </motion.span>
                  </div>
                  <p className="text-xs text-white/50 mt-2">秒</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* 加载动画 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="space-y-2"
        >
          <div className="flex justify-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
          <p className="text-white/30 text-sm">
            感谢您的耐心等待
          </p>
        </motion.div>
        
        {/* 联系管理员 */}
        <div className="mt-8 text-center">
          <p className="text-white/20 text-xs">
            如需帮助，请联系管理员
          </p>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;