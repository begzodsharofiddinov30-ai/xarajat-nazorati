import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// Google ID token (JWT) ni qo'shimcha paketsiz tekshirish: imzo Google'ning ochiq kalitlari bilan,
// audience — bizning Client ID, issuer — Google. Kalitlar Cache-Control bo'yicha keshlanadi.
const CERTS_URL = 'https://www.googleapis.com/oauth2/v1/certs';
const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

let cache = { certs: null, expires: 0 };

async function loadCerts(force = false) {
  if (!force && cache.certs && Date.now() < cache.expires) return cache.certs;
  const res = await fetch(CERTS_URL);
  if (!res.ok) throw new Error(`Google kalitlarini yuklab bo'lmadi: ${res.status}`);
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get('cache-control') ?? '')?.[1] ?? 3600);
  cache = { certs: await res.json(), expires: Date.now() + maxAge * 1000 };
  return cache.certs;
}

export const googleClientIds = () =>
  env.GOOGLE_CLIENT_ID.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

// Yaroqli bo'lsa { sub, email, name } qaytaradi, aks holda null.
export async function verifyGoogleIdToken(idToken) {
  const kid = jwt.decode(idToken, { complete: true })?.header?.kid;
  if (!kid) return null;

  let certs = await loadCerts();
  // Google kalitlarni vaqti-vaqti bilan almashtiradi: noma'lum kid bo'lsa kalitlar qayta yuklanadi.
  if (!certs[kid]) certs = await loadCerts(true);
  if (!certs[kid]) return null;

  let payload;
  try {
    payload = jwt.verify(idToken, certs[kid], {
      algorithms: ['RS256'],
      audience: googleClientIds(),
      issuer: ISSUERS,
    });
  } catch {
    return null;
  }
  // Faqat Google tasdiqlagan email: aks holda boshqa odamning emaili bilan hisobga kirib olish mumkin bo'lardi.
  if (!payload.email || String(payload.email_verified) !== 'true') return null;
  return { sub: payload.sub, email: payload.email.toLowerCase(), name: payload.name };
}

// Testlar uchun.
export function resetGoogleCertsCache() {
  cache = { certs: null, expires: 0 };
}
