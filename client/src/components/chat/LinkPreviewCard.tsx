import React, { useState } from 'react';
import type { LinkPreview } from '../../services/linkPreviewApi';

interface Props {
  preview: LinkPreview;
  isSelf: boolean;
  isCompact?: boolean;
}

const LinkPreviewCard: React.FC<Props> = ({ preview, isSelf, isCompact = false }) => {
  const [imageError, setImageError] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);

  // 风险等级配置
  const riskConfig = {
    safe: {
      border: 'border-green-200',
      bg: 'bg-green-50/50',
      badge: 'bg-green-100 text-green-700',
      badgeText: '✅ 安全',
      icon: '🛡️',
    },
    suspicious: {
      border: 'border-amber-200',
      bg: 'bg-amber-50/50',
      badge: 'bg-amber-100 text-amber-700',
      badgeText: '⚠️ 可疑',
      icon: '⚠️',
    },
    dangerous: {
      border: 'border-red-200',
      bg: 'bg-red-50/50',
      badge: 'bg-red-100 text-red-700',
      badgeText: '🚫 危险',
      icon: '⛔',
    },
  };

  const config = riskConfig[preview.riskLevel] || riskConfig.safe;

  // 链接类型图标
  const typeIcons: Record<string, string> = {
    image: '🖼️',
    video: '🎬',
    social: '💬',
    github: '🐙',
    website: '🌐',
  };

  // 点击链接 → 弹出安全确认弹窗
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSafetyModal(true);
  };

  // 确认跳转
  const handleConfirm = () => {
    setShowSafetyModal(false);
    window.open(preview.url, '_blank', 'noopener,noreferrer');
  };

  // 取消
  const handleCancel = () => {
    setShowSafetyModal(false);
  };

  // 错误状态（API 失败回退）
  if (preview.error) {
    return (
      <a
        href={preview.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setShowSafetyModal(true);
        }}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition ${
          isSelf ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
        }`}
      >
        <span>🔗</span>
        <span className="truncate max-w-[200px]">{preview.domain || '链接'}</span>
      </a>
    );
  }

  // 紧凑模式
  if (isCompact) {
    return (
      <>
        <a
          onClick={handleClick}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
            isSelf ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          {preview.favicon && !imageError ? (
            <img
              src={preview.favicon}
              alt=""
              className="w-4 h-4 rounded-sm"
              onError={() => setImageError(true)}
            />
          ) : (
            <span>{typeIcons[preview.linkType] || '🔗'}</span>
          )}
          <span className="truncate max-w-[160px]">{preview.title || preview.domain}</span>
          {preview.riskLevel !== 'safe' && (
            <span className="text-xs">{config.icon}</span>
          )}
        </a>

        {showSafetyModal && (
          <SafetyConfirmModal
            preview={preview}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        )}
      </>
    );
  }

  // 完整卡片模式
  return (
    <>
      <div
        onClick={handleClick}
        className={`mt-2 rounded-xl overflow-hidden border cursor-pointer transition-all duration-200 hover:shadow-md active:scale-[0.98] ${
          config.border
        } ${isSelf ? 'bg-white/5 border-white/20' : `${config.bg} border-gray-200`}`}
        style={{ maxWidth: '340px' }}
      >
        {/* 图片预览 */}
        {preview.image && !imageError && (
          <div className="relative w-full h-44 overflow-hidden bg-gray-100">
            <img
              src={preview.image}
              alt=""
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              onError={() => setImageError(true)}
            />
            {preview.linkType === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-gray-800 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 内容 */}
        <div className="p-3.5">
          {/* 站点信息行 */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              {preview.favicon && !imageError ? (
                <img
                  src={preview.favicon}
                  alt=""
                  className="w-4 h-4 rounded-sm flex-shrink-0"
                  onError={() => setImageError(true)}
                />
              ) : (
                <span className="text-sm flex-shrink-0">{typeIcons[preview.linkType] || '🌐'}</span>
              )}
              <span className={`text-xs truncate ${isSelf ? 'text-white/60' : 'text-gray-400'}`}>
                {preview.siteName || preview.domain}
              </span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2 ${config.badge}`}>
              {config.badgeText}
            </span>
          </div>

          {/* 标题 */}
          <h4 className={`font-medium text-sm mb-1 line-clamp-2 leading-snug ${isSelf ? 'text-white' : 'text-gray-800'}`}>
            {preview.title || '无标题'}
          </h4>

          {/* 描述 */}
          {preview.description && (
            <p className={`text-xs line-clamp-2 mb-2 leading-relaxed ${isSelf ? 'text-white/60' : 'text-gray-500'}`}>
              {preview.description}
            </p>
          )}

          {/* 安全警告（危险链接在卡片上直接显示） */}
          {preview.riskLevel === 'dangerous' && (
            <div className="flex items-center gap-2 p-2 bg-red-100 rounded-lg mb-2">
              <span className="text-lg flex-shrink-0">⛔</span>
              <p className="text-xs text-red-700 font-medium">
                该链接已被标记为恶意网站，访问已被阻止
              </p>
            </div>
          )}

          {preview.riskLevel === 'suspicious' && preview.warnings.length > 0 && (
            <div className="flex items-start gap-2 p-2 bg-amber-100 rounded-lg mb-2">
              <span className="text-lg flex-shrink-0">⚠️</span>
              <div className="text-xs text-amber-700">
                {preview.warnings.slice(0, 2).map((warning, i) => (
                  <p key={i} className="leading-relaxed">{warning}</p>
                ))}
              </div>
            </div>
          )}

          {/* 短链接信息 */}
          {preview.isShortUrl && preview.expandedUrl && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${isSelf ? 'text-white/40' : 'text-gray-400'}`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              已展开: {new URL(preview.expandedUrl).hostname.replace('www.', '')}
            </p>
          )}

          {/* 底部域名 */}
          <p className={`text-[11px] mt-2 truncate flex items-center gap-1 ${isSelf ? 'text-white/30' : 'text-gray-400'}`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {preview.domain}
          </p>
        </div>
      </div>

      {/* 安全确认弹窗 */}
      {showSafetyModal && (
        <SafetyConfirmModal
          preview={preview}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  );
};

// ========== 安全确认弹窗组件 ==========
const SafetyConfirmModal: React.FC<{
  preview: LinkPreview;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ preview, onConfirm, onCancel }) => {

  // 危险链接：完全阻止
  if (preview.riskLevel === 'dangerous') {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div 
          className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 红色头部 */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-8 text-center">
            <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4">
              <span className="text-5xl">⛔</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">访问已阻止</h3>
            <p className="text-red-100 text-sm">检测到该网页疑似恶意网站</p>
          </div>

          <div className="p-6">
            {/* 链接信息 */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-xs text-gray-500 mb-1">目标链接</p>
              <p className="text-sm font-mono text-gray-800 break-all">
                {preview.expandedUrl || preview.url}
              </p>
              {preview.isShortUrl && preview.expandedUrl && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <span>⚠️</span>
                  原始链接为短链接，已展开检测
                </p>
              )}
            </div>

            {/* 警告列表 */}
            <div className="space-y-2 mb-6">
              {preview.warnings.map((warning, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-red-50 rounded-xl">
                  <span className="text-red-500 flex-shrink-0 mt-0.5">•</span>
                  <p className="text-sm text-red-700">{warning}</p>
                </div>
              ))}
              {preview.warnings.length === 0 && (
                <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl">
                  <span className="text-red-500 flex-shrink-0 mt-0.5">•</span>
                  <p className="text-sm text-red-700">该链接被系统标记为高风险，已被自动拦截</p>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 text-center mb-4">
              ℹ️ 为了保护你的安全，此链接已被封锁
            </p>

            <button
              onClick={onCancel}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition active:scale-[0.98]"
            >
              我知道了
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 可疑链接：加强警告
  if (preview.riskLevel === 'suspicious') {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div 
          className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 橙色头部 */}
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-8 text-center">
            <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4">
              <span className="text-5xl">⚠️</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">安全警告</h3>
            <p className="text-amber-100 text-sm">该链接可能存在风险</p>
          </div>

          <div className="p-6">
            {/* 链接信息 */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-xs text-gray-500 mb-1">目标链接</p>
              <p className="text-sm font-mono text-gray-800 break-all">
                {preview.expandedUrl || preview.url}
              </p>
              {preview.isShortUrl && preview.expandedUrl && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <span>⚠️</span>
                  短链接已展开，目标地址如上
                </p>
              )}
            </div>

            {/* 警告列表 */}
            <div className="space-y-2 mb-4">
              {preview.warnings.map((warning, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl">
                  <span className="text-amber-500 flex-shrink-0 mt-0.5">•</span>
                  <p className="text-sm text-amber-800">{warning}</p>
                </div>
              ))}
            </div>

            {/* 免责声明 */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-6">
              <p className="text-xs text-red-600 leading-relaxed">
                <strong>⚠️ 免责声明：</strong>如果你执意要继续访问该网页，请自行承担所有后果与责任。RP Chat 不对该网站的内容、安全性或隐私政策负责。
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition active:scale-[0.98]"
              >
                取消
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition active:scale-[0.98] shadow-md"
              >
                我了解风险，继续访问
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 安全链接：普通确认
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 绿色头部 */}
        <div className="bg-gradient-to-r from-green-400 to-emerald-500 px-6 py-8 text-center">
          <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4">
            <span className="text-5xl">🔗</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">即将跳转</h3>
          <p className="text-green-100 text-sm">你即将离开 RP Chat</p>
        </div>

        <div className="p-6">
          {/* 链接信息 */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-500 mb-1">目标链接</p>
            <p className="text-sm font-mono text-gray-800 break-all">
              {preview.expandedUrl || preview.url}
            </p>
            {preview.domain && (
              <p className="text-xs text-gray-400 mt-2">
                域名: {preview.domain}
              </p>
            )}
          </div>

          {/* 安全徽章 */}
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl mb-6">
            <span className="text-lg">🛡️</span>
            <div>
              <p className="text-sm font-medium text-green-700">链接安全检查通过</p>
              <p className="text-xs text-green-600">未检测到安全风险</p>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center mb-4">
            跳转后请自行注意账号和隐私安全
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition active:scale-[0.98]"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition active:scale-[0.98] shadow-md"
            >
              确认跳转
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinkPreviewCard;