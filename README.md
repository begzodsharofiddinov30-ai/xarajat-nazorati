# Xarajat Nazorati

Shaxsiy daromad va xarajatlarni hisobga olish uchun veb-ilova. Interfeys o'zbek tilida, summalar butun so'mda.

**Imkoniyatlar:** ro'yxatdan o'tish va kirish (JWT), tranzaksiyalarni qo'shish, tahrirlash va o'chirish, oylik hisobot (jami summalar, kategoriyalar va kunlik grafiklar), kategoriya bo'yicha oylik limitlar va ulardan oshganda ogohlantirish, filtrlar va izoh bo'yicha qidiruv, CSV eksport, dark mode, mobil uchun moslashgan dizayn.

| Qism | Texnologiyalar |
|---|---|
| Frontend | React 19, Vite, React Router, Recharts, Tailwind CSS 4 |
| Backend | Node.js 20+, Express 5, Mongoose, zod, JWT, bcrypt |
| Ma'lumotlar bazasi | MongoDB |
| Testlar | Vitest, supertest, mongodb-memory-server |

## Talablar

- Node.js 20 yoki undan yangi versiya
- MongoDB 7+ (lokal o'rnatilgan yoki MongoDB Atlas)

## O'rnatish va ishga tushirish

```bash
# 1. Backend
cd server
cp .env.example .env        # JWT_SECRET ni uzun tasodifiy qatorga almashtiring
npm install
npm run seed                # demo ma'lumotlar (ixtiyoriy)
npm run dev                 # http://localhost:4000

# 2. Frontend (yangi terminalda)
cd client
npm install
npm run dev                 # http://localhost:5173
```

Demo hisob: `demo@xarajat.uz` / `demo1234`. Seed skriptini qayta ishga tushirsangiz, demo ma'lumotlar qaytadan yaratiladi.

Dev rejimida Vite `/api` so'rovlarini `localhost:4000` ga yo'naltiradi, shuning uchun CORS sozlash shart emas.

> **macOS:** 5000-portni AirPlay Receiver band qiladi, shuning uchun backend standart holatda 4000-portda ishlaydi.

### Muhit o'zgaruvchilari (`server/.env`)

| O'zgaruvchi | Tavsif |
|---|---|
| `NODE_ENV` | `development` yoki `production` |
| `PORT` | Backend porti (standart: 4000) |
| `MONGO_URI` | MongoDB ulanish manzili |
| `JWT_SECRET` | Token imzosi uchun maxfiy kalit, kamida 16 belgi |
| `JWT_EXPIRES_IN` | Token amal qilish muddati (standart: `7d`) |
| `CLIENT_URL` | CORS uchun ruxsat etilgan frontend manzili. Bir nechta manzil vergul bilan yoziladi |
| `TRUST_PROXY` | Proksi orqasida `1`, aks holda `0` |

Frontend uchun `client/.env` faylida `VITE_API_URL` beriladi. U faqat backend boshqa domenda joylashganda kerak.

### Testlar

```bash
cd server
npm test
```

Testlar xotirada ishlaydigan alohida MongoDB'dan foydalanadi, shuning uchun MongoDB server o'rnatish shart emas. Birinchi ishga tushirishda MongoDB binari (~100 MB) yuklab olinadi. Testlar quyidagilarni tekshiradi: auth, tranzaksiyalar CRUD va filtrlar, oylik hisobot, egalik (boshqa foydalanuvchi ma'lumotiga kira olmaslik), budjet ogohlantirishlari.

### Production

Production'da Express `client/dist` papkasini o'zi tarqatadi. Natijada bitta xizmat va bitta domen bo'ladi, CORS sozlash kerak emas. Ildiz papkadan quyidagilarni bajaring:

```bash
npm run build     # server (faqat production paketlari) + client'ni o'rnatadi va client'ni build qiladi
npm start         # NODE_ENV=production bo'lishi shart
```

Production uchun muhit o'zgaruvchilari:

| O'zgaruvchi | Qiymat |
|---|---|
| `NODE_ENV` | `production` |
| `MONGO_URI` | MongoDB Atlas ulanish manzili |
| `JWT_SECRET` | Kamida 32 belgi: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Kalit kuchsiz bo'lsa yoki namunadagi qiymat qolsa, server ishga tushmaydi |
| `CLIENT_URL` | Saytning manzili, masalan `https://xarajat.onrender.com` |
| `TRUST_PROXY` | `1` (Render, Railway yoki Nginx orqasida) |
| `PORT` | Odatda hosting o'zi beradi |

Hosting uchun health check manzili: `GET /api/health`. MongoDB ulanmagan bo'lsa, 503 qaytadi.

**Render.com misolida:**
1. Yangi **Web Service** yarating va repozitoriyni ulang.
2. Build Command: `npm run build`. Start Command: `npm start`.
3. Yuqoridagi muhit o'zgaruvchilarini kiriting.
4. MongoDB Atlas'da **Network Access** bo'limida hosting IP manzillariga ruxsat bering. Bepul tarifda `0.0.0.0/0` qo'yiladi va kuchli parol ishlatiladi.

Production bazasida `npm run seed` ishlatmang. U ma'lum parolli demo hisob yaratadi.

## Loyiha tuzilmasi

```
server/
  src/
    config/        env (zod bilan tekshiriladi), MongoDB ulanishi
    models/        User, Transaction, Budget
    validators/    zod sxemalari
    middleware/    auth, validate, errorHandler
    services/      budgetService (limitlarni tekshirish)
    controllers/   auth, transaction, summary, budget
    routes/
    app.js         Express ilovasi (testlar uchun alohida)
    server.js
  scripts/seed.js
  tests/
client/
  src/
    api/           fetch klienti va endpoint funksiyalari
    context/       Auth, Theme, Month, Toast
    components/    Layout, formalar, grafiklar, budjet progress-bari
    pages/         Login, Register, Dashboard, Transactions, Budgets
    utils/         formatlash, sanalar, kategoriyalar, CSV
```

## API

Barcha himoyalangan endpoint'lar `Authorization: Bearer <token>` sarlavhasini talab qiladi.

| Metod | Yo'l | Tavsif |
|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password }` → `{ data: { token, user } }` |
| POST | `/api/auth/login` | `{ email, password }` → `{ data: { token, user } }` |
| GET | `/api/auth/me` | Joriy foydalanuvchi |
| GET | `/api/transactions` | Filtrlar: `month=YYYY-MM`, `type`, `category`, `q`, `page`, `limit` (≤1000) |
| POST | `/api/transactions` | `{ type, amount, category, date: "YYYY-MM-DD", note? }` → `{ data, warning }` |
| PUT | `/api/transactions/:id` | To'liq yangilash, javob POST bilan bir xil |
| DELETE | `/api/transactions/:id` | 204 |
| GET | `/api/summary?month=YYYY-MM` | `income`, `expense`, `balance`, `byCategory[]`, `daily[]` |
| GET | `/api/budgets?month=YYYY-MM` | Limitlar: `spent`, `percent`, `status` (`ok` / `warning` ≥80% / `exceeded`) bilan |
| PUT | `/api/budgets` | `{ category, limit }`: yangi limit yaratadi yoki mavjudini yangilaydi |
| DELETE | `/api/budgets/:category` | 204 |

**Xatolar** doim bir xil formatda qaytadi:

```json
{ "error": { "message": "Ma'lumotlar noto'g'ri", "code": "VALIDATION_ERROR", "details": [{ "path": "amount", "message": "..." }] } }
```

**Budjet ogohlantirishi:** xarajat qo'shilgandan yoki tahrirlangandan keyin o'sha oydagi kategoriya xarajati limitdan oshsa, javobda `warning: { category, month, limit, spent, exceededBy, message }` qaytadi. Tranzaksiya baribir saqlanadi.

## Asosiy qarorlar

- **Egalik.** Har bir so'rov `{ _id, user }` filtri bilan bajariladi. Boshqa foydalanuvchining yozuvi so'ralsa 404 qaytadi (403 emas), shunda yozuv borligi oshkor bo'lmaydi.
- **Sanalar** UTC yarim tunida saqlanadi va `YYYY-MM-DD` ko'rinishida qaytadi, shuning uchun vaqt zonasi tranzaksiyani boshqa oyga o'tkazib yubormaydi.
- **Limitlar** har oy uchun takrorlanadi: har bir kategoriyaga bitta limit qo'yiladi va u barcha oylarga amal qiladi.
- **Grafik.** 9 ta kategoriyani pie chart'da ranglar bilan ajratish qiyin, shuning uchun kamayish tartibidagi gorizontal bar chart ishlatilgan. Har bir grafik ostida jadval ko'rinishi ham bor.
- **CSV** UTF-8 BOM bilan yaratiladi, shunda Excel o'zbekcha harflarni to'g'ri ko'rsatadi.
