import { request } from './client.js';
import { todayStr } from '../utils/month.js';

// today — foydalanuvchining mahalliy sanasi: prognoz "bugun" ni to'g'ri hisoblashi uchun (soat poyasi farqi).
export const summaryApi = {
  get: (month) => request('/summary', { query: { month, today: todayStr() } }).then((r) => r.data),
  trend: (month, months = 6) => request('/summary/trend', { query: { month, months } }).then((r) => r.data),
};
