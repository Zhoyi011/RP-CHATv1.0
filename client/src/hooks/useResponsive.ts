import { useState, useEffect } from 'react';

export const useResponsive = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const width = windowSize.width;
  const height = windowSize.height;
  
  // 更精确的判断
  return {
    isMobile: width <= 768,              // 手机: ≤768px
    isTablet: width > 768 && width <= 1024,  // 平板: 769-1024px
    isDesktop: width > 1024,              // 电脑: >1024px
    
    // 添加手机方向判断
    isMobilePortrait: width <= 768 && height > width,  // 竖屏
    isMobileLandscape: width <= 768 && width > height, // 横屏
    
    width,
    height,
  };
};