// client/src/components/shop/Shop.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Gift, ShoppingBag } from 'lucide-react';
import { GiftModal } from '../gift/GiftModal';
import toast from 'react-hot-toast';

interface ShopItem {
  _id: string;
  name: string;
  type: string;
  price: number;
  currency: 'diamonds' | 'coins';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  image: string;
  previewImage?: string;
  description: string;
  isGiftable?: boolean;
}

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

const Shop: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [myItems, setMyItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  
  // 礼物弹窗状态
  const [giftModal, setGiftModal] = useState<{
    isOpen: boolean;
    itemId: string;
    itemName: string;
    itemImage: string;
    itemPrice: number;
  }>({
    isOpen: false,
    itemId: '',
    itemName: '',
    itemImage: '',
    itemPrice: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [itemsRes, inventoryRes] = await Promise.all([
        fetch(`${API_BASE}/shop/items?type=avatarFrame`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/shop/my-items`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      const itemsData = await itemsRes.json();
      const inventoryData = await inventoryRes.json();
      
      setItems(itemsData);
      setMyItems(inventoryData.map((i: any) => i.itemId));
    } catch (error) {
      console.error('加载失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (item: ShopItem) => {
    if (myItems.includes(item._id)) {
      toast.error('已经拥有该物品');
      return;
    }
    
    setBuying(item._id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/shop/buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itemId: item._id })
      });
      
      const data = await response.json();
      if (response.ok) {
        toast.success(`购买成功！获得 ${item.name}`);
        loadData();
      } else {
        toast.error(data.error || '购买失败');
      }
    } catch (error) {
      toast.error('购买失败');
    } finally {
      setBuying(null);
    }
  };

  // 🔥 新增：打开赠送弹窗
  const handleOpenGift = (item: ShopItem) => {
    if (!myItems.includes(item._id)) {
      toast.error('请先购买该物品再赠送');
      return;
    }
    setGiftModal({
      isOpen: true,
      itemId: item._id,
      itemName: item.name,
      itemImage: item.previewImage || item.image,
      itemPrice: item.price,
    });
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-500 to-amber-600';
      case 'epic': return 'from-purple-500 to-pink-600';
      case 'rare': return 'from-blue-500 to-cyan-600';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  const getRarityName = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return '传说';
      case 'epic': return '史诗';
      case 'rare': return '稀有';
      default: return '普通';
    }
  };

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
          <h1 className="text-xl font-bold flex-1">商城</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => {
            const isOwned = myItems.includes(item._id);
            const canGift = isOwned && item.isGiftable !== false;
            
            return (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all ${
                  isOwned ? 'opacity-80' : ''
                }`}
              >
                {/* 预览图 */}
                <div className={`bg-gradient-to-br ${getRarityColor(item.rarity)} p-4 flex justify-center`}>
                  <img
                    src={item.previewImage || item.image}
                    alt={item.name}
                    className="w-32 h-32 object-contain"
                  />
                </div>
                
                {/* 信息 */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">{item.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full bg-${item.rarity === 'legendary' ? 'yellow' : item.rarity === 'epic' ? 'purple' : item.rarity === 'rare' ? 'blue' : 'gray'}-100 text-${item.rarity === 'legendary' ? 'yellow' : item.rarity === 'epic' ? 'purple' : item.rarity === 'rare' ? 'blue' : 'gray'}-700`}>
                      {getRarityName(item.rarity)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{item.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-lg">{item.currency === 'diamonds' ? '💎' : '🪙'}</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">{item.price}</span>
                    </div>
                    
                    <div className="flex gap-2">
                      {/* 🔥 赠送按钮 */}
                      {canGift && (
                        <button
                          onClick={() => handleOpenGift(item)}
                          className="p-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:shadow-md transition active:scale-95"
                          title="赠送好友"
                        >
                          <Gift className="w-4 h-4" />
                        </button>
                      )}
                      
                      {/* 购买按钮 */}
                      <button
                        onClick={() => handleBuy(item)}
                        disabled={isOwned || buying === item._id}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-1 ${
                          isOwned
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:shadow-md active:scale-95'
                        }`}
                      >
                        {buying === item._id ? (
                          '购买中...'
                        ) : isOwned ? (
                          <>
                            <ShoppingBag className="w-3 h-3" />
                            已拥有
                          </>
                        ) : (
                          '购买'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 🔥 赠送礼物弹窗 */}
      <GiftModal
        isOpen={giftModal.isOpen}
        onClose={() => setGiftModal({ ...giftModal, isOpen: false })}
        itemId={giftModal.itemId}
        itemName={giftModal.itemName}
        itemImage={giftModal.itemImage}
        itemPrice={giftModal.itemPrice}
        onSuccess={() => {
          // 赠送成功后刷新数据
          loadData();
        }}
      />
    </div>
  );
};

export default Shop;