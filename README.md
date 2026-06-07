以下是合并后的完整项目文档，根据 `structure.txt` 验证了所有文件的存在性，并整合了全部功能模块。

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
| 其他服务 | Cloudinary（图片/音频上传）、DeepSeek（AI对话）、YouTube API（音乐搜索）、Discord Webhook（告警） |

---

## 📂 完整文件结构

### 🎨 前端结构 (`client/`)

#### 配置文件（根目录）

| 文件 | 职责 |
|------|------|
| `package.json` | 项目依赖和脚本 |
| `vite.config.ts` | Vite 构建配置 |
| `tsconfig.json` | TypeScript 主配置 |
| `tsconfig.app.json` | 应用 TS 配置 |
| `tsconfig.node.json` | Node.js 环境 TypeScript 配置 |
| `tailwind.config.cjs` | TailwindCSS 配置 |
| `postcss.config.cjs` | PostCSS 配置 |
| `eslint.config.js` | ESLint 代码检查 |
| `vercel.json` | Vercel 部署配置 |
| `index.html` | HTML 入口文件 |
| `.gitattributes` | Git LFS 配置（大文件存储） |
| `.gitignore` | Git 忽略文件 |
| `README.md` | 项目说明文档 |

#### `public/` - 静态资源

| 文件/目录 | 职责 |
|-----------|------|
| `favicon.svg` | 网站图标 |
| `fonts/MaokenZhuyuanTi.ttf` | 猫啃珠圆体字体（全局使用） |
| `frames/cat.png` | 猫猫头像框 |
| `frames/demon.png` | 恶魔头像框 |
| `frames/purple.png` | 紫色头像框 |
| `frames/star.png` | 星星头像框 |
| `frames/star1.png` | 星星头像框变体 |
| `wallpapers/desktop/desktop_1~7.mp4` | 电脑端 AFK 壁纸（已废弃，改用 GitHub Releases） |
| `wallpapers/mobile/mobile_1~2.mp4` | 手机端 AFK 壁纸（已废弃） |

> **注意**：由于 Vercel 部署限制（单文件最大 50MB），视频壁纸现已通过 GitHub Releases + jsDelivr CDN 托管。

#### `src/` - 源代码

##### 入口文件

| 文件 | 职责 |
|------|------|
| `main.tsx` | React 渲染入口，导入全局样式 |
| `App.tsx` | 应用根组件 + 路由配置 + 维护模式检测 + AFK 上下文 + FriendProvider |
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
| `/settings` | `Settings` | 账号设置 |
| `/search` | `SearchPage` | 全局搜索 |
| `/changelog` | `Changelog` | 更新日志 |
| `/feed` | `MobileFeed` | 动态页（手机） |
| `/home` | `MobileHome` | 主页（手机） |
| `/shop` | `Shop` | 商城 |
| `/inventory` | `Inventory` | 背包 |
| `/wallet` | `Wallet` | 钱包 |
| `/emojis` | `EmojiManager` | 表情管理 |
| `/onboarding` | `OnboardingWizard` | 新用户引导 |
| `/privacy` | `PrivacyPolicy` | 隐私政策 |
| `/terms` | `TermsOfService` | 服务条款 |
| `/group/:roomId` | `GroupDetail` | 群聊详情页 |
| `/group/:roomId/settings` | `GroupSettings` | 群聊设置 |
| `/room/:roomId/members` | `RoomMembers` | 房间成员列表 |
| `/room/:roomId/pending` | `PendingRequests` | 入群申请审核 |

---

##### `src/components/` - 组件目录

**`components/admin/` - 管理员组件**

| 文件 | 职责 |
|------|------|
| `CreateInvite.tsx` | 创建邀请码 |
| `CreateRedeemCode.tsx` | 创建充值码 |
| `MaintenanceControl.tsx` | 维护模式控制 |
| `MaintenanceScheduler.tsx` | 定时维护计划 |

**`components/auth/` - 认证组件**

| 文件 | 职责 |
|------|------|
| `InviteCode.tsx` | 邀请码验证页面 |
| `Login.tsx` | 登录表单（邮箱/Google） |
| `LoginNew.tsx` | 新版登录页面 |
| `Register.tsx` | 注册表单 |

