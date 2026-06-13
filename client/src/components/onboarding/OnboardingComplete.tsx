// client/src/components/onboarding/OnboardingComplete.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const OnboardingComplete: React.FC = () => {
  const navigate = useNavigate();

  const handleFinish = () => {
    navigate('/chat', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md text-center"
      >
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden p-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="text-7xl mb-4"
          >
            🎉
          </motion.div>
          
          <h1 className="text-2xl font-bold text-white mb-2">
            准备就绪！
          </h1>
          <p className="text-white/80 mb-6">
            你已经完成了基础设置<br />
            现在开始你的角色扮演之旅吧！
          </p>
          
          <button
            onClick={handleFinish}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition shadow-lg"
          >
            🚀 进入 万物阁
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingComplete;