以下是将更新内容合并后的完整项目文档（纯文本，不含图表）。

```markdown
# RP Chat - 项目上下文文档

> 🤖 **AI 维护提示**：本文档记录项目的完整架构、文件职责和当前状态。  
> **每次更新代码后，请同步更新本文档**，以便下次对话的 AI 能快速理解项目。

---

## 📌 项目概览

| 项目 | 说明 |
|------|------|
| 项目名称 | RP Chat - 角色扮演聊天室 |
| 项目类型 | 角色扮演 + 群聊/私聊 + AI 对戏系统 |
| 前端技术 | React 18 + TypeScript + TailwindCSS + Vite |
| 后端技术 | Node.js + Express + MongoDB + Socket.IO |
| 部署平台 | 前端 Vercel / 后端 Render |

---

## 📂 完整文件结构

### 🎨 前端结构 (`client/`)

#### 配置文件（根目录）

| 文件 | 职责 |
|------|------|
| `package.json` | 项目依赖和脚本 |
| `vite.config.ts` | Vite 构建配置 |
| `tsconfig.json` | TypeScript 主配置 |
| `tailwind.config.cjs` | TailwindCSS 配置 |
| `postcss.config.cjs` | PostCSS 配置 |
| `eslint.config.js` | ESLint 代码检查 |
| `vercel.json` | Vercel 部署配置 |
| `index.html` | HTML 入口文件 |

#### `public/` - 静态资源

| 文件 | 职责 |
|------|------|
| `favicon.svg` | 网站图标 |
| `fonts/MaokenZhuyuanTi.ttf` | 猫啃珠圆体字体 |
| `frames/` | 头像框图片目录 |

#### `src/` - 源代码

##### 入口文件

| 文件 | 职责 |
|------|------|
| `main.tsx` | React 渲染入口 |
| `App.tsx` | 应用根组件 + 路由配置 |
| `App.css` / `index.css` | 全局样式（含深色模式覆盖） |

**App.tsx 路由表**

| 路由 | 组件 | 说明 |
|------|------|------|
| `/`, `/login` | `Login` | 登录页（邮箱 + Google） |
| `/register` | `Register` | 注册页 |
| `/invite` | `InviteCode` | 邀请码验证 |
| `/chat` | `ChatHome` | 聊天主页 |
| `/persona` | `PersonaManager` | 角色管理 |
| `/persona/create` | `PersonaCreate` | 创建角色 |
| `/persona/:personaId` | `PersonaDetail` | 角色详情（皮主页） |
| `/profile` | `Profile` | 个人资料 |
| `/settings` | `Settings` | 账号设置（含维护模式控制） |
| `/search` | `SearchPage` | 全局搜索 |
| `/changelog` | `Changelog` | 更新日志 |
| `/feed` | `MobileFeed` | 动态页（手机） |
| `/home` | `MobileHome` | 主页（手机） |
| `/shop` | `Shop` | 商城 |
| `/inventory` | `Inventory` | 背包 |
| `/privacy` | `PrivacyPolicy` | 隐私政策 |
| `/terms` | `TermsOfService` | 服务条款 |
| `/group/:roomId` | `GroupDetail` | 群聊详情页（新增） |
| `/room/:roomId/members` | `RoomMembers` | 房间成员列表（新增） |

---

##### `src/components/` - 组件目录

**`components/auth/`**

| 文件 | 职责 |
|------|------|
| `InviteCode.tsx` | 邀请码验证 |
| `Login.tsx` | 登录表单（支持邮箱/Google） |
| `Register.tsx` | 注册表单（邮箱/Google） |

**`components/admin/`**

| 文件 | 职责 |
|------|------|
| `CreateInvite.tsx` | 创建邀请码（管理员） |

---

**`components/chat/` ⭐ 核心聊天功能**

| 文件 | 职责 |
|------|------|
| `AIChat.tsx` | AI 聊天弹窗 |
| `AIChatRoom.tsx` | AI 对戏主界面 |
| `AISettings.tsx` | AI 角色设置 |
| **`ChatHome.tsx`** | **聊天主界面（群聊/私聊/AI对戏 Tab），消息气泡使用 AvatarFrame** |
| **`ChatInput.tsx`** | **消息输入框（表情、简繁转换、回复预览、@提及面板）** |
| `CreateRoom.tsx` | 创建群聊 |
| `GroupDetail.tsx` | 群聊详情页（使用 useGroupPermission） |
| `GroupSettings.tsx` | 群聊设置（头衔管理：创建/删除/分配） |
| `JoinRoom.tsx` | 加入群聊 |
| `LinkPreviewCard.tsx` | 链接预览卡片 |
| `LinkPreviewContainer.tsx` | 链接预览容器 |
| `PendingRequests.tsx` | 入群申请审核 |
| `PrivateChat.tsx` | 私聊功能（前端已就绪） |
| `RoomMembers.tsx` | 房间成员列表（头像使用 AvatarFrame） |
| `RoomSettings.tsx` | 房间设置 |
| `UserPersonaSettings.tsx` | 用户角色设置（AI 用） |

---

**`components/common/`**

| 文件 | 职责 |
|------|------|
| **`AvatarFrame.tsx`** | **头像框显示（支持从URL提取文件名、独立配置scale/offset）** |
| **`AvatarUpload.tsx`** | **头像上传弹窗（Cloudinary）** |
| `Changelog.tsx` | 更新日志展示 |
| `ContextMenu.tsx` | 右键菜单 |
| `EmojiPicker.tsx` | 表情选择器 |
| **`PersonaSwitchPanel.tsx`** | **角色切换弹窗（搜索、最近使用，头像使用 AvatarFrame）** |
| `SearchPage.tsx` | 全局搜索页面 |

---

**`components/diamond/`**

| 文件 | 职责 |
|------|------|
| `DailyDiamond.tsx` | 每日签到（连续奖励） |
| `DiamondBalance.tsx` | 钻石余额显示 |

---

**`components/layout/`**

| 文件 | 职责 |
|------|------|
| `DesktopLayout.tsx` | 桌面端（侧边栏 + 左下角色切换，头像使用 AvatarFrame） |
| `MobileLayout.tsx` | 移动端（顶部栏 + 底部 Tab + 右上角色切换） |
| `TabletLayout.tsx` | 平板端布局 |

---

**`components/persona/` ⭐ 角色系统**

| 文件 | 职责 |
|------|------|
| `PersonaCreate.tsx` | 创建角色 |
| **`PersonaDetail.tsx`** | **角色详情页（皮主页，头像使用 AvatarFrame）** |
| `PersonaEquipments.tsx` | 角色装备显示 |
| `PersonaGuardianList.tsx` | 守护榜 |
| `PersonaList.tsx` | 角色列表（网格） |
| `PersonaManager.tsx` | 角色管理主页 |
| `PersonaPosts.tsx` | 角色动态（发帖、点赞） |
| `PersonaRelationships.tsx` | 亲密关系 |
| `PersonaSearch.tsx` | 角色搜索（简繁转换） |

---

**`components/shop/` & `components/inventory/`**

| 文件 | 职责 |
|------|------|
| `Shop.tsx` | 商城页面 |
| `Inventory.tsx` | 背包页面 |

---

**`components/feed/` & `components/home/`**

| 文件 | 职责 |
|------|------|
| `MobileFeed.tsx` | 手机端动态页（返回按钮、主题适配） |
| `MobileHome.tsx` | 手机端主页（返回按钮、突出钻石） |

---

**`components/settings/`**

| 文件 | 职责 |
|------|------|
| `Settings.tsx` | 应用设置（账号设置 + 偏好设置 + 管理员面板 + 维护模式控制） |

---

##### `src/contexts/`

| 文件 | 职责 |
|------|------|
| `ThemeContext.tsx` | 深色/浅色模式上下文（仅从 localStorage 读取，无系统跟随） |

##### `src/hooks/`

| 文件 | 职责 |
|------|------|
| `useDebounce.ts` | 防抖 |
| `useFont.ts` | 字体加载 |
| `useKeyboardHeight.ts` | 移动端键盘高度检测 |
| `useLongPress.ts` | 长按事件 |
| `usePermissions.ts` | 权限检查 |
| `useQuickSwitchPersona.ts` | Tab 键快捷切换角色 |
| `useResponsive.ts` | 响应式断点检测 |
| `useUnreadCount.ts` | 未读消息计数 |
| **`useGroupPermission.ts`** | **群组权限 Hook（检查群主/管理员）** |

##### `src/services/`

| 文件 | 职责 |
|------|------|
| **`api.ts`** | **API 调用封装（核心，含 401 拦截），添加 avatarFrame 和 equipped 类型** |
| `diamondApi.ts` | 钻石系统 API |
| `linkPreviewApi.ts` | 链接预览 API |
| `Notification.ts` | 浏览器通知 |
| **`socket.ts`** | **Socket.IO 连接管理** |
| `translateApi.ts` | 简繁转换 API |
| `agoraService.ts` | 声网语音（已放弃） |

##### `src/utils/`

| 文件 | 职责 |
|------|------|
| `linkParser.ts` | URL 提取和解析 |
| `renderMarkdown.ts` | Markdown 渲染 |
| `timeFormat.ts` | 消息时间格式化 |

---

### ⚙️ 后端结构 (`server/`)

#### 配置文件（根目录）

| 文件 | 职责 |
|------|------|
| `package.json` | 依赖和脚本 |
| `.env` | 环境变量 |
| `render.yaml` | Render 部署配置 |

#### `src/` - 源代码

##### 入口文件

| 文件 | 职责 |
|------|------|
| **`app.js`** | **Express 入口 + Socket.IO 配置（核心），注册 admin 路由，添加部署通知，移除重复 server.listen** |

##### `src/models/` - 数据模型

| 模型 | 职责 | 关键字段 |
|------|------|----------|
| `User` | 用户 | username, diamonds, equippedItems, dailyDiamondStreak |
| `Persona` | 角色 | name, displayName, description, userId, equipped |
| `Room` | 房间 | name, createdBy, pendingMembers |
| `Message` | 消息 | content, replyTo, isRecalled, isDeleted |
| `AIPersona` | AI 角色 | name, personality, replyStyle |
| `Post` | 帖子 | content, images, likes, likeCount |
| `ShopItem` | 商城商品 | name, type, price, rarity, image |
| `UserInventory` | 用户库存 | itemId, isEquipped |
| `Changelog` | 更新日志 | sha, message, commitType |
| `InviteCode` | 邀请码 | code, usedBy, expiresAt, type |
| `ActivePersona` | 激活角色 | userId, personaId |
| `PersonaRoom` | 角色-房间关联 | personaId, roomId |
| **`SystemSettings`** | **系统设置** | **key, value（用于维护模式等）** |
| **`Title`** | **头衔** | **name, roomId, createdBy, assignedTo** |
| **`DebugAuth`** | **调试授权** | **用于开发调试** |

##### `src/routes/` - API 路由

| 文件 | 主要接口 |
|------|----------|
| `auth.js` | 登录、注册（邮箱密码）、邀请码 |
| `room.js` | 创建、消息、审核、撤回、删除、转让、**/mentionable（提及通知）** |
| `persona.js` | CRUD、切换、装备 |
| `ai.js` | AI 对话 |
| `aiPersona.js` | AI 角色 CRUD |
| `diamond.js` | 余额、每日签到 |
| `shop.js` | 商品、购买、装备、卸下 |
| `post.js` | 发布、点赞、删除 |
| `upload.js` | Cloudinary 上传/删除 |
| `user.js` | 资料、设置、**修改密码、删除账户** |
| `search.js` | 全局搜索 |
| `translate.js` | 简繁转换 |
| `changelog.js` | GitHub 同步 |
| `linkPreview.js` | URL 元数据抓取 |
| **`admin.js`** | **管理员路由（维护模式开关、系统设置）** |
| **`title.js`** | **头衔路由（创建、删除、分配、列表）** |

##### `src/middleware/` - 中间件

| 文件 | 职责 |
|------|------|
| `securityMiddleware.js` | 安全中间件（限流、请求验证），集成 Discord 告警 |
| `securityLogger.js` | 安全日志记录 |
| **`mentionHandler.js`** | **@提及处理中间件，解析消息中的提及并发送通知** |

##### `src/services/` - 业务服务

| 文件 | 职责 |
|------|------|
| `aiService.js` | DeepSeek API 调用 |
| `uploadService.js` | Cloudinary 上传 |
| `contentFilter.js` | 脏话过滤 |
| `translateService.js` | 翻译服务 |
| `markdownService.js` | Markdown 解析 |
| **`discordAlert.js`** | **Discord 告警服务（多频道支持，用于安全事件、部署通知等）** |

##### `src/scripts/` - 维护脚本

| 文件 | 职责 |
|------|------|
| `clean-db.js` | 清理数据库 |
| `createAdmin.js` | 创建管理员 |
| `fix-room-owner.js` | 修复房间群主 |
| `fix-room.js` | 修复房间数据 |
| `health-check.js` | 健康检查（使用 db.collection() 避免模型重复编译） |
| `initAvatarFrames.js` | 初始化头像框商品 |
| `initShop.js` | 初始化商城商品 |
| `migrate-to-persona-rooms.js` | 迁移到角色房间 |
| `test-link-preview.js` | 测试链接预览 |
| **`test-discord.js`** | **测试 Discord Webhook** |

##### `.github/workflows/` - GitHub Actions

| 文件 | 职责 |
|------|------|
| **`discord-updates.yml`** | **Discord 更新通知工作流（代码推送时发送通知）** |

---

## 🔗 关键数据流（纯文本描述）

### 1. 发送消息流程（支持回复和提及）
用户点击回复按钮 → 设置 replyToMessage → 输入框显示回复预览 → 用户输入内容（可 @ 成员） → 前端解析 @ 提及 → 发送消息带 replyToId 和 mentions → 后端 mentionHandler 处理 → 保存消息到 MongoDB → 广播 new-message → 触发 Discord 告警（如需要） → 前端显示消息和引用内容，@ 成员高亮。

### 2. 消息撤回流程
用户右键/长按消息 → 选择撤回（5分钟内）→ 后端标记 isRecalled → 广播 message-recalled → 所有人看到撤回提示。

### 3. 消息删除（软删除）流程
用户右键/长按消息 → 选择删除（仅自己）→ 后端标记 isDeleted → 仅删除者本人看不到。

### 4. AI 对戏流程
点击 AI 对戏 Tab → 加载默认 AI 角色 → 发送消息 → 调用 DeepSeek API → 返回带动作描写的回复。

### 5. 每日签到流程
打开签到面板 → GET 签到信息 → 点击领取 → POST 领取 → 计算连续奖励（5,5,8,8,10,15,20 循环）→ 更新钻石。

### 6. 更新日志同步流程
访问更新日志页面 → 检查是否需要同步（>1小时）→ 调用 GitHub API → 保存到数据库 → 返回 entries。

### 7. 角色切换流程
点击切换按钮 → 打开 PersonaSwitchPanel → 选择角色 → API 更新激活角色 → localStorage 保存 → 触发事件更新界面。

### 8. 头像上传流程
点击更换头像 → 选择图片 → 上传到 Cloudinary → 返回 URL → 更新数据库 → 刷新页面。

### 9. 头像框系统
购买头像框 → 装备到角色 → 显示时根据 frameId 应用配置（scale, offsetX, offsetY）→ 在头像周围显示。

### 10. @提及流程
用户在输入框输入 `@` → 弹出成员列表 → 选择成员 → 插入 `@用户名` → 发送时后端解析 mentions → 为被提及者创建通知 → 被提及者收到高亮消息。

### 11. 维护模式流程
管理员在设置面板开启维护模式 → 后端设置 SystemSettings → 所有非管理员请求返回 503 维护页面 → Socket.IO 拒绝连接。

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
GITHUB_TOKEN=your_github_token
DEEPSEEK_API_KEY=your_deepseek_api_key
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# Discord 告警（可选）
DISCORD_WEBHOOK_SECURITY=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK_DEPLOY=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK_FEEDBACK=https://discord.com/api/webhooks/...
```