---

**`components/chat/` ⭐ 核心聊天功能**

| 文件 | 职责 |
|------|------|
| `AIChat.tsx` | AI 聊天弹窗 |
| `AIChatRoom.tsx` | AI 对戏主界面 |
| `AISettings.tsx` | AI 角色设置 |
| **`ChatHome.tsx`** | **聊天主界面（群聊/私聊/AI对戏 Tab），支持消息分页、语音、音乐、红包、礼物** |
| **`ChatInput.tsx`** | **消息输入框（表情、@提及、录音、音乐、礼物、红包）** |
| `CreateRoom.tsx` | 创建群聊 |
| `GroupDetail.tsx` | 群聊详情页 |
| `GroupSettings.tsx` | 群聊设置（头衔管理） |
| `JoinRoom.tsx` | 加入群聊 |
| `LinkPreviewCard.tsx` | 链接预览卡片 |
| `LinkPreviewContainer.tsx` | 链接预览容器 |
| `MessageBubble.tsx` | 消息气泡组件 |
| `PatPanel.tsx` | 拍一拍面板 |
| `PendingRequests.tsx` | 入群申请审核 |
| `PrivateChat.tsx` | 私聊功能 |
| `RoomMembers.tsx` | 房间成员列表 |
| `RoomSettings.tsx` | 房间设置 |
| **`TranslatableMessage.tsx`** | **消息渲染（文字/语音/音乐/红包/礼物/表情）** |
| `UserPersonaSettings.tsx` | 用户角色设置（AI 用） |
| `AudioPlayer.tsx` | 音频播放器 |
| `AudioRecorderButton.tsx` | 长按录音按钮 |
| `MusicCard.tsx` | 音乐卡片 |
| `MusicSearchModal.tsx` | 音乐搜索弹窗 |

---

**`components/common/` - 通用组件**

| 文件 | 职责 |
|------|------|
| **`AFKScreen.tsx`** | **AFK 隐私保护遮挡屏幕** |
| **`AvatarFrame.tsx`** | **头像框显示组件** |
| **`AvatarUpload.tsx`** | **头像上传弹窗** |
| `Changelog.tsx` | 更新日志展示 |
| `ConnectionStatus.tsx` | 连接状态指示器 |
| `ContextMenu.tsx` | 右键菜单 |
| **`DraggableAFKStatus.tsx`** | **可拖拽橙色锁头控制面板** |
| `EmojiPicker.tsx` | 表情选择器 |
| `GlassDatePicker.tsx` | 毛玻璃日期选择器 |
| `LinkCard.tsx` | 链接卡片 |
| `MaintenancePage.tsx` | 维护模式页面 |
| `NotificationSettings.tsx` | 通知设置 |
| **`PersonaSwitchPanel.tsx`** | **角色切换弹窗** |
| `SearchPage.tsx` | 全局搜索页面 |

---

**`components/debug/` - 调试组件**

| 文件 | 职责 |
|------|------|
| `DebugPanel.tsx` | 调试面板（开发环境） |

**`components/diamond/` - 钻石系统**

| 文件 | 职责 |
|------|------|
| `DailyDiamond.tsx` | 每日签到 |
| `DiamondBalance.tsx` | 钻石余额显示 |

**`components/emoji/` - 表情包系统**

| 文件 | 职责 |
|------|------|
| `EmojiManager.tsx` | 表情管理页面 |
| `EmojiMessage.tsx` | 表情消息渲染 |
| `EmojiPicker.tsx` | 表情选择器 |
| `EmojiUploader.tsx` | 表情上传组件 |

**`components/feed/` - 动态页面**

| 文件 | 职责 |
|------|------|
| `MobileFeed.tsx` | 手机端动态页 |

**`components/friends/` - 好友系统**

| 文件 | 职责 |
|------|------|
| `AddFriendModal.tsx` | 添加好友弹窗 |
| `FriendList.tsx` | 好友列表 |
| `FriendRequests.tsx` | 好友申请列表 |

