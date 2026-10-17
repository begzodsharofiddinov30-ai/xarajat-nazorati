import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Budget } from '../models/Budget.js';
import { Category } from '../models/Category.js';
import { Goal } from '../models/Goal.js';
import { Recurring } from '../models/Recurring.js';
import { Transaction } from '../models/Transaction.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { googleClientIds, verifyGoogleIdToken } from '../utils/googleToken.js';

const SALT_ROUNDS = 10;
// Foydalanuvchi topilmasa ham bcrypt bajariladi: javob vaqtidan email mavjudligini bilib bo'lmaydi.
const DUMMY_HASH = bcrypt.hashSync('timing-safe-dummy-password', SALT_ROUNDS);

// Token ichidagi `ver` foydalanuvchining tokenVersion i bilan mos bo'lishi kerak (parol almashtirilsa eski tokenlar o'chadi).
function signToken(user) {
  return jwt.sign({ sub: user.id, ver: user.tokenVersion ?? 0 }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

export async function register(req, res) {
  const { name, email, password } = req.valid.body;

  if (await User.exists({ email })) {
    throw ApiError.conflict("Bu email bilan allaqachon ro'yxatdan o'tilgan", 'EMAIL_TAKEN');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email, passwordHash });

  res.status(201).json({ data: { token: signToken(user), user } });
}

export async function login(req, res) {
  const { email, password } = req.valid.body;
  const user = await User.findOne({ email }).select('+passwordHash');

  // Email yoki parol qaysi biri xato ekanini aytmaymiz.
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (user && !user.passwordHash) {
    throw ApiError.unauthorized(
      "Bu hisob Google orqali ochilgan. \"Google bilan kirish\" tugmasini bosing",
      'USE_GOOGLE_LOGIN',
    );
  }
  if (!user || !ok) throw ApiError.unauthorized("Email yoki parol noto'g'ri", 'INVALID_CREDENTIALS');

  res.json({ data: { token: signToken(user), user } });
}

export async function me(req, res) {
  res.json({ data: { user: req.user } });
}

async function loadWithPassword(req) {
  const user = await User.findById(req.user.id).select('+passwordHash');
  if (!user) throw ApiError.unauthorized();
  return user;
}

// Maxfiy amallar (parol almashtirish, akkauntni o'chirish) uchun joriy parol qayta so'raladi.
async function assertPassword(user, password, field) {
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    throw ApiError.badRequest("Ma'lumotlar noto'g'ri", 'VALIDATION_ERROR', [
      { path: field, message: "Parol noto'g'ri" },
    ]);
  }
}

export async function updateProfile(req, res) {
  const user = await User.findByIdAndUpdate(req.user.id, { $set: { name: req.valid.body.name } }, { new: true, runValidators: true }).select('+passwordHash');
  if (!user) throw ApiError.unauthorized();
  res.json({ data: { user } });
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.valid.body;
  const user = await loadWithPassword(req);
  // Paroli yo'q (Google orqali ochilgan) hisob birinchi parolini joriy parolsiz o'rnatadi.
  if (user.passwordHash) {
    if (!currentPassword) {
      throw ApiError.badRequest("Ma'lumotlar noto'g'ri", 'VALIDATION_ERROR', [
        { path: 'currentPassword', message: 'Joriy parolni kiriting' },
      ]);
    }
    await assertPassword(user, currentPassword, 'currentPassword');
  }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();

  // Boshqa qurilmalardagi sessiyalar tugaydi; joriy qurilma yangi token oladi.
  res.json({ data: { token: signToken(user), user } });
}

export async function logoutAll(req, res) {
  const user = await User.findByIdAndUpdate(req.user.id, { $inc: { tokenVersion: 1 } }, { new: true }).select('+passwordHash');
  if (!user) throw ApiError.unauthorized();
  res.json({ data: { token: signToken(user), user } });
}

