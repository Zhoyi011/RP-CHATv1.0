// server/src/services/translateService.js
const OpenCC = require('opencc-js');
const { translate } = require('@vitalets/google-translate-api');

// ========== 简繁转换 ==========
const s2tConverter = OpenCC.Converter({ from: 'cn', to: 'twp' });
const t2sConverter = OpenCC.Converter({ from: 'twp', to: 'cn' });

async function simplifiedToTraditional(text) {
  if (!text || typeof text !== 'string') return text;
  try {
    return await s2tConverter(text);
  } catch (error) {
    console.error('简转繁失败:', error);
    return text;
  }
}

async function traditionalToSimplified(text) {
  if (!text || typeof text !== 'string') return text;
  try {
    return await t2sConverter(text);
  } catch (error) {
    console.error('繁转简失败:', error);
    return text;
  }
}

async function smartConvert(text) {
  if (!text || typeof text !== 'string') return text;
  const hasTraditional = /[愛國學會書龍對發開關體頭點電飛個過後時間門馬鳥魚貝車長東樂為萬與麼]/.test(text);
  if (hasTraditional) {
    return await traditionalToSimplified(text);
  } else {
    return await simplifiedToTraditional(text);
  }
}

// ========== 翻译功能（纯 Google 免费）==========
/**
 * 翻译文本
 * @param {string} text - 原文
 * @param {string} targetLang - 目标语言 (zh, en, ja, ko 等)
 * @returns {Promise<string>}
 */
async function translateText(text, targetLang) {
  if (!text || typeof text !== 'string') return text;
  if (text.length > 5000) return text;
  
  try {
    const langMap = {
      'zh': 'zh-CN',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
      'en': 'en',
      'ja': 'ja',
      'ko': 'ko',
      'fr': 'fr',
      'de': 'de',
      'es': 'es',
      'it': 'it',
      'pt': 'pt',
      'ru': 'ru'
    };
    
    const to = langMap[targetLang] || targetLang;
    const result = await translate(text, { to });
    
    // 如果需要繁体中文，再转换一下
    if (targetLang === 'zh-TW') {
      return await simplifiedToTraditional(result.text);
    }
    
    return result.text;
  } catch (error) {
    console.error('翻译失败:', error.message);
    return text;
  }
}

/**
 * 批量翻译
 */
async function translateBatch(texts, targetLang) {
  return await Promise.all(texts.map(text => translateText(text, targetLang)));
}

module.exports = {
  simplifiedToTraditional,
  traditionalToSimplified,
  smartConvert,
  translateText,
  translateBatch
};