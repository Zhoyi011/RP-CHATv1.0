// client/src/types/gift.ts

// ========== 礼物相关 ==========
export interface GiftRecord {
  _id: string;
  fromPersonaId: {
    _id: string;
    name: string;
    displayName: string;
    avatar?: string;
  };
  toPersonaId: {
    _id: string;
    name: string;
    displayName: string;
    avatar?: string;
  };
  itemId: {
    _id: string;
    name: string;
    image: string;
  };
  itemName: string;
  itemType: string;
  diamondCost: number;
  guardValue: number;
  message: string;
  createdAt: string;
}

export interface SendGiftRequest {
  toPersonaId: string;
  itemId: string;
  message?: string;
}

export interface SendGiftResponse {
  success: boolean;
  message: string;
  guardValue: number;
  data: GiftRecord;
}

// ========== 红包相关 ==========
export type RedPacketType = 'random' | 'fixed' | 'personal';

export interface RedPacket {
  _id: string;
  senderPersonaId: {
    _id: string;
    name: string;
    displayName: string;
    avatar?: string;
  };
  roomId: string;
  type: RedPacketType;
  totalAmount: number;
  remainingAmount: number;
  count: number;
  remainingCount: number;
  message: string;
  diamondType: 'paid';
  status: 'active' | 'finished' | 'expired';
  targetPersonaId?: {
    _id: string;
    name: string;
    displayName: string;
  };
  records: RedPacketRecord[];
  createdAt: string;
  expiresAt: string;
}

export interface RedPacketRecord {
  personaId: string;
  personaName: string;
  amount: number;
  createdAt: string;
  isLucky?: boolean;
}

export interface SendRedPacketRequest {
  roomId: string;
  type: RedPacketType;
  totalAmount: number;
  count?: number;
  message?: string;
  targetPersonaId?: string;
}

export interface SendRedPacketResponse {
  success: boolean;
  message: string;
  redPacketId: string;
  data: RedPacket;
}

export interface ClaimRedPacketResponse {
  success: boolean;
  message: string;
  amount: number;
  isLucky: boolean;
  remainingCount: number;
  isFinished: boolean;
}

// ========== 守护榜相关 ==========
export interface GuardianRankingItem {
  _id: string;
  name: string;
  displayName: string;
  avatar?: string;
  avatarFrame?: string;  // 🔥 添加缺失的字段
  guardianValue: number;
  giftCount: number;
  topGuardians: {
    personaId: string;
    name: string;
    avatar?: string;
    amount: number;
  }[];
}

export interface GuardianListResponse {
  guardians: {
    personaId: string;
    name: string;
    avatar?: string;
    avatarFrame?: string;  // 🔥 添加缺失的字段
    totalAmount: number;
    giftCount: number;
    lastGiftAt: string;
  }[];
  totalGuardValue: number;
  totalGuardians: number;
}

export interface MySentGuardianResponse {
  totalSent: number;
  totalGifts: number;
  sentList: {
    personaId: string;
    name: string;
    avatar?: string;
    avatarFrame?: string;  // 🔥 添加缺失的字段
    totalAmount: number;
    giftCount: number;
    lastGiftAt: string;
  }[];
}