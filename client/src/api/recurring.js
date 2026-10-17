import { request } from './client.js';

export const recurringApi = {
  list: () => request('/recurring').then((r) => r.data),
  create: (body) => request('/recurring', { method: 'POST', body }).then((r) => r.data),
  update: (id, body) => request(`/recurring/${id}`, { method: 'PUT', body }).then((r) => r.data),
  remove: (id) => request(`/recurring/${id}`, { method: 'DELETE' }),
};
