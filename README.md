# 万物阁 - 项目上下文文档（精简协作版）

> 🤖 **AI 维护提示**：本文档记录核心架构、文件职责和项目状态。  
> **每次更新代码后，请同步更新「最后更新记录」**。

---

## 📌 项目概览

| 项目 | 说明 |
|------|------|
| 名称 | 万物阁（OmniGe） |
| 类型 | 角色扮演聊天室 + 墨香阁小说平台 + AI 对戏 |
| 前端 | React 18 + TypeScript + TailwindCSS + Vite + Framer Motion |
| 后端 | Node.js + Express + MongoDB + Socket.IO |
| 部署 | 前端 Vercel / 后端 Render |
| 其他服务 | Cloudinary（图片/音频上传）、**Gemini（AI对话 + 歌词清洗）**、YouTube API（音乐搜索）、Discord Webhook（告警） |

---

## 📂 前端文件及职责 (`client/src/`)

### 入口文件
| 文件 | 职责 |
|------|------|
| `main.tsx` | React 渲染入口 |
| `App.tsx` | 根组件 + 路由配置（含所有小说路由） |
| `App.css` / `index.css` | 全局样式 |

### 组件 (`components/`)

#### `components/admin/` - 管理员
| 文件 | 职责 |
|------|------|
| `CreateInvite.tsx` | 创建邀请码 |
| `CreateRedeemCode.tsx` | 创建充值码 |
| `MaintenanceControl.tsx` | 维护模式控制 |
| `MaintenanceScheduler.tsx` | 定时维护计划 |

#### `components/auth/` - 认证
| 文件 | 职责 |
|------|------|
| `InviteCode.tsx` | 邀请码验证 |
| `Login.tsx` / `LoginNew.tsx` | 登录表单 |
| `Register.tsx` | 注册表单 |

#### `components/chat/` - 核心聊天 ⭐
| 文件 | 职责 |
|------|------|
| `AIChat.tsx` | AI 聊天弹窗（Gemini） |
| `AIChatRoom.tsx` | AI 对戏主界面 |
| `AISettings.tsx` | AI 角色设置 |
| `ChatHome.tsx` | 聊天主界面（消息分页、语音、音乐、红包、礼物） |
| `ChatInput.tsx` | 消息输入框（表情、@提及、录音、音乐、礼物、红包） |
| `CreateRoom.tsx` | 创建群聊 |
| `GroupDetail.tsx` | 群聊详情页 |
| `GroupSettings.tsx` | 群聊设置 |
| `JoinRoom.tsx` | 加入群聊 |
| `LinkPreviewCard.tsx` / `LinkPreviewContainer.tsx` | 链接预览 |
| `MessageBubble.tsx` | 消息气泡 |
| `PatPanel.tsx` | 拍一拍面板 |
| `PendingRequests.tsx` | 入群申请审核 |
| `PrivateChat.tsx` | 私聊功能 |
| `RoomMembers.tsx` | 房间成员列表 |
| `RoomSettings.tsx` | 房间设置 |
| `TranslatableMessage.tsx` | 消息渲染（文字/语音/音乐/红包/礼物/表情） |
| `UserPersonaSettings.tsx` | 用户角色设置（AI 用） |
| `AudioPlayer.tsx` / `AudioRecorderButton.tsx` | 语音播放/录音 |
| `MusicCard.tsx` | 音乐卡片 + 歌词展开 |
| `MusicSearchModal.tsx` | 音乐搜索（YouTube/Bilibili） |

#### `components/common/` - 通用
| 文件 | 职责 |
|------|------|
| `AFKScreen.tsx` | AFK 隐私保护全屏壁纸 |
| `AvatarFrame.tsx` | 头像框显示 |
| `AvatarUpload.tsx` | 头像上传弹窗 |
| `Changelog.tsx` | 更新日志展示 |
| `ConnectionStatus.tsx` | 连接状态指示器 |
| `ContextMenu.tsx` | 右键菜单 |
| `DraggableAFKStatus.tsx` | 可拖拽橙色锁头控制面板 |
| `EmojiPicker.tsx` | 表情选择器 |
| `GlassDatePicker.tsx` | 毛玻璃日期选择器 |
| `LinkCard.tsx` | 链接卡片 |
| `MaintenancePage.tsx` | 维护模式页面 |
| `NotificationSettings.tsx` | 通知设置 |
| `PersonaSwitchPanel.tsx` | 角色切换弹窗 |
| `SearchPage.tsx` | 全局搜索 |

