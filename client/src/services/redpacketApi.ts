// client/src/services/redpacketApi.ts
import { request } from './api';
import type {
  RedPacket,
  SendRedPacketRequest,
  SendRedPacketResponse,
  ClaimRedPacketResponse,
} from '../types/gift';

// 🔥 重新定义红包详情返回类型
export interface RedPacketDetailResponse {
  redPacket: {
    _id: string;
    type: 'random' | 'fixed' | 'personal';
    totalAmount: number;
    remainingAmount: number;
    count: number;
    remainingCount: number;
    message: string;
    status: string;
    sender: {
      _id: string;
      name: string;
      displayName: string;
      avatar?: string;
    };
    targetPersona?: {
      _id: string;
      name: string;
      displayName: string;
    };
    createdAt: string;
    expiresAt: string;
  };
  records: {
    personaId: string;
    personaName: string;
    amount: number;
    createdAt: string;
    isLucky?: boolean;
  }[];
  hasClaimed: boolean;
  isExpired: boolean;
}

/**
 * 发红包
 */
export const sendRedPacket = (data: SendRedPacketRequest): Promise<SendRedPacketResponse> => {
  return request('/redpacket/send', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * 抢红包
 */
export const claimRedPacket = (redPacketId: string): Promise<ClaimRedPacketResponse> => {
  return request(`/redpacket/${redPacketId}/claim`, {
    method: 'POST',
  });
};

/**
 * 获取红包详情
 */
export const getRedPacketDetail = (redPacketId: string): Promise<RedPacketDetailResponse> => {
  return request(`/redpacket/${redPacketId}`);
};

/**
 * 获取房间红包列表
 */
export const getRoomRedPackets = (roomId: string, page = 1, limit = 20): Promise<{
  redPackets: RedPacket[];
  total: number;
  page: number;
  totalPages: number;
}> => {
  return request(`/redpacket/room/${roomId}?page=${page}&limit=${limit}`);
};