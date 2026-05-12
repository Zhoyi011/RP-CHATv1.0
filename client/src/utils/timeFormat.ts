import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

export const formatMessageTime = (date: string | Date): string => {
  const now = dayjs();
  const msgTime = dayjs(date);
  const diffMinutes = now.diff(msgTime, 'minute');

  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
  
  const diffHours = now.diff(msgTime, 'hour');
  if (diffHours < 24) return `${diffHours} 小时前`;
  
  const diffDays = now.diff(msgTime, 'day');
  if (diffDays < 7) return `${diffDays} 天前`;

  return msgTime.format('MM-DD HH:mm');
};

export const formatFullTime = (date: string | Date): string => {
  return dayjs(date).format('YYYY 年 M 月 D 日 HH:mm');
};

export const formatShortDate = (date: string | Date): string => {
  return dayjs(date).format('M/D');
};