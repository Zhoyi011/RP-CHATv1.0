// server/src/services/aiService.js
const axios = require('axios');

// DeepSeek 配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-1ec04e45f1844d8d86c415d5c74b1fdc';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// 根据回复风格获取 max_tokens
const getMaxTokensByStyle = (style) => {
  switch (style) {
    case 'short': return 120;      // 约 60-80 字
    case 'medium': return 200;     // 约 100-150 字
    case 'detailed': return 350;   // 约 200-300 字
    default: return 200;
  }
};

// 构建 System Prompt（用于新版 AI 角色）
const buildSystemPrompt = (aiPersona, userPersona) => {
  const userName = userPersona?.name || '用户';
  const userDesc = userPersona?.description || '一个喜欢聊天的人';
  
  return `
## 角色扮演设定

你正在扮演 **${aiPersona.name}**，与我扮演的 **${userName}** 进行对话。

### 你的角色信息
- 名称：${aiPersona.name}
- 性格：${aiPersona.personality || '友善、热情'}
- 背景设定：${aiPersona.description || '一个友好的 AI 助手'}

### 我的角色信息
- 名称：${userName}
- 自我介绍：${userDesc}

### 回复规则（非常重要！）
1. **回复要简短自然**：每次回复 1-3 句话，不要长篇大论
2. **必须包含动作**：用 *动作* 或 【动作】 来表达表情和动作
   - 正确示例：*微笑着* 你好呀！
   - 正确示例：【皱眉思考】嗯...这件事有点麻烦
3. **不要替对方行动**：只描述 ${aiPersona.name} 的行为，不要替 ${userName} 做决定
4. **保持角色一致性**：严格按照上面的角色设定来回应
5. **不要打破第四面墙**：绝对不要说"作为AI"、"我没有情感"之类的废话

### 回复示例
*微笑着点头* 你说得对，我也是这么想的。
【轻轻叹气】好吧，那就这样决定了。
*歪了歪头* 诶？真的吗？

现在开始对话吧！记住要简短、有动作、符合角色设定。
  `;
};

// 构建简单 System Prompt（用于旧版）
const buildSimpleSystemPrompt = (personaName, personaDescription, userPersonaName) => {
  return `
## 角色扮演设定

你正在扮演 **${personaName}**，与 **${userPersonaName || '用户'}** 对话。

### 你的角色设定
${personaDescription || '一个友善的角色'}

### 回复规则
1. 每次回复 1-3 句话，要简短
2. 必须包含动作：用 *动作* 或 【动作】
3. 不要替对方行动
4. 不要说"作为AI"之类的话

### 示例
*微笑着* 你好呀，今天过得怎么样？
【思考】嗯...让我想想。

开始对话吧！
  `;
};

// ========== 新版：使用 AI Persona 对话 ==========
const chatWithAIPersona = async (aiPersona, message, history = [], userPersona = null) => {
  try {
    const systemPrompt = buildSystemPrompt(aiPersona, userPersona);
    
    // 转换历史格式（保留最近 10 轮）
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    console.log(`🤖 [DeepSeek] 调用 AI 角色: ${aiPersona.name}, 风格: ${aiPersona.replyStyle}`);

    const response = await axios.post(DEEPSEEK_API_URL, {
      model: 'deepseek-chat',
      messages: messages,
      max_tokens: getMaxTokensByStyle(aiPersona.replyStyle),
      temperature: 0.85,
      top_p: 0.9,
      frequency_penalty: 0.5,
      presence_penalty: 0.5
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      timeout: 30000
    });

    let reply = response.data.choices[0].message.content;
    console.log(`✅ [DeepSeek] 收到回复: ${reply.substring(0, 50)}...`);

    // 后处理：如果回复没有动作，尝试添加一个简单的动作
    if (!reply.includes('*') && !reply.includes('【') && !reply.includes('「')) {
      const actions = ['微微点头', '轻轻笑了笑', '想了想', '看了一眼', '歪了歪头', '眨了眨眼'];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      reply = `*${randomAction}* ${reply}`;
    }

    return reply;
  } catch (error) {
    console.error('❌ [DeepSeek] API 错误:', error.response?.data || error.message);
    
    // 友好的错误提示
    if (error.response?.status === 401) {
      return '(API 密钥无效，请联系管理员)';
    }
    if (error.response?.status === 429) {
      return '(API 请求太频繁，请稍后再试)';
    }
    if (error.code === 'ECONNABORTED') {
      return '(AI 响应超时，请稍后再试)';
    }
    return '(AI 暂时无法回应，请稍后再试)';
  }
};

// ========== 旧版：简单 AI 对话（兼容原有功能）==========
const chatWithAI = async (personaName, personaDescription, message, history = [], userPersonaName = '用户') => {
  try {
    const systemPrompt = buildSimpleSystemPrompt(personaName, personaDescription, userPersonaName);
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    console.log(`🤖 [DeepSeek] 简单对话: ${personaName}`);

    const response = await axios.post(DEEPSEEK_API_URL, {
      model: 'deepseek-chat',
      messages: messages,
      max_tokens: 200,
      temperature: 0.85,
      top_p: 0.9
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      timeout: 30000
    });

    let reply = response.data.choices[0].message.content;

    // 后处理：添加动作
    if (!reply.includes('*') && !reply.includes('【')) {
      const actions = ['微微点头', '轻轻笑了笑', '想了想'];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      reply = `*${randomAction}* ${reply}`;
    }

    return reply;
  } catch (error) {
    console.error('❌ [DeepSeek] 简单对话错误:', error.response?.data || error.message);
    return '(AI 暂时无法回应，请稍后再试)';
  }
};

// ========== 健康检查 ==========
const checkHealth = async () => {
  try {
    const response = await axios.post(DEEPSEEK_API_URL, {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: 'hi' }],
      max_tokens: 5
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      timeout: 10000
    });
    return response.status === 200;
  } catch (error) {
    console.error('DeepSeek 健康检查失败:', error.message);
    return false;
  }
};

module.exports = { 
  chatWithAI, 
  chatWithAIPersona,
  checkHealth
};