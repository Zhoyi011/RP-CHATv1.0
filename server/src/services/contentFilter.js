const Filter = require('bad-words');

const filter = new Filter();

// 自定义 RP 额外屏蔽词
filter.addWords(
  // 你可以在这里添加需要屏蔽的词
   '操你妈',
   '傻逼',
    '滚',
    '死全家',
    '你妈死了',
    '傻子',
    '妈的',
    '去死',
    '垃圾',
    '弱智',
    '智障',
    '王八蛋',
    '狗东西',
    '吃屎',
    '草泥马',
    '傻吊',
    '傻B',
    '傻比',
    '傻缺',
    '傻叉',
    '傻蛋',
    '傻屌',
    '傻冒',
    '傻愣',
    '傻熊',
    '傻猴',
    '傻鸟',
    '傻牛',
    '傻猪',
    '傻狗',
    '傻子',
    '傻逼',
    '傻比',
    'Fuck You',
    'Shit',
    'Bitch'
    

);

function filterMessage(text) {
  if (!text || typeof text !== 'string') return text;
  return filter.clean(text);
}

function isClean(text) {
  if (!text || typeof text !== 'string') return true;
  return !filter.isProfane(text);
}

module.exports = { filterMessage, isClean };