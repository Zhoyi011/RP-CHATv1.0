import { useState, useEffect } from 'react';

export const useKeyboardHeight = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    let lastHeight = window.innerHeight;

    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const heightDiff = lastHeight - currentHeight;

      // 安卓键盘高度通常 > 200px
      if (heightDiff > 150) {
        setKeyboardHeight(heightDiff);
        setIsKeyboardOpen(true);
      } else if (heightDiff < -100) {
        // 键盘收起
        setKeyboardHeight(0);
        setIsKeyboardOpen(false);
      }
      
      lastHeight = currentHeight;
    };

    // 安卓主要用 resize 事件
    window.addEventListener('resize', handleResize);

    // iOS 用 visualViewport
    if (window.visualViewport) {
      const handleViewport = () => {
        const viewportH = window.visualViewport!.height;
        const windowH = window.innerHeight;
        const diff = windowH - viewportH;
        
        if (diff > 150) {
          setKeyboardHeight(diff);
          setIsKeyboardOpen(true);
        } else {
          setKeyboardHeight(0);
          setIsKeyboardOpen(false);
        }
      };
      
      window.visualViewport.addEventListener('resize', handleViewport);
      return () => {
        window.visualViewport?.removeEventListener('resize', handleViewport);
        window.removeEventListener('resize', handleResize);
      };
    }

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { keyboardHeight, isKeyboardOpen, isIOS };
};