---

## 🚀 部署信息

| 服务 | 平台 | 地址 | 备注 |
|------|------|------|------|
| 前端 | Vercel | https://rp-chat-v1-0.vercel.app | 自动部署 main 分支 |
| 后端 | Render | https://rp-chatv1-0.onrender.com | 免费实例，无请求会休眠 |

---

## 📝 功能清单

### ✅ 已完成功能

#### 💬 核心聊天
- [x] 消息发送/接收（Socket.IO 实时）
- [x] 消息回复（引用回复，气泡内显示）
- [x] 消息撤回（5分钟内，所有人可见）
- [x] 消息删除（软删除，仅自己不可见）
- [x] 动作扮演（`/me` 命令）
- [x] 简繁转换 + 表情选择器
- [x] Tab 键快捷切换角色
- [x] 链接预览卡片
- [x] Markdown 渲染
- [x] **@提及功能（成员选择、通知、高亮）**

#### 👤 角色系统
- [x] 角色创建/编辑/删除
- [x] 角色搜索（简繁转换）
- [x] 角色详情页（皮主页）
- [x] 角色动态（发帖、点赞）
- [x] 亲密关系 + 守护榜
- [x] 角色头像上传（Cloudinary）
- [x] 角色切换面板（弹窗 + 搜索 + 最近使用）
- [x] 记住上次使用的角色（localStorage）

