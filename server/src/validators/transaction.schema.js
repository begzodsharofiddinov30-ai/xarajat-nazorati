import { z } from 'zod';
import { ALL_CATEGORIES, TYPES, isValidCategory } from '../utils/categories.js';
import { MONTH_RE, isValidDateString } from '../utils/month.js';

export const monthField = z.string().regex(MONTH_RE, "Oy YYYY-MM formatida bo'lishi kerak");

export const transactionBodySchema = z
  .object({
    type: z.enum(TYPES, { errorMap: () => ({ message: "Tur 'income' yoki 'expense' bo'lishi kerak" }) }),
    amount: z
      .number({ required_error: 'Summani kiriting', invalid_type_error: "Summa son bo'lishi kerak" })
      .int("Summa butun son bo'lishi kerak (tiyinsiz)")
      .positive("Summa musbat bo'lishi kerak")
      .max(1_000_000_000_000, 'Summa juda katta'),
    category: z.string({ required_error: 'Kategoriyani tanlang' }),
    date: z
      .string({ required_error: 'Sanani kiriting' })
      .refine(isValidDateString, "Sana YYYY-MM-DD formatida va to'g'ri bo'lishi kerak"),
    note: z.string().trim().max(200, 'Izoh 200 belgidan oshmasin').optional().default(''),
  })
  .superRefine((val, ctx) => {
    if (!isValidCategory(val.type, val.category)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['category'],
        message: 'Kategoriya tranzaksiya turiga mos emas',
      });
    }
  });

export const transactionListQuerySchema = z.object({
  month: monthField.optional(),
  type: z.enum(TYPES).optional(),
  category: z.enum(ALL_CATEGORIES).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(500),
});
