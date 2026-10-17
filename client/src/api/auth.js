import { request } from './client.js';

export const authApi = {
  register: (body) => request('/auth/register', { method: 'POST', body }).then((r) => r.data),
  login: (body) => request('/auth/login', { method: 'POST', body }).then((r) => r.data),
  me: () => request('/auth/me').then((r) => r.data.user),
  updateProfile: (body) => request('/auth/profile', { method: 'PATCH', body }).then((r) => r.data.user),
  // Parol almashtirilganda boshqa qurilmalar chiqarib yuboriladi; joriy qurilma yangi token oladi.
  changePassword: (body) => request('/auth/password', { method: 'POST', body }).then((r) => r.data),
  logoutAll: () => request('/auth/logout-all', { method: 'POST', body: {} }).then((r) => r.data),
  deleteAccount: (body) => request('/auth/account', { method: 'DELETE', body }),
};
