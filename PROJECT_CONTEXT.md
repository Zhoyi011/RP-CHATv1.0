好的！我来帮你完整化 `PROJECT_CONTEXT.md`，包含所有文件的详细说明。

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
| 前端技术 | React 18 + TypeScript + TailwindCSS + Vite + Framer Motion |
| 后端技术 | Node.js + Express + MongoDB + Socket.IO |
| 部署平台 | 前端 Vercel / 后端 Render |
| 其他服务 | Cloudinary（图片上传）、DeepSeek（AI对话）、Discord Webhook（告警） |

---

## 📂 完整文件结构

### 🎨 前端结构 (`client/`)

#### 配置文件（根目录）

| 文件 | 职责 |
|------|------|
| `package.json` | 项目依赖和脚本 |
| `vite.config.ts` | Vite 构建配置 |
| `tsconfig.json` | TypeScript 主配置 |
| `tsconfig.node.json` | Node.js 环境 TypeScript 配置 |
| `tailwind.config.cjs` | TailwindCSS 配置 |
| `postcss.config.cjs` | PostCSS 配置 |
| `eslint.config.js` | ESLint 代码检查 |
| `vercel.json` | Vercel 部署配置 |
| `index.html` | HTML 入口文件 |

#### `public/` - 静态资源

| 文件 | 职责 |
|------|------|
| `favicon.svg` | 网站图标 |
| `fonts/MaokenZhuyuanTi.ttf` | 猫啃珠圆体字体（全局使用） |
| `frames/` | 头像框图片目录（.png 格式） |

#### `src/` - 源代码

##### 入口文件

| 文件 | 职责 |
|------|------|
| `main.tsx` | React 渲染入口，导入全局样式 |
| `App.tsx` | 应用根组件 + 路由配置 + 维护模式检测 |
| `App.css` | 组件样式（动画、计数器等） |
| `index.css` | 全局样式（Tailwind、字体、深色模式、动画） |
| `vite-env.d.ts` | Vite 环境变量类型声明 |

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
| `/settings` | `Settings` | 账号设置（含维护模式控制） |
| `/search` | `SearchPage` | 全局搜索 |
| `/changelog` | `Changelog` | 更新日志 |
| `/feed` | `MobileFeed` | 动态页（手机） |
| `/home` | `MobileHome` | 主页（手机） |
| `/shop` | `Shop` | 商城 |
| `/inventory` | `Inventory` | 背包 |
| `/wallet` | `Wallet` | 钱包（充值码兑换） |
| `/onboarding` | `OnboardingWizard` | 新用户引导流程 |
| `/privacy` | `PrivacyPolicy` | 隐私政策 |
| `/terms` | `TermsOfService` | 服务条款 |
| `/group/:roomId` | `GroupDetail` | 群聊详情页 |
| `/group/:roomId/settings` | `GroupSettings` | 群聊设置 |
| `/room/:roomId/members` | `RoomMembers` | 房间成员列表 |
| `/room/:roomId/pending` | `PendingRequests` | 入群申请审核 |

---

##### `src/components/` - 组件目录

**`components/auth/` - 认证相关**

| 文件 | 职责 |
|------|------|
| `InviteCode.tsx` | 邀请码验证页面（必须输入才能激活账号） |
| `Login.tsx` | 登录表单（支持邮箱/Google，含 hCaptcha） |
| `Register.tsx` | 注册表单（邮箱/密码） |

**`components/admin/` - 管理员组件**

| 文件 | 职责 |
|------|------|
| `CreateInvite.tsx` | 创建邀请码（管理员） |
| `CreateRedeemCode.tsx` | 创建充值码（super_admin/owner） |
| `MaintenanceControl.tsx` | 维护模式控制（开关 + 管理员豁免） |
| `MaintenanceScheduler.tsx` | 定时维护计划管理 |

---

**`components/chat/` ⭐ 核心聊天功能**

