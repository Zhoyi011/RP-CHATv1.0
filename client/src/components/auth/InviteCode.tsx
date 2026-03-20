import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const InviteCode = () => {
  const [inviteCode, setInviteCode] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 先不做任何验证，直接跳转测试
    navigate('/chat');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-xl p-8 rounded-2xl w-96">
        <h2 className="text-2xl text-white mb-6 text-center">邀请码页面</h2>
        <p className="text-white/80 text-center mb-4">
          如果看到这个页面，说明路由正常！
        </p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className="w-full p-3 mb-4 bg-white/20 text-white rounded-lg"
            placeholder="随便输入"
          />
          
          <button
            type="submit"
            className="w-full bg-white text-gray-800 py-3 rounded-lg font-medium"
          >
            点我跳转聊天页
          </button>
        </form>

        <button
          onClick={() => navigate('/')}
          className="mt-4 text-white/60 hover:text-white text-sm"
        >
          返回登录页
        </button>
      </div>
    </div>
  );
};

export default InviteCode;
