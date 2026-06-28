好的，我来根据最新的 `tree.txt` 更新完整合并版 `PROJECT_CONTEXT.md`。

```markdown
# 万物阁 - 项目上下文文档

> 🤖 **AI 维护提示**：本文档记录项目的完整架构、文件职责和当前状态。  
> **每次更新代码后，请同步更新本文档**，以便下次对话的 AI 能快速理解项目。

---

## 📌 项目概览

| 项目 | 说明 |
|------|------|
| 项目名称 | 万物阁（RP Chat） |
| 项目类型 | 角色扮演 + 群聊/私聊 + AI 对戏 + **墨香阁小说平台** + **天仪阁 3D 宇宙** |
| 前端技术 | React 18 + TypeScript + TailwindCSS + Vite + Framer Motion + Three.js |
| 后端技术 | Node.js + Express + MongoDB + Socket.IO |
| 部署平台 | 前端 Vercel / 后端 Render |
| 其他服务 | Cloudinary（图片/音频/纹理）、**Gemini（AI对话 + 歌词清洗）**、YouTube API（音乐搜索）、Discord Webhook（告警） |

---

## 📂 完整文件结构

> **注意**：以下结构基于 `tree.txt`（最新），包含所有已实现的功能模块。

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
| `.gitattributes` | Git LFS 配置 |
| `.gitignore` | Git 忽略文件 |
| `README.md` | 项目说明文档 |

#### `public/` - 静态资源

| 文件/目录 | 职责 |
|-----------|------|
| `favicon.svg` | 网站图标 |
| `fonts/MaokenZhuyuanTi.ttf` | 猫啃珠圆体字体 |
| `frames/cat.png` | 猫猫头像框 |
| `frames/demon.png` | 恶魔头像框 |
| `frames/purple.png` | 紫色头像框 |
| `frames/star.png` | 星星头像框 |
| `frames/star1.png` | 星星头像框变体 |
| `textures/planets/` | 天仪阁行星纹理（本地备选，已迁移 Cloudinary） |
| `textures/planets/earth.jpg` | 地球日间纹理 |
| `textures/planets/earth_night.jpg` | 地球夜间纹理 |
| `textures/planets/jupiter.jpg` | 木星纹理 |
| `textures/planets/mars.jpg` | 火星纹理 |
| `textures/planets/mercury.jpg` | 水星纹理 |
| `textures/planets/neptune.jpg` | 海王星纹理 |
| `textures/planets/saturn.jpg` | 土星纹理 |
| `textures/planets/saturn_ring_alpha.png` | 土星环纹理 |
| `textures/planets/uranus.jpg` | 天王星纹理 |
| `textures/planets/venus.jpg` | 金星表面纹理 |
| `textures/planets/venus_atmo.jpg` | 金星大气纹理 |
| `wallpapers/desktop/desktop_1~7.mp4` | 电脑端 AFK 壁纸（已废弃） |
| `wallpapers/mobile/mobile_1~2.mp4` | 手机端 AFK 壁纸（已废弃） |

> **注意**：天仪阁纹理已迁移至 Cloudinary CDN，本地 `textures/planets/` 仅作备选。

#### `src/` - 源代码

##### 入口文件

| 文件 | 职责 |
|------|------|
| `main.tsx` | React 渲染入口 |
| `App.tsx` | 应用根组件 + 路由配置（含所有小说路由 + 天仪阁路由） |
| `App.css` | 组件样式 |
| `index.css` | 全局样式 |
| `vite-env.d.ts` | Vite 环境变量类型声明 |

**App.tsx 路由表（完整版）**

| 路由 | 组件 | 说明 |
|------|------|------|
| `/`, `/login` | `Login` | 登录页 |
| `/register` | `Register` | 注册页 |
| `/invite` | `InviteCode` | 邀请码验证 |
| `/chat` | `ChatHome` | 聊天主页 |
| `/persona` | `PersonaManager` | 角色管理 |
| `/persona/create` | `PersonaCreate` | 创建角色 |
| `/persona/:personaId` | `PersonaDetail` / `UserProfile` | 角色详情/用户资料 |
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
| **🆕 `/novel`** | `NovelHome` / `NovelMobileHome` | **墨香阁小说首页** |
| **🆕 `/author/dashboard`** | `AuthorDashboard` | **作者控制台** |
| **🆕 `/novel/create`** | `NovelCreate` | **创建小说** |
| **🆕 `/novel/edit/:id`** | `NovelEdit` | **编辑小说** |
| **🆕 `/novel/:id/chapters`** | `ChapterManage` | **章节管理** |
| **🆕 `/novel/chapter/create/:novelId`** | `ChapterEdit` | **创建章节** |
| **🆕 `/novel/chapter/edit/:chapterId`** | `ChapterEdit` | **编辑章节** |
| **🆕 `/novel/favorites`** | `MyFavorites` | **我的收藏** |
| **🆕 `/novel/follows`** | `MyFollows` | **我的关注** |
| **🆕 `/admin/applications`** | `AdminApplications` | **管理员审核作者申请** |
| **🆕 `/tianyige`** | `TianyiGe` | **天仪阁 3D 宇宙观测** |

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
| `Login.tsx` | 登录表单 |
| `LoginNew.tsx` | 新版登录页面 |
| `Register.tsx` | 注册表单 |

---

**`components/chat/` ⭐ 核心聊天功能**

| 文件 | 职责 |
|------|------|
| `AIChat.tsx` | AI 聊天弹窗（Gemini） |
| `AIChatRoom.tsx` | AI 对戏主界面 |
| `AISettings.tsx` | AI 角色设置 |
| **`ChatHome.tsx`** | **聊天主界面（支持消息分页、语音、音乐、红包、礼物）** |
| **`ChatInput.tsx`** | **消息输入框（表情、@提及、录音、音乐、礼物、红包）** |
| `CreateRoom.tsx` | 创建群聊 |
| `GroupDetail.tsx` | 群聊详情页 |
| `GroupSettings.tsx` | 群聊设置 |
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
| `UserPersonaSettings.tsx` | 用户角色设置 |
| `AudioPlayer.tsx` | 音频播放器 |
| `AudioRecorderButton.tsx` | 长按录音按钮 |
| **`MusicCard.tsx`** | **音乐卡片（歌词从弹窗改为卡片下方展开，调用后端 lyrics API）** |
| `MusicSearchModal.tsx` | 音乐搜索弹窗（移除前端清洗逻辑） |

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
| **`MobileLayout.tsx`** | **移动端布局（增加底部 Tab "小说"入口，侧边菜单增加小说相关链接）** |
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
| `Settings.tsx` | 应用设置 |

**`components/shop/` - 商城**

| 文件 | 职责 |
|------|------|
| `Shop.tsx` | 商城页面（含赠送按钮） |

**`components/tianyige/` - 天仪阁组件 🆕**

| 文件 | 职责 |
|------|------|
| `PlanetLOD.tsx` | 行星 LOD（Level of Detail）组件 |
| `PlanetLODWithTime.tsx` | 带时间控制的 LOD 行星组件 |
| `TimeControls.tsx` | 时间控制组件（加速/暂停/重置） |

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

##### `src/pages/` - 页面组件

**`pages/admin/` - 管理员页面**

| 文件 | 职责 |
|------|------|
| **`AdminApplications.tsx`** | **管理员审核作者申请** |

**`pages/novel/` - 墨香阁小说模块 🆕**

| 文件 | 职责 |
|------|------|
| **`NovelHome.tsx`** | **小说首页（列表、分类、搜索、排序、详情模态框、阅读器）** |
| **`NovelMobileHome.tsx`** | **手机端小说首页** |
| **`AuthorDashboard.tsx`** | **作者控制台** |
| **`NovelCreate.tsx`** | **创建小说** |
| **`NovelEdit.tsx`** | **编辑小说** |
| **`ChapterManage.tsx`** | **章节管理** |
| **`ChapterEdit.tsx`** | **创建/编辑章节（Markdown 双栏编辑器）** |
| **`MyFavorites.tsx`** | **我的收藏** |
| **`MyFollows.tsx`** | **我的关注** |
| **`UserProfile.tsx`** | **用户/作者资料页** |

**`pages/tianyige/` - 天仪阁 3D 宇宙 🆕**

| 文件 | 职责 |
|------|------|
| **`TianyiGe.tsx`** | **主场景组件（入口）** |
| **`TianyiGe.css`** | **天仪阁全局样式** |
| **`components/CameraController.tsx`** | **相机控制器（跟踪/重置）** |
| **`components/Planet.tsx`** | **行星组件（含地球日夜 Shader）** |
| **`components/SearchBar.tsx`** | **搜索栏组件** |
| **`components/SettingsPanel.tsx`** | **画质/设置面板** |
| **`data/galaxies.ts`** | **银河系/星系数据** |
| **`data/planets.ts`** | **行星数据（含纹理 URL）** |
| **`hooks/`** | **天仪阁自定义 Hooks** |
| **`types/index.ts`** | **TypeScript 类型定义** |
| **`utils/`** | **天仪阁工具函数** |

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
| **`usePersona.ts`** | **获取当前角色、角色列表、刷新角色状态** |
| `useQuickSwitchPersona.ts` | Tab 键切换角色 |
| `useResponsive.ts` | 响应式断点 |
| **`useTimeEngine.ts`** | **时间引擎 Hook（天仪阁）** |
| `useUnreadCount.ts` | 未读消息计数 |
| **`useWebGLContext.ts`** | **WebGL 上下文检测（天仪阁）** |

##### `src/services/`

| 文件 | 职责 |
|------|------|
| **`api.ts`** | **API 调用封装（添加 Persona 作者字段、novelApi 对象）** |
| `agoraService.ts` | 声网语音（已放弃） |
| `audioRecorderService.ts` | 录音核心服务 |
| `diamondApi.ts` | 钻石系统 API |
| `emojiApi.ts` | 表情 API |
| `friendApi.ts` | 好友 API |
| `giftApi.ts` | 礼物 API |
| `guardianApi.ts` | 守护榜 API |
| `linkPreviewApi.ts` | 链接预览 API |
| `Notification.ts` | 浏览器通知 |
| **`performanceMonitor.ts`** | **性能监控（天仪阁）** |
| `redpacketApi.ts` | 红包 API |
| `socket.ts` | Socket.IO 连接管理 |
| `transactionApi.ts` | 交易 API |
| `translateApi.ts` | 简繁转换 API |

##### `src/styles/` - 样式文件

| 文件 | 职责 |
|------|------|
| **`novel.css`** | **墨香阁电脑端完整样式** |
| **`novel-mobile.css`** | **手机端专用样式** |

##### `src/types/` - 类型定义

| 文件 | 职责 |
|------|------|
| `ai.ts` | AI 角色类型 |
| `gift.ts` | 礼物/红包类型 |
| **`novel.ts`** | **小说、章节、评论、收藏、关注等 TypeScript 类型** |

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
| **`app.js`** | **Express 入口 + Socket.IO 配置 + 路由注册（注册 /api/novel 和 /api/lyrics）** |

##### `src/models/` - 数据模型

| 模型 | 职责 | 关键字段 |
|------|------|----------|
| `User.js` | 用户模型 | username, email, diamonds, paidDiamonds, freeDiamonds, role |
| **`Persona.js`** | **角色模型（添加作者字段）** | isAuthor, authorApprovedAt, novelSlots, createdNovelCount, followersCount, totalDonationIncome |
| `Room.js` | 房间模型 | name, description, createdBy, members |
| **`Message.js`** | **消息模型** | content, isAudio, audioUrl, musicData, isRedPacket, isGift, isEmoji |
| `Friend.js` | 好友关系 | personaId, friendPersonaId |
| `FriendRequest.js` | 好友申请 | fromPersonaId, toPersonaId, status |
| `InviteCode.js` | 邀请码 | code, type, createdBy, usedBy |
| `RedeemCode.js` | 充值码 | code, diamondAmount, isUsed |
| `RedemptionRecord.js` | 充值记录 | userId, code, diamondAmount |
| **`TransactionRecord.js`** | **交易流水（新增交易类型）** | author_application, donation, expand_novel_slot |
| `SystemSettings.js` | 系统设置 | key, value |
| `MaintenanceSchedule.js` | 维护计划 | name, startTime, endTime |
| `Title.js` | 头衔 | name, roomId, assignedTo |
| `ActivePersona.js` | 激活角色 | userId, personaId |
| `PersonaRoom.js` | 角色-房间关联 | personaId, roomId |
| `AIPersona.js` | AI 角色 | name, personality |
| `Post.js` | 帖子 | content, images, likes |
| `ShopItem.js` | 商城商品 | name, type, price, isGiftable, guardValue |
| `UserInventory.js` | 用户库存 | itemId, isEquipped |
| `Changelog.js` | 更新日志 | sha, message |
| `DebugAuth.js` | 调试授权 | code, userId |
| `UserEmoji.js` | 用户表情 | userId, url, usageCount |
| `EmojiCategory.js` | 表情分组 | userId, name |
| `GiftRecord.js` | 礼物记录 | fromPersonaId, toPersonaId, itemId, guardValue |
| `RedPacket.js` | 红包 | senderId, type, totalAmount, remainingAmount |
| `RedPacketRecord.js` | 红包领取记录 | redPacketId, receiverId, amount |
| `AuditLog.js` | 审计日志 | userId, action |
| `VoiceRoom.js` | 语音房 | creatorId |
| `UserPersonaForAI.js` | AI 用户角色 | name, description |
| `UserReadRecord.js` | 阅读记录 | lastReadAt |
| **🆕 `Novel.js`** | **小说模型** | title, authorId, category, status, wordCount, coverUrl, description, tags |
| **🆕 `Chapter.js`** | **章节模型** | novelId, title, content, wordCount, isPublished |
| **🆕 `Favorite.js`** | **收藏模型** | userId, personaId, novelId |
| **🆕 `FollowAuthor.js`** | **关注作者模型** | userId, personaId, authorPersonaId |
| **🆕 `Comment.js`** | **评论模型** | targetType, targetId, content, likes |
| **🆕 `Donation.js`** | **赞赏记录模型** | fromPersonaId, novelId, chapterId, amount |
| **🆕 `AuthorApplication.js`** | **作者申请模型** | applicantPersonaId, status, diamondCost |

##### `src/routes/` - API 路由

| 文件 | 主要接口 |
|------|----------|
| `auth.js` | 登录、注册、邀请码 |
| `user.js` | 用户资料、修改密码 |
| `persona.js` | 角色 CRUD、审核、搜索 |
| `room.js` | 房间 CRUD、消息分页、撤回 |
| `pat.js` | 拍一拍 |
| `redeem.js` | 充值码 |
| `admin.js` | 维护模式 |
| `diamond.js` | 钻石余额、签到、交易流水 |
| `shop.js` | 商品、购买、装备 |
| `upload.js` | Cloudinary 上传 |
| `translate.js` | 简繁转换 |
| `ai.js` | **Gemini AI 对话** |
| `aiPersona.js` | AI 角色 CRUD |
| `post.js` | 帖子 |
| `search.js` | 全局搜索 |
| `changelog.js` | 更新日志同步 |
| `linkPreview.js` | 链接预览 |
| `security.js` | 安全报告 |
| `friend.js` | 好友 API |
| `privateChat.js` | 私聊 API |
| `music.js` | 音乐搜索（YouTube + Bilibili） |
| `youtube.js` | YouTube 视频详情 |
| `emoji.js` | 表情 API |
| `gift.js` | 礼物 API |
| `redpacket.js` | 红包 API |
| `guardian.js` | 守护榜 API |
| `voice.js` | 语音房 |
| **🆕 `novel.js`** | **小说 API（完整 CRUD、章节管理、收藏、关注、评论、赞赏、作者申请审核）** |
| **`lyrics.js`** | 歌词查询 API（优先 LRCLIB，失败后用 Gemini 3.1/2.5/2.0 Flash Lite 三模型轮换清洗，最终降级到本地正则） |

##### `src/middlewares/` - 中间件

| 文件 | 职责 |
|------|------|
| `auditLog.js` | 审计日志 |
| `mentionHandler.js` | @提及处理 |
| `roleMiddleware.js` | 角色权限 |
| `securityLogger.js` | 安全日志 |
| `securityMiddleware.js` | 安全中间件 |

##### `src/services/` - 业务服务

| 文件 | 职责 |
|------|------|
| `aiService.js` | **Gemini API 调用** |
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
| **`socketHelper.js`** | **Socket 通知辅助函数** |

##### `src/scripts/` - 维护脚本

| 文件 | 职责 |
|------|------|
| `backup.js` | 数据库备份 |
| `clean-db.js` | 清理数据库 |
| `clean-soft-deleted-novels.js` | 清理软删除的小说 |
| `clear-diamonds.js` | 清空钻石 |
| `createAdmin.js` | 创建管理员 |
| `fix-all.js` | 综合修复脚本 |
| `fix-global-numbers.js` | 修复全局编号 |
| `fix-issues.js` | 修复问题 |
| `fix-novel-counts.js` | 修复小说计数 |
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
用户输入内容 → 前端解析 @ 提及 → 发送消息 → 后端 mentionHandler → 保存 → 广播 new-message

### 2. 语音消息流程
长按录音 → 上传 Cloudinary → Socket 发送（含 audioUrl）→ 广播 → 音频播放器

### 3. 音乐分享流程
点击音乐按钮 → 搜索（YouTube/Bilibili）→ 选择歌曲 → 传递原始标题/歌手/时长 → 后端 lyrics API 智能清洗 → Socket 发送 musicData → 广播 → MusicCard 渲染，歌词卡片下方展开，支持高亮和点击跳转

#### 歌词查询详细流程
1. 前端传递原始 `title`、`artist`、`durationSeconds`
2. 后端先用原始标题查询 LRCLIB
3. 若 404，调用 Gemini 3.1 Flash Lite 清洗（去除歌手名、括号、版本标识）
4. 清洗后用纯净歌名再次查询 LRCLIB
5. 若仍失败，依次换用 gemini-2.5-flash-lite、gemini-2.0-flash
6. 全部失败则用本地正则最终降级
7. 返回同步歌词（LRC 格式），前端解析时间戳
8. 卡片下方显示，根据播放进度实时高亮，点击歌词跳转

### 4. 红包流程
发红包（随机/固定/个人）→ 聊天显示红包卡片 → 点击抢红包 → 验证 → 增加钻石 → 记录领取

### 5. 礼物流程
商城选择商品 → 赠送好友 → 扣钻石 → 发送礼物消息 → 增加守护值 → 更新守护榜

### 6. 表情包流程
上传表情 → Cloudinary 压缩转 WebP → 保存 → 聊天发送 → 使用次数 +1

### 7. 好友系统流程
搜索角色 → 填写申请理由 → 发送申请 → Socket 通知 → 同意/拒绝 → 创建好友关系 → 可私聊

### 8. AFK 隐私保护流程
无操作 5 分钟 → 进入 AFK 模式 → 播放动态壁纸 → 双视频层无缝循环 → 橙色锁头控制面板

### 9. 角色系统流程
用户申请创建角色 → 管理员审核 → 通过后归属于申请人 → 计算同名编号

### 10. 墨香阁小说流程
**作者申请**：角色申请成为作者（消耗 10 钻石）→ 管理员审核 → 通过后获得作者权限（基础 5 个创作名额）。**创建小说**：作者创建小说（封面、标题、分类、简介）→ 管理章节（Markdown 编辑器）→ 发布。**读者功能**：收藏小说、关注作者、评论、赞赏（仅付费钻石）。**作者控制台**：统计作品数、创作名额（可扩展）、粉丝数、赞赏收入。

### 11. 天仪阁 3D 宇宙流程
用户进入 `/tianyige` → 加载 Three.js 场景 → 显示太阳 + 八大行星 → 行星公转/自转动画 → 鼠标拖拽旋转 / 滚轮缩放 → 点击行星锁定追踪 → 搜索定位行星 → 画质设置（低/中/高）→ 暂停/恢复动画 → 显示/隐藏轨道

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
CLOUDINARY_URL=cloudinary://...

# YouTube API（音乐搜索）
YOUTUBE_API_KEY=your_youtube_api_key

# Gemini API（AI对话 + 歌词清洗）
GEMINI_API_KEY=your_gemini_api_key

# Discord 告警
DISCORD_WEBHOOK_SECURITY=...
DISCORD_WEBHOOK_DEPLOY=...
DISCORD_WEBHOOK_FEEDBACK=...

# hCaptcha
HCAPTCHA_SECRET_KEY=your_hcaptcha_secret
```

