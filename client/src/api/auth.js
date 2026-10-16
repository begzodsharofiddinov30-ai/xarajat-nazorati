import { request } from './client.js';

export const authApi = {
  register: (body) => request('/auth/register', { method: 'POST', body }).then((r) => r.data),
  login: (body) => request('/auth/login', { method: 'POST', body }).then((r) => r.data),
  me: () => request('/auth/me').then((r) => r.data.user),
};
