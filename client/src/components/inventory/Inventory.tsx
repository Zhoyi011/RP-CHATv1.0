import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface InventoryItem {
  _id: string;
  itemId: string;
  itemType: string;
  itemName: string;
  itemImage: string;
  isEquipped: boolean;
}

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

const Inventory: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [equipping, setEquipping] = useState<string | null>(null);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/shop/my-items`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error('加载背包失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEquip = async (item: InventoryItem) => {
    setEquipping(item._id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/shop/equip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ inventoryId: item._id })
      });
      
      if (response.ok) {
        toast.success(`已装备 ${item.itemName}`);
        loadInventory();
        window.dispatchEvent(new Event('personaChanged'));
      } else {
        const data = await response.json();
        toast.error(data.error || '装备失败');
      }
    } catch (error) {
      toast.error('装备失败');
    } finally {
      setEquipping(null);
    }
  };

  const handleUnequip = async (item: InventoryItem) => {
    setEquipping(item._id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/shop/unequip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ inventoryId: item._id })
      });
      
      if (response.ok) {
        toast.success(`已卸下 ${item.itemName}`);
        loadInventory();
        window.dispatchEvent(new Event('personaChanged'));
      } else {
        toast.error('卸下失败');
      }
    } catch (error) {
      toast.error('卸下失败');
    } finally {
      setEquipping(null);
    }
  };

  const avatarFrameItems = items.filter(i => i.itemType === 'avatarFrame');
  const otherItems = items.filter(i => i.itemType !== 'avatarFrame');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 pb-8">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white sticky top-0 z-10 shadow-md">
        <div className="px-4 py-3 flex items-center">
          <button onClick={() => navigate(-1)} className="mr-3 p-1 hover:bg-white/20 rounded-full transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold flex-1">我的背包</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 头像框区域 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
            <span>🖼️</span> 头像框
          </h2>
          {avatarFrameItems.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center text-gray-400">
              还没有头像框，快去商城购买吧～
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {avatarFrameItems.map((item) => (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-md ${
                    item.isEquipped ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="p-4 flex justify-center bg-gray-50 dark:bg-gray-700/50">
                    <img
                      src={item.itemImage}
                      alt={item.itemName}
                      className="w-24 h-24 object-contain"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-center mb-3">
                      {item.itemName}
                    </h3>
                    <button
                      onClick={() => item.isEquipped ? handleUnequip(item) : handleEquip(item)}
                      disabled={equipping === item._id}
                      className={`w-full py-2 rounded-xl text-sm font-medium transition ${
                        item.isEquipped
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          : 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:shadow-md active:scale-95'
                      }`}
                    >
                      {equipping === item._id ? '处理中...' : (item.isEquipped ? '已装备' : '装备')}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Inventory;