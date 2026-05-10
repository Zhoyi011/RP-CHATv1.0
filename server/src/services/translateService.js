const OpenCC = require('opencc');

// 初始化转换器
const s2tConverter = new OpenCC('s2t.json');  // 简体转繁体
const t2sConverter = new OpenCC('t2s.json');  // 繁体转简体

// 简体转繁体
async function simplifiedToTraditional(text) {
  try {
    return await s2tConverter.convertPromise(text);
  } catch (error) {
    console.error('简转繁失败:', error);
    return text;
  }
}

// 繁体转简体
async function traditionalToSimplified(text) {
  try {
    return await t2sConverter.convertPromise(text);
  } catch (error) {
    console.error('繁转简失败:', error);
    return text;
  }
}

// 自动检测并转换（智能转换）
async function smartConvert(text) {
  // 简单检测：如果包含繁体字符则转简体，否则转繁体
  const hasTraditional = /[\u4E00-\u9FFF]/.test(text) && 
    /[愛國學會書龍對發開關體頭點電飛個過後時間門馬鳥魚貝車長東樂為]/.test(text);
  
  if (hasTraditional) {
    return await traditionalToSimplified(text);
  } else {
    return await simplifiedToTraditional(text);
  }
}

module.exports = {
  simplifiedToTraditional,
  traditionalToSimplified,
  smartConvert
};