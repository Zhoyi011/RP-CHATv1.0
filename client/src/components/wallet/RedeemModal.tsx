// client/src/components/wallet/RedeemModal.tsx
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { redeemApi } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

interface RedeemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const RedeemModal: React.FC<RedeemModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{ valid: boolean; diamondAmount?: number } | null>(null);

  // 格式化充值码输入（自动转大写）
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setCode(value);
    // 清空检查结果
    if (checkResult) setCheckResult(null);
  };

  // 检查充值码（实时验证）
  const handleCheckCode = async () => {
    if (!code.trim()) {
      toast.error('请输入充值码');
      return;
    }

    setChecking(true);
    try {
      const res = await redeemApi.check(code.trim());
      if (res.valid && res.data) {
        setCheckResult({
          valid: true,
          diamondAmount: res.data.diamondAmount
        });
        toast.success(`有效充值码！可获得 ${res.data.diamondAmount} 💎`);
      } else {
        setCheckResult({ valid: false });
        toast.error(res.error || '充值码无效');
      }
    } catch (error: any) {
      setCheckResult({ valid: false });
      toast.error(error.message || '检查失败');
    } finally {
      setChecking(false);
    }
  };

  // 使用充值码
  const handleSubmit = async () => {
    if (!code.trim()) {
      toast.error('请输入充值码');
      return;
    }

    setLoading(true);
    try {
      const res = await redeemApi.use(code.trim());
      toast.success(res.message);
      setCode('');
      setCheckResult(null);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || '充值失败，请检查充值码');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩层 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 弹窗内容 */}
      <div className={`relative w-full max-w-md rounded-2xl shadow-xl overflow-hidden ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* 头部 */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            充值钻石
          </h2>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4 space-y-4">
          {/* 说明文字 */}
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} text-center`}>
            在官方商店购买的充值码，在此输入兑换钻石
          </div>

          {/* 充值码输入 */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              充值码
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={handleCodeChange}
                placeholder="例如: RP-AB12-3456"
                className={`flex-1 px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 transition-all uppercase ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white focus:ring-purple-500 focus:border-transparent' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 focus:ring-purple-500 focus:border-transparent'
                }`}
                autoCapitalize="characters"
              />
              <button
                onClick={handleCheckCode}
                disabled={checking || !code.trim()}
                className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                  checking || !code.trim()
                    ? 'bg-gray-300 cursor-not-allowed'
                    : isDark
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {checking ? '检查中' : '检查'}
              </button>
            </div>
          </div>

          {/* 检查结果提示 */}
          {checkResult && (
            <div className={`p-3 rounded-xl text-sm ${
              checkResult.valid
                ? isDark
                  ? 'bg-green-900/30 text-green-400 border border-green-800'
                  : 'bg-green-50 text-green-700 border border-green-200'
                : isDark
                  ? 'bg-red-900/30 text-red-400 border border-red-800'
                  : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {checkResult.valid ? (
                <div className="flex items-center gap-2">
                  <span>✓</span>
                  <span>有效充值码！将获得 {checkResult.diamondAmount} 💎</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>✗</span>
                  <span>充值码无效或已过期</span>
                </div>
              )}
            </div>
          )}

          {/* 提示信息 */}
          <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} space-y-1`}>
            <p>• 充值码格式：RP-XXXX-XXXX（字母-数字）</p>
            <p>• 每个充值码只能使用一次</p>
            <p>• 充值码有效期为14天</p>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className={`flex gap-3 p-4 border-t ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button
            onClick={onClose}
            className={`flex-1 py-2.5 rounded-xl font-medium transition-all ${
              isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !code.trim() || (checkResult && !checkResult.valid)}
            className={`flex-1 py-2.5 rounded-xl font-medium transition-all bg-gradient-to-r from-purple-500 to-pink-500 text-white ${
              loading || !code.trim() || (checkResult && !checkResult.valid)
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:from-purple-600 hover:to-pink-600'
            }`}
          >
            {loading ? '充值中...' : '确认充值'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RedeemModal;