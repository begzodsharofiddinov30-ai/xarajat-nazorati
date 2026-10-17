import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { requireAuth } from './middleware/auth.js';
import { catchUpRecurring } from './middleware/recurring.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import budgetRoutes from './routes/budget.routes.js';
import categoryRoutes from './routes/category.routes.js';
import goalRoutes from './routes/goal.routes.js';
import loanRoutes from './routes/loan.routes.js';
import recurringRoutes from './routes/recurring.routes.js';
import summaryRoutes from './routes/summary.routes.js';
import transactionRoutes from './routes/transaction.routes.js';

const CLIENT_DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  message: { error: { message: "Juda ko'p so'rov. Birozdan keyin qayta urinib ko'ring", code: 'TOO_MANY_REQUESTS' } },
});

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  if (env.TRUST_PROXY) app.set('trust proxy', env.TRUST_PROXY);

  // Google orqali kirish (accounts.google.com/gsi) uchun Google talab qiladigan istisnolar:
  // skript, iframe va uslublar shu manzildan; popup oynasi bilan aloqa (COOP) va referrer.
  const GSI = 'https://accounts.google.com/gsi/';
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'script-src': ["'self'", `${GSI}client`],
          'frame-src': ["'self'", GSI],
          'connect-src': ["'self'", GSI],
          'style-src': ["'self'", 'https:', "'unsafe-inline'"],
        },
      },
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );
  app.use(cors({ origin: env.CLIENT_URL.split(',').map((s) => s.trim()) }));
  // Import bitta so'rovda 1000 tagacha qator yuboradi, shuning uchun faqat shu yo'lga kattaroq limit.
  app.use('/api/transactions/import', express.json({ limit: '1mb' }));
  app.use(express.json({ limit: '100kb' }));
  // Google redirect usuli formani application/x-www-form-urlencoded ko'rinishida yuboradi.
  app.use('/api/auth/google/redirect', express.urlencoded({ extended: false, limit: '10kb' }));

  app.get('/api/health', (_req, res) => {
    const db = mongoose.connection.readyState === 1;
    res.status(db ? 200 : 503).json({ data: { status: db ? 'ok' : 'degraded', db } });
  });

  app.use('/api', apiLimiter);
  app.use('/api/auth', authRoutes);
  app.use('/api/transactions', requireAuth, catchUpRecurring, transactionRoutes);
  app.use('/api/summary', requireAuth, catchUpRecurring, summaryRoutes);
  app.use('/api/budgets', requireAuth, catchUpRecurring, budgetRoutes);
  app.use('/api/categories', requireAuth, categoryRoutes);
  app.use('/api/recurring', requireAuth, recurringRoutes);
  app.use('/api/goals', requireAuth, goalRoutes);
  app.use('/api/loans', requireAuth, catchUpRecurring, loanRoutes);

  // Production'da frontend build'ini shu serverning o'zi tarqatadi: bitta xizmat, bitta domen, CORS kerak emas.
  if (env.NODE_ENV === 'production' && fs.existsSync(CLIENT_DIST)) {
    app.use(
      '/assets',
      express.static(path.join(CLIENT_DIST, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }),
    );
    app.use(express.static(CLIENT_DIST, { index: false, maxAge: '1h' }));
    app.get(/^\/(?!api(\/|$)).*/, (_req, res) => {
      res.set('Cache-Control', 'no-cache');
      res.sendFile(path.join(CLIENT_DIST, 'index.html'));
    });
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