| 文件 | 职责 |
|------|------|
| `AIChat.tsx` | AI 聊天弹窗组件 |
| `AIChatRoom.tsx` | AI 对戏主界面 |
| `AISettings.tsx` | AI 角色设置 |
| **`ChatHome.tsx`** | **聊天主界面（群聊/私聊/AI对戏 Tab）** |
| **`ChatInput.tsx`** | **消息输入框（表情、简繁转换、回复预览、@提及）** |
| `CreateRoom.tsx` | 创建群聊弹窗 |
| `GroupDetail.tsx` | 群聊详情页 |
| `GroupSettings.tsx` | 群聊设置（头衔管理） |
| `JoinRoom.tsx` | 加入群聊 |
| `LinkPreviewCard.tsx` | 链接预览卡片 |
| `LinkPreviewContainer.tsx` | 链接预览容器 |
| `PatPanel.tsx` | 拍一拍面板（双击头像触发） |
| `PendingRequests.tsx` | 入群申请审核列表 |
| `PrivateChat.tsx` | 私聊功能 |
| `RoomMembers.tsx` | 房间成员列表 |
| `RoomSettings.tsx` | 房间设置 |
| `TranslatableMessage.tsx` | 可翻译消息组件（中英/多语言） |
| `UserPersonaSettings.tsx` | 用户角色设置（AI 用） |

---

**`components/common/` - 通用组件**

| 文件 | 职责 |
|------|------|
| **`AvatarFrame.tsx`** | **头像框显示（支持独立配置 scale/offset）** |
| **`AvatarUpload.tsx`** | **头像上传弹窗（Cloudinary）** |
| `Changelog.tsx` | 更新日志展示 |
| `ContextMenu.tsx` | 右键菜单 |
| `CustomDatePicker.tsx` | 自定义日期选择器 |
| `EmojiPicker.tsx` | 表情选择器 |
| `GlassDatePicker.tsx` | 毛玻璃效果日期时间选择器 |
| `MaintenancePage.tsx` | 维护模式页面 |
| `NotificationSettings.tsx` | 通知设置 |
| **`PersonaSwitchPanel.tsx`** | **角色切换弹窗（搜索、最近使用）** |
| `SearchPage.tsx` | 全局搜索页面 |

---

**`components/diamond/` - 钻石系统**

| 文件 | 职责 |
|------|------|
| `DailyDiamond.tsx` | 每日签到（连续奖励） |
| `DiamondBalance.tsx` | 钻石余额显示 |

---

**`components/layout/` - 布局组件**

| 文件 | 职责 |
|------|------|
| `DesktopLayout.tsx` | 桌面端布局（侧边栏 + 左下角色切换） |
| `MobileLayout.tsx` | 移动端布局（顶部栏 + 底部 Tab） |
| `TabletLayout.tsx` | 平板端布局 |

---

**`components/persona/` ⭐ 角色系统**

| 文件 | 职责 |
|------|------|
| `PersonaCreate.tsx` | 创建角色（含头像上传） |
| **`PersonaDetail.tsx`** | **角色详情页（皮主页）** |
| `PersonaEquipments.tsx` | 角色装备显示 |
| `PersonaGuardianList.tsx` | 守护榜 |
| `PersonaList.tsx` | 角色列表（网格） |
| `PersonaManager.tsx` | 角色管理主页 |
| `PersonaPosts.tsx` | 角色动态（发帖、点赞） |
| `PersonaRelationships.tsx` | 亲密关系 |
| `PersonaSearch.tsx` | 角色搜索 |

---

**`components/shop/` & `components/inventory/` - 商城背包**

| 文件 | 职责 |
|------|------|
| `Shop.tsx` | 商城页面（购买头像框等） |
| `Inventory.tsx` | 背包页面（装备物品） |

---

**`components/feed/` & `components/home/` - 手机端页面**

| 文件 | 职责 |
|------|------|
| `MobileFeed.tsx` | 手机端动态页 |
| `MobileHome.tsx` | 手机端主页（资产、签到、快捷入口） |

---

**`components/settings/` - 设置页面**

| 文件 | 职责 |
|------|------|
| `Settings.tsx` | 应用设置（账号/偏好/管理面板） |

---

**`components/user/` - 用户相关**

| 文件 | 职责 |
|------|------|
| `UserList.tsx` | 用户列表（私聊） |

---

**`components/wallet/` - 钱包系统**

| 文件 | 职责 |
|------|------|
| `Wallet.tsx` | 钱包主页（余额、充值记录） |
| `RedeemModal.tsx` | 充值码输入弹窗 |
| `RedemptionHistory.tsx` | 充值记录列表 |

---

**`components/onboarding/` - 新用户引导**

