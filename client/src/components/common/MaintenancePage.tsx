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
  
  // ========== 请勿随意修改 Discord 链接 ==========
  const DISCORD_INVITE_URL = 'https://discord.gg/zfr4hNQdtN';
  const DISCORD_SERVER_NAME = '万物阁 官方社群';
  // =============================================

  // ========== 固定动画元素位置（页面加载时生成一次，不会变化）==========
  const [particles] = useState(() => ({
    blue: Array(25).fill(0).map(() => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 5 + Math.random() * 6,
      delay: Math.random() * 5,
    })),
    purple: Array(20).fill(0).map(() => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 6 + Math.random() * 7,
      delay: Math.random() * 6,
    })),
    cyan: Array(35).fill(0).map(() => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 4 + Math.random() * 5,
      delay: Math.random() * 7,
    })),
    stars: Array(30).fill(0).map(() => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 4 + Math.random() * 5,
      delay: Math.random() * 4,
    })),
  }));

  useEffect(() => {
    if (!endTime) return;
    
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

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* ========== 背景动画区域（请勿随意修改）========== */}
      
      {/* 主光晕 - 蓝色 */}
      <div className="absolute top-1/4 -left-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" 
           style={{ animationDuration: '4s' }} />
      
      {/* 主光晕 - 紫色 */}
      <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"
           style={{ animationDuration: '5s', animationDelay: '1s' }} />
      
      {/* 主光晕 - 青色 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"
           style={{ animationDuration: '6s', animationDelay: '2s' }} />
      
      {/* 漂浮粒子层 1 - 蓝色粒子（固定位置） */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.blue.map((p, i) => (
          <div
            key={`blue-${i}`}
            className="absolute w-1 h-1 bg-blue-400/40 rounded-full"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              animation: `floatSmooth ${p.duration}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>
      
      {/* 漂浮粒子层 2 - 紫色粒子（固定位置） */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.purple.map((p, i) => (
          <div
            key={`purple-${i}`}
            className="absolute w-1.5 h-1.5 bg-purple-400/30 rounded-full"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              animation: `floatSmoothReverse ${p.duration}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>
      
      {/* 漂浮粒子层 3 - 青色粒子（固定位置） */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.cyan.map((p, i) => (
          <div
            key={`cyan-${i}`}
            className="absolute w-0.5 h-0.5 bg-cyan-400/50 rounded-full"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              animation: `floatSmooth ${p.duration}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>
      
      {/* 柔和星光层（固定位置，平滑呼吸） */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.stars.map((s, i) => (
          <div
            key={`star-${i}`}
            className="absolute w-1 h-1 bg-white/20 rounded-full"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              animation: `breathe ${s.duration}s ease-in-out infinite`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>
      
      {/* 旋转齿轮背景装饰 */}
      <div className="absolute top-20 left-10 opacity-10 pointer-events-none">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="text-8xl"
        >
          ⚙️
        </motion.div>
      </div>
      <div className="absolute bottom-20 right-10 opacity-10 pointer-events-none">
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="text-6xl"
        >
          🔧
        </motion.div>
      </div>
      <div className="absolute top-1/2 right-20 opacity-5 pointer-events-none">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="text-5xl"
        >
          🛠️
        </motion.div>
      </div>
      
      {/* ========== 背景动画结束 ========== */}

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
        
        {/* Discord 入群入口 */}
        <motion.a
          href={DISCORD_INVITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="block mb-6 group"
        >
          <div className="bg-gradient-to-r from-[#5865F2] to-[#4752C4] rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-[#5865F2]" viewBox="0 0 127.14 96.36" fill="currentColor">
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.86.66,1.75,1.34,2.66,2a68.68,68.68,0,0,1-10.87,5.18,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S53.8,46,53.8,53,48.81,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.21,60,73.21,53s5-12.74,11.44-12.74S96,46,96,53,91.08,65.69,84.69,65.69Z"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="text-white font-bold text-lg">加入 Discord 社区</p>
                <p className="text-white/70 text-sm">获取最新动态 · 反馈问题 · 交流互动</p>
              </div>
              <div className="text-white/50 group-hover:translate-x-1 transition-transform duration-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </motion.a>
        
        {/* 备用链接 */}
        <div className="text-center">
          <p className="text-white/20 text-xs">
            邀请链接永久有效 · {DISCORD_SERVER_NAME}
          </p>
        </div>
        
        {/* 加载动画 */}
        <div className="mt-6 space-y-2">
          <div className="flex justify-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
          <p className="text-white/30 text-sm">
            感谢您的耐心等待
          </p>
        </div>
        
        {/* 联系管理员 */}
        <div className="mt-8 text-center">
          <p className="text-white/20 text-xs">
            如需帮助，请加入 Discord 联系管理员
          </p>
        </div>
      </div>

      {/* ========== 动画关键帧（请勿随意修改）========== */}
      <style>{`
        @keyframes floatSmooth {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
            opacity: 0.15;
          }
          25% {
            transform: translateY(-15px) translateX(8px);
            opacity: 0.4;
          }
          50% {
            transform: translateY(8px) translateX(-12px);
            opacity: 0.25;
          }
          75% {
            transform: translateY(-8px) translateX(15px);
            opacity: 0.35;
          }
        }
        
        @keyframes floatSmoothReverse {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
            opacity: 0.15;
          }
          25% {
            transform: translateY(12px) translateX(-10px);
            opacity: 0.35;
          }
          50% {
            transform: translateY(-12px) translateX(15px);
            opacity: 0.25;
          }
          75% {
            transform: translateY(15px) translateX(-8px);
            opacity: 0.4;
          }
        }
        
        @keyframes breathe {
          0%, 100% {
            opacity: 0.08;
            transform: scale(1);
          }
          50% {
            opacity: 0.25;
            transform: scale(1.15);
          }
        }
      `}</style>
      {/* ========== 动画关键帧结束 ========== */}
    </div>
  );
};

export default MaintenancePage;