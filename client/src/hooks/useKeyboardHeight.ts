import { useState, useEffect } from 'react';

export const useKeyboardHeight = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    let lastVisualHeight = window.visualViewport?.height || window.innerHeight;
    let timer: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      if (timer) clearTimeout(timer);
      
      timer = setTimeout(() => {
        const visualViewport = window.visualViewport;
        
        if (visualViewport) {
          const currentVisualHeight = visualViewport.height;
          const windowHeight = window.innerHeight;
          const diff = windowHeight - currentVisualHeight;
          
          // 键盘弹出时，visualViewport 高度会减少
          if (diff > 150) {
            setKeyboardHeight(diff);
            setIsKeyboardOpen(true);
            console.log(`📱 [Keyboard] 键盘弹出，高度差: ${diff}px`);
          } 
          // 键盘收起时，差异很小
          else if (diff < 50 && keyboardHeight > 0) {
            setKeyboardHeight(0);
            setIsKeyboardOpen(false);
            console.log(`📱 [Keyboard] 键盘收起`);
          }
        } else {
          // 降级方案
          const currentHeight = window.innerHeight;
          const heightDiff = lastVisualHeight - currentHeight;
          
          if (heightDiff > 150) {
            setKeyboardHeight(heightDiff);
            setIsKeyboardOpen(true);
          } else if (heightDiff < -100 && keyboardHeight > 0) {
            setKeyboardHeight(0);
            setIsKeyboardOpen(false);
          }
          lastVisualHeight = currentHeight;
        }
      }, 50);
    };

    // 优先使用 visualViewport（iOS 和 Android 都支持）
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
      
      return () => {
        window.visualViewport?.removeEventListener('resize', handleResize);
        window.visualViewport?.removeEventListener('scroll', handleResize);
        if (timer) clearTimeout(timer);
      };
    }
    
    // 降级方案
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (timer) clearTimeout(timer);
    };
  }, [keyboardHeight]);

  return { keyboardHeight, isKeyboardOpen, isIOS };
};