#### 🖼️ 头像框系统
- [x] 商城购买头像框
- [x] 装备/卸下头像框
- [x] 每个头像框独立配置（scale, offsetX, offsetY）
- [x] 角色主页 + 聊天消息 + 成员列表 + 侧边栏 + 切换面板 统一显示头像框

#### 🏠 群聊系统
- [x] 创建群聊
- [x] 申请加入（审核机制）
- [x] 群主/管理员权限
- [x] 转让群主 + 踢出成员
- [x] 未读消息计数（红点提示）
- [x] 消息时间分隔线 + 气泡时间戳
- [x] **头衔管理（创建/删除/分配）**
- [x] **群组权限 Hook（useGroupPermission）**

#### 🤖 AI 对戏
- [x] DeepSeek API 接入
- [x] AI 角色自定义（名称、性格、回复风格）
- [x] 用户角色设置（让 AI 认识你）
- [x] 聊天历史保存（localStorage）

#### 💎 经济系统
- [x] 每日签到（连续奖励：5,5,8,8,10,15,20 循环）
- [x] 钻石为主货币（金币已移除）
- [x] 商城 + 背包

#### 🔐 认证与安全
- [x] 邮箱密码登录 + 注册
- [x] Google OAuth 登录
- [x] 修改密码 + 删除账户
- [x] 邀请码机制
- [x] **安全中间件（限流、请求验证）**
- [x] **安全日志记录**
- [x] **Discord 告警（安全事件、部署通知等）**
- [x] **维护模式（管理员可开关）**