| 文件 | 职责 |
|------|------|
| `OnboardingWizard.tsx` | 引导流程控制器 |
| `OnboardingProfile.tsx` | 填写用户名/昵称/生日 |
| `OnboardingPersona.tsx` | 创建或跳过角色 |
| `OnboardingRoom.tsx` | 创建或跳过群聊 |
| `OnboardingComplete.tsx` | 完成引导 |

---

**`components/legal/` - 法律页面**

| 文件 | 职责 |
|------|------|
| `PrivacyPolicy.tsx` | 隐私政策 |
| `TermsOfService.tsx` | 服务条款 |

---

##### `src/contexts/`

| 文件 | 职责 |
|------|------|
| `ThemeContext.tsx` | 深色/浅色模式上下文（仅 localStorage） |

##### `src/hooks/`

| 文件 | 职责 |
|------|------|
| `useDebounce.ts` | 防抖 hook |
| `useFont.ts` | 字体加载 hook |
| `useKeyboardHeight.ts` | 移动端键盘高度检测 |
| `useLongPress.ts` | 长按事件 hook |
| `usePermissions.ts` | 权限检查 hook |
| `useQuickSwitchPersona.ts` | Tab 键快捷切换角色 |
| `useResponsive.ts` | 响应式断点检测 |
| `useUnreadCount.ts` | 未读消息计数 |
| **`useGroupPermission.ts`** | **群组权限 Hook（检查群主/管理员）** |

##### `src/services/`

| 文件 | 职责 |
|------|------|
| **`api.ts`** | **API 调用封装（核心，含 401 拦截）** |
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

##### `src/firebase/`

| 文件 | 职责 |
|------|------|
| `config.ts` | Firebase 配置（Google 登录） |

##### `src/animations/`

| 文件 | 职责 |
|------|------|
| `variants.ts` | Framer Motion 动画变体（可选） |

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
| **`app.js`** | **Express 入口 + Socket.IO 配置 + 路由注册** |

##### `src/models/` - 数据模型

| 模型 | 职责 | 关键字段 |
|------|------|----------|
| `User.js` | 用户模型 | username, email, password, diamonds, role, hasAccess, onboarded, equippedItems |
| `Persona.js` | 角色模型 | name, displayName, description, avatar, userId, status, sameNameNumber, equipped |
| `Room.js` | 房间模型 | name, description, createdBy, members, isPublic, requireApproval |
| `Message.js` | 消息模型 | content, roomId, personaId, isAction, isPat, replyTo, isRecalled, isDeleted, mentions |
| `InviteCode.js` | 邀请码模型 | code, type, createdBy, usedBy, expiresAt, maxUses, usesCount |
| `RedeemCode.js` | 充值码模型 | code, diamondAmount, createdBy, isUsed, usedBy, expiresAt |
| `RedemptionRecord.js` | 充值记录模型 | userId, redeemCodeId, code, diamondAmount, previousBalance, newBalance |
| `SystemSettings.js` | 系统设置模型 | key, value（维护模式等） |
| `MaintenanceSchedule.js` | 维护计划模型 | name, startTime, endTime, message, isActive, repeatWeekly |
| `Title.js` | 头衔模型 | name, roomId, createdBy, assignedTo |
| `ActivePersona.js` | 激活角色模型 | userId, personaId |
| `PersonaRoom.js` | 角色-房间关联 | personaId, roomId, role |
| `AIPersona.js` | AI 角色模型 | name, personality, replyStyle |
| `Post.js` | 帖子模型 | content, images, likes, likeCount |
| `ShopItem.js` | 商城商品模型 | name, type, price, rarity, image |
| `UserInventory.js` | 用户库存模型 | itemId, isEquipped |
| `Changelog.js` | 更新日志模型 | sha, message, commitType |
| `DebugAuth.js` | 调试授权模型 | code, userId, isUsed, expiresAt |

##### `src/routes/` - API 路由

