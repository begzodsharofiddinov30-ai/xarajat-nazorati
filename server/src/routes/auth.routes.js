import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import {
  changePassword,
  deleteAccount,
  login,
  logoutAll,
  me,
  register,
  updateProfile,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  changePasswordSchema,
  deleteAccountSchema,
  loginSchema,
  profileSchema,
  registerSchema,
} from '../validators/auth.schema.js';

// Parolni tanlab topishga urinishlarni sekinlashtiradi.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  message: { error: { message: "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring", code: 'TOO_MANY_REQUESTS' } },
});

const router = Router();

router.post('/register', authLimiter, validate({ body: registerSchema }), register);
router.post('/login', authLimiter, validate({ body: loginSchema }), login);
router.get('/me', requireAuth, me);
router.patch('/profile', requireAuth, validate({ body: profileSchema }), updateProfile);
router.post('/password', requireAuth, authLimiter, validate({ body: changePasswordSchema }), changePassword);
router.post('/logout-all', requireAuth, logoutAll);
router.delete('/account', requireAuth, authLimiter, validate({ body: deleteAccountSchema }), deleteAccount);

export default router;
