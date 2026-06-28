// client/src/types/novel.ts
import type { Persona as ApiPersona } from '../services/api';

// ========== 基础类型 ==========

export interface NovelAuthor {
  _id: string;
  name: string;
  displayName: string;
  avatar: string;
  isAuthor: boolean;
  followersCount?: number;
  totalDonationIncome?: number;
  // 🆕 等级/头衔
  level?: number;
  title?: string;
}

export interface Novel {
  _id: string;
  title: string;
  authorPersonaId: NovelAuthor | string;
  authorName: string;
  cover: string;
  description: string;
  category: string;
  tags: string[];
  status: '连载' | '完结';
  wordCount: number;
  views: number;
  likes: number;
  totalChapters: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // 🆕 作者等级/头衔（当 authorPersonaId 是 string 时使用）
  authorLevel?: number;
  authorTitle?: string;
}

export interface Chapter {
  _id: string;
  novelId: string;
  chapterNumber: number;
  title: string;
  content: string;
  wordCount: number;
  views: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  novelId: string;
  chapterId: string | null;
  userId: string;
  personaId: {
    _id: string;
    name: string;
    displayName: string;
    avatar: string;
    // 🆕 等级/头衔
    level?: number;
    title?: string;
  };
  personaName: string;
  content: string;
  likes: number;
  likedBy: string[];
  parentCommentId: string | null;
  isDeleted: boolean;
  createdAt: string;
}

export interface Favorite {
  _id: string;
  novelId: Novel;
  createdAt: string;
}

// 关注作者类型 - 扩展 authorPersonaId 包含更多字段
export interface FollowAuthor {
  _id: string;
  authorPersonaId: {
    _id: string;
    name: string;
    displayName: string;
    avatar: string;
    isAuthor: boolean;
    followersCount: number;
    createdNovelCount?: number;
    novelSlots?: number;
    totalDonationIncome?: number;
    // 🆕 等级/头衔
    level?: number;
    title?: string;
  };
  createdAt: string;
}

export interface AuthorApplication {
  _id: string;
  applicantPersonaId: {
    _id: string;
    name: string;
    displayName: string;
    avatar: string;
    // 🆕 等级/头衔
    level?: number;
    title?: string;
  };
  applicantUserId: {
    _id: string;
    username: string;
    email: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  diamondCost: number;
  reviewComment: string;
  reviewedBy?: string;
  reviewedAt?: string;
  appliedAt: string;
  createdAt: string;
  updatedAt: string;
}

// 后端返回的申请列表响应
export interface PendingApplicationsResponse {
  applications: AuthorApplication[];
}

export interface DonationRecord {
  _id: string;
  fromPersonaId: string;
  fromUserId: string;
  toPersonaId: string;
  toUserId: string;
  novelId: string;
  diamondAmount: number;
  message: string;
  createdAt: string;
}

// ========== API 响应类型 ==========

export interface NovelListResponse {
  novels: Novel[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface NovelDetailResponse {
  novel: Novel;
  chapters: Pick<Chapter, '_id' | 'chapterNumber' | 'title' | 'wordCount' | 'createdAt'>[];
  stats: {
    favoriteCount: number;
    followCount: number;
    commentCount: number;
    donationTotal: number;
  };
}

export interface ChapterContentResponse {
  chapter: Chapter;
  prev: Pick<Chapter, '_id' | 'chapterNumber' | 'title'> | null;
  next: Pick<Chapter, '_id' | 'chapterNumber' | 'title'> | null;
}

export interface CommentsResponse {
  comments: Comment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface MyFavoritesResponse {
  favorites: Favorite[];
}

export interface MyFollowsResponse {
  follows: FollowAuthor[];
}

export interface MyNovelsResponse {
  novels: Novel[];
  novelSlots: number;
  createdNovelCount: number;
  remainingSlots: number;
}

export interface CreateNovelResponse {
  success: boolean;
  message: string;
  novel: Novel;
}

export interface CreateChapterResponse {
  success: boolean;
  message: string;
  chapter: Chapter;
  chapterNumber: number;
}

export interface ExpandSlotResponse {
  success: boolean;
  message: string;
  novelSlots: number;
  createdNovelCount: number;
  remainingSlots: number;
}

export interface ApplyAuthorResponse {
  success: boolean;
  message: string;
  application: AuthorApplication;
}

export interface MyApplicationResponse {
  application: AuthorApplication | null;
}

export interface ToggleFavoriteResponse {
  success: boolean;
  action: 'added' | 'removed';
  message: string;
}

export interface ToggleFollowResponse {
  success: boolean;
  action: 'followed' | 'unfollowed';
  message: string;
}

export interface AddCommentResponse {
  success: boolean;
  comment: Comment;
}

export interface LikeCommentResponse {
  success: boolean;
  likes: number;
  hasLiked: boolean;
}

export interface DonateResponse {
  success: boolean;
  message: string;
  newBalance: number;
}

export interface ReviewApplicationResponse {
  success: boolean;
  message: string;
}

// ========== 常量 ==========

export const NOVEL_CATEGORIES = [
  '全部',
  '武侠',
  '玄幻',
  '言情',
  '历史',
  '悬疑',
  '科幻',
  '文学',
  '其他'
] as const;

export type NovelCategory = typeof NOVEL_CATEGORIES[number];

export const SORT_OPTIONS = [
  { value: 'latest', label: '最新发布' },
  { value: 'popular', label: '最多阅读' },
  { value: 'likes', label: '最多点赞' },
  { value: 'wordCount', label: '字数最多' }
] as const;

export type SortOption = typeof SORT_OPTIONS[number]['value'];
export type Persona = ApiPersona;