| 文件 | 主要接口 |
|------|----------|
| `auth.js` | 登录、注册、Google 登录、邀请码验证、获取用户信息 |
| `user.js` | 用户资料、修改密码、删除账户、引导状态、用户名检查 |
| `persona.js` | 角色 CRUD、审核、搜索、守护、亲密关系、动态 |
| `room.js` | 房间 CRUD、消息、审核、撤回、删除、转让、@提及 |
| `pat.js` | 拍一拍（预设动作、自定义、发送） |
| `redeem.js` | 充值码创建、使用、列表、统计 |
| `admin.js` | 维护模式开关、管理员豁免、维护计划 |
| `diamond.js` | 钻石余额、每日签到 |
| `shop.js` | 商品列表、购买、装备、卸下 |
| `upload.js` | Cloudinary 图片上传/删除 |
| `translate.js` | 简繁转换、多语言翻译 |
| `ai.js` | AI 对话（DeepSeek） |
| `aiPersona.js` | AI 角色 CRUD |
| `post.js` | 帖子发布、点赞、删除 |
| `search.js` | 全局搜索 |
| `changelog.js` | GitHub 更新日志同步 |
| `linkPreview.js` | URL 元数据抓取 |
| `security.js` | 安全报告 |

##### `src/middleware/` - 中间件

| 文件 | 职责 |
|------|------|
| `securityMiddleware.js` | 安全中间件（限流、IP黑名单、注入检测、恶意UA、告警） |
| `securityLogger.js` | 安全日志记录 |
| `roleMiddleware.js` | 角色权限中间件（super_admin/owner/admin 检查） |
| `auditLog.js` | 审计日志 |
| `mentionHandler.js` | @提及处理中间件 |

##### `src/services/` - 业务服务

| 文件 | 职责 |
|------|------|
| `aiService.js` | DeepSeek API 调用 |
| `translateService.js` | 简繁转换 + 多语言翻译（Google Translate） |
| `discordAlert.js` | Discord Webhook 告警（安全、部署、反馈） |
| `uploadService.js` | Cloudinary 上传 |
| `contentFilter.js` | 脏话过滤 |
| `markdownService.js` | Markdown 解析 |

##### `src/scripts/` - 维护脚本

| 文件 | 职责 |
|------|------|
| `health-check.js` | 系统健康检查（数据库、API、性能） |
| `createAdmin.js` | 创建管理员账号 |
| `clean-db.js` | 清理数据库 |
| `init-shop.js` | 初始化商城商品 |
| `init-avatar-frames.js` | 初始化头像框商品 |
| `fix-room-owner.js` | 修复房间群主 |
| `fix-room.js` | 修复房间数据 |
| `fix-persona-data.js` | 修复角色数据 |
| `fix-global-numbers.js` | 修复全局编号 |
| `migrate-to-persona-rooms.js` | 迁移到角色房间 |
| `test-link-preview.js` | 测试链接预览 |
| `test-discord.js` | 测试 Discord Webhook |

##### `.github/workflows/` - GitHub Actions

| 文件 | 职责 |
|------|------|
| `discord-updates.yml` | 代码推送时发送 Discord 通知 |

---

## 🔗 关键数据流

### 1. 发送消息流程
用户点击回复按钮 → 设置 replyToMessage → 输入框显示回复预览 → 用户输入内容（可 @ 成员） → 前端解析 @ 提及 → 发送消息带 replyToId 和 mentions → 后端 mentionHandler 处理 → 保存消息到 MongoDB → 广播 new-message → 前端显示消息和引用内容，@ 成员高亮。

### 2. 消息撤回流程
用户右键/长按消息 → 选择撤回（5分钟内）→ 后端标记 isRecalled → 广播 message-recalled → 所有人看到撤回提示。

### 3. 消息删除流程
用户右键/长按消息 → 选择删除（仅自己）→ 后端标记 isDeleted → 仅删除者本人看不到。

### 4. AI 对戏流程
点击 AI 对戏 Tab → 加载默认 AI 角色 → 发送消息 → 调用 DeepSeek API → 返回带动作描写的回复。

### 5. 每日签到流程
打开签到面板 → GET 签到信息 → 点击领取 → POST 领取 → 计算连续奖励（5,5,8,8,10,15,20 循环）→ 更新钻石。

### 6. 角色切换流程
点击切换按钮 → 打开 PersonaSwitchPanel → 选择角色 → API 更新激活角色 → localStorage 保存 → 触发事件更新界面。

### 7. 头像上传流程
点击更换头像 → 选择图片 → 上传到 Cloudinary → 返回 URL → 更新数据库 → 刷新页面。

