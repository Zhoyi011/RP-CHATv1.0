// ==================== 键盘布局配置 ====================
console.log('🔧 [KeyboardLayouts] 加载键盘布局配置');

export const keyboardLayouts = {
  // 小写字母布局
  lower: [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['⇧', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '⌫'],
    ['?123', 'space', '⏎']
  ],
  
  // 大写字母布局
  upper: [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['⇧', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
    ['?123', 'space', '⏎']
  ],
  
  // 符号和数字布局
  symbols: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
    ['-', '_', '+', '=', '[', ']', '{', '}', '\\', '|'],
    [';', ':', "'", '"', ',', '<', '.', '>', '/', '?'],
    ['ABC', 'space', '⌫', '⏎']
  ]
};

// 特殊按键列表（用于样式判断）
export const specialKeys = ['⌫', '⇧', '?123', 'ABC', 'space', '⏎'];

// 按键显示文字映射（显示不同的文字）
export const keyDisplayMap: Record<string, string> = {
  'space': '空格',
  '⌫': '⌫',
  '⏎': '回车',
  '⇧': '⇧',
  '?123': '?123',
  'ABC': 'ABC'
};

console.log('✅ [KeyboardLayouts] 键盘布局加载完成', {
  lowerKeys: keyboardLayouts.lower.flat().length,
  upperKeys: keyboardLayouts.upper.flat().length,
  symbolsKeys: keyboardLayouts.symbols.flat().length
});