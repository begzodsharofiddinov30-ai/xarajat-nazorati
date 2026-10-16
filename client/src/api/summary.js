import { request } from './client.js';

export const summaryApi = {
  get: (month) => request('/summary', { query: { month } }).then((r) => r.data),
};
