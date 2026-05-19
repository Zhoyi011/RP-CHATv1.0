```markdown
# RP Chat - 项目上下文文档

> 🤖 **AI 注意**：本文档记录项目的完整架构、文件职责和当前状态。
> 每次更新代码后，请同步更新本文档，以便下次对话的 AI 能快速理解项目。
> 

---

## 📌 项目概述

| 项目 | 说明 |
|------|------|
| 名称 | RP Chat - 角色扮演聊天室 |
| 类型 | 角色扮演 + 群聊/私聊 + AI 对戏系统 |
| 前端 | React + TypeScript + TailwindCSS + Vite |
| 后端 | Node.js + Express + MongoDB + Socket.IO |
| 部署 | 前端 Vercel / 后端 Render |

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
| `README.md` | 项目说明文档 |

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
| `AIChat.tsx` | AI 聊天弹窗（旧版） |
| `AIChatRoom.tsx` | AI 对戏主界面（新版） |
| `AISettings.tsx` | AI 角色设置弹窗 |
| `ChatHome.tsx` | 聊天主界面（群聊/私聊/AI对戏 Tab） |
| `ChatInput.tsx` | 消息输入框（表情、简繁转换、回复预览） |
| `CreateRoom.tsx` | 创建群聊房间 |
| `GroupDetail.tsx` | 群聊详情页 |
| `GroupSettings.tsx` | 群聊设置 |
| `JoinRoom.tsx` | 加入群聊 |
| `LinkPreviewCard.tsx` | 链接预览卡片（响应式） |
| `LinkPreviewContainer.tsx` | 链接预览容器 |
| `PendingRequests.tsx` | 入群申请审核 |
| `PrivateChat.tsx` | 私聊功能 |
| `RoomMembers.tsx` | 房间成员列表 |
| `RoomSettings.tsx` | 房间设置 |
| `UserPersonaSettings.tsx` | 用户角色设置（让 AI 认识你） |

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
| `DailyDiamond.tsx` | 每日钻石领取（连续签到奖励） |
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

**`components/persona/` ⭐ 角色系统**
| 文件 | 职责 |
|------|------|
| `PersonaCreate.tsx` | 创建角色 |
| `PersonaDetail.tsx` | 角色详情页 |
| `PersonaEquipments.tsx` | 角色装备显示 |
| `PersonaGuardianList.tsx` | 角色监护人/守护榜 |
| `PersonaList.tsx` | 角色列表（网格布局） |
| `PersonaManager.tsx` | 角色管理主页 |
| `PersonaPosts.tsx` | 角色动态（发帖、点赞） |
| `PersonaRelationships.tsx` | 角色亲密关系 |
| `PersonaSearch.tsx` | 角色搜索（支持简繁转换） |

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
| `agoraService.ts` | 声网语音服务（已放弃） |
| `api.ts` | API 调用封装（核心） |
| `diamondApi.ts` | 钻石系统 API |
| `linkPreviewApi.ts` | 链接预览 API |
| `Notification.ts` | 浏览器通知 |
| `socket.ts` | Socket.IO 连接管理 |
| `translateApi.ts` | 简繁转换 API（含 isTraditional 检测） |

##### `src/types/`
| 文件 | 职责 |
|------|------|
| `ai.ts` | AI 角色类型定义 |
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
| `app.js` | Express 应用入口 + Socket.IO 配置（核心） |

##### `src/models/` - 数据模型
| 文件 | 职责 | 关键字段 |
|------|------|----------|
| `ActivePersona.js` | 激活角色模型 | userId, personaId |
| `AIPersona.js` | AI 角色模型 | name, personality, replyStyle, isDefault |
| `Changelog.js` | 更新日志模型 | sha, message, formattedMessage, commitType |
| `InviteCode.js` | 邀请码模型 | code, usedBy, expiresAt |
| `Message.js` | 消息模型 | content, replyTo, isRecalled, isDeleted |
| `Persona.js` | 角色模型 | name, displayName, description, userId |
| `PersonaRoom.js` | 角色-房间关联模型 | personaId, roomId, role |
| `Post.js` | 帖子模型 | content, images, likes, likeCount |
| `Room.js` | 房间模型 | name, createdBy, pendingMembers |
| `ShopItem.js` | 商城商品模型 | name, type, price, rarity |
| `User.js` | 用户模型 | username, diamonds, coins, equippedItems, dailyDiamondStreak |
| `UserInventory.js` | 用户库存模型 | itemId, isEquipped |
| `UserPersonaForAI.js` | 用户角色模型（AI用） | name, description |
| `UserReadRecord.js` | 用户阅读记录 | lastReadAt |
| `VoiceRoom.js` | 语音房模型 | creatorId, memberCount |

##### `src/routes/` - API 路由
| 文件 | 职责 | 主要接口 |
|------|------|----------|
| `ai.js` | AI 对话 | 聊天、角色设定 |
| `aiPersona.js` | AI 角色管理 | CRUD、默认设置 |
| `auth.js` | 认证相关 | 登录、注册、邀请码 |
| `changelog.js` | 更新日志 | GitHub 同步、手动添加 |
| `diamond.js` | 钻石系统 | 余额、每日签到 |
| `linkPreview.js` | 链接预览 | URL 元数据抓取 |
| `persona.js` | 角色管理 | 增删改查、切换角色 |
| `post.js` | 帖子系统 | 发布、点赞、删除 |
| `room.js` | 房间核心 | 创建、加入、消息、审核、转让、撤回、删除 |
| `search.js` | 搜索功能 | 全局搜索 |
| `shop.js` | 商城系统 | 商品列表、购买、装备 |
| `translate.js` | 翻译功能 | 简繁转换 |
| `user.js` | 用户管理 | 资料、设置 |
| `voice.js` | 语音功能 | 语音房管理 |

##### `src/scripts/` - 维护脚本
| 文件 | 职责 |
|------|------|
| `clean-db.js` | 清理数据库 |
| `createAdmin.js` | 创建管理员 |
| `fix-room-owner.js` | 修复房间群主 |
| `fix-room.js` | 修复房间数据 |
| `health-check.js` | 健康检查 |
| `initShop.js` | 初始化商城商品 |
| `migrate-to-persona-rooms.js` | 迁移到角色房间 |
| `test-link-preview.js` | 测试链接预览 |

##### `src/services/` - 业务服务
| 文件 | 职责 |
|------|------|
| `aiService.js` | DeepSeek API 调用 |
| `api.ts` | API 类型定义 |
| `cardService.js` | 卡片服务 |
| `contentFilter.js` | 脏话过滤 |
| `linkService.js` | 链接处理 |
| `markdownService.js` | Markdown 解析 |
| `translateService.js` | 翻译服务 |

---

## 🔗 关键数据流

### 1. 发送消息流程（支持回复）
用户输入 → 点击回复按钮 → 设置 replyToMessage 状态
→ 输入框上方显示回复预览 → 用户输入内容
→ handleSendMessage → socket.emit('send-message', { replyToId })
→ 后端 Socket.IO 接收 → 验证回复消息是否存在
→ 保存到 MongoDB（Message 模型，包含 replyTo 字段）
→ populate 回复消息信息 → 广播 new-message 事件
→ 前端收到 → 消息气泡上方显示引用内容

### 2. 消息撤回流程
用户右键/长按消息 → 选择撤回 → 检查是否5分钟内
→ roomApi.recallMessage → 后端验证权限和时间
→ 标记 isRecalled = true → 广播 message-recalled 事件
→ 所有人看到「xxx撤回了一条消息」

### 3. 消息删除（软删除）流程
用户右键/长按消息 → 选择删除（仅自己）→ 确认
→ roomApi.deleteMessage → 后端验证权限
→ 标记 isDeleted = true → 广播 message-deleted 事件给删除者本人
→ 前端从消息列表中移除该消息（其他人仍可见）

### 4. AI 对戏流程
点击 AI 对戏 Tab → 加载默认 AI 角色
→ 用户发送消息 → 调用 /api/ai/chat-with-persona
→ 后端构建 System Prompt（含角色设定、用户设定）
→ 调用 DeepSeek API → 返回回复
→ 前端显示 AI 回复（含动作描写）

### 5. 每日签到流程
用户打开签到面板 → GET /api/diamond/daily-info
→ 后端返回是否已签到、连续天数、今日奖励
→ 用户点击领取 → POST /api/diamond/daily
→ 后端验证、计算奖励（5,5,8,8,10,15,20 循环）
→ 更新用户钻石和连续天数 → 返回结果
→ 前端刷新显示

### 6. 更新日志同步流程
用户访问更新日志页面 → GET /api/changelog
→ 后端检查是否需要同步（距离上次 >1小时）
→ 调用 GitHub API 获取 commits
→ 保存到 Changelog 模型（去重）
→ 返回 entries 给前端
→ 管理员可手动点击同步按钮触发 POST /api/changelog/sync-github

---

## ⚙️ 环境变量

### 前端 (`client/.env`)
env
VITE_API_BASE=https://rp-chatv1-0.onrender.com/api

### 后端 (`server/.env`)
env
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret
FIREBASE_CONFIG=...
GITHUB_TOKEN=your_github_token
DEEPSEEK_API_KEY=your_deepseek_api_key

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
- [x] 消息撤回（5分钟内可撤回，所有人可见撤回提示）
- [x] 消息删除（软删除，仅自己不可见）
- [x] 消息回复（引用回复，消息气泡内显示被回复内容）
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
- [x] 链接预览（抓取 URL 标题和图片，手机响应式）
- [x] Markdown 渲染（支持基本格式）
- [x] 全局搜索（搜索用户、群聊、角色）
- [x] 更新日志展示（自动同步 GitHub commits）
- [x] 隐私政策/服务条款页面

### ✅ AI 对戏系统
- [x] AI 对话（DeepSeek API）
- [x] AI 角色自定义（名称、性格、回复风格）
- [x] 用户角色设置（让 AI 认识你）
- [x] 多个 AI 角色切换
- [x] 聊天历史保存（localStorage）

### ✅ 经济系统
- [x] 每日签到（连续奖励：5,5,8,8,10,15,20）
- [x] 钻石余额显示
- [x] 商城（头像框、戒指、关系卡）
- [x] 物品购买
- [x] 物品装备/卸下

### ✅ 帖子系统
- [x] 发布帖子（文字 + 最多2张图片）
- [x] 点赞/取消点赞
- [x] 帖子列表（分页）
- [x] 角色主页显示动态

### ⏳ 开发中的功能
- [ ] 私聊功能（PrivateChat 组件已创建，后端未完成）
- [ ] 消息搜索（全文搜索）
- [ ] 帖子评论功能
- [ ] 商城更多商品类型

### ❌ 已放弃的功能
- [ ] 语音房（agoraService 已配置但未使用）

---

## 🗺️ API 路由映射表

### 房间相关 (`/api/room`)
| 路由 | 方法 | 功能 |
|------|------|------|
| `/my-rooms` | GET | 获取群聊列表 |
| `/:roomId/messages` | GET | 获取消息（支持回复数据） |
| `/:roomId/messages` | POST | 发送消息（支持回复） |
| `/create` | POST | 创建群聊 |
| `/join-request` | POST | 申请加入 |
| `/:roomId/pending` | GET | 获取待审核 |
| `/approve-request` | POST | 批准/拒绝申请 |
| `/message/recall` | POST | 撤回消息 |
| `/message/delete` | POST | 删除消息（软删除） |
| `/active-persona` | GET/POST | 获取/设置当前角色 |
| `/:roomId/my-personas` | GET | 用户在群中的角色 |
| `/leave` | POST | 退出群聊 |
| `/transfer-owner` | POST | 转让群主 |

### AI 角色相关 (`/api/ai-persona`)
| 路由 | 方法 | 功能 |
|------|------|------|
| `/list` | GET | 获取所有 AI 角色 |
| `/default` | GET | 获取默认 AI 角色 |
| `/personas` | GET | 获取所有 AI 角色 |
| `/personas` | POST | 创建 AI 角色 |
| `/personas/:id` | PUT | 更新 AI 角色 |
| `/personas/:id` | DELETE | 删除 AI 角色 |
| `/personas/:id/default` | POST | 设为默认 |
| `/my-persona` | GET | 获取用户自己的角色 |
| `/my-persona` | PUT | 更新用户自己的角色 |

### 钻石相关 (`/api/diamond`)
| 路由 | 方法 | 功能 |
|------|------|------|
| `/balance` | GET | 获取余额 |
| `/daily` | GET | 获取签到信息 |
| `/daily` | POST | 每日签到领取 |
| `/daily-info` | GET | 获取签到详情 |
| `/daily-status` | GET | 获取签到状态 |

### 商城相关 (`/api/shop`)
| 路由 | 方法 | 功能 |
|------|------|------|
| `/items` | GET | 获取商品列表 |
| `/my-items` | GET | 获取用户物品 |
| `/buy` | POST | 购买物品 |
| `/equip` | POST | 装备物品 |
| `/unequip` | POST | 卸下物品 |

### 帖子相关 (`/api/post`)
| 路由 | 方法 | 功能 |
|------|------|------|
| `/create` | POST | 创建帖子 |
| `/user/:userId` | GET | 获取用户帖子 |
| `/persona/:personaId` | GET | 获取角色帖子 |
| `/like/:postId` | POST | 点赞/取消点赞 |
| `/:postId` | DELETE | 删除帖子 |

### 更新日志相关 (`/api/changelog`)
| 路由 | 方法 | 功能 |
|------|------|------|
| `/` | GET | 获取更新日志 |
| `/manual` | POST | 手动添加更新 |
| `/manual/:id` | DELETE | 删除手动更新 |
| `/sync-github` | POST | 手动同步 GitHub |

---

## 🗄️ 数据库模型关系
User (用户)
  ├── Persona (角色) - 1:N
  ├── Room (创建的群聊) - 1:N
  ├── Message (发送的消息) - 1:N
  ├── Post (帖子) - 1:N
  ├── UserInventory (拥有的物品) - 1:N
  └── AIPersona (AI角色) - 1:N

Persona (角色)
  ├── PersonaRoom (角色-房间关联) - N:N
  ├── Message (发送的消息) - 1:N
  └── Post (帖子) - 1:N

Room (房间)
  ├── Message (房间消息) - 1:N
  ├── PersonaRoom (房间内角色) - 1:N
  └── User (成员, 群主) - N:1

Message (消息)
  ├── replyTo (引用消息) - 自引用
  └── isRecalled / isDeleted (撤回/软删除标记)

Changelog (更新日志)
  ├── type (auto/manual)
  └── commitType (feat/fix/docs等)

ShopItem (商城商品)
  └── UserInventory (用户购买记录) - 1:N
```