**`components/gift/` - 礼物系统**

| 文件 | 职责 |
|------|------|
| `GiftMessage.tsx` | 礼物消息卡片 |
| `GiftModal.tsx` | 赠送礼物弹窗 |

**`components/guardian/` - 守护系统**

| 文件 | 职责 |
|------|------|
| `GuardianRanking.tsx` | 守护榜组件 |

**`components/home/` - 手机端主页**

| 文件 | 职责 |
|------|------|
| `MobileHome.tsx` | 手机端主页 |

**`components/inventory/` - 背包系统**

| 文件 | 职责 |
|------|------|
| `Inventory.tsx` | 背包页面 |

**`components/layout/` - 布局组件**

| 文件 | 职责 |
|------|------|
| `DesktopLayout.tsx` | 桌面端布局 |
| `MobileLayout.tsx` | 移动端布局 |
| `TabletLayout.tsx` | 平板端布局 |

**`components/legal/` - 法律页面**

| 文件 | 职责 |
|------|------|
| `PrivacyPolicy.tsx` | 隐私政策 |
| `TermsOfService.tsx` | 服务条款 |

**`components/onboarding/` - 新用户引导**

| 文件 | 职责 |
|------|------|
| `OnboardingComplete.tsx` | 完成引导 |
| `OnboardingPersona.tsx` | 创建角色引导 |
| `OnboardingProfile.tsx` | 填写资料引导 |
| `OnboardingRoom.tsx` | 创建群聊引导 |
| `OnboardingWizard.tsx` | 引导流程控制器 |

**`components/persona/` ⭐ 角色系统**

| 文件 | 职责 |
|------|------|
| `PersonaCreate.tsx` | 创建角色（头像必填、标签验证） |
| `PersonaDetail.tsx` | 角色详情页（皮主页） |
| `PersonaEquipments.tsx` | 角色装备显示 |
| `PersonaGuardianList.tsx` | 守护榜 |
| `PersonaList.tsx` | 角色列表 |
| `PersonaManager.tsx` | 角色管理主页（含审核） |
| `PersonaPosts.tsx` | 角色动态 |
| `PersonaRelationships.tsx` | 亲密关系 |
| `PersonaSearch.tsx` | 角色搜索 |

**`components/profile/` - 用户资料**

| 文件 | 职责 |
|------|------|
| `Profile.tsx` | 用户资料页面 |

**`components/redpacket/` - 红包系统**

| 文件 | 职责 |
|------|------|
| `RedPacketDetail.tsx` | 红包详情/抢红包弹窗 |
| `RedPacketMessage.tsx` | 红包消息卡片 |
| `RedPacketModal.tsx` | 发红包弹窗 |

**`components/settings/` - 设置页面**

| 文件 | 职责 |
|------|------|
| `Settings.tsx` | 应用设置（账号/偏好/管理面板） |

**`components/shop/` - 商城**

| 文件 | 职责 |
|------|------|
| `Shop.tsx` | 商城页面（含赠送按钮） |

**`components/user/` - 用户相关**

| 文件 | 职责 |
|------|------|
| `UserList.tsx` | 用户列表 |

**`components/wallet/` - 钱包系统**

| 文件 | 职责 |
|------|------|
| `RedeemModal.tsx` | 充值码输入弹窗 |
| `RedemptionHistory.tsx` | 充值记录 |
| `TransactionHistory.tsx` | 交易流水 |
| `Wallet.tsx` | 钱包主页 |

---

##### `src/contexts/`

| 文件 | 职责 |
|------|------|
| `AFKContext.tsx` | AFK 状态管理 |
| `FriendContext.tsx` | 好友状态管理 |
| `ThemeContext.tsx` | 深色/浅色模式 |

##### `src/hooks/`

| 文件 | 职责 |
|------|------|
| `useAFK.ts` | AFK 相关 Hook |
| `useDebounce.ts` | 防抖 |
| `useFont.ts` | 字体加载 |
| `useGroupPermission.ts` | 群组权限 |
| `useKeyboardHeight.ts` | 键盘高度检测 |
| `useLongPress.ts` | 长按事件 |
| `useMediaSession.ts` | 媒体会话 |
| `usePermissions.ts` | 权限检查 |
| `useQuickSwitchPersona.ts` | Tab 键切换角色 |
| `useResponsive.ts` | 响应式断点 |
| `useUnreadCount.ts` | 未读消息计数 |

