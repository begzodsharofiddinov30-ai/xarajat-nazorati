import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

export async function requireAuth(req, _res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw ApiError.unauthorized("Sessiya muddati tugagan yoki token noto'g'ri", 'INVALID_TOKEN');
  }

  // Foydalanuvchi o'chirilgan bo'lsa, eski token ishlamasligi kerak.
  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized("Sessiya muddati tugagan yoki token noto'g'ri", 'INVALID_TOKEN');

  req.user = { id: user.id, name: user.name, email: user.email };
  next();
}
