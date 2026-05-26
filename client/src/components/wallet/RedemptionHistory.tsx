// client/src/components/wallet/RedemptionHistory.tsx
import React, { useState } from 'react';
import { type RedemptionRecord } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

interface RedemptionHistoryProps {
  records: RedemptionRecord[];
  totalReceived: number;
}

const RedemptionHistory: React.FC<RedemptionHistoryProps> = ({ records, totalReceived }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [expanded, setExpanded] = useState(true);

  // 格式化时间
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (records.length === 0) {
    return (
      <div className={`rounded-xl p-6 text-center ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex justify-center mb-3">
          <svg className={`w-12 h-12 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
          暂无充值记录
        </p>
        <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          使用充值码兑换钻石后，记录会显示在这里
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
      {/* 头部 */}
      <div 
        className={`flex items-center justify-between p-4 cursor-pointer ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        } ${expanded ? 'border-b' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <svg className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            充值记录
          </h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
            {records.length} 条
          </span>
        </div>
        <svg 
          className={`w-5 h-5 transition-transform ${isDark ? 'text-gray-400' : 'text-gray-500'} ${expanded ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* 列表 */}
      {expanded && (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {records.map((record) => (
            <div key={record._id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💎</span>
                  <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    +{record.diamondAmount.toLocaleString()}
                  </span>
                </div>
                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {formatDate(record.usedAt)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    充值码:
                  </span>
                  <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                    isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {record.code}
                  </code>
                </div>
                <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  余额: {record.newBalance.toLocaleString()} 💎
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RedemptionHistory;