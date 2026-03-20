import React, { useState } from 'react';

interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

// 常用颜文字库
const kaomojiList = [
  '( ͡° ͜ʖ ͡°)', '(◕ᴗ◕✿)', '(◠‿◠)', '(◕‿◕)', '(◡‿◡✿)',
  '(◕◡◕)', '(｡◕‿◕｡)', '(◕‿◕✿)', '(◕ᴗ◕)', '(◕‿◕)♡',
  '(◡‿◡)', '(◕ᴗ◕✿)', '(◠‿◠✿)', '(◕‿◕)♡', '(◡‿◡✿)',
  '(*^‿^*)', '(◕‿◕✿)', '(◠‿◠✿)', '(◕ᴗ◕✿)', '(◕‿◕)♡',
  '(╯°□°）╯︵ ┻━┻', '¯\\_(ツ)_/¯', '(⊙_⊙)', '(☉_☉)', '(¬_¬)',
  '(¬‿¬)', '(◔_◔)', '(◔‿◔)', '(✿◠‿◠)', '(づ｡◕‿‿◕｡)づ',
  '(っ˘ω˘ς)', '(●´ω｀●)', '(●ˇ∀ˇ●)','(●｀ェ´●)','(ಥ⁠‿⁠ಥ)' ,'(⁠ ⁠≧⁠Д⁠≦⁠)' , 
  '(⁠〒⁠﹏⁠〒⁠)' , '(⁠｡⁠ŏ⁠﹏⁠ŏ⁠)' ,'(⁠༎ຶ⁠ ⁠෴⁠ ⁠༎ຶ⁠)' , '(⁠；⁠^⁠ω⁠^⁠）'

];

// 常用表情
const emojiList = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
  '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
  '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '👏', '🙏', '💪',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
  '🔥', '✨', '⭐', '🌟', '💫', '🎉', '🎊', '🎈', '🎁', '🏆'
];

const EmojiPicker: React.FC<Props> = ({ onSelect, onClose }) => {
  const [activeTab, setActiveTab] = useState<'emoji' | 'kaomoji'>('emoji');

  const handleSelect = (item: string) => {
    onSelect(item);
    // 不关闭面板，让用户可以继续选择
  };

  return (
    <div className="absolute bottom-full mb-2 left-0 bg-white rounded-xl shadow-lg border w-96 z-50">
      {/* 头部 */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('emoji')}
          className={`flex-1 py-2 text-sm font-medium ${
            activeTab === 'emoji' ? 'text-green-600 border-b-2 border-green-500' : 'text-gray-500'
          }`}
        >
          😊 表情
        </button>
        <button
          onClick={() => setActiveTab('kaomoji')}
          className={`flex-1 py-2 text-sm font-medium ${
            activeTab === 'kaomoji' ? 'text-green-600 border-b-2 border-green-500' : 'text-gray-500'
          }`}
        >
          (◕ᴗ◕) 颜文字
        </button>
      </div>

      {/* 内容 - 网格布局 */}
      <div className="p-3 max-h-80 overflow-y-auto">
        {activeTab === 'emoji' ? (
          <div className="grid grid-cols-8 gap-1">
            {emojiList.map((emoji, i) => (
              <button
                key={i}
                onClick={() => handleSelect(emoji)}
                className="p-2 hover:bg-gray-100 rounded-lg text-xl transition"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1">
            {kaomojiList.map((kaomoji, i) => (
              <button
                key={i}
                onClick={() => handleSelect(kaomoji)}
                className="p-2 hover:bg-gray-100 rounded-lg text-sm font-mono text-left transition"
                title={kaomoji}
              >
                {kaomoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 底部 - 只保留关闭按钮 */}
      <div className="border-t p-2 flex justify-end">
        <button
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1"
        >
          关闭
        </button>
      </div>
    </div>
  );
};

export default EmojiPicker;