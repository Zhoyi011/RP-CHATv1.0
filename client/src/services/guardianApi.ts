// client/src/services/guardianApi.ts
import { request } from './api';
import type { GuardianRankingItem, GuardianListResponse, MySentGuardianResponse } from '../types/gift';

/**
 * 获取全局守护榜
 * @param limit - 返回数量，默认50
 */
export const getGuardianRanking = (limit = 50): Promise<{
  ranking: GuardianRankingItem[];
  total: number;
}> => {
  return request(`/guardian/ranking?limit=${limit}`);
};

/**
 * 获取角色的守护者列表
 * @param personaId - 角色ID
 * @param limit - 返回数量，默认20
 */
export const getPersonaGuardians = (personaId: string, limit = 20): Promise<GuardianListResponse> => {
  return request(`/guardian/persona/${personaId}?limit=${limit}`);
};

/**
 * 获取我送出的守护统计
 */
export const getMySentGuardian = (): Promise<MySentGuardianResponse> => {
  return request('/guardian/my-sent');
};