### Message 模型字段说明
| 字段 | 类型 | 说明 |
|------|------|------|
| `replyTo` | ObjectId | 引用的消息ID（自引用） |
| `isRecalled` | Boolean | 是否已撤回（所有人可见） |
| `recalledAt` | Date | 撤回时间 |
| `isDeleted` | Boolean | 是否软删除（仅删除者不可见） |
| `deletedBy` | String | 删除者ID |
| `deletedAt` | Date | 删除时间 |

### 每日签到奖励表
| 连续天数 | 奖励钻石 |
|----------|----------|
| 第1天 | 5 |
| 第2天 | 5 |
| 第3天 | 8 |
| 第4天 | 8 |
| 第5天 | 10 |
| 第6天 | 15 |
| 第7天 | 20 |
| 第8天+ | 循环（第8天=5） |

---

## 🔌 Socket.IO 事件列表

### 客户端发送事件
| 事件名 | 数据 | 说明 |
|--------|------|------|
| `join-room` | `{ roomId, userId, personaId }` | 加入聊天室 |
| `leave-room` | `{}` | 离开聊天室 |
| `send-message` | `{ roomId, userId, personaId, content, isAction, replyToId }` | 发送消息（支持回复） |
| `switch-persona` | `{ userId, newPersonaId }` | 切换角色 |
| `pong` | `{}` | 心跳响应 |

