const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// 获取 YouTube 字幕
router.get('/subtitles', async (req, res) => {
  const { videoId } = req.query;
  
  if (!videoId) {
    return res.status(400).json({ error: '缺少 videoId' });
  }
  
  try {
    // 使用 yt-dlp 获取字幕
    const command = `yt-dlp --write-auto-sub --sub-lang zh-Hans,en --skip-download --print "%(subtitles)s" https://www.youtube.com/watch?v=${videoId}`;
    
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr) {
      console.error('yt-dlp 错误:', stderr);
    }
    
    // 解析字幕
    if (stdout) {
      try {
        const subtitles = JSON.parse(stdout);
        return res.json({ subtitles });
      } catch {
        // 尝试另一种方式
      }
    }
    
    res.json({ subtitles: [] });
  } catch (error) {
    console.error('获取字幕失败:', error);
    res.json({ subtitles: [] });
  }
});

module.exports = router;