##### `src/services/`

| 文件 | 职责 |
|------|------|
| **`api.ts`** | **API 调用封装（核心）** |
| `agoraService.ts` | 声网语音（已放弃） |
| `audioRecorderService.ts` | 录音核心服务 |
| `diamondApi.ts` | 钻石系统 API |
| `emojiApi.ts` | 表情 API |
| `friendApi.ts` | 好友 API |
| `giftApi.ts` | 礼物 API |
| `guardianApi.ts` | 守护榜 API |
| `linkPreviewApi.ts` | 链接预览 API |
| `Notification.ts` | 浏览器通知 |
| `redpacketApi.ts` | 红包 API |
| `socket.ts` | Socket.IO 连接管理 |
| `transactionApi.ts` | 交易 API |
| `translateApi.ts` | 简繁转换 API |

##### `src/types/`

| 文件 | 职责 |
|------|------|
| `ai.ts` | AI 角色类型 |
| `gift.ts` | 礼物/红包类型 |

##### `src/utils/`

| 文件 | 职责 |
|------|------|
| `antiDebug.ts` | 反调试工具 |
| `linkParser.ts` | URL 解析 |
| `renderMarkdown.ts` | Markdown 渲染 |
| `timeFormat.ts` | 时间格式化 |

##### `src/firebase/`

| 文件 | 职责 |
|------|------|
| `config.ts` | Firebase 配置 |

##### `src/animations/`

| 文件 | 职责 |
|------|------|
| `variants.ts` | Framer Motion 动画变体 |

---

### ⚙️ 后端结构 (`server/`)

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

##### 入口文件

| 文件 | 职责 |
|------|------|
| **`app.js`** | **Express 入口 + Socket.IO 配置 + 路由注册** |

##### `src/models/` - 数据模型（共 28 个模型）

| 模型 | 职责 | 关键字段 |
|------|------|----------|
| `User.js` | 用户模型 | username, email, password, diamonds, paidDiamonds, freeDiamonds, role |
| `Persona.js` | 角色模型 | name, displayName, description, avatar, userId, status, sameNameNumber, tags |
| `Room.js` | 房间模型 | name, description, createdBy, members |
| **`Message.js`** | **消息模型** | content, isAudio, audioUrl, audioDuration, musicData, isRedPacket, redPacketId, isGift, giftData, isEmoji, emojiId |
| `Friend.js` | 好友关系 | personaId, friendPersonaId |
| `FriendRequest.js` | 好友申请 | fromPersonaId, toPersonaId, status, reason |
| `InviteCode.js` | 邀请码 | code, type, createdBy, usedBy, expiresAt |
| `RedeemCode.js` | 充值码 | code, diamondAmount, createdBy, isUsed |
| `RedemptionRecord.js` | 充值记录 | userId, redeemCodeId, code, diamondAmount |
| **`TransactionRecord.js`** | **交易流水** | userId, type, amount, paidAmount, freeAmount, balanceAfter, relatedId |
| `SystemSettings.js` | 系统设置 | key, value |
| `MaintenanceSchedule.js` | 维护计划 | name, startTime, endTime, isActive |
| `Title.js` | 头衔 | name, roomId, assignedTo |
| `ActivePersona.js` | 激活角色 | userId, personaId |
| `PersonaRoom.js` | 角色-房间关联 | personaId, roomId |
| `AIPersona.js` | AI 角色 | name, personality, replyStyle |
| `Post.js` | 帖子 | content, images, likes |
| `ShopItem.js` | 商城商品 | name, type, price, isGiftable, guardValue |
| `UserInventory.js` | 用户库存 | itemId, isEquipped |
| `Changelog.js` | 更新日志 | sha, message, commitType |
| `DebugAuth.js` | 调试授权 | code, userId |
| **`UserEmoji.js`** | **用户表情** | userId, url, usageCount, groupId, tags |
| **`EmojiCategory.js`** | **表情分组** | userId, name, emojiIds |
| **`GiftRecord.js`** | **礼物记录** | fromPersonaId, toPersonaId, itemId, diamondAmount, guardValue |
| **`RedPacket.js`** | **红包** | senderId, type, totalAmount, count, remainingAmount, message |
| **`RedPacketRecord.js`** | **红包领取记录** | redPacketId, receiverId, amount |
| `AuditLog.js` | 审计日志 | userId, action, details |
| `VoiceRoom.js` | 语音房 | creatorId, memberCount |
| `UserPersonaForAI.js` | AI 用户角色 | name, description |
| `UserReadRecord.js` | 阅读记录 | lastReadAt |

