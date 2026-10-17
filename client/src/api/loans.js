import { request } from './client.js';
import { todayStr } from '../utils/month.js';

// today — foydalanuvchining mahalliy sanasi: kechikkan to'lovlar to'g'ri aniqlanishi uchun.
export const loansApi = {
  list: () => request('/loans', { query: { today: todayStr() } }),
  get: (id) => request(`/loans/${id}`, { query: { today: todayStr() } }).then((r) => r.data),
  create: (body) => request('/loans', { method: 'POST', body }).then((r) => r.data),
  update: (id, body) => request(`/loans/${id}`, { method: 'PUT', body }).then((r) => r.data),
  remove: (id) => request(`/loans/${id}`, { method: 'DELETE' }),
  // Javob: { data: tranzaksiya, warning }
  pay: (id, body) => request(`/loans/${id}/payments`, { method: 'POST', body }),
};
