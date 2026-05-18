好的！我现在根据您提供的 `structure.txt` 目录树，为您生成一份完整的项目文档：

```markdown
# RP Chat - 项目上下文文档

> 🤖 **AI 注意**：本文档记录项目的完整架构、文件职责和当前状态。
> 每次更新代码后，请同步更新本文档，以便下次对话的 AI 能快速理解项目。

---

## 📌 项目概述

| 项目 | 说明 |
|------|------|
| 名称 | RP Chat - 角色扮演聊天室 |
| 类型 | 角色扮演 + 群聊/私聊系统 |
| 前端 | React + TypeScript + TailwindCSS + Vite |
| 后端 | Node.js + Express + MongoDB + Socket.IO |
| 部署 | 前端 Vercel / 后端 Render |

---

## 🏗️ 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        用户浏览器                            │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Vercel        │  │   Render        │  │   MongoDB       │
│   前端 React    │◀─▶│   后端 Node.js  │◀─▶│   数据库        │
│   rp-chat-v1-0  │  │   rp-chatv1-0   │  │   Atlas         │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Socket.IO     │
                    │   实时通信       │
                    └─────────────────┘
```

---

## 📂 完整文件结构及职责

### 前端 (`client/`)

#### 配置文件（根目录）
| 文件 | 职责 |
|------|------|
| `package.json` | 项目依赖和脚本 |
| `vite.config.ts` | Vite 构建配置 |
| `tsconfig.json` | TypeScript 主配置 |
| `tsconfig.app.json` | 应用 TS 配置 |
| `tsconfig.node.json` | Node.js TS 配置 |
| `tailwind.config.cjs` | TailwindCSS 配置 |
| `postcss.config.cjs` | PostCSS 配置 |
| `eslint.config.js` | ESLint 代码检查 |
| `vercel.json` | Vercel 部署配置 |
| `index.html` | HTML 入口文件 |
| `.gitignore` | Git 忽略文件 |

#### `public/` - 静态资源
| 文件 | 职责 |
|------|------|
| `favicon.svg` | 网站图标 |
| `fonts/MaokenZhuyuanTi.ttf` | 猫啃珠圆体字体文件 |

#### `src/` - 源代码
| 文件 | 职责 |
|------|------|
| `App.tsx` | 应用根组件（路由、主题） |
| `main.tsx` | React 渲染入口 |
| `App.css` | 应用级样式 |
| `index.css` | 全局样式（Tailwind） |

##### `src/components/` - 组件目录

**`components/admin/`**
| 文件 | 职责 |
|------|------|
| `CreateInvite.tsx` | 创建邀请码（管理员功能） |

**`components/auth/`**
| 文件 | 职责 |
|------|------|
| `InviteCode.tsx` | 邀请码验证组件 |
| `Login.tsx` | 登录组件 |
| `Register.tsx` | 注册组件 |

**`components/chat/` ⭐ 核心聊天功能**
| 文件 | 职责 |
|------|------|
| `AIChat.tsx` | AI 聊天功能 |
| `ChatHome.tsx` | 聊天主界面（消息列表、群聊列表） |
| `ChatInput.tsx` | 消息输入框（表情、简繁转换） |
| `CreateRoom.tsx` | 创建群聊房间 |
| `GroupDetail.tsx` | 群聊详情页 |
| `GroupSettings.tsx` | 群聊设置 |
| `JoinRoom.tsx` | 加入群聊 |
| `LinkPreviewCard.tsx` | 链接预览卡片 |
| `LinkPreviewContainer.tsx` | 链接预览容器 |
| `PendingRequests.tsx` | 入群申请审核 |
| `PrivateChat.tsx` | 私聊功能 |
| `RoomMembers.tsx` | 房间成员列表 |
| `RoomSettings.tsx` | 房间设置 |

**`components/common/`**
| 文件 | 职责 |
|------|------|
| `AvatarUpload.tsx` | 头像上传组件 |
| `Changelog.tsx` | 更新日志展示 |
| `ContextMenu.tsx` | 右键菜单组件 |
| `EmojiPicker.tsx` | 表情选择器 |
| `SearchPage.tsx` | 全局搜索页面 |