#### `components/debug/` - 调试
| 文件 | 职责 |
|------|------|
| `DebugPanel.tsx` | 调试面板（开发环境） |

#### `components/diamond/` - 钻石系统
| 文件 | 职责 |
|------|------|
| `DailyDiamond.tsx` | 每日签到 |
| `DiamondBalance.tsx` | 钻石余额显示 |

#### `components/emoji/` - 表情包
| 文件 | 职责 |
|------|------|
| `EmojiManager.tsx` | 表情管理页面 |
| `EmojiMessage.tsx` | 表情消息渲染 |
| `EmojiPicker.tsx` | 表情选择器 |
| `EmojiUploader.tsx` | 表情上传组件 |

#### `components/feed/` - 动态
| 文件 | 职责 |
|------|------|
| `MobileFeed.tsx` | 手机端动态页 |

#### `components/friends/` - 好友系统
| 文件 | 职责 |
|------|------|
| `AddFriendModal.tsx` | 添加好友弹窗 |
| `FriendList.tsx` | 好友列表 |
| `FriendRequests.tsx` | 好友申请列表 |

#### `components/gift/` - 礼物系统
| 文件 | 职责 |
|------|------|
| `GiftMessage.tsx` | 礼物消息卡片 |
| `GiftModal.tsx` | 赠送礼物弹窗 |

#### `components/guardian/` - 守护系统
| 文件 | 职责 |
|------|------|
| `GuardianRanking.tsx` | 守护榜组件 |

#### `components/home/` - 手机端主页
| 文件 | 职责 |
|------|------|
| `MobileHome.tsx` | 手机端主页 |

#### `components/inventory/` - 背包
| 文件 | 职责 |
|------|------|
| `Inventory.tsx` | 背包页面 |

#### `components/layout/` - 布局
| 文件 | 职责 |
|------|------|
| `DesktopLayout.tsx` | 桌面端布局 |
| `MobileLayout.tsx` | 移动端布局（底部 Tab 含小说入口） |
| `TabletLayout.tsx` | 平板端布局 |

#### `components/legal/` - 法律
| 文件 | 职责 |
|------|------|
| `PrivacyPolicy.tsx` | 隐私政策 |
| `TermsOfService.tsx` | 服务条款 |

#### `components/onboarding/` - 新用户引导
| 文件 | 职责 |
|------|------|
| `OnboardingComplete.tsx` | 完成引导 |
| `OnboardingPersona.tsx` | 创建角色引导 |
| `OnboardingProfile.tsx` | 填写资料引导 |
| `OnboardingRoom.tsx` | 创建群聊引导 |
| `OnboardingWizard.tsx` | 引导流程控制器 |

#### `components/persona/` - 角色系统 ⭐
| 文件 | 职责 |
|------|------|
| `PersonaCreate.tsx` | 创建角色（头像必填、标签验证） |
| `PersonaDetail.tsx` | 角色详情页（皮主页） |
| `PersonaEquipments.tsx` | 角色装备显示 |
| `PersonaGuardianList.tsx` | 守护榜 |
| `PersonaList.tsx` | 角色列表 |
| `PersonaManager.tsx` | 角色管理（含审核） |
| `PersonaPosts.tsx` | 角色动态 |
| `PersonaRelationships.tsx` | 亲密关系 |
| `PersonaSearch.tsx` | 角色搜索 |

#### `components/redpacket/` - 红包系统
| 文件 | 职责 |
|------|------|
| `RedPacketDetail.tsx` | 红包详情/抢红包 |
| `RedPacketMessage.tsx` | 红包消息卡片 |
| `RedPacketModal.tsx` | 发红包弹窗 |

#### `components/settings/` - 设置
| 文件 | 职责 |
|------|------|
| `Settings.tsx` | 应用设置 |

#### `components/shop/` - 商城
| 文件 | 职责 |
|------|------|
| `Shop.tsx` | 商城页面（含赠送按钮） |

#### `components/user/` - 用户
| 文件 | 职责 |
|------|------|
| `UserList.tsx` | 用户列表 |

#### `components/wallet/` - 钱包
| 文件 | 职责 |
|------|------|
| `RedeemModal.tsx` | 充值码输入 |
| `RedemptionHistory.tsx` | 充值记录 |
| `TransactionHistory.tsx` | 交易流水 |
| `Wallet.tsx` | 钱包主页 |

### 页面 (`pages/`)

