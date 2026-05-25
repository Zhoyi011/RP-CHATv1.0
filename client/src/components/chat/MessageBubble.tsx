// client/src/components/chat/MessageBubble.tsx - 添加提及高亮

const renderContentWithMentions = (content: string) => {
  const mentionRegex = /@(\w+)/g;
  const parts = content.split(mentionRegex);
  
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      // 这是被 @ 的内容
      return (
        <span key={index} className="text-blue-500 font-semibold bg-blue-100 dark:bg-blue-900/30 px-1 rounded">
          @{part}
        </span>
      );
    }
    return part;
  });
};