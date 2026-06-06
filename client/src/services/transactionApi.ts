// client/src/services/transactionApi.ts
import { request } from './api';

export interface Transaction {
  _id: string;
  userId: string;
  type: string;
  amount: number;
  diamondType: 'paid' | 'free';
  description: string;
  relatedId: string | null;
  relatedName: string;
  balanceAfter: number;
  createdAt: string;
}

export const getTransactionHistory = (limit = 50, offset = 0): Promise<{
  transactions: Transaction[];
  stats: any;
  total: number;
}> => {
  return request(`/diamond/transactions?limit=${limit}&offset=${offset}`);
};