#### `pages/novel/` - 墨香阁小说 🆕
| 文件 | 职责 |
|------|------|
| `NovelHome.tsx` | 小说首页（电脑端） |
| `NovelMobileHome.tsx` | 小说首页（手机端） |
| `AuthorDashboard.tsx` | 作者控制台 |
| `NovelCreate.tsx` | 创建小说 |
| `NovelEdit.tsx` | 编辑小说 |
| `ChapterManage.tsx` | 章节管理 |
| `ChapterEdit.tsx` | Markdown 双栏编辑器 |
| `MyFavorites.tsx` | 我的收藏 |
| `MyFollows.tsx` | 我的关注 |
| `UserProfile.tsx` | 用户/作者资料页 |

#### `pages/admin/` - 管理
| 文件 | 职责 |
|------|------|
| `AdminApplications.tsx` | 作者申请审核 |

### Contexts (`contexts/`)
| 文件 | 职责 |
|------|------|
| `AFKContext.tsx` | AFK 状态管理 |
| `FriendContext.tsx` | 好友状态管理 |
| `ThemeContext.tsx` | 深色/浅色模式 |

### Hooks (`hooks/`)
| 文件 | 职责 |
|------|------|
| `useAFK.ts` | AFK 相关 |
| `useDebounce.ts` | 防抖 |
| `useFont.ts` | 字体加载 |
| `useGroupPermission.ts` | 群组权限 |
| `useKeyboardHeight.ts` | 键盘高度检测 |
| `useLongPress.ts` | 长按事件 |
| `useMediaSession.ts` | 媒体会话 |
| `usePermissions.ts` | 权限检查 |
| `usePersona.ts` | 角色信息获取 |
| `useQuickSwitchPersona.ts` | Tab 键切换角色 |
| `useResponsive.ts` | 响应式断点 |
| `useUnreadCount.ts` | 未读消息计数 |

### Services (`services/`)
| 文件 | 职责 |
|------|------|
| `api.ts` | API 封装（核心，含 novelApi） |
| `audioRecorderService.ts` | 录音服务 |
| `diamondApi.ts` | 钻石 API |
| `emojiApi.ts` | 表情 API |
| `friendApi.ts` | 好友 API |
| `giftApi.ts` | 礼物 API |
| `guardianApi.ts` | 守护榜 API |
| `linkPreviewApi.ts` | 链接预览 |
| `Notification.ts` | 浏览器通知 |
| `redpacketApi.ts` | 红包 API |
| `socket.ts` | Socket.IO 连接 |
| `transactionApi.ts` | 交易 API |
| `translateApi.ts` | 简繁转换 |

### Styles (`styles/`)
| 文件 | 职责 |
|------|------|
| `novel.css` | 墨香阁电脑端样式 |
| `novel-mobile.css` | 墨香阁手机端样式 |

### Types (`types/`)
| 文件 | 职责 |
|------|------|
| `ai.ts` | AI 角色类型 |
| `gift.ts` | 礼物/红包类型 |
| `novel.ts` | 小说相关类型 |

### Utils (`utils/`)
| 文件 | 职责 |
|------|------|
| `antiDebug.ts` | 反调试 |
| `linkParser.ts` | URL 解析 |
| `renderMarkdown.ts` | Markdown 渲染 |
| `timeFormat.ts` | 时间格式化 |

### Firebase (`firebase/`)
| 文件 | 职责 |
|------|------|
| `config.ts` | Firebase 配置（Google 登录） |

---

## 📂 后端文件及职责 (`server/src/`)

### 入口文件
| 文件 | 职责 |
|------|------|
| `app.js` | Express 入口 + Socket.IO + 路由注册 |

