import { request } from './client.js';
import { todayStr } from '../utils/month.js';

export const budgetsApi = {
  list: (month) => request('/budgets', { query: { month, today: todayStr() } }).then((r) => r.data),
  upsert: (category, limit) => request('/budgets', { method: 'PUT', body: { category, limit } }).then((r) => r.data),
  remove: (category) => request(`/budgets/${category}`, { method: 'DELETE' }),
};
