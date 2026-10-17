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

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Joriy parolni kiriting'),
  newPassword,
});

export const deleteAccountSchema = z.object({ password: z.string().min(1, 'Parolni kiriting') });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Parolni kiriting'),
});
