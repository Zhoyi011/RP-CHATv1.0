// client/src/components/admin/CreateRedeemCode.tsx
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { redeemApi } from '../../services/api';

// 预设钻石数量选项
const PRESET_AMOUNTS = [100, 200, 500, 1000, 2000, 5000, 10000];

interface CreateRedeemCodeProps {
  onSuccess?: () => void;
}

const CreateRedeemCode: React.FC<CreateRedeemCodeProps> = ({ onSuccess }) => {
  const [creating, setCreating] = useState(false);
  const [batchCreating, setBatchCreating] = useState(false);
  
  // 单次创建
  const [diamondAmount, setDiamondAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [note, setNote] = useState('');
  const [usePreset, setUsePreset] = useState(true);
  
  // 批量创建
  const [batchAmount, setBatchAmount] = useState(100);
  const [batchCount, setBatchCount] = useState(5);
  const [batchNote, setBatchNote] = useState('');
  
  // 结果显示
  const [lastCreatedCode, setLastCreatedCode] = useState<string | null>(null);
  const [lastCreatedCodes, setLastCreatedCodes] = useState<Array<{ code: string; diamondAmount: number }>>([]);

  // 获取最终钻石数量
  const getFinalAmount = () => {
    if (usePreset) return diamondAmount;
    const custom = parseInt(customAmount);
    return isNaN(custom) || custom < 1 ? 100 : custom;
  };

  // 创建单个充值码
  const handleCreate = async () => {
    const amount = getFinalAmount();
    if (amount < 1) {
      toast.error('钻石数量必须大于0');
      return;
    }
    if (amount > 1000000) {
      toast.error('单次充值码钻石数量不能超过100万');
      return;
    }

    setCreating(true);
    try {
      const res = await redeemApi.create({
        diamondAmount: amount,
        customCode: customCode.trim() || undefined,
        note: note.trim() || undefined,
        presetAmount: amount
      });
      
      if (res.success) {
        toast.success(`充值码创建成功: ${res.data.code}`);
        setLastCreatedCode(res.data.code);
        // 清空自定义码
        setCustomCode('');
        setNote('');
        if (onSuccess) onSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  // 批量创建充值码
  const handleBatchCreate = async () => {
    if (batchAmount < 1) {
      toast.error('钻石数量必须大于0');
      return;
    }
    if (batchCount < 1 || batchCount > 100) {
      toast.error('批量数量必须在1-100之间');
      return;
    }
    if (batchAmount > 1000000) {
      toast.error('充值码钻石数量不能超过100万');
      return;
    }

    setBatchCreating(true);
    try {
      const res = await redeemApi.batchCreate({
        diamondAmount: batchAmount,
        count: batchCount,
        note: batchNote.trim() || undefined
      });
      
      if (res.success) {
        toast.success(res.message);
        setLastCreatedCodes(res.data.codes);
        setBatchNote('');
        if (onSuccess) onSuccess();
        // 3秒后清除显示
        setTimeout(() => setLastCreatedCodes([]), 10000);
      }
    } catch (error: any) {
      toast.error(error.message || '批量创建失败');
    } finally {
      setBatchCreating(false);
    }
  };

  // 复制充值码到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  // 复制所有充值码
  const copyAllCodes = () => {
    const allCodes = lastCreatedCodes.map(c => c.code).join('\n');
    navigator.clipboard.writeText(allCodes);
    toast.success(`已复制 ${lastCreatedCodes.length} 个充值码`);
  };

  return (
    <div className="space-y-6">
      {/* 提示信息 */}
      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
        <p className="text-sm text-purple-700 dark:text-purple-300 flex items-center gap-2">
          <span>💎</span>
          充值码格式: <code className="bg-purple-100 dark:bg-purple-800 px-2 py-0.5 rounded">RP-XXXX-XXXX</code>
          （字母-数字），有效期14天，每个充值码只能使用一次
        </p>
      </div>

      {/* 单次创建 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
          <span>🎫</span> 创建充值码
        </h3>
        
        <div className="space-y-4">
          {/* 钻石数量选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              钻石数量
            </label>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setUsePreset(true)}
                className={`px-3 py-1 text-sm rounded-lg transition ${
                  usePreset
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                预设金额
              </button>
              <button
                onClick={() => setUsePreset(false)}
                className={`px-3 py-1 text-sm rounded-lg transition ${
                  !usePreset
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                自定义金额
              </button>
            </div>
            
            {usePreset ? (
              <div className="flex flex-wrap gap-2">
                {PRESET_AMOUNTS.map(amount => (
                  <button
                    key={amount}
                    onClick={() => setDiamondAmount(amount)}
                    className={`px-4 py-2 rounded-xl font-medium transition ${
                      diamondAmount === amount
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {amount} 💎
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="输入钻石数量"
                min="1"
                max="1000000"
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
              />
            )}
          </div>

          {/* 自定义充值码 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              自定义充值码 <span className="text-xs text-gray-400">（可选，留空自动生成）</span>
            </label>
            <input
              type="text"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              placeholder="例如: RP-MYCODE-1234"
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 outline-none uppercase"
              maxLength={30}
            />
            <p className="text-xs text-gray-400 mt-1">
              格式要求: RP-XXXX-XXXX（字母-数字），如不填写将自动生成
            </p>
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              备注 <span className="text-xs text-gray-400">（可选）</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="用于标记这批充值码的用途"
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          {/* 创建按钮 */}
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2.5 rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50"
          >
            {creating ? '创建中...' : '创建充值码'}
          </button>

          {/* 结果显示 */}
          {lastCreatedCode && (
            <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300 flex items-center justify-between flex-wrap gap-2">
                <span>✅ 充值码: <code className="font-mono font-bold">{lastCreatedCode}</code></span>
                <button
                  onClick={() => copyToClipboard(lastCreatedCode)}
                  className="text-xs bg-green-200 dark:bg-green-800 px-2 py-1 rounded hover:bg-green-300 transition"
                >
                  复制
                </button>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 批量创建 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
          <span>📦</span> 批量创建充值码
        </h3>
        
        <div className="space-y-4">
          {/* 钻石数量 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              钻石数量
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_AMOUNTS.slice(0, 5).map(amount => (
                <button
                  key={amount}
                  onClick={() => setBatchAmount(amount)}
                  className={`px-4 py-2 rounded-xl font-medium transition ${
                    batchAmount === amount
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {amount} 💎
                </button>
              ))}
              <input
                type="number"
                value={batchAmount}
                onChange={(e) => setBatchAmount(parseInt(e.target.value) || 0)}
                className="w-28 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                min="1"
                max="1000000"
              />
            </div>
          </div>

          {/* 数量 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              生成数量: {batchCount} 个
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={batchCount}
              onChange={(e) => setBatchCount(parseInt(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-400 mt-1">最多一次性生成50个充值码</p>
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              备注 <span className="text-xs text-gray-400">（可选）</span>
            </label>
            <input
              type="text"
              value={batchNote}
              onChange={(e) => setBatchNote(e.target.value)}
              placeholder="用于标记这批充值码的用途"
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          {/* 批量创建按钮 */}
          <button
            onClick={handleBatchCreate}
            disabled={batchCreating}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-2.5 rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition disabled:opacity-50"
          >
            {batchCreating ? '批量创建中...' : `批量创建 ${batchCount} 个充值码`}
          </button>

          {/* 批量结果显示 */}
          {lastCreatedCodes.length > 0 && (
            <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  ✅ 已创建 {lastCreatedCodes.length} 个充值码
                </p>
                <button
                  onClick={copyAllCodes}
                  className="text-xs bg-green-200 dark:bg-green-800 px-2 py-1 rounded hover:bg-green-300 transition"
                >
                  复制全部
                </button>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {lastCreatedCodes.map((item, idx) => (
                  <div key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex justify-between items-center">
                    <code className="font-mono">{item.code}</code>
                    <span className="text-xs">{item.diamondAmount}💎</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateRedeemCode;