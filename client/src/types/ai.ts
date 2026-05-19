export interface AIPersona {
  _id: string;
  name: string;
  avatar?: string;
  description: string;      // 角色设定
  personality: string;      // 性格特征
  replyStyle: 'short' | 'medium' | 'detailed';
  exampleDialogue?: string; // 示例对话
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPersonaForAI {
  _id: string;
  name: string;
  description: string;
  avatar?: string;
  createdAt: string;        // ✅ 添加这个
  updatedAt: string;        // ✅ 添加这个
}

export interface AIMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}