const MarkdownIt = require('markdown-it');

const md = new MarkdownIt({
  html: false,        // 禁止 HTML 标签（安全）
  linkify: true,      // 自动识别链接
  breaks: true,       // 换行转 <br>
  typographer: true,  // 智能引号
});

// 自定义规则：只允许安全标签
md.renderer.rules.link_open = function(tokens, idx, options, env, self) {
  tokens[idx].attrPush(['target', '_blank']);
  tokens[idx].attrPush(['rel', 'noopener noreferrer']);
  return self.renderToken(tokens, idx, options);
};

function renderMarkdown(text) {
  if (!text) return '';
  return md.renderInline(text); // 用 renderInline 避免包裹 <p>
}

module.exports = { renderMarkdown };