### 8. 头像框系统
购买头像框 → 装备到角色 → 显示时根据 frameId 应用配置（scale, offsetX, offsetY）→ 在头像周围显示。

### 9. @提及流程
用户在输入框输入 `@` → 弹出成员列表 → 选择成员 → 插入 `@用户名` → 发送时后端解析 mentions → 为被提及者创建通知 → 被提及者收到高亮消息。

### 10. 维护模式流程
管理员在设置面板开启维护模式 → 后端设置 SystemSettings → 所有非管理员请求返回 503 → Socket.IO 拒绝连接。

### 11. 拍一拍流程
双击头像 → 弹出拍一拍面板 → 选择预设动作或自定义 → 后端生成消息（格式：{actor} 动作 {target}）→ 保存为 isPat: true → 广播 → 前端显示 ✨ 样式。

### 12. 充值码流程
管理员创建充值码 → 用户在钱包输入充值码 → 后端验证 → 增加钻石 → 记录使用。

### 13. 新用户引导流程
注册成功 → 输入邀请码 → 引导页（用户名/昵称/生日）→ 创建角色 → 创建/加入群聊 → 进入聊天页。

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

# hCaptcha
HCAPTCHA_SECRET_KEY=your_hcaptcha_secret
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
- [x] **拍一拍功能（双击头像，预设+自定义动作）**

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
- [x] 所有头像显示位置统一使用 AvatarFrame

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
- [x] 钻石为主货币
- [x] 商城 + 背包
- [x] **充值码系统（管理员创建，用户兑换）**

#### 🔐 认证与安全
- [x] 邮箱密码登录 + 注册
- [x] Google OAuth 登录
- [x] 修改密码 + 删除账户
- [x] 邀请码机制
- [x] **安全中间件（限流、请求验证）**
- [x] **安全日志记录**
- [x] **Discord 告警（安全事件、部署通知等）**
- [x] **维护模式（管理员可开关，支持定时计划）**

#### 📱 布局与主题
- [x] 深色模式（仅 localStorage，无系统跟随）
- [x] 响应式布局（手机/平板/桌面）
- [x] 手机端底部 Tab（聊天/动态/主页）
- [x] 电脑端侧边栏 + 左下角色切换
- [x] 移动端键盘适配
- [x] 手机端动态页和主页美化

#### 🌐 翻译功能
- [x] 简繁转换（OpenCC）
- [x] 多语言翻译（Google Translate）
- [x] 消息内翻译按钮（悬停显示）
- [x] 设置中切换翻译目标语言

#### 💰 钱包系统
- [x] 钱包页面（余额、充值记录）
- [x] 充值码兑换
- [x] 管理员创建充值码（单个/批量）

#### 🎭 新用户引导
- [x] 引导流程（用户名/昵称/生日）
- [x] 角色创建引导
- [x] 群聊创建/加入引导

#### 📋 其他
- [x] 更新日志（自动同步 GitHub commits）
- [x] 隐私政策 + 服务条款页面
- [x] 全局搜索
- [x] GitHub Actions Discord 通知
- [x] Framer Motion 动画

### ⏳ 开发中
- [ ] 私聊功能（后端未完成）
- [ ] 消息搜索（全文搜索）
- [ ] 帖子评论功能
- [ ] 邮箱验证（需要邮件服务）

### ❌ 已放弃/删除
- [ ] 语音房（agoraService 已配置但未使用）
- [ ] Apple 登录（网页不支持）
- [ ] 金币作为主货币（改为钻石）
- [ ] 全局编号（改为只显示同名编号）

---

## 🗄️ 数据库模型关系

```
User (用户)
  ├── 1:N → Persona (角色)
  ├── 1:N → Room (创建的房间)
  ├── 1:N → Message (消息)
  ├── 1:N → Post (帖子)
  ├── 1:N → UserInventory (背包)
  ├── 1:N → AIPersona (AI角色)
  └── 1:N → RedemptionRecord (充值记录)

Persona (角色)
  ├── N:N → PersonaRoom (加入的房间)
  ├── 1:N → Message (发送的消息)
  └── 1:N → Post (发布的帖子)

Room (房间)
  ├── 1:N → Message (房间消息)
  └── 1:N → PersonaRoom (成员)

Message (消息)
  └── 自关联 → replyTo (回复)

ShopItem (商品)
  └── 1:N → UserInventory (库存)

SystemSettings (系统设置)
  └── 单例模式 (key-value)

Title (头衔)
  └── N:1 → Room (所属房间)
```