##### `src/routes/` - API 路由（共 25 个路由）

| 文件 | 主要接口 |
|------|----------|
| `auth.js` | 登录、注册、Google 登录、邀请码 |
| `user.js` | 用户资料、修改密码、删除账户 |
| `persona.js` | 角色 CRUD、审核、搜索、守护 |
| `room.js` | 房间 CRUD、消息分页、撤回、删除、@提及 |
| `pat.js` | 拍一拍 |
| `redeem.js` | 充值码 |
| `admin.js` | 维护模式 |
| `diamond.js` | 钻石余额、签到、交易流水 |
| `shop.js` | 商品、购买、装备 |
| `upload.js` | Cloudinary 图片/音频上传 |
| `translate.js` | 简繁转换、多语言翻译 |
| `ai.js` | AI 对话 |
| `aiPersona.js` | AI 角色 CRUD |
| `post.js` | 帖子 |
| `search.js` | 全局搜索 |
| `changelog.js` | 更新日志同步 |
| `linkPreview.js` | 链接预览 |
| `security.js` | 安全报告 |
| **`friend.js`** | **好友 API** |
| **`privateChat.js`** | **私聊 API** |
| **`music.js`** | **音乐搜索（YouTube + Bilibili）** |
| **`youtube.js`** | **YouTube 视频详情** |
| **`emoji.js`** | **表情 API（上传、删除、分组、举报）** |
| **`gift.js`** | **礼物 API** |
| **`redpacket.js`** | **红包 API** |
| **`guardian.js`** | **守护榜 API** |
| `voice.js` | 语音房 |

##### `src/middlewares/` - 中间件

| 文件 | 职责 |
|------|------|
| `auditLog.js` | 审计日志 |
| `mentionHandler.js` | @提及处理 |
| `roleMiddleware.js` | 角色权限 |
| `securityLogger.js` | 安全日志 |
| `securityMiddleware.js` | 安全中间件（限流、IP黑名单） |

##### `src/services/` - 业务服务

| 文件 | 职责 |
|------|------|
| `aiService.js` | DeepSeek API |
| `api.ts` | API 类型定义 |
| `cardService.js` | 卡片服务 |
| `contentFilter.js` | 脏话过滤 |
| **`diamondService.js`** | **钻石服务（含交易记录）** |
| `discordAlert.js` | Discord 告警 |
| `linkService.js` | 链接处理 |
| `markdownService.js` | Markdown 解析 |
| **`redpacketExpireService.js`** | **红包过期检查服务** |
| `securityReport.js` | 安全报告 |
| `translateService.js` | 翻译服务 |
| `uploadService.js` | Cloudinary 上传 |
| `verificationCode.js` | 验证码服务 |

##### `src/utils/` - 工具函数

| 文件 | 职责 |
|------|------|
| **`socketHelper.js`** | **Socket 通知辅助函数（emitToUser, emitToRoom）** |

##### `src/scripts/` - 维护脚本

