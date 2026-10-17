import { request } from './client.js';

export const categoriesApi = {
  list: () => request('/categories').then((r) => r.data),
  create: (body) => request('/categories', { method: 'POST', body }).then((r) => r.data),
  update: (id, body) => request(`/categories/${id}`, { method: 'PUT', body }).then((r) => r.data),
  remove: (id) => request(`/categories/${id}`, { method: 'DELETE' }),
};
