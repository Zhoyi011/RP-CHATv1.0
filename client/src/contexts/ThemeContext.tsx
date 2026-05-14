// ==================== 全局主题 + 字体管理 ====================
console.log('🔧 [ThemeContext] 加载主题上下文');

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'auto';

interface FontItem {
  name: string;           // 字体标识（用于存储）
  displayName: string;    // 显示名称
  value: string;          // CSS font-family 值
  file?: string;          // 字体文件路径（仅自定义字体有）
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  fontFamily: string;
  setFontFamily: (fontFamily: string) => void;
  availableFonts: FontItem[];
  loadCustomFont: (fontName: string, fontUrl: string) => Promise<boolean>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

// 预设字体（始终存在）
const PRESET_FONTS: FontItem[] = [
  {
    name: 'system',
    displayName: '系统默认',
    value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  {
    name: 'default',
    displayName: 'RP Chat 圆体',
    value: '"猫啃珠圆体", "PingFang SC", "Microsoft YaHei", sans-serif',
  },
];

// 从 /fonts/fonts.json 加载自动扫描的自定义字体
async function loadCustomFontsFromJSON(): Promise<FontItem[]> {
  try {
    const res = await fetch('/fonts/fonts.json');
    if (!res.ok) return [];
    const customFonts = await res.json();
    if (!Array.isArray(customFonts)) return [];
    // 适配前端需要的格式
    return customFonts.map((font: any) => ({
      name: font.name,
      displayName: font.displayName || font.name,
      value: font.value || `"${font.name}", system-ui, sans-serif`,
      file: font.file || `/fonts/${font.name}.ttf`,
    }));
  } catch (err) {
    console.warn('⚠️ 加载自定义字体列表失败，将使用预设字体', err);
    return [];
  }
}

// 动态加载 .ttf 字体文件
async function loadFontFile(fontName: string, url: string): Promise<boolean> {
  // 避免重复加载
  if (document.fonts.check(`12px "${fontName}"`)) return true;
  try {
    const font = new FontFace(fontName, `url(${url})`);
    await font.load();
    document.fonts.add(font);
    console.log(`✅ 字体加载成功: ${fontName}`);
    return true;
  } catch (err) {
    console.error(`❌ 字体加载失败: ${fontName}`, err);
    return false;
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ----- 主题状态 -----
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme | null;
    return saved && ['light', 'dark', 'auto'].includes(saved) ? saved : 'auto';
  });

  // ----- 字体状态 -----
  const [fontFamily, setFontFamilyState] = useState<string>(() => {
    const saved = localStorage.getItem('fontFamily');
    return saved || PRESET_FONTS[0].value;
  });

  const [availableFonts, setAvailableFonts] = useState<FontItem[]>(PRESET_FONTS);

  // 加载可用字体列表（预设 + JSON中的自定义字体）
  useEffect(() => {
    loadCustomFontsFromJSON().then(customFonts => {
      setAvailableFonts([...PRESET_FONTS, ...customFonts]);
    });
  }, []);

  // 应用主题到 DOM（处理 auto 模式）
  const applyTheme = useCallback((newTheme: Theme) => {
    const root = document.documentElement;
    const isDark = newTheme === 'dark' || (newTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', newTheme);
  }, []);

  useEffect(() => {
    console.log(`🎨 [ThemeContext] 主题变更为: ${theme}`);
    applyTheme(theme);
  }, [theme, applyTheme]);

  // 监听系统主题变化（当 theme 为 auto 时）
  useEffect(() => {
    if (theme !== 'auto') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme('auto');
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]);

  // 应用字体到 DOM
  useEffect(() => {
    console.log(`🔤 [ThemeContext] 应用字体: ${fontFamily.substring(0, 60)}`);
    document.body.style.fontFamily = fontFamily;
    localStorage.setItem('fontFamily', fontFamily);
  }, [fontFamily]);

  // ----- 对外方法 -----
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'auto';
      return 'light';
    });
  }, []);

  const setFontFamily = useCallback((font: string) => {
    setFontFamilyState(font);
  }, []);

  // 加载自定义字体（如果尚未加载，且提供了 URL）
  const loadCustomFont = useCallback(async (fontName: string, fontUrl: string): Promise<boolean> => {
    const success = await loadFontFile(fontName, fontUrl);
    if (success) {
      // 可选：将新字体添加到 availableFonts 中，并自动应用
      const newFontItem: FontItem = {
        name: fontName,
        displayName: fontName,
        value: `"${fontName}", ${PRESET_FONTS[0].value}`,
        file: fontUrl,
      };
      setAvailableFonts(prev => {
        if (prev.some(f => f.name === fontName)) return prev;
        return [...prev, newFontItem];
      });
      // 自动应用该字体
      setFontFamily(newFontItem.value);
    }
    return success;
  }, []);

  const value: ThemeContextType = {
    theme,
    setTheme,
    toggleTheme,
    fontFamily,
    setFontFamily,
    availableFonts,
    loadCustomFont,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};