| 文件 | 职责 |
|------|------|
| `backup.js` | 数据库备份 |
| `clean-db.js` | 清理数据库 |
| `clear-diamonds.js` | 清空钻石 |
| `createAdmin.js` | 创建管理员 |
| `fix-global-numbers.js` | 修复全局编号 |
| `fix-issues.js` | 修复问题 |
| `fix-paid-diamonds.js` | 修复付费钻石 |
| `fix-persona-data-raw.js` | 修复角色数据（原始） |
| `fix-persona-data.js` | 修复角色数据 |
| `fix-room-owner.js` | 修复房间群主 |
| `fix-room.js` | 修复房间 |
| `health-check.js` | 健康检查 |
| `init-global-numbers.js` | 初始化全局编号 |
| `initAvatarFrames.js` | 初始化头像框 |
| `initNewFrames.js` | 初始化新头像框 |
| `initShop.js` | 初始化商城 |
| `migrate-persona.js` | 角色数据迁移 |
| `migrate-to-persona-rooms.js` | 迁移到角色房间 |
| `refund-expired-redpackets.js` | 退款过期红包 |
| `restore-transactions.js` | 恢复交易流水 |
| `test-discord.js` | 测试 Discord |
| `test-link-preview.js` | 测试链接预览 |

##### `.github/workflows/` - GitHub Actions

| 文件 | 职责 |
|------|------|
| `backup.yml` | 数据库备份工作流 |
| `discord.yml` | Discord 通知工作流 |

---

## 🔗 关键数据流

### 1. 发送消息流程
用户输入内容（可 @ 成员）→ 前端解析 @ 提及 → 发送消息 → 后端 mentionHandler 处理 → 保存到 MongoDB → 广播 new-message

### 2. 语音消息流程
用户长按录音按钮 → 录音中 → 松手 → 上传音频到 Cloudinary → Socket 发送消息（含 audioUrl）→ 广播 → 接收方显示音频播放器

### 3. 音乐分享流程
点击音乐按钮 → 选择平台（YouTube/Bilibili）→ 搜索 → 选择歌曲 → 获取详情 → Socket 发送 JSON 消息 → 广播 → 渲染 MusicCard

### 4. 红包流程
发红包（随机/固定/个人）→ 聊天显示红包卡片 → 用户点击抢红包 → 后端验证 → 增加钻石 → 记录领取 → 手气最佳标记

### 5. 礼物流程
商城选择商品 → 点击赠送 → 选择好友 → 扣钻石 → 发送礼物消息 → 增加对方守护值 → 更新守护榜

### 6. 表情包流程
上传表情（单张/批量）→ Cloudinary 压缩转 WebP → 保存到用户表情库 → 聊天时选择发送 → 使用次数 +1

### 7. 好友系统流程
搜索角色 → 填写申请理由 → 发送申请 → Socket 通知对方 → 同意/拒绝 → 创建好友关系 → 可私聊

### 8. AFK 隐私保护流程
用户无操作 5 分钟 → 进入 AFK 模式 → 播放动态壁纸 → 双视频层无缝循环 → 橙色锁头控制面板

### 9. 角色系统流程（新版）
用户申请创建角色 → 管理员审核 → 通过后直接归属于申请人 → 计算同名编号（已批准数量+1）→ 无全局编号

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

# YouTube API（音乐搜索）
YOUTUBE_API_KEY=your_youtube_api_key

# Discord 告警
DISCORD_WEBHOOK_SECURITY=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK_DEPLOY=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK_FEEDBACK=https://discord.com/api/webhooks/...

