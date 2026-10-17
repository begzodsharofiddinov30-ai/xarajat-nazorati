import { request } from './client.js';

export const phonesApi = {
  // Javob: { data: [raqam + paid, count, lastPayment, autoPay], meta: { month, total, unassigned, trend } }
  list: (month) => request('/phones', { query: { month } }),
  create: (body) => request('/phones', { method: 'POST', body }).then((r) => r.data),
  update: (id, body) => request(`/phones/${id}`, { method: 'PUT', body }).then((r) => r.data),
  remove: (id) => request(`/phones/${id}`, { method: 'DELETE' }),
};
