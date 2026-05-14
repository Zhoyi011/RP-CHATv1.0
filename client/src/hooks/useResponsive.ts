import { useEffect, useState } from 'react';

console.log('🔧 [useResponsive] 加载响应式 Hook');

export const useResponsive = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      const newSize = { width: window.innerWidth, height: window.innerHeight };
      console.log(`📐 [useResponsive] 窗口大小变化: ${newSize.width}x${newSize.height}`);
      setWindowSize(newSize);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      console.log(`📐 [useResponsive] 初始窗口大小: ${windowSize.width}x${windowSize.height}`);
      return () => {
        console.log(`🧹 [useResponsive] 移除 resize 监听`);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []);

  const isMobile = windowSize.width < 768;
  const isTablet = windowSize.width >= 768 && windowSize.width < 1024;
  const isDesktop = windowSize.width >= 1024;

  console.log(`📱 [useResponsive] 当前设备: 手机=${isMobile}, 平板=${isTablet}, 电脑=${isDesktop}`);

  return { isMobile, isTablet, isDesktop, width: windowSize.width, height: windowSize.height };
};