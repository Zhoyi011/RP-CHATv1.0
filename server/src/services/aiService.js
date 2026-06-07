// server/src/services/aiService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ========== 模型配置（按优先级排序）==========
const MODELS = {
  primary: 'gemini-3.5-flash',      // 主模型：最新，5 RPM
  fallback1: 'gemini-2.5-flash',    // 备用1：稳定，2 RPM
  fallback2: 'gemini-3.1-flash-lite', // 备用2：轻量，15 RPM
};

// 获取 API Key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// 初始化客户端
let genAI = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// 限流重试配置
const MAX_RETRIES_PER_MODEL = 2;  // 每个模型最多重试2次
const MAX_MODEL_SWITCH = 3;       // 最多尝试3个模型
const INITIAL_RETRY_DELAY = 1000; // 1秒

// 根据回复风格获取 max_tokens
const getMaxTokensByStyle = (style) => {
  switch (style) {
    case 'short': return 100;
    case 'medium': return 200;
    case 'detailed': return 400;
    default: return 200;
  }
};

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 带模型降级和重试的 API 调用
const callWithFallback = async (prompt, generationConfig, modelIndex = 0, retryCount = 0) => {
  if (!genAI) {
    throw new Error('Gemini API 未配置');
  }

  // 获取当前要尝试的模型
  const modelList = [MODELS.primary, MODELS.fallback1, MODELS.fallback2];
  const currentModel = modelList[modelIndex];
  
  if (!currentModel) {
    throw new Error('所有模型都不可用');
  }

  try {
    console.log(`🔍 尝试模型: ${currentModel} (尝试 ${retryCount + 1}/2)`);
    
    const model = genAI.getGenerativeModel({ model: currentModel });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    });
    
    console.log(`✅ 模型 ${currentModel} 调用成功`);
    return result;
    
  } catch (error) {
    const errorMsg = error.message || '';
    const isRateLimit = errorMsg.includes('429') || 
                        errorMsg.includes('quota') ||
                        errorMsg.includes('RPM') ||
                        errorMsg.includes('TPM') ||
                        errorMsg.includes('rate limit');
    
    const isModelError = errorMsg.includes('404') || 
                         errorMsg.includes('not found') ||
                         errorMsg.includes('model');
    
    console.error(`❌ 模型 ${currentModel} 失败:`, errorMsg.substring(0, 100));
    
    // 限流错误：当前模型重试
    if (isRateLimit && retryCount < MAX_RETRIES_PER_MODEL - 1) {
      const waitTime = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`⏳ 限流，${waitTime}ms 后重试 ${currentModel} (${retryCount + 1}/${MAX_RETRIES_PER_MODEL})`);
      await delay(waitTime);
      return callWithFallback(prompt, generationConfig, modelIndex, retryCount + 1);
    }
    
    // 模型错误或重试用尽：切换到下一个模型
    if (modelIndex < MAX_MODEL_SWITCH - 1) {
      console.log(`🔄 切换到下一个模型 (${modelList[modelIndex + 1]})`);
      await delay(500); // 切换模型前短暂等待
      return callWithFallback(prompt, generationConfig, modelIndex + 1, 0);
    }
    
    throw error;
  }
};

// 构建 System Prompt
const buildSystemPrompt = (aiPersona, userPersona) => {
  return `## 角色扮演设定

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

现在开始对话吧！记住要简短、有动作、符合角色设定。`;
};

// 构建建议生成 Prompt
const buildSuggestPrompt = (recentMessages, contextInfo = {}) => {
  const formattedMessages = recentMessages.map(msg => {
    const senderName = msg.personaName || (msg.role === 'user' ? '用户' : 'AI');
    return `${senderName}: ${msg.content}`;
  }).join('\n');

  return `## 任务
你是一个聊天建议助手。根据以下群聊对话历史，生成一句**简短、自然、符合话题**的回复建议。

## 对话历史
${formattedMessages || '（暂无历史消息，这是一个新群聊）'}

## 建议要求
1. 只输出**一句话**，不要超过 30 个字
2. 不要使用动作描写（不要用 *动作* 或 【动作】）
3. 内容要自然、贴合当前话题
4. 如果话题不明朗，可以发一个友好的问候或表情

## 输出格式
直接输出建议文本，不要加引号或其他标记。`;
};

