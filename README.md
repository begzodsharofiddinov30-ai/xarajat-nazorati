# Xarajat Nazorati

Shaxsiy daromad va xarajatlarni hisobga olish uchun veb-ilova. Interfeys o'zbek tilida, summalar butun so'mda.

**Imkoniyatlar:**

- ro'yxatdan o'tish va kirish (JWT), profil sozlamalari: ismni o'zgartirish, parolni almashtirish (boshqa qurilmalar chiqib ketadi), "boshqa qurilmalardan chiqish", hisobni o'chirish;
- tranzaksiyalarni qo'shish, tahrirlash va o'chirish (o'chirishni bekor qilish mumkin), oylik hisobot, kategoriya va kunlik grafiklar, oxirgi 6 oylik daromad/xarajat trendi;
- filtrlar: oy yoki sana oralig'i, tur, kategoriya, summa oralig'i, izoh bo'yicha qidiruv, saralash va sahifalash;
- **oy oxirigacha xarajat prognozi** va budjet kategoriyalari uchun "shu tempda limitdan oshasiz" ogohlantirishi;
- kategoriya bo'yicha oylik limitlar: 80% ga yetganda ham, oshganda ham ogohlantirish;
- **o'z kategoriyalaringiz** (nom va emoji ikonka);
- **takroriy to'lovlar** (kunlik, haftalik, oylik): ijara, obuna, maosh o'zi qo'shiladi;
- **jamg'arma maqsadlari**: maqsad summasi, muddat, qo'shilgan mablag'lar va oylik kerakli summa;
- **CSV import** (saqlashdan oldin ko'rib chiqish, takrorlarni o'tkazib yuborish) va CSV eksport;
- dark mode, mobil uchun moslashgan dizayn.

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

Testlar xotirada ishlaydigan alohida MongoDB'dan foydalanadi, shuning uchun MongoDB server o'rnatish shart emas. Birinchi ishga tushirishda MongoDB binari (~100 MB) yuklab olinadi. Testlar quyidagilarni tekshiradi: auth va profil (parol almashtirilganda eski token o'chishi, hisobni o'chirish), tranzaksiyalar CRUD va filtrlar, oylik hisobot, trend va prognoz, egalik (boshqa foydalanuvchi ma'lumotiga kira olmaslik), budjet ogohlantirishlari, o'z kategoriyalar, takroriy qoidalar, maqsadlar, CSV import va uning tahlili.

Har bir push va pull request'da shu testlar hamda client build'i GitHub Actions'da (`.github/workflows/ci.yml`) avtomatik ishga tushadi.

Kodni formatlash: `npm run format` (Prettier, sozlamalar `.prettierrc.json` da). Tekshirish uchun: `npm run format:check`.

### Production (Vercel)

Sayt Vercel'da ishlaydi: **https://xarajat-nazorati.vercel.app**. `main` ga har bir push avtomatik deploy qilinadi, pull request'lar uchun esa alohida preview manzil yaratiladi.

- Frontend (`client/dist`) Vercel CDN orqali statik fayl sifatida tarqatiladi.
- Butun API bitta serverless funksiya: `api/index.js` → `server/src/serverless.js`. U Express ilovasini ishga tushiradi va MongoDB ulanishini keyingi so'rovlar uchun saqlab qoladi.
- Sozlamalar `vercel.json` da: build buyruqlari, `/api/*` ni funksiyaga yo'naltirish, SPA uchun `index.html` ga qaytish va region `fra1` (MongoDB Atlas Frankfurt'da, shuning uchun kechikish kam).
- `.vercelignore` mahalliy `.env` fayllarni yuklashdan saqlaydi.

Vercel loyihasidagi muhit o'zgaruvchilari (Settings → Environment Variables):

| O'zgaruvchi | Qiymat |
|---|---|
| `NODE_ENV` | `production` |
| `MONGO_URI` | MongoDB Atlas ulanish manzili |
| `JWT_SECRET` | Kamida 32 belgi: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Kalit kuchsiz bo'lsa yoki namunadagi qiymat qolsa, server ishga tushmaydi |
| `TRUST_PROXY` | `1`: rate limit foydalanuvchining haqiqiy IP manzili bo'yicha ishlaydi |
| `JWT_EXPIRES_IN` | `7d` |

Frontend va API bitta domenda, shuning uchun `CLIENT_URL` (CORS) kerak emas. Qo'lda deploy qilish: ildiz papkada `vercel deploy --prod`.

Health check manzili: `GET /api/health`. MongoDB ulanmagan bo'lsa, 503 qaytadi. MongoDB Atlas'da **Network Access** bo'limida `0.0.0.0/0` ga ruxsat bo'lishi kerak, chunki Vercel funksiyalarining IP manzili doimiy emas. Shu sababli kuchli parol ishlatiladi.

Oddiy serverda ham ishlatish mumkin: `npm run build && npm start` (`NODE_ENV=production`). Bunda Express `client/dist` ni o'zi tarqatadi.

Production bazasida `npm run seed` ishlatmang. U ma'lum parolli demo hisob yaratadi.

## Loyiha tuzilmasi

```
server/
  src/
    config/        env (zod bilan tekshiriladi), MongoDB ulanishi
    models/        User, Transaction, Budget, Category, Recurring, Goal
    validators/    zod sxemalari
    middleware/    auth, validate, errorHandler
    services/      budget, category, recurring, forecast, goal
    controllers/   auth, transaction, summary, budget
    routes/
    utils/         sana, takrorlanish (recurrence), prognoz (forecast) sof funksiyalari
    app.js         Express ilovasi (testlar uchun alohida)
    server.js
  scripts/seed.js
  tests/
client/
  src/
    api/           fetch klienti va endpoint funksiyalari
    context/       Auth, Categories, Theme, Month, Toast
    components/    Layout, formalar, grafiklar, budjet progress-bari
    pages/         Login, Register, Dashboard, Transactions, Budgets, Recurring, Goals, Categories, Settings
    utils/         formatlash, sanalar, kategoriyalar, CSV eksport va import
```

## API

Barcha himoyalangan endpoint'lar `Authorization: Bearer <token>` sarlavhasini talab qiladi.

| Metod | Yo'l | Tavsif |
|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password }` → `{ data: { token, user } }` |
| POST | `/api/auth/login` | `{ email, password }` → `{ data: { token, user } }` |
| GET | `/api/auth/me` | Joriy foydalanuvchi |
| PATCH | `/api/auth/profile` | `{ name }` |
| POST | `/api/auth/password` | `{ currentPassword, newPassword }` → yangi token; eski tokenlar yaroqsiz bo'ladi |
| POST | `/api/auth/logout-all` | Boshqa barcha qurilmalardan chiqarish → yangi token |
| DELETE | `/api/auth/account` | `{ password }`: hisob va barcha ma'lumot o'chiriladi |
| GET | `/api/transactions` | Filtrlar: `month=YYYY-MM` yoki `from`/`to` (YYYY-MM-DD), `type`, `category`, `q`, `minAmount`, `maxAmount`, `sort` (`date_desc`, `date_asc`, `amount_desc`, `amount_asc`), `page`, `limit` (≤1000). `meta.totals` butun filtr bo'yicha jami daromad/xarajat |
| POST | `/api/transactions/import` | `{ rows: [{ type, amount, category, date, note }], skipDuplicates }` (≤1000 qator) → `{ data: { imported, skipped, invalid[] } }` |
| POST | `/api/transactions` | `{ type, amount, category, date: "YYYY-MM-DD", note? }` → `{ data, warning }` |
| PUT | `/api/transactions/:id` | To'liq yangilash, javob POST bilan bir xil |
| DELETE | `/api/transactions/:id` | 204 |
| GET | `/api/summary?month=YYYY-MM&today=YYYY-MM-DD` | `income`, `expense`, `balance`, `byCategory[]`, `daily[]`, `forecast` (faqat joriy oy uchun, aks holda `null`) |
| GET | `/api/summary/trend?month=YYYY-MM&months=6` | Oxirgi oylar: `[{ month, income, expense, balance }]` |
| GET | `/api/budgets?month=YYYY-MM&today=YYYY-MM-DD` | Limitlar: `spent`, `percent`, `status` (`ok` / `warning` ≥80% / `exceeded`), joriy oy uchun `projected` va `projectedExceeds` bilan |
| PUT | `/api/budgets` | `{ category, limit }`: yangi limit yaratadi yoki mavjudini yangilaydi |
| DELETE | `/api/budgets/:category` | 204 |
| GET, POST | `/api/categories` | O'z kategoriyalar: `{ type, label, icon }`. Tranzaksiyada kalit `c_<id>` |
| PUT, DELETE | `/api/categories/:id` | Nom/ikonkani yangilash; tranzaksiya yoki takroriy qoida ishlatayotgan kategoriya o'chmaydi (409) |
| GET, POST | `/api/recurring` | `{ type, amount, category, note, frequency: daily/weekly/monthly, startDate, endDate?, active }` |
| PUT, DELETE | `/api/recurring/:id` | O'zgarish bugundan boshlab amal qiladi; o'chirilsa, yaratilgan tranzaksiyalar qoladi |
| GET, POST | `/api/goals` | Maqsad: `{ name, targetAmount, deadline? }` → `saved`, `percent`, `remaining`, `monthlyNeeded` |
| PUT, DELETE | `/api/goals/:id` | |
| POST | `/api/goals/:id/contributions` | `{ amount, date?, note? }`: musbat — qo'shish, manfiy — qaytarib olish |
| DELETE | `/api/goals/:id/contributions/:cid` | |

**Xatolar** doim bir xil formatda qaytadi:

```json
{ "error": { "message": "Ma'lumotlar noto'g'ri", "code": "VALIDATION_ERROR", "details": [{ "path": "amount", "message": "..." }] } }
```

**Budjet ogohlantirishi:** xarajat qo'shilgandan yoki tahrirlangandan keyin o'sha oydagi kategoriya xarajati limitning 80% iga yetsa yoki limitdan oshsa, javobda `warning: { category, month, limit, spent, exceededBy, level: 'warning' | 'exceeded', message }` qaytadi. Tranzaksiya baribir saqlanadi.

## Asosiy qarorlar

- **Prognoz** (`server/src/utils/forecast.js`). Takroriy to'lovlar (ijara, obuna) tempga ko'paytirilmaydi. Qolgan ("o'zgaruvchan") xarajatlar bugungacha bo'lgan kunlik o'rtacha bo'yicha oy oxirigacha davom etadi, oxirida hali yaratilmagan takroriy to'lovlar qo'shiladi. Formula: `hozirgacha + kunlik o'rtacha × qolgan kunlar + kutilayotgan takroriy`. Oyning dastlabki kunlarida prognoz kam aniq (`confidence: low`). Klient o'zining mahalliy sanasini `today` bilan yuboradi, shuning uchun soat poyasi farqi (Toshkent UTC+5) hisobni siljitmaydi.
- **Takroriy tranzaksiyalar** alohida rejalashtiruvchi (cron) talab qilmaydi: ma'lumot o'qiladigan so'rovlardan oldin yetishmayotgan yozuvlar yaratiladi. Serverless muhitda doimiy ishlaydigan jarayon yo'q, shunday bo'lsa ham hech narsa o'tib ketmaydi. `(user, recurring, date)` bo'yicha unikal indeks bir kunga ikki marta yozishga yo'l qo'ymaydi. Server sanasi UTC bo'yicha, shuning uchun Toshkentda yozuv ertalab soat 05:00 da paydo bo'ladi.
- **O'z kategoriyalar.** Tranzaksiyada kalit sifatida `c_<id>` saqlanadi. Ishlatilayotgan kategoriya o'chirilmaydi, shunda eski yozuvlar nomsiz qolmaydi.
- **Sessiyalar.** JWT ichida `ver` bor va u foydalanuvchining `tokenVersion` i bilan solishtiriladi: parol almashtirilganda yoki "boshqa qurilmalardan chiqish" bosilganda eski tokenlar darhol yaroqsiz bo'ladi.
- **CSV import** qatorlarni alohida tekshiradi: yaroqlilari saqlanadi, yaroqsizlari sabab bilan qaytadi. Takrorlar (sana, tur, summa, kategoriya va izohi bir xil) o'tkazib yuboriladi, shuning uchun bir faylni ikki marta yuklash xavfsiz.
- **Maqsadlar** tranzaksiyalar va balansga ta'sir qilmaydi: jamg'arma yozuvlari faqat shu maqsad uchun hisoblanadi.

- **Egalik.** Har bir so'rov `{ _id, user }` filtri bilan bajariladi. Boshqa foydalanuvchining yozuvi so'ralsa 404 qaytadi (403 emas), shunda yozuv borligi oshkor bo'lmaydi.
- **Sanalar** UTC yarim tunida saqlanadi va `YYYY-MM-DD` ko'rinishida qaytadi, shuning uchun vaqt zonasi tranzaksiyani boshqa oyga o'tkazib yubormaydi.
- **Limitlar** har oy uchun takrorlanadi: har bir kategoriyaga bitta limit qo'yiladi va u barcha oylarga amal qiladi.
- **Grafik.** 9 ta kategoriyani pie chart'da ranglar bilan ajratish qiyin, shuning uchun kamayish tartibidagi gorizontal bar chart ishlatilgan. Har bir grafik ostida jadval ko'rinishi ham bor.
- **CSV** UTF-8 BOM bilan yaratiladi, shunda Excel o'zbekcha harflarni to'g'ri ko'rsatadi.
