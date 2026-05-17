import { useEffect, useCallback } from 'react';
import type { Persona } from '../services/api';

console.log('🔧 [useQuickSwitchPersona] 加载快捷键切换角色Hook');

interface UseQuickSwitchPersonaOptions {
  enabled: boolean;
  personas: Persona[];
  currentPersona: Persona | null;
  onSwitch: (persona: Persona) => void;
  shortcutKey?: string;
}

export const useQuickSwitchPersona = ({
  enabled,
  personas,
  currentPersona,
  onSwitch,
  shortcutKey = 'Tab'
}: UseQuickSwitchPersonaOptions) => {
  const canSwitch = enabled && personas.length > 1;
  console.log(`⌨️ [useQuickSwitchPersona] 初始化, enabled=${enabled}, 角色数=${personas.length}, canSwitch=${canSwitch}, 快捷键=${shortcutKey}`);

  const getNextPersona = useCallback(() => {
    if (personas.length === 0) return null;
    if (!currentPersona) return personas[0];
    
    const currentIndex = personas.findIndex(p => p._id === currentPersona._id);
    const nextIndex = (currentIndex + 1) % personas.length;
    console.log(`⌨️ [useQuickSwitchPersona] 下一个角色索引: ${nextIndex}`);
    return personas[nextIndex];
  }, [personas, currentPersona]);

  const getPrevPersona = useCallback(() => {
    if (personas.length === 0) return null;
    if (!currentPersona) return personas[0];
    
    const currentIndex = personas.findIndex(p => p._id === currentPersona._id);
    const prevIndex = (currentIndex - 1 + personas.length) % personas.length;
    console.log(`⌨️ [useQuickSwitchPersona] 上一个角色索引: ${prevIndex}`);
    return personas[prevIndex];
  }, [personas, currentPersona]);

  useEffect(() => {
    if (!canSwitch) {
      console.log(`⌨️ [useQuickSwitchPersona] 快捷键已禁用 (canSwitch=false)`);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Tab 键切换（不阻止默认行为可能会改变焦点）
      if (e.key === shortcutKey && !e.shiftKey) {
        e.preventDefault();
        const nextPersona = getNextPersona();
        if (nextPersona && nextPersona._id !== currentPersona?._id) {
          console.log(`⌨️ [useQuickSwitchPersona] Tab 键切换到: ${nextPersona.displayName || nextPersona.name}`);
          onSwitch(nextPersona);
        }
      }
      
      // Shift + Tab 反向切换
      if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        const prevPersona = getPrevPersona();
        if (prevPersona && prevPersona._id !== currentPersona?._id) {
          console.log(`⌨️ [useQuickSwitchPersona] Shift+Tab 切换到: ${prevPersona.displayName || prevPersona.name}`);
          onSwitch(prevPersona);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    console.log(`⌨️ [useQuickSwitchPersona] 已注册快捷键监听: ${shortcutKey}`);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      console.log(`🧹 [useQuickSwitchPersona] 已移除快捷键监听`);
    };
  }, [canSwitch, shortcutKey, getNextPersona, getPrevPersona, currentPersona, onSwitch]);

  return {
    getNextPersona,
    getPrevPersona,
    personaCount: personas.length,
    canSwitch
  };
};