### Models (`models/`)
| 模型 | 职责 | 关键字段 |
|------|------|----------|
| `User.js` | 用户 | username, email, diamonds, role |
| `Persona.js` | 角色 | name, isAuthor, novelSlots |
| `Room.js` | 房间 | name, createdBy, members |
| `Message.js` | 消息 | content, isAudio, musicData |
| `Novel.js` 🆕 | 小说 | title, authorId, category, status |
| `Chapter.js` 🆕 | 章节 | novelId, title, content |
| `AuthorApplication.js` 🆕 | 作者申请 | applicantPersonaId, status |
| `Favorite.js` 🆕 | 收藏 | userId, novelId |
| `FollowAuthor.js` 🆕 | 关注作者 | userId, authorPersonaId |
| `Comment.js` 🆕 | 评论 | targetId, content, likes |
| `Donation.js` 🆕 | 赞赏 | fromPersonaId, amount |
| `TransactionRecord.js` | 交易流水 | userId, type, amount |
| `Friend.js` / `FriendRequest.js` | 好友 | personaId, friendPersonaId |
| `InviteCode.js` / `RedeemCode.js` | 邀请/充值码 | code, usedBy |
| `RedPacket.js` / `RedPacketRecord.js` | 红包 | senderId, totalAmount |
| `GiftRecord.js` | 礼物 | fromPersonaId, guardValue |
| `UserEmoji.js` / `EmojiCategory.js` | 表情 | userId, url |
| `ShopItem.js` / `UserInventory.js` | 商城 | name, price |
| `Title.js` | 头衔 | name, assignedTo |
| `SystemSettings.js` | 系统设置 | key, value |
| `MaintenanceSchedule.js` | 维护计划 | startTime, endTime |
| `AIPersona.js` | AI 角色 | name, personality |
| `Post.js` | 帖子 | content, images, likes |
| `Changelog.js` | 更新日志 | sha, message |
| `ActivePersona.js` | 激活角色 | userId, personaId |
| `PersonaRoom.js` | 角色-房间关联 | personaId, roomId |
| `UserPersonaForAI.js` | AI 用户角色 | name, description |
| `UserReadRecord.js` | 阅读记录 | lastReadAt |
| `VoiceRoom.js` | 语音房 | creatorId |
| `AuditLog.js` / `DebugAuth.js` | 审计/调试 | - |

### Routes (`routes/`)
| 文件 | 主要接口 |
|------|----------|
| `auth.js` | 登录、注册、邀请码 |
| `user.js` | 用户资料 |
| `persona.js` | 角色 CRUD、审核 |
| `room.js` | 房间、消息分页、撤回 |
| `novel.js` 🆕 | 小说 CRUD、章节、收藏、关注、赞赏 |
| `lyrics.js` 🆕 | 歌词查询（LRCLIB + Gemini） |
| `music.js` / `youtube.js` | 音乐搜索 |
| `friend.js` / `privateChat.js` | 好友、私聊 |
| `redpacket.js` / `gift.js` / `guardian.js` | 红包、礼物、守护榜 |
| `emoji.js` | 表情上传、分组 |
| `shop.js` | 商城、购买、装备 |
| `diamond.js` | 钻石、签到、交易流水 |
| `admin.js` | 维护模式 |
| `translate.js` | 简繁转换 |
| `ai.js` / `aiPersona.js` | **Gemini AI 对话** |
| `post.js` / `search.js` | 帖子、搜索 |
| `upload.js` | Cloudinary 上传 |
| `pat.js` | 拍一拍 |
| `voice.js` | 语音房 |
| `title.js` | 头衔 |
| `security.js` | 安全报告 |
| `changelog.js` | 更新日志同步 |
| `linkPreview.js` | 链接预览 |

### Middlewares (`middlewares/`)
| 文件 | 职责 |
|------|------|
| `auditLog.js` | 审计日志 |
| `mentionHandler.js` | @提及处理 |
| `roleMiddleware.js` | 角色权限 |
| `securityLogger.js` / `securityMiddleware.js` | 安全中间件 |

### Services (`services/`)
| 文件 | 职责 |
|------|------|
| `aiService.js` | **Gemini API 调用** |
| `diamondService.js` | 钻石 + 交易流水 |
| `translateService.js` | 翻译服务 |
| `uploadService.js` | Cloudinary 上传 |
| `discordAlert.js` | Discord 告警 |
| `redpacketExpireService.js` | 红包过期检查 |
| `contentFilter.js` / `markdownService.js` | 内容过滤 / Markdown |
| `verificationCode.js` | 验证码 |

### Utils (`utils/`)
| 文件 | 职责 |
|------|------|
| `socketHelper.js` | Socket 通知辅助 |

### Scripts (`scripts/`)
| 文件 | 职责 |
|------|------|
| `backup.js` | 数据库备份 |
| `createAdmin.js` | 创建管理员 |
| `clean-db.js` / `clear-diamonds.js` | 清理数据 |
| `fix-*.js` | 各类修复脚本 |
| `init*.js` | 初始化头像框、商城 |
| `migrate-*.js` | 数据迁移 |
| `health-check.js` | 健康检查 |
| `test-*.js` | 测试脚本 |

### GitHub Actions (`.github/workflows/`)
| 文件 | 职责 |
|------|------|
| `backup.yml` | 数据库备份工作流 |
| `discord.yml` | Discord 通知工作流 |

---

## ⚙️ 环境变量

### 前端
```env
VITE_API_BASE=https://rp-chatv1-0.onrender.com/api
```