### 🤖 歌词智能清洗模型池

| 优先级 | 模型 | RPM | 用途 |
|--------|------|-----|------|
| 1 | `gemini-3.1-flash-lite` | 15 | 主力清洗模型 |
| 2 | `gemini-2.5-flash-lite` | 10 | 第一备选 |
| 3 | `gemini-2.0-flash` | 10 | 第二备选 |
| 4 | 本地正则清洗 | 无限制 | 最终降级 |

> ⚠️ 不使用 `gemini-3.5-flash` 和 `gemini-2.5-flash`，避免与 AI 建议/对话功能抢占配额。免费版 15 RPM 完全够用。

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
- [x] 长按录音按钮
- [x] 音频播放器
- [x] Cloudinary 音频上传（MP3 转码）

### 🎵 音乐分享系统
- [x] YouTube + Bilibili 双平台搜索
- [x] 音乐卡片 + 嵌入播放器
- [x] **歌词卡片下方展开（不再使用弹窗）**
- [x] **后端 LRCLIB + Gemini 智能清洗**
- [x] **播放时高亮当前歌词行**
- [x] **点击歌词跳转到对应播放时间**

### 😀 表情包系统
- [x] 单张/批量上传
- [x] 自动压缩转 WebP
- [x] 分组管理、收藏功能
- [x] 使用统计、搜索、举报