#### 📱 布局与主题
- [x] 深色模式（仅 localStorage，无系统跟随）
- [x] 响应式布局（手机/平板/桌面）
- [x] 手机端底部 Tab（聊天/动态/主页）
- [x] 电脑端侧边栏 + 左下角色切换
- [x] 移动端键盘适配
- [x] 手机端动态页和主页美化（返回按钮、突出钻石）

#### 📋 其他
- [x] 更新日志（自动同步 GitHub commits）
- [x] 隐私政策 + 服务条款页面（美化版）
- [x] 全局搜索
- [x] GitHub Actions Discord 通知

### ⏳ 开发中
- [ ] 私聊功能（后端未完成）
- [ ] 消息搜索（全文搜索）
- [ ] 帖子评论功能
- [ ] 邮箱验证（需要邮件服务，如 Brevo）

### ❌ 已放弃/删除
- [ ] 语音房（agoraService 已配置但未使用）
- [ ] Apple 登录（网页不支持）
- [ ] 金币作为主货币（改为钻石）

---

## 🗄️ 数据库模型关系（纯文本）

- User 一对多 Persona, Room, Message, Post, UserInventory, AIPersona
- Persona 多对多 PersonaRoom, 一对多 Message, Post
- Room 一对多 Message, PersonaRoom
- Message 自关联 replyTo
- ShopItem 一对多 UserInventory
- SystemSettings 单例（key-value）
- Title 属于 Room，可分配给 User

