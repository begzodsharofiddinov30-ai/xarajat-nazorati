import { z } from 'zod';
import { MAX_AMOUNT, expenseCategoryKeyField, monthField, todayField } from './common.js';

export const budgetUpsertSchema = z.object({
  category: expenseCategoryKeyField,
  limit: z
    .number({ required_error: 'Limitni kiriting', invalid_type_error: "Limit son bo'lishi kerak" })
    .int("Limit butun son bo'lishi kerak")
    .positive("Limit musbat bo'lishi kerak")
    .max(MAX_AMOUNT, 'Limit juda katta'),
});

export const budgetCategoryParamSchema = z.object({ category: expenseCategoryKeyField });

export const monthQuerySchema = z.object({ month: monthField.optional(), today: todayField });

export const trendQuerySchema = z.object({
  month: monthField.optional(),
  months: z.coerce.number().int().min(2).max(12).default(6),
});
