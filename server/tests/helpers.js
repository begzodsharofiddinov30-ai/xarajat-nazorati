import request from 'supertest';
import { createApp } from '../src/app.js';

export const app = createApp();
export const api = () => request(app);

let counter = 0;

export async function registerUser(overrides = {}) {
  counter += 1;
  const body = {
    name: 'Test Foydalanuvchi',
    email: `user${counter}-${Date.now()}@test.uz`,
    password: 'secret123',
    ...overrides,
  };
  const res = await api().post('/api/auth/register').send(body);
  if (res.status !== 201) throw new Error(`Register failed: ${JSON.stringify(res.body)}`);
  return { ...body, token: res.body.data.token, user: res.body.data.user };
}

export const bearer = (token) => ({ Authorization: `Bearer ${token}` });

export function expense(overrides = {}) {
  return { type: 'expense', amount: 50_000, category: 'food', date: '2026-10-05', note: 'Korzinka', ...overrides };
}

export async function createTx(token, body) {
  return api().post('/api/transactions').set(bearer(token)).send(body);
}