### 🎁 礼物/红包/守护系统
- [x] 赠送礼物、守护值计算
- [x] 全站守护榜
- [x] 随机/固定/个人三种红包
- [x] 红包过期自动退款
- [x] 充值钻石/免费钻石分类

### 📚 墨香阁小说模块
- [x] **小说创建、编辑、删除**
- [x] **章节管理（Markdown 双栏编辑器）**
- [x] **作者申请与审核（消耗 10 钻石）**
- [x] **作者控制台（作品统计、创作名额扩展）**
- [x] **读者功能：收藏、关注、评论、赞赏**
- [x] **搜索与筛选（分类、状态、排序）**
- [x] **手机端独立优化页面**
- [x] **底部 Tab "小说"入口**

### 🛸 天仪阁 3D 宇宙观测（🆕 新增）
- [x] **3D 太阳系场景（太阳 + 八大行星）**
- [x] **行星公转 + 自转动画**
- [x] **半透明轨道环**
- [x] **鼠标拖拽旋转 / 滚轮缩放**
- [x] **行星点击锁定追踪**
- [x] **搜索定位（搜索行星名称）**
- [x] **相机重置视角**
- [x] **地球日夜混合纹理（自定义 Shader）**
- [x] **三档画质动态调整（低/中/高）**
- [x] **暂停/恢复动画**
- [x] **显示/隐藏轨道**
- [x] **玻璃拟态信息面板**
- [x] **移动端自适应（自动降级到中画质）**
- [x] **所有纹理托管于 Cloudinary CDN**
- [x] **LOD（Level of Detail）性能优化**
- [x] **时间控制（加速/暂停）**

