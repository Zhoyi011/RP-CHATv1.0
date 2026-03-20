import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-semibold">守护榜</h3>
          {totalAmount > 0 && (
            <p className="text-xs text-gray-500">总守护值: {totalAmount}</p>
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
              className="w-24 px-2 py-1 border rounded text-sm"
            />
            <button
              onClick={handleDonate}
              disabled={donating}
              className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600 disabled:opacity-50"
            >
              {donating ? '守护中...' : '守护'}
            </button>
          </div>
        )}
      </div>

      {guardians.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          {isOwner ? '还没有人守护这个角色' : '成为第一个守护者吧 ✨'}
        </div>
      ) : (
        <div className="space-y-3">
          {guardians.slice(0, 10).map((guardian, index) => (
            <div key={guardian.userId._id} className="flex items-center gap-3">
              <div className="w-8 text-center font-bold text-gray-400">
                #{index + 1}
              </div>
              <div
                onClick={() => navigate(`/persona/${guardian.userId._id}`)}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold cursor-pointer hover:scale-105 transition"
              >
                {guardian.userId.username?.charAt(0) || '?'}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{guardian.userId.username}</p>
                <p className="text-xs text-gray-400">
                  {new Date(guardian.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-yellow-600">{guardian.amount}</p>
                <p className="text-xs text-gray-400">金币</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PersonaGuardianList;