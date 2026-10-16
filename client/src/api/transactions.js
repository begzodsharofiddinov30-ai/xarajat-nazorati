import { request } from './client.js';

export const transactionsApi = {
  list: (query) => request('/transactions', { query }),
  // Javob: { data, warning } — warning budjet oshganda to'ladi.
  create: (body) => request('/transactions', { method: 'POST', body }),
  update: (id, body) => request(`/transactions/${id}`, { method: 'PUT', body }),
  remove: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),
};
