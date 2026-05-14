// ==================== 脏话过滤服务 ====================
console.log('🔧 [contentFilter] 初始化脏话过滤模块...');

// 自定义脏话列表（中英文）
const badWords = [
    // 英文脏话
    'fuck', 'shit', 'asshole', 'bitch', 'damn', 'hell', 'cunt', 'dick', 'pussy',
    'cock', 'whore', 'slut', 'bastard', 'wanker', 'twat', 'crap',
    // 中文脏话
    '傻逼', '你他妈', '操你妈', '白痴', '脑残', '废物', '垃圾', '弱智', '智障',
    '笨蛋', '蠢货', 'sb', 'cnm', 'nmsl', 'wcnm', 'tmd', 'mdzz'
];

console.log(`📋 [contentFilter] 已加载 ${badWords.length} 个过滤词`);

/**
 * 过滤消息中的脏话
 * @param {string} content - 原始消息内容
 * @returns {string} 过滤后的内容
 */
function filterMessage(content) {
    console.log(`🔍 [contentFilter] 开始过滤消息，原始长度: ${content?.length || 0}`);
    
    if (!content) {
        console.log(`⚠️ [contentFilter] 消息为空，返回空字符串`);
        return '';
    }
    
    let filtered = content;
    let replacedCount = 0;
    
    badWords.forEach(word => {
        // 使用正则替换，忽略大小写，全局匹配
        const regex = new RegExp(word, 'gi');
        const before = filtered;
        filtered = filtered.replace(regex, (match) => '【已屏蔽脏话】'.repeat(match.length));
        if (before !== filtered) {
            replacedCount++;
            console.log(`  🚫 [contentFilter] 过滤词 "${word}" 被替换`);
        }
    });
    
    if (replacedCount > 0) {
        console.log(`✅ [contentFilter] 过滤完成，共替换 ${replacedCount} 种脏话`);
    } else {
        console.log(`✅ [contentFilter] 消息干净，无需过滤`);
    }
    
    return filtered;
}

/**
 * 检查消息是否干净（不含脏话）
 * @param {string} content - 消息内容
 * @returns {boolean}
 */
function isClean(content) {
    if (!content) {
        console.log(`⚠️ [contentFilter] 检查空消息，返回 true`);
        return true;
    }
    
    const isCleanResult = !badWords.some(word => content.toLowerCase().includes(word.toLowerCase()));
    console.log(`🔍 [contentFilter] 消息${isCleanResult ? '干净✅' : '含脏话❌'}`);
    
    return isCleanResult;
}

console.log('✅ [contentFilter] 脏话过滤模块初始化完成');
module.exports = { filterMessage, isClean };