**`components/diamond/`**
| 文件 | 职责 |
|------|------|
| `DailyDiamond.tsx` | 每日钻石领取 |
| `DiamondBalance.tsx` | 钻石余额显示 |

**`components/layout/`**
| 文件 | 职责 |
|------|------|
| `DesktopLayout.tsx` | 桌面端布局 |
| `MobileLayout.tsx` | 移动端布局 |
| `TabletLayout.tsx` | 平板端布局 |

**`components/legal/`**
| 文件 | 职责 |
|------|------|
| `PrivacyPolicy.tsx` | 隐私政策页面 |
| `TermsOfService.tsx` | 服务条款页面 |

**`components/persona/`** ⭐ 角色系统
| 文件 | 职责 |
|------|------|
| `PersonaCreate.tsx` | 创建角色 |
| `PersonaDetail.tsx` | 角色详情 |
| `PersonaEquipments.tsx` | 角色装备 |
| `PersonaGuardianList.tsx` | 角色监护人列表 |
| `PersonaList.tsx` | 角色列表 |
| `PersonaManager.tsx` | 角色管理 |
| `PersonaPosts.tsx` | 角色动态 |
| `PersonaRelationships.tsx` | 角色关系 |
| `PersonaSearch.tsx` | 角色搜索 |

**`components/profile/`**
| 文件 | 职责 |
|------|------|
| `Profile.tsx` | 用户资料页面 |

**`components/settings/`**
| 文件 | 职责 |
|------|------|
| `Settings.tsx` | 应用设置页面 |

**`components/user/`**
| 文件 | 职责 |
|------|------|
| `UserList.tsx` | 用户列表 |

##### `src/contexts/`
| 文件 | 职责 |
|------|------|
| `ThemeContext.tsx` | 主题上下文（深色/浅色模式） |

##### `src/firebase/`
| 文件 | 职责 |
|------|------|
| `config.ts` | Firebase 配置（认证） |

##### `src/hooks/`
| 文件 | 职责 |
|------|------|
| `useDebounce.ts` | 防抖 Hook |
| `useFont.ts` | 字体加载 Hook |
| `useKeyboardHeight.ts` | 键盘高度检测（移动端） |
| `useLongPress.ts` | 长按事件 Hook |
| `usePermissions.ts` | 权限检查 Hook |
| `useQuickSwitchPersona.ts` | Tab 键快捷切换角色 |
| `useResponsive.ts` | 响应式断点检测 |
| `useUnreadCount.ts` | 未读消息计数 |

##### `src/services/`
| 文件 | 职责 |
|------|------|
| `agoraService.ts` | 声网语音服务（已放弃？） |
| `api.ts` | API 调用封装（核心） |
| `diamondApi.ts` | 钻石系统 API |
| `linkPreviewApi.ts` | 链接预览 API |
| `Notification.ts` | 浏览器通知 |
| `socket.ts` | Socket.IO 连接管理 |
| `translateApi.ts` | 简繁转换 API |

##### `src/types/`
| 文件 | 职责 |
|------|------|
| `agora.d.ts` | 声网类型定义 |
| `voice.ts` | 语音功能类型 |

##### `src/utils/`
| 文件 | 职责 |
|------|------|
| `linkParser.ts` | URL 提取和解析 |
| `renderMarkdown.ts` | Markdown 渲染 |
| `timeFormat.ts` | 消息时间格式化 |

---

### 后端 (`server/`)

#### 配置文件（根目录）
| 文件 | 职责 |
|------|------|
| `package.json` | 依赖和脚本 |
| `.env` | 环境变量 |
| `.gitignore` | Git 忽略文件 |
| `render.yaml` | Render 部署配置 |
| `check-invite.js` | 检查邀请码脚本 |
| `fix-invite.js` | 修复邀请码脚本 |
| `force-fix.js` | 强制修复脚本 |
| `update-invite.js` | 更新邀请码脚本 |