### 👤 角色系统
- [x] 角色创建/编辑/删除
- [x] 审核机制（申请 → 审核 → 归属）
- [x] 同名编号（只计算已批准）
- [x] 头像必填、标签限制
- [x] **作者字段（isAuthor, novelSlots, createdNovelCount 等）**

### 👥 好友系统
- [x] 角色间添加好友
- [x] 好友申请 Socket 通知
- [x] 同意/拒绝/删除好友
- [x] 角色间私聊（需好友关系）

### 🛡️ AFK 隐私保护系统
- [x] 5分钟自动进入
- [x] 全屏动态壁纸
- [x] 双视频层无缝切换
- [x] 可拖拽橙色锁头控制面板

### 💎 经济系统
- [x] 每日签到（循环奖励）
- [x] 充值码系统
- [x] 交易流水记录
- [x] 商城 + 背包 + 头像框

### 🔐 认证与安全
- [x] 邮箱密码登录 + Google 登录
- [x] 邀请码机制
- [x] 安全中间件
- [x] Discord 告警
- [x] 维护模式

### 📱 布局与主题
- [x] 深色模式
- [x] 响应式布局
- [x] 手机端底部 Tab（聊天/动态/主页/小说）

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
  ├── 1:N → TransactionRecord (交易流水)
  ├── 1:N → GiftRecord (送出的礼物)
  ├── 1:N → RedPacket (发送的红包)
  ├── 1:N → RedPacketRecord (抢到的红包)
  ├── 🆕 1:N → Favorite (收藏的小说)
  └── 🆕 1:N → FollowAuthor (关注的作者)

