import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';

process.on('unhandledRejection', (err) => {
  console.error('Ushlanmagan promise xatosi:', err);
});

async function main() {
  await connectDB(env.MONGO_URI);
  const server = createApp().listen(env.PORT, () => {
    console.log(`Server ishga tushdi: http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  let closing = false;
  const shutdown = async (signal) => {
    if (closing) return;
    closing = true;
    console.log(`${signal} qabul qilindi, server to'xtatilmoqda...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    // Ochiq ulanishlar yopilmasa ham 10 soniyadan keyin chiqib ketadi.
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error("Serverni ishga tushirib bo'lmadi:", err);
  process.exit(1);
});
