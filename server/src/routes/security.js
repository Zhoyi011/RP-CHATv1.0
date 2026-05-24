// server/src/routes/security.js（新增）
app.post('/api/security/gentle-alert', (req, res) => {
  const { type, userAgent } = req.body;
  const ip = getClientIp(req);
  
  // 只记录到日志，不封禁
  console.log(`📋 [温和警报] ${type} - IP: ${ip} - UA: ${userAgent}`);
  
  // 可选：写入专门的安全日志（不触发封禁）
  fs.appendFileSync('/tmp/gentle_alerts.log', JSON.stringify({
    type, ip, userAgent, timestamp: new Date().toISOString()
  }) + '\n');
  
  res.json({ received: true });
});