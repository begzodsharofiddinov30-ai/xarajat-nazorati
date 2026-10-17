import { request } from './client.js';

export const transactionsApi = {
  list: (query) => request('/transactions', { query }),
  // Javob: { data, warning } — warning budjet 80% ga yetganda yoki oshganda to'ladi.
  create: (body) => request('/transactions', { method: 'POST', body }),
  update: (id, body) => request(`/transactions/${id}`, { method: 'PUT', body }),
  remove: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),
  // Javob: { data: { imported, skipped, invalid: [{ row, message }] } }
  import: (rows, skipDuplicates = true) =>
    request('/transactions/import', { method: 'POST', body: { rows, skipDuplicates } }).then((r) => r.data),
};
