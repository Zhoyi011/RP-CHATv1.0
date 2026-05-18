```markdown
# RP Chat - 项目上下文文档

> 🤖 AI 注意：本文档记录项目的完整架构、文件职责和当前状态。每次更新代码后请同步更新。

---

## 📌 项目概述

| 项目 | 说明 |
|------|------|
| 名称 | RP Chat - 角色扮演聊天室 |
| 前端 | React + TypeScript + TailwindCSS + Vite (Vercel) |
| 后端 | Node.js + Express + MongoDB + Socket.IO (Render) |

---

## 📂 前端结构 (`client/`)

### 配置文件
| 文件 | 职责 |
|------|------|
| `vite.config.ts` | Vite 构建配置 |
| `tailwind.config.cjs` | TailwindCSS 配置 |
| `tsconfig.json` | TypeScript 配置 |
| `vercel.json` | Vercel 部署配置 |

### `src/` 源代码

#### `components/chat/` ⭐ 核心
| 文件 | 职责 |
|------|------|
| `ChatHome.tsx` | 聊天主界面（消息列表、群聊列表、回复/撤回/删除） |
| `ChatInput.tsx` | 消息输入框（表情、简繁转换、回复预览） |
| `AIChat.tsx` | AI 对话弹窗 |
| `CreateRoom.tsx` | 创建群聊 |
| `PrivateChat.tsx` | 私聊（待完善） |
| `LinkPreviewCard.tsx` | 链接预览卡片（响应式） |
| `LinkPreviewContainer.tsx` | 链接预览容器 |
| `PendingRequests.tsx` | 入群申请审核 |
| `RoomMembers.tsx` | 成员列表 |
| `RoomSettings.tsx` | 群设置 |

#### `components/persona/` ⭐ 角色系统
| 文件 | 职责 |
|------|------|
| `PersonaList.tsx` | 角色列表 |
| `PersonaCreate.tsx` | 创建角色 |
| `PersonaDetail.tsx` | 角色详情 |
| `PersonaManager.tsx` | 角色管理 |
| `PersonaSearch.tsx` | 角色搜索 |

#### `components/common/`
| 文件 | 职责 |
|------|------|
| `ContextMenu.tsx` | 右键菜单（撤回/删除/回复） |
| `EmojiPicker.tsx` | 表情选择器 |
| `AvatarUpload.tsx` | 头像上传 |
| `SearchPage.tsx` | 全局搜索 |

#### `components/layout/`
| 文件 | 职责 |
|------|------|
| `DesktopLayout.tsx` | 桌面端布局 |
| `MobileLayout.tsx` | 移动端布局 |
| `TabletLayout.tsx` | 平板端布局 |

#### `components/auth/`
| 文件 | 职责 |
|------|------|
| `Login.tsx` | 登录 |
| `Register.tsx` | 注册 |
| `InviteCode.tsx` | 邀请码验证 |

#### `src/contexts/`
| 文件 | 职责 |
|------|------|
| `ThemeContext.tsx` | 深色/浅色主题 |

#### `src/hooks/`
| 文件 | 职责 |
|------|------|
| `useResponsive.ts` | 响应式断点 |
| `useLongPress.ts` | 长按事件 |
| `useQuickSwitchPersona.ts` | Tab 键快捷切换角色 |
| `useKeyboardHeight.ts` | 移动端键盘适配 |

#### `src/services/`
| 文件 | 职责 |
|------|------|
| `api.ts` | API 调用封装（类型定义 + HTTP 请求） |
| `socket.ts` | Socket.IO 连接管理 |
| `translateApi.ts` | 简繁转换 |
| `linkPreviewApi.ts` | 链接预览 API |
| `Notification.ts` | 浏览器通知 |

#### `src/utils/`
| 文件 | 职责 |
|------|------|
| `linkParser.ts` | URL 提取 |
| `renderMarkdown.ts` | Markdown 渲染 |
| `timeFormat.ts` | 时间格式化 |

---

## 📂 后端结构 (`server/`)

### 配置文件
| 文件 | 职责 |
|------|------|
| `.env` | 环境变量 |
| `render.yaml` | Render 部署配置 |

### `src/`
| 文件 | 职责 |
|------|------|
| `app.js` | Express 入口 + Socket.IO 配置 |

#### `src/models/`
| 文件 | 职责 | 关键字段 |
|------|------|----------|
| `User.js` | 用户 | username, firebaseUid |
| `Persona.js` | 角色 | name, description, userId |
| `Room.js` | 群聊 | name, createdBy, pendingMembers |
| `Message.js` | 消息 | content, replyTo, isRecalled, isDeleted |
| `PersonaRoom.js` | 角色-房间关联 | personaId, roomId, role |
| `ActivePersona.js` | 当前激活角色 | userId, personaId |
| `InviteCode.js` | 邀请码 | code, usedBy |
| `UserReadRecord.js` | 阅读记录 | lastReadAt |

#### `src/routes/`
| 文件 | 职责 |
|------|------|
| `auth.js` | 登录/注册/邀请码 |
| `room.js` | 群聊 CRUD、消息、审核、撤回、删除 |
| `persona.js` | 角色管理 |
| `user.js` | 用户资料 |
| `ai.js` | AI 对话 |
| `search.js` | 全局搜索 |
| `translate.js` | 简繁转换 |
| `linkPreview.js` | 链接预览 |
| `diamond.js` | 钻石系统 |

#### `src/services/`
| 文件 | 职责 |
|------|------|
| `aiService.js` | Gemini AI 对话（角色扮演） |
| `contentFilter.js` | 脏话过滤 |
| `linkService.js` | 链接处理 |

---

## 🔌 Socket.IO 事件

| 客户端发送 | 服务端发送 |
|-----------|-----------|
| `join-room` | `new-message` |
| `leave-room` | `message-recalled` |
| `send-message` (含 replyToId) | `message-deleted` |
| `recall-message` | `room-online-count` |
| `delete-message` | `user-joined` / `user-left` |
| `switch-persona` | `persona-switched` |

---

## ✅ 已完成功能

- [x] 登录/注册（Firebase + 邀请码）
- [x] 角色创建/管理
- [x] 群聊（创建、加入、审核、转让、踢人）
- [x] 消息发送/接收（实时）
- [x] **消息回复**（引用回复，气泡内显示）
- [x] **消息撤回**（5分钟内，所有人可见）
- [x] **消息删除**（软删除，仅自己不可见）
- [x] 动作扮演（/me）
- [x] 简繁转换 + 表情选择器
- [x] Tab 键快捷切换角色
- [x] 未读计数 + 最后消息预览
- [x] 时间分隔线 + 气泡时间戳
- [x] 深色模式 + 响应式布局
- [x] 链接预览（卡片，手机适配）
- [x] Markdown 渲染
- [x] AI 对话（Gemini 2.5 Flash，角色扮演）
- [x] 全局搜索

---

## 📅 最后更新

| 日期 | 内容 |
|------|------|
| 2026-05-18 | 消息回复/撤回/删除完成，AI 模型修复为 gemini-2.5-flash，链接预览手机适配 |
