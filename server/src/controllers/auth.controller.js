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
  const user = await User.findByIdAndUpdate(req.user.id, { $set: { name: req.valid.body.name } }, { new: true, runValidators: true });
  if (!user) throw ApiError.unauthorized();
  res.json({ data: { user } });
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.valid.body;
  const user = await loadWithPassword(req);
  await assertPassword(user, currentPassword, 'currentPassword');

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();

  // Boshqa qurilmalardagi sessiyalar tugaydi; joriy qurilma yangi token oladi.
  res.json({ data: { token: signToken(user), user } });
}

export async function logoutAll(req, res) {
  const user = await User.findByIdAndUpdate(req.user.id, { $inc: { tokenVersion: 1 } }, { new: true });
  if (!user) throw ApiError.unauthorized();
  res.json({ data: { token: signToken(user), user } });
}

export async function deleteAccount(req, res) {
  const user = await loadWithPassword(req);
  await assertPassword(user, req.valid.body.password, 'password');

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
