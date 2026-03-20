import React from 'react';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const navigate = useNavigate();

  return (
    <div className="p-8">
      <button 
        onClick={() => navigate('/chat')}
        className="mb-4 text-green-600 hover:text-green-700"
      >
        ← 返回聊天
      </button>
      <h1 className="text-2xl font-bold mb-6">设置</h1>
      <p className="text-gray-500">设置页面开发中...</p>
    </div>
  );
};

export default Settings;