Persona (角色)
  ├── N:N → PersonaRoom (加入的房间)
  ├── 1:N → Message (发送的消息)
  ├── 1:N → Post (发布的帖子)
  ├── N:N → Friend (好友关系)
  ├── 1:N → GiftRecord (收到的礼物)
  ├── 🆕 1:N → Novel (创作的小说)
  ├── 🆕 1:N → AuthorApplication (作者申请)
  └── 🆕 1:N → Donation (收到的赞赏)

Novel (小说)
  ├── 1:N → Chapter (章节)
  ├── 1:N → Favorite (收藏)
  ├── 1:N → Comment (评论)
  └── 1:N → Donation (赞赏)

Room (房间)
  ├── 1:N → Message (房间消息)
  ├── 1:N → PersonaRoom (成员)
  └── 1:N → RedPacket (房间红包)
```

---

## 🔌 Socket.IO 事件列表

### 客户端发送

| 事件 | 数据 | 说明 |
|------|------|------|
| `join-room` | `{ roomId, userId, personaId }` | 加入聊天室 |
| `leave-room` | `{}` | 离开聊天室 |
| `send-message` | 完整消息数据 | 支持文本/语音/音乐/红包/礼物/表情 |
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

## 🛸 天仪阁 - 画质参数

| 参数 | 低画质 | 中画质 | 高画质 |
|------|--------|--------|--------|
| 环境光 | 0.25 | 0.15 | 0.08 |
| 太阳光源强度 | 15 | 28 | 45 |
| 主方向光 | 0.6 | 1.0 | 1.5 |
| 暖色背光 | 0.3 | 0.5 | 0.8 |
| 冷色侧补光 | 0.2 | 0.4 | 0.6 |
| 曝光度 | 1.0 | 1.3 | 1.6 |
| 色调映射 | Reinhard | Reinhard | ACES Filmic |
| 星星数量 | 4000 | 10000 | 20000 |
| 阴影 | 关闭 | 开启 | 开启（高分辨率）|

---

## 📅 最后更新记录

| 日期 | 更新内容 |
|------|----------|
| **2026-06-13** | **天仪阁 3D 宇宙观测**：Three.js 太阳系、八大行星、公转/自转、地球日夜 Shader、三档画质、Cloudinary 纹理托管、LOD 性能优化、时间控制；**墨香阁小说模块完整上线**；**音乐卡片歌词重构**；**AI 对话切换至 Gemini**；**新增 3 个天仪阁组件、2 个数据文件、1 个性能监控服务** |
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

| 问题 | 严重程度 | 说明 |
|------|----------|------|
| 部分手机浏览器视频无法自动播放 | 🔴 高 | 需要用户首次交互后播放 |
| AFK 状态切换时短暂空白 | 🟡 中 | 已优化但未完全解决 |
| 手机端视频可能卡顿 | 🟡 中 | 大文件在低端手机上可能播放不流畅 |
| **手机端歌词显示** | 🟡 中 | 歌词区域可能过大，后续可折叠 |
| **小说封面上传** | 🟡 中 | 使用现有上传 API，但字段可能未正确保存 |
| **天仪阁卫星系统** | 🟢 低 | 待添加月球等卫星 |
| **天仪阁太阳 Bloom 辉光** | 🟢 低 | 高画质下太阳泛光效果 |
| **天仪阁相机飞向目标动画** | 🟢 低 | 搜索后平滑飞入 |

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
> | 音乐分享 | `MusicSearchModal.tsx` + `music.js` + **`lyrics.js`** |
> | 表情包 | `EmojiManager.tsx` + `emoji.js` |
> | 红包系统 | `redpacket.js` + `redpacketExpireService.js` |
> | 礼物系统 | `gift.js` + `diamondService.js` |
> | 好友系统 | `FriendContext.tsx` + `friend.js` |
> | **🆕 小说系统** | `novel.js` + `Novel.js` + `Chapter.js` + 相关模型 |
> | **🆕 作者申请** | `AuthorApplication.js` + `admin.js` |
> | 钻石交易 | `TransactionRecord.js` + `diamondService.js` |
> | 角色系统 | `Persona.js` + `persona.js` |
> | Socket 通知 | `socketHelper.js` |
> | **🆕 歌词 API** | `lyrics.js` + `GEMINI_API_KEY` |
> | **🆕 AI 对话** | `aiService.js` + `GEMINI_API_KEY` |
> | **🆕 天仪阁行星数据** | `data/planets.ts`（纹理 URL） |
> | **🆕 天仪阁画质设置** | `components/SettingsPanel.tsx` |
> | **🆕 天仪阁 LOD** | `components/PlanetLOD.tsx` |
> | **🆕 天仪阁时间控制** | `components/TimeControls.tsx` + `useTimeEngine.ts` |
> 
> ### 手机端路由：
> 
> | Tab | 路由 |
> |-----|------|
> | 聊天 | `/chat` |
> | 动态 | `/feed` |
> | 主页 | `/home` |
> | **🆕 小说** | `/novel` |
> | **🆕 天仪阁** | `/tianyige` |
> 
> ### 🆕 天仪阁开发注意事项：
> 
> 1. **纹理托管**：所有纹理已迁移至 Cloudinary CDN，无需本地存储
> 2. **移动端适配**：移动端自动降级到中画质
> 3. **地球 Shader**：使用自定义 Shader 实现日夜混合，不要移除
> 4. **性能优化**：三档画质动态调整，低画质关闭阴影；LOD 自动优化
> 5. **后续扩展**：可添加卫星系统、银河系场景、小行星带
> 
> ### 🆕 墨香阁部署注意事项：
> 
> 1. **环境变量**：需配置 `GEMINI_API_KEY`
> 2. **数据库迁移**：现有用户需添加 `isAuthor` 等字段
> 3. **字体**：确保 `public/fonts/MaokenZhuyuanTi.ttf` 存在
> 4. **路由**：所有小说页面已受 `ProtectedRoute` 保护

---

*本文档由 AI 维护，每次重要更新后请同步更新*