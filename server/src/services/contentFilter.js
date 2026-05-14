const Filter = require('bad-words-next');

// 初始化过滤器
const filter = new Filter();

// 可选：添加自定义脏话
filter.addWords('FUCK', 'SHIT', 'Bitch', ' asshole', ' bastard','你他妈','傻逼');

function filterMessage(content) {
    if (!content) return '';
    // 使用 bad-words-next 过滤
    return filter.clean(content);
}

function isClean(content) {
    if (!content) return true;
    // 检查是否包含脏话
    return filter.clean(content) === content;
}

module.exports = { filterMessage, isClean };