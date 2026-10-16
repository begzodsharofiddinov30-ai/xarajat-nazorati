import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

const SALT_ROUNDS = 10;
// Foydalanuvchi topilmasa ham bcrypt bajariladi: javob vaqtidan email mavjudligini bilib bo'lmaydi.
const DUMMY_HASH = bcrypt.hashSync('timing-safe-dummy-password', SALT_ROUNDS);

function signToken(user) {
  return jwt.sign({ sub: user.id }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
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