---

## 🔌 Socket.IO 事件列表

### 客户端发送

| 事件 | 数据 | 说明 |
|------|------|------|
| `join-room` | `{ roomId, userId, personaId }` | 加入聊天室 |
| `leave-room` | `{}` | 离开聊天室 |
| `send-message` | `{ roomId, userId, personaId, content, isAction, replyToId, mentions }` | 发送消息（含提及） |
| `switch-persona` | `{ userId, newPersonaId }` | 切换角色 |
| `pong` | `{}` | 心跳响应 |

### 服务端发送

| 事件 | 数据 | 说明 |
|------|------|------|
| `connected` | `{ id, timestamp }` | 连接成功 |
| `ping` | `{}` | 心跳检测 |
| `new-message` | `Message`（含 avatarFrame） | 新消息 |
| `message-recalled` | `{ messageId, recalledByName }` | 消息被撤回 |
| `message-deleted` | `{ messageId }` | 消息被删除（仅通知删除者） |
| `room-online-count` | `{ roomId, count }` | 在线人数更新 |
| `user-joined` | `{ userId, personaId, onlineCount }` | 用户加入 |
| `user-left` | `{ userId }` | 用户离开 |
| `persona-switched` | `{ userId, newPersonaId }` | 角色切换通知 |

---

## 📅 每日签到奖励表

