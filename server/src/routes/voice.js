// 安装: npm install livekit-server-sdk

const AccessToken = require('livekit-server-sdk').AccessToken;

// LiveKit 配置
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_WS_URL = process.env.LIVEKIT_WS_URL;

// 生成语音房间 Token
router.post('/voice/token', authMiddleware, async (req, res) => {
  try {
    const { roomName } = req.body;
    const userId = req.userId;
    const persona = await getActivePersona(userId);
    
    if (!persona) {
      return res.status(400).json({ error: '请先选择一个角色' });
    }
    
    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: persona._id.toString(),
      name: persona.displayName || persona.name,
      metadata: JSON.stringify({
        avatar: persona.avatar,
        userId: userId
      }),
      ttl: '6h',
    });
    
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    
    res.json({ 
      token: token.toJwt(),
      wsUrl: LIVEKIT_WS_URL
    });
  } catch (error) {
    console.error('生成语音Token失败:', error);
    res.status(500).json({ error: '生成失败' });
  }
});