import React, { useState, useEffect } from 'react';
import type { LinkPreview } from '../../services/linkPreviewApi';

interface Props {
  preview: LinkPreview;
  isSelf: boolean;
  isCompact?: boolean;
}

const LinkPreviewCard: React.FC<Props> = ({ preview, isSelf, isCompact = false }) => {
  const [showWarning, setShowWarning] = useState(preview.riskLevel !== 'safe');
  const [imageError, setImageError] = useState(false);

  // 风险等级颜色
  const riskColors = {
    safe: 'border-green-200 bg-green-50',
    suspicious: 'border-amber-200 bg-amber-50',
    dangerous: 'border-red-200 bg-red-50'
  };

  // 链接类型图标
  const typeIcons = {
    image: '🖼️',
    video: '🎬',
    social: '💬',
    github: '🐙',
    website: '🌐'
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (preview.riskLevel === 'dangerous') {
      if (!confirm('⚠️ 此链接被标记为高风险！\n\n确定要继续访问吗？')) {
        e.preventDefault();
        return;
      }
    }
    
    window.open(preview.url, '_blank', 'noopener,noreferrer');
  };

  if (preview.error) {
    return (
      <a
        href={preview.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          e.stopPropagation();
          if (!confirm(`是否打开链接：${preview.url}`)) {
            e.preventDefault();
          }
        }}
        className={`inline-block text-xs break-all ${
          isSelf ? 'text-white/80 hover:text-white' : 'text-blue-500 hover:underline'
        }`}
      >
        🔗 {preview.domain || '链接'}
      </a>
    );
  }

  if (isCompact) {
    // 紧凑模式（用于消息列表中）
    return (
      <a
        href={preview.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition ${
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
        <span className="truncate max-w-[200px]">{preview.title || preview.domain}</span>
        {preview.riskLevel !== 'safe' && (
          <span className="text-amber-500">⚠️</span>
        )}
      </a>
    );
  }

  // 完整卡片模式
  return (
    <div
      onClick={handleClick}
      className={`mt-2 rounded-xl overflow-hidden border cursor-pointer transition-all hover:shadow-md ${
        riskColors[preview.riskLevel]
      } ${isSelf ? 'bg-white/10 border-white/20' : 'bg-white border-gray-200'}`}
      style={{ maxWidth: '320px' }}
    >
      {/* 图片预览 */}
      {preview.image && !imageError && (
        <div className="relative w-full h-40 overflow-hidden bg-gray-100">
          <img
            src={preview.image}
            alt=""
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
          {preview.linkType === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          )}
        </div>
      )}

      {/* 内容 */}
      <div className="p-3">
        {/* 站点信息 */}
        <div className="flex items-center gap-2 mb-2">
          {preview.favicon && !imageError ? (
            <img
              src={preview.favicon}
              alt=""
              className="w-4 h-4 rounded-sm"
              onError={() => setImageError(true)}
            />
          ) : (
            <span className="text-sm">{typeIcons[preview.linkType] || '🌐'}</span>
          )}
          <span className={`text-xs ${isSelf ? 'text-white/60' : 'text-gray-400'}`}>
            {preview.siteName || preview.domain}
          </span>
          {preview.isShortUrl && preview.expandedUrl && (
            <span className={`text-xs ${isSelf ? 'text-white/40' : 'text-gray-300'}`}>
              (短链接)
            </span>
          )}
        </div>

        {/* 标题 */}
        <h4 className={`font-medium text-sm mb-1 line-clamp-2 ${isSelf ? 'text-white' : 'text-gray-800'}`}>
          {preview.title || '无标题'}
        </h4>

        {/* 描述 */}
        {preview.description && (
          <p className={`text-xs line-clamp-2 mb-2 ${isSelf ? 'text-white/70' : 'text-gray-500'}`}>
            {preview.description}
          </p>
        )}

        {/* 安全警告 */}
        {preview.riskLevel !== 'safe' && showWarning && (
          <div className={`text-xs p-2 rounded-lg mb-2 ${
            preview.riskLevel === 'dangerous' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {preview.warnings.map((warning, i) => (
              <div key={i}>{warning}</div>
            ))}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowWarning(false);
              }}
              className="mt-1 underline hover:no-underline"
            >
              我知道了
            </button>
          </div>
        )}

        {/* 底部 URL */}
        <p className={`text-xs truncate ${isSelf ? 'text-white/40' : 'text-gray-400'}`}>
          {preview.domain}
          {preview.expandedUrl && preview.expandedUrl !== preview.url && (
            <span className="ml-1 text-amber-500">
              (展开: {new URL(preview.expandedUrl).hostname})
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

export default LinkPreviewCard;