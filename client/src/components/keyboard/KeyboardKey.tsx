import React from 'react';
import { motion } from 'framer-motion';

interface KeyboardKeyProps {
  keyValue: string;
  theme: 'light' | 'dark';
  isActive: boolean;
  onPress: (key: string) => void;
}

console.log('🔧 [KeyboardKey] 加载按键组件');

export const KeyboardKey: React.FC<KeyboardKeyProps> = ({ 
  keyValue, 
  theme, 
  isActive, 
  onPress 
}) => {
  // 判断是否为特殊按键
  const isSpecial = ['⌫', '⇧', '?123', 'ABC', 'space', '⏎'].includes(keyValue);
  
  // 获取按键宽度
  let width = 'w-12';
  if (keyValue === 'space') width = 'w-32';
  if (keyValue === '⏎') width = 'w-16';
  
  // 获取按键样式
  const getKeyStyle = () => {
    if (isActive) {
      return theme === 'dark' ? 'bg-white/30 scale-95' : 'bg-black/10 scale-95';
    }
    if (isSpecial) {
      return theme === 'dark' ? 'bg-white/15' : 'bg-gray-200';
    }
    return theme === 'dark' ? 'bg-white/10' : 'bg-gray-100';
  };
  
  const getTextColor = () => {
    return theme === 'dark' ? 'text-white' : 'text-gray-900';
  };
  
  // 获取显示文字
  const getDisplayText = () => {
    if (keyValue === 'space') return '空格';
    if (keyValue === '⏎') return '回车';
    return keyValue;
  };

  console.log(`⌨️ [KeyboardKey] 渲染按键: ${keyValue}`);

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onMouseDown={() => onPress(keyValue)}
      onTouchStart={() => onPress(keyValue)}
      className={`
        ${width} h-12 rounded-lg
        ${getKeyStyle()} ${getTextColor()}
        hover:${theme === 'dark' ? 'bg-white/20' : 'bg-gray-200'}
        transition-all duration-75
        font-medium text-lg
        flex items-center justify-center
        active:scale-95
      `}
    >
      {getDisplayText()}
    </motion.button>
  );
};