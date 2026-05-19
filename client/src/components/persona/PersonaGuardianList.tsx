import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { personaApi } from '../../services/api';
import toast from 'react-hot-toast';

interface Guardian {
  userId: { _id: string; username: string; avatar?: string };
  amount: number;
  createdAt: string;
}

interface Props {
  personaId: string;
  guardians: Guardian[];
  totalAmount: number;
  isOwner: boolean;
  onUpdate: () => void;
}

const PersonaGuardianList: React.FC<Props> = ({ personaId, guardians, totalAmount, isOwner, onUpdate }) => {
  const [donateAmount, setDonateAmount] = useState(100);
  const [donating, setDonating] = useState(false);
  const navigate = useNavigate();

  const handleDonate = async () => {
    if (!isOwner) {
      setDonating(true);
      try {
        await personaApi.addGuardian(personaId, donateAmount);
        toast.success(`成功守护！捐赠 ${donateAmount} 金币`);
        onUpdate();
      } catch (error) {
        toast.error('守护失败');
      } finally {
        setDonating(false);
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <span>🛡️</span> 守护榜
          </h3>
          {totalAmount > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">总守护值: {totalAmount}</p>
          )}
        </div>
        {!isOwner && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={donateAmount}
              onChange={(e) => setDonateAmount(Number(e.target.value))}
              min={10}
              step={10}
              className="w-24 px-2 py-1.5 border dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleDonate}
              disabled={donating}
              className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:from-yellow-600 hover:to-amber-700 transition disabled:opacity-50 shadow-md"
            >
              {donating ? '守护中...' : '守护 ✨'}
            </button>
          </div>
        )}
      </div>

      {guardians.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          {isOwner ? '还没有人守护这个角色' : '成为第一个守护者吧 ✨'}
        </div>
      ) : (
        <div className="space-y-3">
          {guardians.slice(0, 10).map((guardian, index) => (
            <motion.div
              key={guardian.userId._id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:shadow-sm transition"
            >
              <div className={`w-8 text-center font-bold ${
                index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-600' : 'text-gray-400'
              }`}>
                #{index + 1}
              </div>
              <div
                onClick={() => navigate(`/profile/${guardian.userId._id}`)}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold cursor-pointer hover:scale-105 transition shadow-md"
              >
                {guardian.userId.username?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{guardian.userId.username}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(guardian.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-yellow-600 dark:text-yellow-400">{guardian.amount}</p>
                <p className="text-xs text-gray-400">金币</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PersonaGuardianList;