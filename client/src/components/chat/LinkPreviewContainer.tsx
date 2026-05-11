import React, { useState, useEffect, useRef } from 'react';
import { linkPreviewApi, type LinkPreview } from '../../services/linkPreviewApi';
import LinkPreviewCard from './LinkPreviewCard';

interface Props {
  urls: string[];
  isSelf: boolean;
}

const LinkPreviewContainer: React.FC<Props> = ({ urls, isSelf }) => {
  const [previews, setPreviews] = useState<LinkPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (urls.length === 0 || fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchPreviews = async () => {
      setLoading(true);
      try {
        const data = await linkPreviewApi.getBatchPreviews(urls);
        setPreviews(data);
      } catch (error) {
        console.error('获取链接预览失败:', error);
        // 如果 API 失败，回退到基本链接显示
        setPreviews(urls.map(url => ({
          originalUrl: url,
          url: url,
          title: '',
          description: '',
          image: '',
          favicon: '',
          siteName: '',
          type: 'website',
          linkType: 'website' as const,
          domain: getDomainFromUrl(url),
          riskLevel: 'safe' as const,
          warnings: [],
          isShortUrl: false,
          error: true
        })));
      } finally {
        setLoading(false);
      }
    };

    fetchPreviews();
  }, [urls]);

  if (loading && previews.length === 0) {
    return (
      <div className="mt-2 space-y-2">
        {urls.map((url, i) => (
          <div
            key={i}
            className={`rounded-xl p-3 animate-pulse ${
              isSelf ? 'bg-white/10' : 'bg-gray-100'
            }`}
            style={{ maxWidth: '320px' }}
          >
            <div className={`h-3 w-24 rounded mb-2 ${isSelf ? 'bg-white/20' : 'bg-gray-200'}`} />
            <div className={`h-2 w-48 rounded ${isSelf ? 'bg-white/20' : 'bg-gray-200'}`} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      {previews.map((preview, i) => (
        <LinkPreviewCard
          key={i}
          preview={preview}
          isSelf={isSelf}
          isCompact={urls.length > 2}
        />
      ))}
    </div>
  );
};

// 辅助函数
function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default LinkPreviewContainer;