export const parseMarkdown = (text: string): string => {
  if (!text) return '';
  
  let result = text
    // 转义 HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    
    // 粗体 **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold">$1</strong>')
    // 斜体 *text*
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    // 下划线 __text__
    .replace(/__(.+?)__/g, '<u class="underline">$1</u>')
    // 删除线 ~~text~~
    .replace(/~~(.+?)~~/g, '<span class="text-gray-400 line-through">$1</span>')
    // 行内代码 `code`
    .replace(/`(.+?)`/g, '<code class="bg-gray-200 text-pink-600 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    
    // 引用 > text
    .replace(/^&gt;\s?(.+)$/gm, '<blockquote class="border-l-4 border-gray-300 pl-3 text-gray-500 italic my-1">$1</blockquote>')
    
    // 链接（先处理 Markdown 链接 [text](url)，再处理纯 URL）
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">$1</a>')
    .replace(/(?<!href=")(?<!">)(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">$1</a>');
  
  // 换行
  result = result.replace(/\n/g, '<br/>');
  
  return result;
};