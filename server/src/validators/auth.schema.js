import { z } from 'zod';

const email = z.string().trim().toLowerCase().email("Email noto'g'ri");

// bcrypt faqat birinchi 72 baytni hisobga oladi, undan uzunini qabul qilmaymiz.
const newPassword = z
  .string()
  .min(6, "Parol kamida 6 ta belgi bo'lishi kerak")
  .refine((p) => Buffer.byteLength(p, 'utf8') <= 72, 'Parol juda uzun (72 baytdan oshmasin)');
const name = z.string().trim().min(2, 'Ism kamida 2 ta belgi').max(50, 'Ism juda uzun');

export const registerSchema = z.object({ name, email, password: newPassword });

export const profileSchema = z.object({ name });

// Faqat Google orqali ochilgan (paroli yo'q) hisobda joriy parol so'ralmaydi: controller tekshiradi.
export const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword,
});

// Paroli bor hisob parol bilan, paroli yo'q (Google) hisob emailini yozib tasdiqlaydi.
export const deleteAccountSchema = z.object({
  password: z.string().optional(),
  confirmEmail: z.string().trim().toLowerCase().optional(),
});

export const googleSchema = z.object({ credential: z.string().min(20).max(5000) });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Parolni kiriting'),
});