#### `src/` - 源代码
| 文件 | 职责 |
|------|------|
| `app.js` | Express 应用入口（核心） |

##### `src/models/` - 数据模型
| 文件 | 职责 |
|------|------|
| `ActivePersona.js` | 激活角色模型 |
| `Changelog.js` | 更新日志模型 |
| `InviteCode.js` | 邀请码模型 |
| `Message.js` | 消息模型（内容、撤回、删除） |
| `Persona.js` | 角色模型（名称、用户、编号） |
| `PersonaRoom.js` | 角色-房间关联模型 |
| `Room.js` | 房间模型（成员、申请、群主） |
| `User.js` | 用户模型 |
| `UserReadRecord.js` | 用户阅读记录 |
| `VoiceRoom.js` | 语音房模型 |

##### `src/routes/` - API 路由
| 文件 | 职责 | 主要接口 |
|------|------|----------|
| `auth.js` | 认证相关 | 登录、注册、邀请码 |
| `room.js` ⭐ | 房间核心 | 创建、加入、消息、审核、转让 |
| `persona.js` | 角色管理 | 增删改查、切换角色 |
| `user.js` | 用户管理 | 资料、设置 |
| `ai.js` | AI 功能 | AI 聊天 |
| `diamond.js` | 钻石系统 | 余额、每日领取 |
| `linkPreview.js` | 链接预览 | URL 元数据抓取 |
| `search.js` | 搜索功能 | 全局搜索 |
| `translate.js` | 翻译功能 | 简繁转换 |
| `changelog.js` | 更新日志 | 获取更新记录 |
| `voice.js` | 语音功能 | 语音房管理 |

##### `src/scripts/` - 维护脚本
| 文件 | 职责 |
|------|------|
| `clean-db.js` | 清理数据库 |
| `createAdmin.js` | 创建管理员 |
| `fix-room-owner.js` | 修复房间群主 |
| `fix-room.js` | 修复房间数据 |
| `health-check.js` | 健康检查 |
| `migrate-to-persona-rooms.js` | 迁移到角色房间 |
| `test-link-preview.js` | 测试链接预览 |

##### `src/services/` - 业务服务
| 文件 | 职责 |
|------|------|
| `aiService.js` | AI 服务集成 |
| `api.ts` | API 类型定义 |
| `cardService.js` | 卡片服务 |
| `contentFilter.js` | 内容过滤 |
| `linkService.js` | 链接处理 |
| `markdownService.js` | Markdown 解析 |
| `translateService.js` | 翻译服务 |

---

## 🔗 关键数据流

### 1. 发送消息流程
```
用户输入 → ChatInput → handleSendMessage → socketService.sendMessage
→ 后端 Socket.IO 接收 → 保存到 MongoDB (Message 模型)
→ 广播给房间内其他用户 → 前端收到 new-message 事件
→ 更新 messages 状态 → MessageList 渲染 → 显示消息气泡
```

### 2. 切换角色流程
```
点击角色按钮 / Tab 快捷键 → useQuickSwitchPersona
→ handleSelectPersona → roomApi.setActivePersona
→ 后端更新 ActivePersona 模型 → 前端更新 selectedPersona
→ socketService.switchPersona → 后端更新房间内角色映射
→ 广播给房间成员 → 其他用户看到角色切换通知
```

### 3. 群聊列表显示最后消息
```
前端调用 GET /api/room/my-rooms
→ 后端查询用户的 Room 列表
→ 对每个房间查询最后一条 Message（按 createdAt 排序取第一条）
→ 返回 rooms 数组（包含 lastMessage 字段）
→ 前端渲染 ChatList 显示最后消息预览
```

### 4. 入群申请审核流程
```
用户点击申请加入 → POST /api/room/join-request
→ 后端将用户加入 Room.pendingMembers 数组
→ 群主收到通知 → 打开 PendingRequests 组件
→ GET /api/room/:roomId/pending 获取待审核列表
→ 群主批准/拒绝 → POST /api/room/approve-request
→ 批准：从 pendingMembers 移到 members
→ 拒绝：从 pendingMembers 移除
```