### 后端
```env
PORT=5000
MONGODB_URI=...
JWT_SECRET=...
FIREBASE_CONFIG=...
GITHUB_TOKEN=...
CLOUDINARY_URL=...

# YouTube API（音乐搜索）
YOUTUBE_API_KEY=...

# Gemini API（AI对话 + 歌词清洗）
GEMINI_API_KEY=...

# Discord 告警
DISCORD_WEBHOOK_SECURITY=...
DISCORD_WEBHOOK_DEPLOY=...
DISCORD_WEBHOOK_FEEDBACK=...

# hCaptcha
HCAPTCHA_SECRET_KEY=...
```

### Gemini 歌词清洗模型池
| 优先级 | 模型 | RPM |
|--------|------|-----|
| 1 | `gemini-3.1-flash-lite` | 15 |
| 2 | `gemini-2.5-flash-lite` | 10 |
| 3 | `gemini-2.0-flash` | 10 |
| 4 | 本地正则 | 无限制 |

> ⚠️ 不使用 `gemini-3.5-flash` 和 `gemini-2.5-flash`，避免与 AI 对话抢占配额。

---

## 🚀 部署信息

| 服务 | 平台 | 地址 |
|------|------|------|
| 前端 | Vercel | https://rp-chat-v1-0.vercel.app |
| 后端 | Render | https://rp-chatv1-0.onrender.com |

---

## 🔌 Socket.IO 事件

### 客户端发送
| 事件 | 数据 |
|------|------|
| `join-room` | `{ roomId, userId, personaId }` |
| `leave-room` | `{}` |
| `send-message` | 文本/语音/音乐/红包/礼物/表情 |
| `switch-persona` | `{ userId, newPersonaId }` |
| `pong` | `{}` |

### 服务端发送
| 事件 | 数据 |
|------|------|
| `connected` / `ping` | `{ id, timestamp }` |
| `new-message` | `Message` |
| `message-recalled` / `message-deleted` | `{ messageId, ... }` |
| `room-online-count` | `{ roomId, count }` |
| `persona-switched` | `{ userId, newPersonaId }` |
| `friend-request-received/updated` | `{ request }` |
| `redpacket-received` | `{ redPacketId }` |

---

## 🤖 AI 维护指南

> ### 给下次对话的 AI：
> 
> 1. **务必先阅读本文档**
> 2. 修改前 **先问用户要文件内容**
> 3. 保持风格一致，注意移动端兼容
> 4. 墨香阁阅读器 **禁止普通用户复制**，作者模式允许
> 5. 歌词逻辑 **不要放回前端**，用后端 `/api/lyrics`
> 6. **AI 对话已改用 Gemini**（DeepSeek 不再使用）
> 7. `PersonaSwitchPanel` 的 `align` 只接受 `'left' | 'right'`

---

## 📅 最后更新记录（你的里程碑）

| 日期 | 更新内容 |
|------|----------|
| **2026-06-13** | 墨香阁完整上线 + 歌词功能重构 + **AI 对话切换至 Gemini** |
| 2026-06-12 | 音乐卡片歌词从弹窗改为下方展开 + 点击跳转 |
| 2026-06-11 | 墨香阁电脑/手机双端适配 + 作者申请 + Markdown 编辑器 |
| 2026-06-10 | 红包/礼物/守护系统 + 表情包 |
| 2026-06-09 | 好友系统 + 角色间私聊 |
| 2026-06-08 | AFK 隐私保护 + 动态壁纸 |
| 2026-06-07 | 语音消息 + 音乐分享 |
| 2026-06-06 | 角色系统重构 + 钻石交易流水 |
| 2026-06-05 | 每日签到 + 充值码系统 |
| 2026-06-04 | 商城 + 背包 + 头像框 |
| 2026-06-03 | @提及 + 拍一拍 + 消息分页 |
| 2026-06-02 | 消息回复 + 撤回 + 删除 |
| 2026-06-01 | 项目初始化 |

---

### ⚠️ 当前已知问题

| 问题 | 说明 |
|------|------|
| 墨香阁「切换」按钮 | 点击后角色切换面板没有弹出 |
| 小说封面上传 | 字段可能未正确保存到 Novel 模型 |

---

*本文档由 AI 维护，每次重要更新后请同步更新「最后更新记录」*
```

这份文档：
- ✅ **保留了每个文件的完整位置和职责**
- ✅ **更新了 AI 对话为 Gemini**（DeepSeek 已移除）
- ✅ **保留了万物阁如何运作的核心流程**
- ✅ **最后更新记录作为你的里程碑完整保留**
- ✅ **AI 注意事项全部保留**