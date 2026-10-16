import { z } from 'zod';

const email = z.string().trim().toLowerCase().email("Email noto'g'ri");

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Ism kamida 2 ta belgi').max(50, 'Ism juda uzun'),
  email,
  // bcrypt faqat birinchi 72 baytni hisobga oladi, undan uzunini qabul qilmaymiz.
  password: z
    .string()
    .min(6, "Parol kamida 6 ta belgi bo'lishi kerak")
    .refine((p) => Buffer.byteLength(p, 'utf8') <= 72, 'Parol juda uzun (72 baytdan oshmasin)'),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Parolni kiriting'),
});
