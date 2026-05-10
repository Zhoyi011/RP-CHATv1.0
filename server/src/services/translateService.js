const OpenCC = require('opencc');

// 初始化转换器
const s2tConverter = new OpenCC('s2t.json');  // 简体转繁体
const t2sConverter = new OpenCC('t2s.json');  // 繁体转简体

/**
 * 简体转繁体
 * @param {string} text - 简体中文文本
 * @returns {Promise<string>} 繁体中文文本
 */
async function simplifiedToTraditional(text) {
  if (!text || typeof text !== 'string') return text;
  try {
    return await s2tConverter.convertPromise(text);
  } catch (error) {
    console.error('简转繁失败:', error);
    return text;
  }
}

/**
 * 繁体转简体
 * @param {string} text - 繁体中文文本
 * @returns {Promise<string>} 简体中文文本
 */
async function traditionalToSimplified(text) {
  if (!text || typeof text !== 'string') return text;
  try {
    return await t2sConverter.convertPromise(text);
  } catch (error) {
    console.error('繁转简失败:', error);
    return text;
  }
}

/**
 * 智能转换（自动检测并转换）
 * @param {string} text - 待转换文本
 * @returns {Promise<string>} 转换后的文本
 */
async function smartConvert(text) {
  if (!text || typeof text !== 'string') return text;
  
  // 检测是否包含繁体字
  const hasTraditional = /[愛國學會書龍對發開關體頭點電飛個過後時間門馬鳥魚貝車長東樂為萬與麼]/.test(text);
  
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