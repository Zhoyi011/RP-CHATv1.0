const fs = require('fs-extra');
const path = require('path');

console.log('🔍 扫描字体文件...');

const fontsDir = path.join(__dirname, '../public/fonts');
const outputFile = path.join(__dirname, '../public/fonts/fonts.json');

// 确保目录存在
fs.ensureDirSync(fontsDir);

// 读取所有 .ttf 文件
const files = fs.readdirSync(fontsDir);
const fontFiles = files.filter(file => file.endsWith('.ttf'));

// 提取文件名（不含扩展名）
const fonts = fontFiles.map(file => ({
  name: path.basename(file, '.ttf'),
  displayName: path.basename(file, '.ttf'),
  file: `/fonts/${file}`,
  value: `"${path.basename(file, '.ttf')}", system-ui, sans-serif`
}));

// 写入 JSON 文件
fs.writeJsonSync(outputFile, fonts, { spaces: 2 });

console.log(`✅ 已生成字体列表，共 ${fonts.length} 个字体`);