| 连续天数 | 奖励钻石 |
|----------|----------|
| 第 1 天 | 5 💎 |
| 第 2 天 | 5 💎 |
| 第 3 天 | 8 💎 |
| 第 4 天 | 8 💎 |
| 第 5 天 | 10 💎 |
| 第 6 天 | 15 💎 |
| 第 7 天 | 20 💎 |
| 第 8 天+ | 循环（第 8 天 = 5） |

---

## 🤖 AI 维护指南

> ### 给下次对话的 AI：
> 
> 1. **请务必先阅读本文档再回答问题！**
> 2. 修改代码前，**请先询问用户手上的文件内容**
> 3. 保持代码风格一致，注意移动端兼容性
> 
> ### 关键配置位置：
> 
> | 配置项 | 文件位置 |
> |--------|----------|
> | 头像框配置 | `AvatarFrame.tsx` 的 `frameConfigs` |
> | Cloudinary | `CLOUDINARY_URL` 环境变量 |
> | DeepSeek API | `aiService.js` |
> | Socket.IO | `app.js` + `socket.ts` |
> | 路由守卫 | `App.tsx` + `api.ts` 401 拦截 |
> | Discord 告警 | `discordAlert.js` + 环境变量 |
> | 维护模式 | `admin.js` + `SystemSettings` 模型 |
> | 提及处理 | `mentionHandler.js` 中间件 |
> | 头衔系统 | `title.js` 路由 + `Title` 模型 |
> | 群组权限 | `useGroupPermission.ts` Hook |
> 
> ### 手机端路由：
> 
> | Tab | 路由 |
> |-----|------|
> | 聊天 | `/chat` |
> | 动态 | `/feed` |
> | 主页 | `/home` |
> 
> ### 账号设置路径：
> 
> - 账号设置：`/settings`
> - 角色主页：`/persona/:personaId`
> 
> ### 维护模式：
> 
> - 管理员在 `/settings` 中开启/关闭
> - 开启后普通用户无法访问任何 API 和 WebSocket

---

## 📅 最后更新记录

| 日期 | 更新内容 |
|------|----------|
| 2026-05-26 | **头像框系统集成**（所有头像显示位置统一使用 AvatarFrame）；**安全系统**（限流、日志、Discord 多频道告警、维护模式）；**认证升级**（邮箱密码登录、修改密码、删除账户）；**@提及功能**（成员选择、通知、高亮）；**头衔系统**（创建/删除/分配）；**群组管理修复**（路由完善、权限 Hook）；**主题优化**（移除系统跟随，只保留手动切换）；**移动端页面美化**（返回按钮、突出钻石）；**健康检查增强**；**GitHub Actions Discord 通知**；移除 Apple 登录和金币货币 |
| 2026-05-23 | 修复头像上传（Cloudinary），完善头像框系统 |
| 2026-05-22 | 完成头像框功能、角色切换面板、手机端重构 |
| 2026-05-21 | 完成 AI 对戏模块、商城系统、帖子系统、每日签到 |
| 2026-05-18 | 完成消息回复、撤回、删除功能 |

---

*本文档由 AI 维护，每次重要更新后请同步更新*

