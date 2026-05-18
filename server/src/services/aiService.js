const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 根据角色描述生成 System Prompt
const buildSystemPrompt = (personaName, personaDescription, userPersonaName = '用户') => {
  return `
你是 ${personaName}，正在和 ${userPersonaName} 进行角色扮演对话。

## 你的角色设定
${personaDescription || '一个普通的角色，性格友善，喜欢聊天。'}

## 核心规则
1. **回复必须简短**：每次回复 1-3 句话，不超过 80 字
2. **必须包含动作**：用 *动作* 或 【动作】 来表达你的表情和动作
3. **不要替对方行动**：只描述 ${personaName} 的行为，不要替 ${userPersonaName} 做决定
4. **保持角色一致性**：根据上面的角色设定来回应，不要偏离
5. **不要打破第四面墙**：不要说"作为AI"、"我没有情感"之类的话

## 回复格式示例
*微笑着点头* 你说得对，我也是这么想的。

【皱眉思考】嗯...这件事有点麻烦。

*轻轻叹了口气* 好吧，那就这样决定了。

*脸红* 别这样嘛...我会害羞的...

现在开始和 ${userPersonaName} 对话吧！记住要简短、有动作、符合角色设定。
`;
};

const chatWithAI = async (personaName, personaDescription, message, history = [], userPersonaName = '用户') => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.85,      // 稍高，更有创意
        maxOutputTokens: 120,   // 限制输出长度
        topP: 0.9,
      },
    });

    const systemPrompt = buildSystemPrompt(personaName, personaDescription, userPersonaName);

    // 转换历史格式，只保留最近 10 轮
    const chatHistory = history.slice(-10).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: `明白了，我会扮演好 ${personaName}，保持回复简短并包含动作描写。` }] },
        ...chatHistory
      ],
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 120,
      },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    let reply = response.text();

    // 后处理：确保回复不太长
    if (reply.length > 200) {
      const cutPoint = reply.lastIndexOf('。', 160);
      if (cutPoint > 80) {
        reply = reply.substring(0, cutPoint + 1);
      } else {
        reply = reply.substring(0, 160) + '...';
      }
    }

    // 如果回复没有动作，尝试添加简单动作
    if (!reply.includes('*') && !reply.includes('【') && !reply.includes('「')) {
      const actions = ['微微点头', '轻轻笑了笑', '想了想', '看了一眼'];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      reply = `*${randomAction}* ${reply}`;
    }

    return reply;
  } catch (error) {
    console.error('AI 对话失败:', error);
    
    // 友好错误提示
    if (error.message?.includes('API key')) {
      return '(AI 服务配置中，请稍后再试)';
    }
    if (error.message?.includes('model') || error.status === 404) {
      return '(AI 模型暂时不可用)';
    }
    return '(AI 暂时无法回应，请稍后再试)';
  }
};

module.exports = { chatWithAI };