# hCaptcha
HCAPTCHA_SECRET_KEY=your_hcaptcha_secret
```

---

## 🚀 部署信息

| 服务 | 平台 | 地址 |
|------|------|------|
| 前端 | Vercel | https://rp-chat-v1-0.vercel.app |
| 后端 | Render | https://rp-chatv1-0.onrender.com |

---

## 📝 功能清单

### ✅ 核心聊天
- [x] 消息发送/接收（Socket.IO 实时）
- [x] 消息回复、撤回、删除
- [x] 动作扮演（`/me` 命令）
- [x] 简繁转换 + 表情选择器
- [x] @提及功能
- [x] 拍一拍功能
- [x] 消息分页加载
- [x] 消息去重优化

### 🎙️ 语音消息系统
- [x] 长按录音按钮（上滑取消、时长限制）
- [x] 音频播放器（播放/暂停、进度条）
- [x] Cloudinary 音频上传（MP3 转码）

### 🎵 音乐分享系统
- [x] YouTube + Bilibili 双平台搜索
- [x] 音乐卡片 + 嵌入播放器
- [x] 播放失败降级

### 😀 表情包系统
- [x] 单张/批量上传（最多10张）
- [x] 自动压缩转 WebP
- [x] 分组管理、收藏功能
- [x] 使用统计、搜索、举报

### 🎁 礼物/红包/守护系统
- [x] 赠送礼物、守护值计算
- [x] 全站守护榜、角色守护者列表
- [x] 随机/固定/个人三种红包
- [x] 红包过期自动退款
- [x] 充值钻石/免费钻石分类

### 👤 角色系统
- [x] 角色创建/编辑/删除
- [x] 审核机制（申请 → 审核 → 归属）
- [x] 同名编号（只计算已批准）
- [x] 头像必填、标签限制
- [x] 角色搜索（只能查看他人角色）

### 👥 好友系统
- [x] 角色间添加好友
- [x] 好友申请 Socket 通知
- [x] 同意/拒绝/删除好友
- [x] 角色间私聊（需好友关系）

### 🛡️ AFK 隐私保护系统
- [x] 5分钟自动进入
- [x] 全屏动态壁纸（电脑7个/手机2个）
- [x] 双视频层无缝切换
- [x] 可拖拽橙色锁头控制面板
- [x] 功能菜单（暂停/循环/跳过/解锁）

### 💎 经济系统
- [x] 每日签到（循环奖励）
- [x] 充值码系统
- [x] 交易流水记录
- [x] 商城 + 背包 + 头像框

### 🔐 认证与安全
- [x] 邮箱密码登录 + Google 登录
- [x] 邀请码机制
- [x] 安全中间件（限流、IP黑名单）
- [x] Discord 告警
- [x] 维护模式

### 📱 布局与主题
- [x] 深色模式
- [x] 响应式布局（手机/平板/桌面）
- [x] 手机端底部 Tab（聊天/动态/主页）

---

## 🗄️ 数据库模型关系

```
User (用户)
  ├── 1:N → Persona (角色)
  ├── 1:N → Room (创建的房间)
  ├── 1:N → Message (消息)
  ├── 1:N → Post (帖子)
  ├── 1:N → UserInventory (背包)
  ├── 1:N → UserEmoji (表情)
  ├── 1:N → EmojiCategory (表情分组)
  ├── 1:N → RedemptionRecord (充值记录)
  ├── 1:N → TransactionRecord (交易流水)
  ├── 1:N → GiftRecord (送出的礼物)
  ├── 1:N → RedPacket (发送的红包)
  └── 1:N → RedPacketRecord (抢到的红包)

Persona (角色)
  ├── N:N → PersonaRoom (加入的房间)
  ├── 1:N → Message (发送的消息)
  ├── 1:N → Post (发布的帖子)
  ├── N:N → Friend (好友关系)
  ├── N:N → FriendRequest (好友申请)
  ├── 1:N → GiftRecord (收到的礼物)
  └── 1:N → RedPacketRecord (抢到的红包)

Room (房间)
  ├── 1:N → Message (房间消息)
  ├── 1:N → PersonaRoom (成员)
  ├── 1:N → Title (头衔)
  └── 1:N → RedPacket (房间红包)

Message (消息)
  ├── 自关联 → replyTo (回复)
  ├── 字段 → isAudio, audioUrl, audioDuration
  ├── 字段 → musicData
  ├── 字段 → isRedPacket, redPacketId
  ├── 字段 → isGift, giftData
  └── 字段 → isEmoji, emojiId

ShopItem (商品)
  ├── 1:N → UserInventory (库存)
  └── 1:N → GiftRecord (礼物记录)

RedPacket (红包)
  └── 1:N → RedPacketRecord (领取记录)
