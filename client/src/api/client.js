import { getItem, setItem } from '../utils/storage.js';

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
const TOKEN_KEY = 'xn_token';

export const getToken = () => getItem(TOKEN_KEY);
export const setToken = (token) => setItem(TOKEN_KEY, token);

let unauthorizedHandler = () => {};
export function onUnauthorized(fn) {
  unauthorizedHandler = fn;
}

export class ApiError extends Error {
  constructor(status, error) {
    super(error?.message ?? "Server bilan bog'lanib bo'lmadi");
    this.status = status;
    this.code = error?.code ?? 'NETWORK_ERROR';
    this.details = error?.details ?? [];
  }

  // Zod xatolarini forma maydonlariga bog'lash uchun: { amount: '...', date: '...' }
  get fieldErrors() {
    return Object.fromEntries(this.details.map((d) => [d.path, d.message]));
  }
}

export async function request(path, { method = 'GET', body, query } = {}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== '') params.set(k, v);
  }
  const qs = params.toString();
  const token = getToken();

  let res;
  try {
    res = await fetch(`${BASE}/api${path}${qs ? `?${qs}` : ''}`, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0);
  }

  if (res.status === 204) return null;
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && token) unauthorizedHandler();
    throw new ApiError(res.status, json?.error);
  }
  return json;
}
