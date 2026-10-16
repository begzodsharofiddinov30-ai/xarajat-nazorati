// Demo ma'lumotlar: joriy oy (bugungacha) va undan oldingi 2 oy.
// Ishga tushirish: npm run seed
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { Budget } from '../src/models/Budget.js';
import { Transaction } from '../src/models/Transaction.js';
import { User } from '../src/models/User.js';

const DEMO = { name: 'Demo Foydalanuvchi', email: 'demo@xarajat.uz', password: 'demo1234' };

// Har safar bir xil natija chiqishi uchun oddiy deterministik tasodifiy generator.
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const between = (min, max) => Math.round((min + rand() * (max - min)) / 1000) * 1000;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const NOTES = {
  food: ['Korzinka', 'Bozor', 'Non va sut', 'Tushlik', 'Makro', 'Choyxona'],
  transport: ['Taksi', 'Metro', 'Benzin', 'Avtobus'],
  entertainment: ['Kino', "Do'stlar bilan kafe", 'Konsert', 'Obuna'],
  health: ['Dorixona', 'Shifokor qabuli'],
  clothing: ["Ko'ylak", 'Poyabzal', 'Kurtka'],
  education: ['Ingliz tili kursi', 'Kitoblar'],
  other: ["Sovg'a", 'Uy jihozlari', "Telefon ta'miri"],
};

function utc(y, m, d) {
  return new Date(Date.UTC(y, m, d));
}

function buildMonth(userId, year, month, lastDay) {
  const tx = [];
  const add = (day, type, category, amount, note = '') => {
    if (day <= lastDay) tx.push({ user: userId, type, category, amount, note, date: utc(year, month, day) });
  };

  add(5, 'income', 'salary', 8_000_000, 'Oylik maosh');
  if (rand() > 0.4) add(18, 'income', 'freelance', between(1_000_000, 3_000_000), 'Frilans loyiha');
  add(1, 'expense', 'housing', 2_500_000, 'Ijara');
  add(10, 'expense', 'utilities', between(300_000, 450_000), "Gaz, svet, suv");
  add(12, 'expense', 'utilities', 120_000, 'Internet');

  for (let day = 1; day <= lastDay; day++) {
    if (rand() > 0.25) add(day, 'expense', 'food', between(20_000, 180_000), pick(NOTES.food));
    if (rand() > 0.5) add(day, 'expense', 'transport', between(8_000, 45_000), pick(NOTES.transport));
    if (rand() > 0.85) add(day, 'expense', 'entertainment', between(50_000, 200_000), pick(NOTES.entertainment));
    if (rand() > 0.93) add(day, 'expense', 'health', between(30_000, 250_000), pick(NOTES.health));
    if (rand() > 0.95) add(day, 'expense', 'clothing', between(150_000, 600_000), pick(NOTES.clothing));
    if (rand() > 0.96) add(day, 'expense', 'other', between(50_000, 300_000), pick(NOTES.other));
  }
  add(3, 'expense', 'education', 600_000, NOTES.education[0]);
  return tx;
}

async function main() {
  await connectDB(env.MONGO_URI);

  const existing = await User.findOne({ email: DEMO.email });
  if (existing) {
    await Promise.all([
      Transaction.deleteMany({ user: existing._id }),
      Budget.deleteMany({ user: existing._id }),
      User.deleteOne({ _id: existing._id }),
    ]);
  }

  const user = await User.create({
    name: DEMO.name,
    email: DEMO.email,
    passwordHash: await bcrypt.hash(DEMO.password, 10),
  });

  const today = new Date();
  const transactions = [];
  for (let offset = 2; offset >= 0; offset--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - offset, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const lastDay = offset === 0 ? today.getUTCDate() : new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    transactions.push(...buildMonth(user._id, y, m, lastDay));
  }
  await Transaction.insertMany(transactions);

  await Budget.insertMany([
    { user: user._id, category: 'food', limit: 2_500_000 },
    { user: user._id, category: 'transport', limit: 500_000 },
    { user: user._id, category: 'entertainment', limit: 300_000 },
    { user: user._id, category: 'utilities', limit: 600_000 },
    { user: user._id, category: 'clothing', limit: 700_000 },
  ]);

  console.log(`Tayyor: ${transactions.length} ta tranzaksiya, 5 ta budjet.`);
  console.log(`Kirish: ${DEMO.email} / ${DEMO.password}`);
  await disconnectDB();
}

main().catch(async (err) => {
  console.error(err);
  await disconnectDB();
  process.exit(1);
});