```

---

## 🔌 Socket.IO 事件列表

### 客户端发送

| 事件 | 数据 | 说明 |
|------|------|------|
| `join-room` | `{ roomId, userId, personaId }` | 加入聊天室 |
| `leave-room` | `{}` | 离开聊天室 |
| `send-message` | `{ roomId, userId, personaId, content, replyToId, mentions, isAudio, audioUrl, audioDuration, musicData, isRedPacket, redPacketData, isGift, giftData, isEmoji, emojiId }` | 发送消息 |
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
| `persona-switched` | `{ userId, newPersonaId }` | 角色切换通知 |
| `friend-request-received` | `{ request }` | 好友申请通知 |
| `friend-request-updated` | `{ requestId, status }` | 好友申请状态更新 |
| `redpacket-received` | `{ redPacketId }` | 新红包通知 |

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
> | 头像框配置 | `AvatarFrame.tsx` 的 `frameAdjustments` |
> | AFK 配置 | `AFKContext.tsx` 的 `AFK_CONFIG` |
> | 语音消息 | `AudioRecorderButton.tsx` + `audioRecorderService.ts` |
> | 音乐分享 | `MusicSearchModal.tsx` + `music.js` |
> | 表情包 | `EmojiManager.tsx` + `emoji.js` |
> | 红包系统 | `redpacket.js` + `redpacketExpireService.js` |
> | 礼物系统 | `gift.js` + `diamondService.js` |
> | 好友系统 | `FriendContext.tsx` + `friend.js` |
> | 钻石交易 | `TransactionRecord.js` + `diamondService.js` |
> | 角色系统 | `Persona.js` + `persona.js` |
> | Socket 通知 | `socketHelper.js` |
> 
> ### 手机端路由：
> 
> | Tab | 路由 |
> |-----|------|
> | 聊天 | `/chat` |
> | 动态 | `/feed` |
> | 主页 | `/home` |

---

## 📅 最后更新记录

| 日期 | 更新内容 |
|------|----------|
| **2026-06-06** | **角色系统重构**：审核机制、同名编号计算、头像必填、标签限制、删除全局编号；**钻石交易系统**：交易流水记录、收入/支出统计 |
| **2026-06-05** | **红包系统**：随机/固定/个人红包、24小时过期退款、红包卡片；**礼物系统**：赠送礼物、守护值、守护榜 |
| **2026-06-04** | **表情包系统**：批量上传、分组管理、收藏、搜索、举报；**语音消息系统**；**音乐分享系统** |
| 2026-06-03 | 好友系统完整实现 |
| 2026-05-31 | AFK 系统完整重构 v2.0 |
| 2026-05-30 | AFK 隐私保护系统 |
| 2026-05-28 | 拍一拍、充值码、多语言翻译 |
| 2026-05-27 | 管理员豁免、头像上传优化 |
| 2026-05-26 | 头像框系统、安全系统、@提及 |
| 2026-05-23 | 修复头像上传 |
| 2026-05-22 | 头像框功能、手机端重构 |
| 2026-05-21 | AI 对戏、商城、帖子、签到 |
| 2026-05-18 | 消息回复、撤回、删除 |

---

### ⚠️ 当前已知问题

| 问题 | 严重程度 | 说明 |
|------|----------|------|
| 部分手机浏览器视频无法自动播放 | 🔴 高 | 需要用户首次交互后播放 |
| AFK 状态切换时短暂空白 | 🟡 中 | 已优化但未完全解决 |
| 手机端视频可能卡顿 | 🟡 中 | 大文件在低端手机上可能播放不流畅 |

---

*本文档由 AI 维护，每次重要更新后请同步更新*
```

以上是合并后的完整项目文档，已根据 `structure.txt` 验证了所有文件的存在性，并整合了以下所有功能模块：

- **表情包系统**：上传、分组、收藏、搜索、举报
- **礼物/红包/守护系统**：三种红包、礼物赠送、守护值、守护榜
- **角色系统重构**：审核机制、同名编号、头像必填、标签限制
- **钻石交易系统**：交易流水、收入/支出统计
- **语音消息系统**：长按录音、音频播放器
- **音乐分享系统**：YouTube + Bilibili 双平台
- **好友系统**：角色间好友、私聊
- **AFK 系统**：隐私保护、动态壁纸
- 所有历史功能（头像框、安全系统、@提及、头衔、充值码等）