export async function deleteAccount(req, res) {
  const user = await loadWithPassword(req);
  const { password, confirmEmail } = req.valid.body;
  if (user.passwordHash) {
    await assertPassword(user, password ?? '', 'password');
  } else if (confirmEmail !== user.email) {
    throw ApiError.badRequest("Ma'lumotlar noto'g'ri", 'VALIDATION_ERROR', [
      { path: 'confirmEmail', message: 'Tasdiqlash uchun emailingizni aniq yozing' },
    ]);
  }

  const owner = { user: user._id };
  await Promise.all([
    Transaction.deleteMany(owner),
    Budget.deleteMany(owner),
    Category.deleteMany(owner),
    Recurring.deleteMany(owner),
    Goal.deleteMany(owner),
  ]);
  await user.deleteOne();
  res.status(204).end();
}

// ---- Google orqali kirish ----

// Client ID maxfiy emas: frontend uni shu yerdan oladi, shuning uchun uni o'zgartirish uchun qayta build kerak emas.
export async function authConfig(_req, res) {
  res.json({ data: { googleClientId: googleClientIds()[0] ?? null } });
}

const safeName = (name, email) => {
  const n = (name ?? '').trim().slice(0, 50);
  return n.length >= 2 ? n : email.split('@')[0].slice(0, 50).padEnd(2, '_');
};

// Google hisobiga mos foydalanuvchini topadi, bog'laydi yoki yaratadi.
async function findOrCreateGoogleUser(credential) {
  if (!googleClientIds().length) {
    throw new ApiError(503, 'Google orqali kirish hali sozlanmagan', 'GOOGLE_NOT_CONFIGURED');
  }
  const g = await verifyGoogleIdToken(credential);
  if (!g) throw ApiError.unauthorized("Google orqali kirib bo'lmadi. Qaytadan urinib ko'ring", 'GOOGLE_INVALID');

  const byGoogle = await User.findOne({ googleId: g.sub }).select('+passwordHash');
  if (byGoogle) return byGoogle;

  const byEmail = await User.findOne({ email: g.email }).select('+passwordHash');
  if (byEmail) {
    // Shu email bilan ochilgan hisob bor: Google emailni tasdiqlagani uchun o'sha hisobga bog'laymiz.
    // Email hech qachon tasdiqlanmagan bo'lsa, kimdir begona emailni oldindan band qilib qo'ygan bo'lishi mumkin:
    // shuning uchun eski parol o'chiriladi va barcha eski sessiyalar tugatiladi (haqiqiy egasi kerak bo'lsa
    // Sozlamalarda yangi parol o'rnatadi).
    byEmail.googleId = g.sub;
    if (!byEmail.emailVerified) {
      byEmail.passwordHash = null;
      byEmail.tokenVersion = (byEmail.tokenVersion ?? 0) + 1;
      byEmail.emailVerified = true;
    }
    await byEmail.save();
    return byEmail;
  }

  try {
    return await User.create({ name: safeName(g.name, g.email), email: g.email, googleId: g.sub, emailVerified: true });
  } catch (err) {
    // Bir vaqtda ikki so'rov kelsa (masalan, ikki marta bosilgan), ikkinchisi birinchisi yaratganini oladi.
    if (err.code === 11000) return User.findOne({ email: g.email }).select('+passwordHash');
    throw err;
  }
}

export async function googleLogin(req, res) {
  const user = await findOrCreateGoogleUser(req.valid.body.credential);
  res.json({ data: { token: signToken(user), user } });
}

// Redirect usuli (iPhone'dagi o'rnatilgan ilova, Android ilovasi): Google formani shu manzilga POST qiladi.
// CSRF himoyasi: Google g_csrf_token ni ham cookie'ga, ham formaga qo'yadi, ular teng bo'lishi kerak.
export async function googleRedirect(req, res) {
  const csrfCookie = (req.headers.cookie ?? '')
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('g_csrf_token='))
    ?.slice('g_csrf_token='.length);
  const { credential, g_csrf_token: csrf } = req.body ?? {};
  const fail = (code) => res.redirect(303, `/login#google_error=${code}`);

  if (typeof csrf !== 'string' || !csrf || csrf !== csrfCookie || typeof credential !== 'string') return fail('csrf');
  try {
    const user = await findOrCreateGoogleUser(credential);
    // Token URL fragmentida: serverga yuborilmaydi va frontend uni darhol manzildan o'chiradi.
    res.redirect(303, `/#token=${encodeURIComponent(signToken(user))}`);
  } catch (err) {
    fail(err.code === 'GOOGLE_NOT_CONFIGURED' ? 'config' : 'invalid');
  }
}