// 使用 Gemini 进行对话
const chatWithAIPersona = async (aiPersona, message, history = [], userPersona = null) => {
  if (!genAI) {
    console.error('Gemini API 未配置');
    return '(AI 服务未配置，请联系管理员)';
  }

  try {
    const systemPrompt = buildSystemPrompt(aiPersona, userPersona);
    
    // 构建完整对话内容
    let fullChat = systemPrompt + '\n\n';
    
    // 添加历史消息
    for (const msg of history.slice(-10)) {
      const role = msg.role === 'user' ? userPersona?.name || '用户' : aiPersona.name;
      fullChat += `${role}: ${msg.content}\n`;
    }
    
    fullChat += `${userPersona?.name || '用户'}: ${message}\n${aiPersona.name}:`;

    const generationConfig = {
      temperature: 0.85,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: getMaxTokensByStyle(aiPersona.replyStyle),
    };

    const result = await callWithFallback(fullChat, generationConfig);
    let reply = result.response.text();
    reply = reply.trim();
    
    if (!reply) {
      reply = '*微微点头* 嗯，我明白了。';
    }

    // 后处理：如果回复没有动作，尝试添加
    if (!reply.includes('*') && !reply.includes('【') && !reply.includes('「') && reply.length < 50) {
      const actions = ['微微点头', '轻轻笑了笑', '想了想', '看了一眼', '歪了歪头'];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      reply = `*${randomAction}* ${reply}`;
    }

    return reply;
  } catch (error) {
    console.error('Gemini API 错误:', error);
    
    if (error.message?.includes('API key')) {
      return '(Gemini API 密钥无效，请联系管理员)';
    }
    if (error.message?.includes('quota') || error.message?.includes('429')) {
      return '(API 繁忙，请稍后再试)';
    }
    if (error.message?.includes('safety')) {
      return '(内容被安全过滤器拦截，请换个话题)';
    }
    return '(AI 暂时无法回应，请稍后再试)';
  }
};

// 生成聊天建议
const generateSuggest = async (roomId, recentMessages, contextInfo = {}) => {
  if (!genAI) {
    console.error('Gemini API 未配置');
    return '来聊点什么呢？';
  }

  try {
    const prompt = buildSuggestPrompt(recentMessages, contextInfo);
    
    const generationConfig = {
      temperature: 0.9,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 60,
    };

    const result = await callWithFallback(prompt, generationConfig);
    let suggestion = result.response.text();
    
    suggestion = suggestion.trim();
    suggestion = suggestion.replace(/^["']|["']$/g, '');
    
    if (suggestion.length > 50) {
      suggestion = suggestion.substring(0, 50) + '...';
    }
    
    return suggestion || '来聊点什么呢？';
  } catch (error) {
    console.error('生成建议失败:', error);
    
    // 降级建议
    const fallbackSuggestions = [
      '大家今天过得怎么样？',
      '有人想聊点什么吗？',
      '最近有什么好玩的事情吗？',
      '有没有人推荐好看的电影？',
      '今天天气不错呢~',
      '大家有什么计划吗？',
    ];
    const randomIndex = Math.floor(Math.random() * fallbackSuggestions.length);
    return fallbackSuggestions[randomIndex];
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

// 导出模型配置供状态接口使用
const getModelConfig = () => ({
  primary: MODELS.primary,
  fallbacks: [MODELS.fallback1, MODELS.fallback2],
  limits: {
    'gemini-3.5-flash': { rpm: 5, tpm: 250000 },
    'gemini-2.5-flash': { rpm: 2, tpm: 250000 },
    'gemini-3.1-flash-lite': { rpm: 15, tpm: 250000 },
  }
});

module.exports = { 
  chatWithAI, 
  chatWithAIPersona,
  generateSuggest,
  getModelConfig
};