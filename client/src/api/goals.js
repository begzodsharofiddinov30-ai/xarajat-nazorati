import { request } from './client.js';
import { todayStr } from '../utils/month.js';

export const goalsApi = {
  list: () => request('/goals', { query: { today: todayStr() } }).then((r) => r.data),
  create: (body) => request('/goals', { method: 'POST', body }).then((r) => r.data),
  update: (id, body) => request(`/goals/${id}`, { method: 'PUT', body }).then((r) => r.data),
  remove: (id) => request(`/goals/${id}`, { method: 'DELETE' }),
  addContribution: (id, body) => request(`/goals/${id}/contributions`, { method: 'POST', body }).then((r) => r.data),
  removeContribution: (id, cid) => request(`/goals/${id}/contributions/${cid}`, { method: 'DELETE' }).then((r) => r.data),
};
