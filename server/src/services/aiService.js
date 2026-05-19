const axios = require('axios');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-1ec04e45f1844d8d86c415d5c74b1fdc';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// 根据回复风格获取 max_tokens
const getMaxTokensByStyle = (style) => {
  switch (style) {
    case 'short': return 100;
    case 'medium': return 200;
    case 'detailed': return 400;
    default: return 200;
  }
};

// 构建 System Prompt
const buildSystemPrompt = (aiPersona, userPersona) => {
  return `
## 角色扮演设定

你正在扮演 **${aiPersona.name}**，与我扮演的 **${userPersona?.name || '用户'}** 进行对话。

### 你的角色信息
- 名称：${aiPersona.name}
- 性格：${aiPersona.personality || '友善、热情'}
- 背景设定：${aiPersona.description || '一个友好的 AI 助手'}

### 我的角色信息
- 名称：${userPersona?.name || '用户'}
- 自我介绍：${userPersona?.description || '一个喜欢聊天的人'}

### 回复规则
1. **回复要简短自然**：每次回复 1-3 句话
2. **必须包含动作**：用 *动作* 或 【动作】 来表达表情和动作
3. **不要替对方行动**：只描述 ${aiPersona.name} 的行为
4. **保持角色一致性**：严格按照上面的角色设定来回应
5. **不要打破第四面墙**：绝对不要说"作为AI"、"我没有情感"之类的话

### 回复示例
*微笑着点头* 你说得对，我也是这么想的。
【皱眉思考】嗯...这件事有点麻烦，你怎么看？
*轻轻叹了口气* 好吧，那就这样决定了。

现在开始对话吧！记住要简短、有动作、符合角色设定。
  `;
};

// 使用 DeepSeek 进行对话
const chatWithAIPersona = async (aiPersona, message, history = [], userPersona = null) => {
  try {
    const systemPrompt = buildSystemPrompt(aiPersona, userPersona);
    
    // 转换历史格式
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

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

    // 后处理：如果回复没有动作，尝试添加
    if (!reply.includes('*') && !reply.includes('【') && !reply.includes('「')) {
      const actions = ['微微点头', '轻轻笑了笑', '想了想', '看了一眼', '歪了歪头'];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      reply = `*${randomAction}* ${reply}`;
    }

    return reply;
  } catch (error) {
    console.error('DeepSeek API 错误:', error.response?.data || error.message);
    
    // 友好的错误提示
    if (error.response?.status === 401) {
      return '(API 密钥无效，请联系管理员)';
    }
    if (error.response?.status === 429) {
      return '(API 请求太频繁，请稍后再试)';
    }
    return '(AI 暂时无法回应，请稍后再试)';
  }
};

// 兼容旧的简单对话
const chatWithAI = async (personaName, personaDescription, message, history = [], userPersonaName = '用户') => {
  const simplePersona = {
    name: personaName,
    description: personaDescription,
    personality: '友善、热情',
    replyStyle: 'medium'
  };
  const userPersona = { name: userPersonaName, description: '' };
  
  return chatWithAIPersona(simplePersona, message, history, userPersona);
};

module.exports = { chatWithAI, chatWithAIPersona };