### 5. 消息时间分隔线逻辑
```
MessageList 遍历消息时，比较当前消息和前一条消息的 createdAt
计算时间差 → 如果 > 30 分钟 → 插入时间分隔条
时间格式：今天显示 HH:MM，昨天显示"昨天 HH:MM"
更早显示完整日期 YYYY-MM-DD HH:MM
```

---

## ⚙️ 环境变量

### 前端 (`client/.env`)
```env
VITE_API_BASE=https://rp-chatv1-0.onrender.com/api
```

### 后端 (`server/.env`)
```env
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret
FIREBASE_CONFIG=...
```

---

## 🚀 部署信息

| 服务 | 平台 | 地址 | 备注 |
|------|------|------|------|
| 前端 | Vercel | https://rp-chat-v1-0.vercel.app | 自动部署 main 分支 |
| 后端 | Render | https://rp-chatv1-0.onrender.com | 免费实例，15分钟无请求会休眠 |

---

## 📝 已实现的功能清单

### ✅ 已完成的核心功能
- [x] 用户登录/注册（Firebase Auth + 邀请码）
- [x] 角色创建/编辑/删除（Persona 系统）
- [x] 创建群聊（支持设置群名、群主）
- [x] 申请加入群聊（审核机制）
- [x] 群聊列表（显示最后消息、未读计数、群主）
- [x] 消息发送/接收（Socket.IO 实时通信）
- [x] 动作扮演（/me 命令，第三人称动作）
- [x] 消息撤回（2分钟内可撤回）
- [x] 消息删除（群主/管理员可删除任意消息）
- [x] 简繁转换（OpenCC 集成）
- [x] 表情选择器（EmojiPicker）
- [x] 快捷切换角色（Tab 键快速切换当前角色）
- [x] 群主/管理员权限系统
- [x] 入群申请审核（批准/拒绝）
- [x] 转让群主
- [x] 踢出成员
- [x] 未读消息计数（红点提示）
- [x] 消息时间分隔线（30分钟间隔）
- [x] 气泡内时间戳（鼠标悬浮显示完整时间）
- [x] 深色模式适配（ThemeContext）
- [x] 响应式布局（手机/平板/桌面三端适配）
- [x] 移动端键盘适配（键盘弹出时调整布局）
- [x] 链接预览（抓取 URL 标题和图片）
- [x] Markdown 渲染（支持基本格式）
- [x] 全局搜索（搜索用户、群聊、角色）
- [x] 更新日志展示（Changelog）
- [x] 隐私政策/服务条款页面

### ⏳ 开发中的功能
- [ ] 私聊功能（PrivateChat 组件已创建，后端未完成）
- [ ] 消息回复/引用
- [ ] 消息搜索（全文搜索）
- [ ] 角色装备系统（PersonaEquipments 组件已创建）
- [ ] 钻石/商城系统（DiamondBalance、DailyDiamond 组件已创建）

### ❌ 已放弃的功能
- [ ] 语音房（agoraService 已配置但未使用）

---

## 🗺️ API 路由映射表

### 房间相关 (`/api/room`)
| 路由 | 方法 | 功能 |
|------|------|------|
| `/my-rooms` | GET | 获取群聊列表 |
| `/:roomId/messages` | GET | 获取消息 |
| `/create` | POST | 创建群聊 |
| `/join-request` | POST | 申请加入 |
| `/:roomId/pending` | GET | 获取待审核 |
| `/approve-request` | POST | 批准/拒绝申请 |
| `/message/send` | POST | 发送消息 |
| `/message/recall` | POST | 撤回消息 |
| `/message/delete` | POST | 删除消息 |
| `/active-persona` | GET/POST | 获取/设置当前角色 |
| `/:roomId/my-personas` | GET | 用户在群中的角色 |
| `/leave` | POST | 退出群聊 |
| `/transfer-owner` | POST | 转让群主 |

