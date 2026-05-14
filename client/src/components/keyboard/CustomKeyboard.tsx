import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ==================== 键盘布局 ====================
const layouts = {
  lower: [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['⇧', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '⌫'],
    ['?123', 'space', '⏎']
  ],
  upper: [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['⇧', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
    ['?123', 'space', '⏎']
  ],
  symbols: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
    ['-', '_', '+', '=', '[', ']', '{', '}', '\\', '|'],
    [';', ':', "'", '"', ',', '<', '.', '>', '/', '?'],
    ['ABC', 'space', '⌫', '⏎']
  ]
};

interface CustomKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  onClose?: () => void;
  placeholder?: string;
  maxLength?: number;
  theme?: 'light' | 'dark';
  enableSound?: boolean;
}

export const CustomKeyboard: React.FC<CustomKeyboardProps> = ({
  value,
  onChange,
  onClose,
  placeholder = '输入消息...',
  maxLength = 500,
  theme = 'dark',
  enableSound = false
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [layout, setLayout] = useState<'lower' | 'upper' | 'symbols'>('lower');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 播放按键音效（可选）
  const playSound = () => {
    if (!enableSound) return;
    const audio = new Audio('/sounds/keypress.mp3');
    audio.volume = 0.2;
    audio.play().catch(() => {});
  };

  // 处理按键
  const handleKeyPress = (key: string) => {
    playSound();
    setActiveKey(key);
    setTimeout(() => setActiveKey(null), 100);

    switch (key) {
      case '⌫': // 删除
        setInputValue(prev => prev.slice(0, -1));
        break;
      case '⏎': // 回车
        if (onClose) onClose();
        onChange(inputValue);
        break;
      case 'space':
        setInputValue(prev => prev + ' ');
        break;
      case '⇧':
        setLayout(layout === 'lower' ? 'upper' : 'lower');
        break;
      case '?123':
        setLayout('symbols');
        break;
      case 'ABC':
        setLayout('lower');
        break;
      default:
        if (inputValue.length < maxLength) {
          setInputValue(prev => prev + key);
        }
    }
  };

  // 同步到父组件
  useEffect(() => {
    onChange(inputValue);
  }, [inputValue, onChange]);

  // 获取当前布局
  const currentLayout = layouts[layout];

  // 获取按键样式
  const getKeyStyle = (key: string) => {
    const isActive = activeKey === key;
    const isSpecial = ['⌫', '⇧', '?123', 'ABC', 'space', '⏎'].includes(key);
    
    let width = 'w-12';
    if (key === 'space') width = 'w-32';
    if (key === '⏎') width = 'w-16';
    
    return {
      width,
      background: isActive 
        ? (theme === 'dark' ? 'bg-white/30' : 'bg-black/10')
        : isSpecial 
          ? (theme === 'dark' ? 'bg-white/15' : 'bg-gray-200')
          : (theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'),
      textColor: theme === 'dark' ? 'text-white' : 'text-gray-900',
      hover: theme === 'dark' ? 'hover:bg-white/20' : 'hover:bg-gray-200'
    };
  };

  return (
    <>
      {/* 输入框 */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          readOnly
          value={inputValue}
          placeholder={placeholder}
          onClick={() => setShowKeyboard(true)}
          onFocus={() => setShowKeyboard(true)}
          className={`
            w-full p-3 rounded-xl resize-none
            ${theme === 'dark' 
              ? 'bg-gray-800 text-white placeholder-gray-400' 
              : 'bg-gray-100 text-gray-900 placeholder-gray-500'
            }
            focus:outline-none focus:ring-2 focus:ring-blue-500
            transition-all duration-200
          `}
          rows={3}
          maxLength={maxLength}
        />
        <div className="absolute bottom-2 right-2 text-xs text-gray-400">
          {inputValue.length}/{maxLength}
        </div>
      </div>

      {/* 自定义键盘 */}
      <AnimatePresence>
        {showKeyboard && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 20 }}
            className={`
              fixed bottom-0 left-0 right-0 z-50
              ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}
              shadow-2xl border-t
              ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
            `}
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* 键盘头部 */}
            <div className="flex justify-between items-center px-4 py-2 border-b border-gray-700">
              <button
                onClick={onClose}
                className="px-3 py-1 text-blue-500 font-medium"
              >
                完成
              </button>
              <div className="text-sm text-gray-400">
                自定义键盘
              </div>
              <button
                onClick={() => setShowKeyboard(false)}
                className="px-3 py-1 text-gray-400"
              >
                ↓
              </button>
            </div>

            {/* 键盘按键 */}
            <div className="p-2">
              {currentLayout.map((row, rowIndex) => (
                <div key={rowIndex} className="flex justify-center gap-1 mb-1">
                  {row.map((key, keyIndex) => {
                    const style = getKeyStyle(key);
                    return (
                      <motion.button
                        key={keyIndex}
                        whileTap={{ scale: 0.95 }}
                        onMouseDown={() => handleKeyPress(key)}
                        onTouchStart={() => handleKeyPress(key)}
                        className={`
                          ${style.width} h-12 rounded-lg
                          ${style.background} ${style.textColor}
                          ${style.hover} transition-all duration-75
                          font-medium text-lg
                          flex items-center justify-center
                          active:scale-95
                        `}
                      >
                        {key === 'space' ? '空格' : key === '⏎' ? '回车' : key}
                      </motion.button>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};