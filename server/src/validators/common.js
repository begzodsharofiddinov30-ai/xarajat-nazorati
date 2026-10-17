import { z } from 'zod';
import { EXPENSE_CATEGORIES, TYPES, isBuiltinCategory, isCustomKey } from '../utils/categories.js';
import { MONTH_RE, isValidDateString } from '../utils/month.js';

export const MAX_AMOUNT = 1_000_000_000_000;

export const monthField = z.string().regex(MONTH_RE, "Oy YYYY-MM formatida bo'lishi kerak");

export const dateField = (message = "Sana YYYY-MM-DD formatida va to'g'ri bo'lishi kerak") =>
  z.string({ required_error: 'Sanani kiriting' }).refine(isValidDateString, message);

export const typeField = z.enum(TYPES, { errorMap: () => ({ message: "Tur 'income' yoki 'expense' bo'lishi kerak" }) });

export const amountField = z
  .number({ required_error: 'Summani kiriting', invalid_type_error: "Summa son bo'lishi kerak" })
  .int("Summa butun son bo'lishi kerak (tiyinsiz)")
  .positive("Summa musbat bo'lishi kerak")
  .max(MAX_AMOUNT, 'Summa juda katta');

// Shakl tekshiruvi (tayyor kategoriya yoki c_<id>). Mavjudligi servis qatlamida tekshiriladi.
export const categoryKeyField = z
  .string({ required_error: 'Kategoriyani tanlang' })
  .max(40)
  .refine((k) => isBuiltinCategory(k) || isCustomKey(k), "Kategoriya noto'g'ri");

export const expenseCategoryKeyField = z
  .string({ required_error: 'Kategoriyani tanlang' })
  .max(40)
  .refine(
    (k) => EXPENSE_CATEGORIES.includes(k) || isCustomKey(k),
    "Budjet faqat xarajat kategoriyasi uchun o'rnatiladi",
  );

export const noteField = (max = 200) => z.string().trim().max(max, `Izoh ${max} belgidan oshmasin`).optional().default('');

// Ixtiyoriy bog'lanish (masalan, Loan _id). null — bog'lanmagan.
export const refField = z
  .string()
  .regex(/^[0-9a-f]{24}$/, "Raqam noto'g'ri")
  .nullable()
  .optional()
  .transform((v) => v ?? null);

// Foydalanuvchining mahalliy "bugun" sanasi (soat poyasi farqi uchun); bermasa server UTC sanasi olinadi.
export const todayField = dateField().optional();
