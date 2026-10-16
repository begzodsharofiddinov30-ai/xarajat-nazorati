import { z } from 'zod';
import { EXPENSE_CATEGORIES } from '../utils/categories.js';
import { monthField } from './transaction.schema.js';

const category = z.enum(EXPENSE_CATEGORIES, {
  errorMap: () => ({ message: "Budjet faqat xarajat kategoriyasi uchun o'rnatiladi" }),
});

export const budgetUpsertSchema = z.object({
  category,
  limit: z
    .number({ required_error: 'Limitni kiriting', invalid_type_error: "Limit son bo'lishi kerak" })
    .int("Limit butun son bo'lishi kerak")
    .positive("Limit musbat bo'lishi kerak")
    .max(1_000_000_000_000, 'Limit juda katta'),
});

export const budgetCategoryParamSchema = z.object({ category });

export const monthQuerySchema = z.object({ month: monthField.optional() });