### 服务端发送事件
| 事件名 | 数据 | 说明 |
|--------|------|------|
| `connected` | `{ id, timestamp }` | 连接成功 |
| `ping` | `{}` | 心跳检测 |
| `new-message` | `Message` | 新消息（含回复数据） |
| `message-recalled` | `{ messageId, recalledByName }` | 消息被撤回 |
| `message-deleted` | `{ messageId }` | 消息被删除（仅通知删除者） |
| `room-online-count` | `{ roomId, count }` | 房间在线人数更新 |
| `user-joined` | `{ userId, personaId, onlineCount }` | 用户加入房间 |
| `user-left` | `{ userId }` | 用户离开房间 |
| `persona-switched` | `{ userId, newPersonaId }` | 角色切换通知 |

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
> - ✅ 核心文件在哪里（ChatHome.tsx、room.js、app.js、socket.ts）
> - ✅ 关键数据流（消息发送含回复、撤回、删除、AI对戏、每日签到）
> - ✅ 当前已完成的功能（含消息回复/撤回/软删除/AI对戏/商城/帖子/签到）
> - ✅ 数据库模型关系和 API 路由
> - ✅ Socket.IO 事件列表
> - ✅ 每日签到奖励规则
> 
> 如果你需要修改代码，请：
> 1. **请先向用户询问他手上的文件，查看相关文件的现有职责，最后才修改**
> 2. 保持代码风格一致
> 3. 修改后更新本文档
> 4. 注意移动端兼容性（响应式布局）
> 5. 确保 Socket.IO 事件命名规范
> 6. 消息软删除仅影响删除者本人，其他人仍可见
> 7. AI 对戏使用 DeepSeek API，需要配置 API Key
> 8. 更新日志需要配置 GitHub Token 才能自动同步

---

## 📅 最后更新记录 **请不要随意删除掉之前的记录，每次更新.md时都要写回之前的更新记录**

| 日期 | 更新内容 | 更新人 |
|------|----------|--------|
| 2026-05-19 | 完成 AI 对戏模块（DeepSeek API）、商城系统、帖子系统、每日签到、角色页面样式统一、更新日志 GitHub 同步修复 | AI |
| 2026-05-18 | 完成消息回复、撤回、软删除功能 | AI |
| 2026-05-18 | 更新 Message 模型添加 replyTo/isRecalled/isDeleted 字段 | AI |
| 2026-05-18 | 更新 Socket.IO 支持回复消息和撤回/删除事件 | AI |
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

*本文档由 AI 生成，基于实际代码结构。请在每次重要更新后同步更新本文档（用户会告知）*
