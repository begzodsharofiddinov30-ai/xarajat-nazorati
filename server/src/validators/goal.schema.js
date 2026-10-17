import { z } from 'zod';
import { MAX_AMOUNT, amountField, dateField, noteField } from './common.js';

const name = z.string({ required_error: 'Maqsad nomini kiriting' }).trim().min(2, 'Nom kamida 2 ta belgi').max(60, 'Nom 60 belgidan oshmasin');

export const goalBodySchema = z.object({
  name,
  targetAmount: amountField,
  deadline: dateField("Muddat YYYY-MM-DD formatida bo'lishi kerak").nullable().optional(),
});

export const contributionSchema = z.object({
  // Musbat — qo'shish, manfiy — qaytarib olish.
  amount: z
    .number({ required_error: 'Summani kiriting', invalid_type_error: "Summa son bo'lishi kerak" })
    .int("Summa butun son bo'lishi kerak")
    .refine((n) => n !== 0, "Summa nol bo'lmasin")
    .refine((n) => Math.abs(n) <= MAX_AMOUNT, 'Summa juda katta'),
  date: dateField().optional(),
  note: noteField(100),
});

export const goalListQuerySchema = z.object({ today: dateField().optional() });
