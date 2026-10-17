// Vercel serverless funksiyasi uchun handler (api/index.js shu faylni eksport qiladi).
// Funksiya "issiq" bo'lsa MongoDB ulanishi keyingi so'rovlarda qayta ishlatiladi.
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';

const app = createApp();
let connecting = null;

function ensureDB() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  // Bir vaqtda kelgan so'rovlar bitta ulanishni kutadi; xato bo'lsa keyingi so'rov qayta urinadi.
  connecting ??= connectDB(env.MONGO_URI).catch((err) => {
    connecting = null;
    throw err;
  });
  return connecting;
}

export default async function handler(req, res) {
  try {
    await ensureDB();
  } catch (err) {
    console.error("MongoDB ga ulanib bo'lmadi:", err);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { message: "Server vaqtincha ishlamayapti", code: 'DB_UNAVAILABLE' } }));
    return;
  }
  // vercel.json dagi rewrite (/api/:path* -> /api) so'rovga ?path=... qo'shadi; ilovaga asl so'rov yetib borishi uchun olib tashlanadi.
  const url = new URL(req.url, 'http://localhost');
  if (url.searchParams.has('path')) {
    url.searchParams.delete('path');
    req.url = url.pathname + url.search;
  }
  return app(req, res);
}
