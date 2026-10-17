// Vercel serverless funksiyasi: butun Express API shu bitta funksiya orqali ishlaydi (vercel.json dagi rewrites).
// Paketlar server/node_modules dan olinishi uchun asosiy kod server/src/serverless.js da.
export { default } from '../server/src/serverless.js';
