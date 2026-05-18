const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function chatWithAI(personaName, personaDescription, userMessage, history = []) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const chatHistory = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: `从现在开始，你是${personaName}。设定：${personaDescription}。完全以角色身份说话，用中文，不跳出角色，回复自然有角色感。` }]
        },
        {
          role: 'model',
          parts: [{ text: `好的，我是${personaName}，我会以角色的身份和你对话。` }]
        },
        ...chatHistory.slice(-10)
      ],
    });

    const result = await chat.sendMessage(userMessage);
    return result.response.text();
  } catch (error) {
    console.error('AI 对话失败:', error);
    return '(AI 暂时无法回应...)';
  }
}

module.exports = { chatWithAI };
