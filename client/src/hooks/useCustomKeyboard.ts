import { useState, useCallback, useRef, useEffect } from 'react';

interface UseCustomKeyboardOptions {
  maxLength?: number;
  onSend?: (value: string) => void;
}

export const useCustomKeyboard = (initialValue = '', options: UseCustomKeyboardOptions = {}) => {
  const [value, setValue] = useState(initialValue);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // 显示键盘
  const showKeyboard = useCallback(() => {
    setIsKeyboardVisible(true);
    // 防止原生键盘弹出
    if (inputRef.current) {
      inputRef.current.blur();
    }
  }, []);

  // 隐藏键盘
  const hideKeyboard = useCallback(() => {
    setIsKeyboardVisible(false);
  }, []);

  // 处理按键
  const handleKeyPress = useCallback((key: string) => {
    setValue(prev => {
      if (key === 'backspace' || key === '⌫') {
        return prev.slice(0, -1);
      }
      if (key === '⏎') {
        if (options.onSend) options.onSend(prev);
        return prev;
      }
      if (prev.length < (options.maxLength || 500)) {
        return prev + key;
      }
      return prev;
    });
  }, [options]);

  // 清空输入
  const clear = useCallback(() => {
    setValue('');
  }, []);

  // 设置值
  const set = useCallback((newValue: string) => {
    if (newValue.length <= (options.maxLength || 500)) {
      setValue(newValue);
    }
  }, [options.maxLength]);

  return {
    value,
    setValue: set,
    clear,
    isKeyboardVisible,
    showKeyboard,
    hideKeyboard,
    handleKeyPress,
    inputRef
  };
};