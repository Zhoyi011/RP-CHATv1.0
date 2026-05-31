// client/src/contexts/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 🔥 强制锁定为浅色模式，忽略 localStorage
  const [theme, setTheme] = useState<Theme>('light');

  // 🔥 监听 localStorage 变化，如果有人试图修改，强制改回浅色
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark') {
        console.log('🎨 [Theme] 检测到暗色模式尝试，强制切换回浅色');
        localStorage.setItem('theme', 'light');
        setTheme('light');
      }
    };

    // 监听自定义事件，用于捕获通过代码修改的主题
    const handleThemeForced = () => {
      if (localStorage.getItem('theme') === 'dark') {
        localStorage.setItem('theme', 'light');
        setTheme('light');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('themeForced', handleThemeForced);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('themeForced', handleThemeForced);
    };
  }, []);

  // 🔥 强制应用浅色模式
  useEffect(() => {
    const html = document.documentElement;
    
    // 移除所有主题类
    html.classList.remove('light', 'dark');
    // 只添加浅色类
    html.classList.add('light');
    
    // 强制 localStorage 为 light
    localStorage.setItem('theme', 'light');
    
    // 设置 body 背景色
    document.body.style.backgroundColor = '#f9fafb';
    
    console.log(`🎨 [Theme] 主题已强制锁定为: 浅色模式`);
  }, []);

  // 🔥 setTheme 被调用时，如果是 dark，强制改回 light
  const handleSetTheme = useCallback((newTheme: Theme) => {
    if (newTheme === 'dark') {
      console.log('🎨 [Theme] 夜间模式已被禁用，保持浅色模式');
      return;
    }
    // 如果强行设置为 light，也什么都不做，因为已经是 light 了
  }, []);

  const toggleTheme = useCallback(() => {
    // 🔥 禁用切换功能
    console.log('🎨 [Theme] 夜间模式切换已被禁用');
    // 可选：弹出提示
    // toast.info('夜间模式暂不可用');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};