// server/test-link-preview.js
// 测试链接检测服务

const linkService = require('../services/linkService');

const TEST_URLS = {
  // ========== 正常网站 ==========
  safe: [
    'https://github.com',
    'https://www.bilibili.com',
    'https://baidu.com',
    'https://www.npmjs.com/package/cheerio',
  ],
  
  // ========== 短链接 ==========
  shortLinks: [
    'https://bit.ly/3xyz',        // bit.ly 短链接
    'https://tinyurl.com/example', // TinyURL
  ],
  
  // ========== 可疑链接（测试用）==========
  suspicious: [
    'http://example.tk',           // 免费可疑 TLD
    'http://192.168.1.1',          // IP 地址
    'http://login-example.xyz',    // 钓鱼关键词 + 低价 TLD
    'http://bit.ly/3xyz',          // HTTP + 短链接
  ],
  
  // ========== 各种链接类型 ==========
  types: [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',  // 视频
    'https://twitter.com/example',                    // 社交
    'https://github.com/facebook/react',              // GitHub
    'https://picsum.photos/200/300',                  // 图片
  ],
  
  // ========== 无协议域名 ==========
  noProtocol: [
    'github.com',
    'npmjs.com',
    'bilibili.com',
  ],
};

async function runTests() {
  console.log('🧪 开始链接检测测试\n');
  console.log('=' .repeat(60));
  
  // ===== 测试安全网站 =====
  console.log('\n🟢 测试安全网站:');
  for (const url of TEST_URLS.safe) {
    console.log(`\n📎 ${url}`);
    const result = await linkService.analyzeUrl(url);
    console.log(`   ✅ 标题: ${result.title || '(无)'}`);
    console.log(`   📝 描述: ${(result.description || '').substring(0, 60)}`);
    console.log(`   🖼️ 图片: ${result.image ? '有' : '无'}`);
    console.log(`   🔖 Favicon: ${result.favicon ? '有' : '无'}`);
    console.log(`   🏷️ 类型: ${result.linkType}`);
    console.log(`   🛡️ 安全: ${result.riskLevel} ${result.warnings.join(', ')}`);
  }
  
  // ===== 测试短链接 =====
  console.log('\n\n🔗 测试短链接展开:');
  for (const url of TEST_URLS.shortLinks) {
    console.log(`\n📎 ${url}`);
    const result = await linkService.analyzeUrl(url);
    console.log(`   展开: ${result.expandedUrl || '未展开'}`);
    console.log(`   🛡️ 安全: ${result.riskLevel}`);
  }
  
  // ===== 测试可疑链接 =====
  console.log('\n\n⚠️ 测试可疑链接检测:');
  for (const url of TEST_URLS.suspicious) {
    console.log(`\n📎 ${url}`);
    const result = await linkService.analyzeUrl(url);
    console.log(`   🛡️ 风险等级: ${result.riskLevel}`);
    console.log(`   ⚠️ 警告: ${result.warnings.map(w => `"${w}"`).join(', ') || '无'}`);
  }
  
  // ===== 测试链接类型识别 =====
  console.log('\n\n📋 测试链接类型识别:');
  for (const url of TEST_URLS.types) {
    console.log(`\n📎 ${url}`);
    const result = await linkService.analyzeUrl(url);
    console.log(`   🏷️ 类型: ${result.linkType}`);
    console.log(`   📝 标题: ${result.title || '(无)'}`);
  }
  
  // ===== 测试无协议域名 =====
  console.log('\n\n🌐 测试无协议域名:');
  for (const url of TEST_URLS.noProtocol) {
    console.log(`\n📎 ${url} → https://${url}`);
    const result = await linkService.analyzeUrl(`https://${url}`);
    console.log(`   ✅ 标题: ${result.title || '(无)'}`);
    console.log(`   🛡️ 安全: ${result.riskLevel}`);
  }
  
  console.log('\n\n' + '='.repeat(60));
  console.log('✅ 测试完成!');
}

runTests().catch(console.error);