---

## 🔌 Socket.IO 事件列表

### 客户端发送

| 事件 | 数据 | 说明 |
|------|------|------|
| `join-room` | `{ roomId, userId, personaId }` | 加入聊天室 |
| `leave-room` | `{}` | 离开聊天室 |
| `send-message` | `{ roomId, userId, personaId, content, isAction, replyToId, mentions }` | 发送消息 |
| `switch-persona` | `{ userId, newPersonaId }` | 切换角色 |
| `pong` | `{}` | 心跳响应 |

### 服务端发送

| 事件 | 数据 | 说明 |
|------|------|------|
| `connected` | `{ id, timestamp }` | 连接成功 |
| `ping` | `{}` | 心跳检测 |
| `new-message` | `Message` | 新消息 |
| `message-recalled` | `{ messageId, recalledByName }` | 消息被撤回 |
| `message-deleted` | `{ messageId }` | 消息被删除 |
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
> 4. 动画使用 Framer Motion，类型需要 `as const`
> 
> ### 关键配置位置：
> 
> | 配置项 | 文件位置 |
> |--------|----------|
> | 头像框配置 | `AvatarFrame.tsx` 的 `frameAdjustments` |
> | Cloudinary | `CLOUDINARY_URL` 环境变量 |
> | DeepSeek API | `aiService.js` |
> | Socket.IO | `app.js` + `socket.ts` |
> | 路由守卫 | `App.tsx` + `api.ts` 401 拦截 |
> | Discord 告警 | `discordAlert.js` + 环境变量 |
> | 维护模式 | `admin.js` + `SystemSettings` 模型 |
> | 提及处理 | `mentionHandler.js` 中间件 |
> | 头衔系统 | `title.js` 路由 + `Title` 模型 |
> | 群组权限 | `useGroupPermission.ts` Hook |
> | 拍一拍 | `pat.js` + `PatPanel.tsx` |
> | 充值码 | `redeem.js` + `Wallet.tsx` |
> | 翻译 | `translateService.js` + `TranslatableMessage.tsx` |
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
> - 钱包：`/wallet`
> 
> ### 维护模式：
> 
> - 管理员在 `/settings` 中开启/关闭
> - 开启后普通用户无法访问任何 API 和 WebSocket
> - 支持定时维护计划
> 
> ### 新用户引导流程：
> 
> 注册 → 邀请码 → `/onboarding`（填信息）→ 创建角色 → 创建/加入群聊 → `/chat`

---

## 📅 最后更新记录

| 日期 | 更新内容 |
|------|----------|
| 2026-05-28 | **拍一拍功能**（双击头像，预设/自定义动作）；**充值码系统**（钱包页面）；**多语言翻译**（Google Translate，消息内翻译）；**新用户引导流程**；**全局编号移除**（只保留同名编号）；**定时维护计划**；**动画优化**（Framer Motion）；**安全中间件优化**（翻译接口白名单） |
| 2026-05-27 | **管理员豁免选项**；**头像上传优化**；**PersonaManager 头像显示**；**动态功能修复** |
| 2026-05-26 | **头像框系统集成**；**安全系统**；**认证升级**；**@提及功能**；**头衔系统**；**群组管理修复** |
| 2026-05-23 | 修复头像上传（Cloudinary），完善头像框系统 |
| 2026-05-22 | 完成头像框功能、角色切换面板、手机端重构 |
| 2026-05-21 | 完成 AI 对戏模块、商城系统、帖子系统、每日签到 |
| 2026-05-18 | 完成消息回复、撤回、删除功能 |

---

*本文档由 AI 维护，每次重要更新后请同步更新*
```

这个完整版文档包含了：
- 所有前端文件的详细说明（包括新增的 wallet、onboarding、pat 等）
- 所有后端模型的详细说明（包括新增的 RedeemCode、RedemptionRecord、MaintenanceSchedule 等）
- 所有 API 路由的说明
- 所有中间件和服务的说明
- 完整的功能清单
- 数据库模型关系图
- Socket.IO 事件列表
- AI 维护指南（含所有关键配置位置）