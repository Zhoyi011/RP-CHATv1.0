// client/src/services/giftApi.ts
import { request } from './api';
import type { GiftRecord, SendGiftRequest, SendGiftResponse } from '../types/gift';

/**
 * 赠送礼物
 */
export const sendGift = (data: SendGiftRequest): Promise<SendGiftResponse> => {
  return request('/gift/send', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * 获取收到的礼物列表
 */
export const getReceivedGifts = (page = 1, limit = 20): Promise<{
  gifts: GiftRecord[];
  total: number;
  page: number;
  totalPages: number;
}> => {
  return request(`/gift/received?page=${page}&limit=${limit}`);
};

/**
 * 获取送出的礼物列表
 */
export const getSentGifts = (page = 1, limit = 20): Promise<{
  gifts: GiftRecord[];
  total: number;
  page: number;
  totalPages: number;
}> => {
  return request(`/gift/sent?page=${page}&limit=${limit}`);
};