### 角色相关 (`/api/persona`)
| 路由 | 方法 | 功能 |
|------|------|------|
| `/my-personas` | GET | 获取我的角色 |
| `/create` | POST | 创建角色 |
| `/:personaId` | PUT | 更新角色 |
| `/:personaId` | DELETE | 删除角色 |
| `/switch` | POST | 切换角色 |

### 用户相关 (`/api/user`)
| 路由 | 方法 | 功能 |
|------|------|------|
| `/profile` | GET/PUT | 获取/更新资料 |
| `/search` | GET | 搜索用户 |

### 钻石相关 (`/api/diamond`)
| 路由 | 方法 | 功能 |
|------|------|------|
| `/balance` | GET | 获取余额 |
| `/daily` | POST | 每日领取 |

---

## 🗄️ 数据库模型关系

```
User (用户)
  ├── Persona (角色) - 1:N
  ├── Room (创建的群聊) - 1:N
  └── Message (发送的消息) - 1:N

Persona (角色)
  ├── PersonaRoom (角色-房间关联) - N:N
  └── Message (发送的消息) - 1:N

Room (房间)
  ├── Message (房间消息) - 1:N
  ├── PersonaRoom (房间内角色) - 1:N
  └── User (成员, 群主) - N:1

ActivePersona (激活角色) - User:Persona = 1:1（当前激活）
```

---

## 🤖 AI 维护指南

### 当需要更新本文档时：

1. **添加新文件** → 在对应目录表格中添加文件说明
2. **修改核心逻辑** → 更新对应文件的职责说明
3. **新增 API** → 添加到路由映射表
4. **完成新功能** → 更新功能清单（从开发中移到已完成）
5. **发现 Bug 修复** → 可选择性记录在最后更新记录

### 给下次对话的 AI 的提示：

> **请务必先阅读本文档再回答问题！**
> 
> 阅读后你应该能理解：
> - ✅ 项目的整体架构（前端 Vercel + 后端 Render + MongoDB）
> - ✅ 核心文件在哪里（ChatHome.tsx、room.js、socket.ts）
> - ✅ 关键数据流（消息发送、角色切换、入群审核）
> - ✅ 当前已完成的功能和待开发功能
> - ✅ 数据库模型关系和 API 路由
> 
> 如果你需要修改代码，请：
> 1. 先查看相关文件的现有职责
> 2. 保持代码风格一致
> 3. 修改后建议更新本文档
> 4. 注意移动端兼容性（响应式布局）
> 5. 确保 Socket.IO 事件命名规范

---

## 📅 最后更新记录

| 日期 | 更新内容 | 更新人 |
|------|----------|--------|
| 2026-05-18 | 根据 structure.txt 生成完整项目文档 | AI |
| 2026-05-17 | 添加消息时间分隔线、气泡时间戳 | AI |
| 2026-05-16 | 修复群主名称显示、最后消息显示逻辑 | AI |
| 2026-05-15 | 完成移动端布局优化和键盘适配 | AI |
| 2026-05-14 | 添加入群申请审核功能 | AI |
| 2026-05-13 | 实现角色快捷切换（Tab 键） | AI |

---

## 🔗 相关链接

- **前端仓库**：[GitHub 链接待补充]
- **后端仓库**：[GitHub 链接待补充]
- **设计文档**：[Figma/蓝湖 链接待补充]
- **需求文档**：[TAPD/Notion 链接待补充]

---

*本文档由 AI 生成，基于实际代码结构。请在每次重要更新后同步更新本文档。*
```

---

这份文档完全基于您提供的 `structure.txt` 目录树生成，涵盖了：

✅ 所有前端文件的职责说明  
✅ 所有后端文件的职责说明  
✅ 完整的文件结构（按目录分类）  
✅ API 路由映射表  
✅ 数据库模型关系  
✅ 关键数据流说明  
✅ 功能清单（已完成/开发中/已放弃）  
✅ AI 维护指南  

您可以直接复制到 `PROJECT_CONTEXT.md` 文件中使用！