// ==================== 字体管理 Hook ====================
console.log('🔧 [useFont] 加载字体管理Hook');

import { useState, useEffect, useCallback } from 'react';

interface FontInfo {
  name: string;
  displayName: string;
  isLoaded: boolean;
}

export const useFont = () => {
  const [fonts, setFonts] = useState<FontInfo[]>([]);
  const [currentFont, setCurrentFont] = useState<string>('system');

  // 加载可用字体
  useEffect(() => {
    const loadFonts = async () => {
      console.log('📁 [useFont] 扫描可用字体...');
      
      // 从 localStorage 读取
      const saved = localStorage.getItem('selectedFont');
      if (saved) {
        console.log(`🔤 [useFont] 读取保存的字体: ${saved}`);
        setCurrentFont(saved);
      }
      
      // 预设字体
      const presetFonts: FontInfo[] = [
        { name: 'system', displayName: '系统默认', isLoaded: true },
        { name: 'default', displayName: 'RP Chat 圆体', isLoaded: true },
      ];
      
      // 尝试加载 custom fonts 目录的字体
      // 这里需要后端提供字体列表API，或前端预置
      
      setFonts(presetFonts);
      console.log(`✅ [useFont] 加载了 ${presetFonts.length} 个字体`);
    };
    
    loadFonts();
  }, []);

  // 切换字体
  const switchFont = useCallback((fontName: string, fontValue: string) => {
    console.log(`🔤 [useFont] 切换字体: ${fontName}`);
    document.documentElement.style.setProperty('--font-family-base', fontValue);
    document.body.style.fontFamily = fontValue;
    localStorage.setItem('selectedFont', fontName);
    setCurrentFont(fontName);
  }, []);

  // 加载自定义字体
  const loadCustomFont = useCallback(async (fontName: string, fontUrl: string) => {
    console.log(`📁 [useFont] 加载自定义字体: ${fontName}`);
    try {
      const font = new FontFace(fontName, `url(${fontUrl})`);
      await font.load();
      document.fonts.add(font);
      
      setFonts(prev => [...prev, {
        name: fontName,
        displayName: fontName,
        isLoaded: true
      }]);
      
      console.log(`✅ [useFont] 字体加载成功: ${fontName}`);
      return true;
    } catch (error) {
      console.error(`❌ [useFont] 字体加载失败:`, error);
      return false;
    }
  }, []);

  return {
    fonts,
    currentFont,
    switchFont,
    loadCustomFont,
  };
};