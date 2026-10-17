import { z } from 'zod';
import { FREQUENCIES } from '../utils/recurrence.js';
import { amountField, categoryKeyField, dateField, noteField, refField, typeField } from './common.js';

export const recurringBodySchema = z
  .object({
    type: typeField,
    amount: amountField,
    category: categoryKeyField,
    note: noteField(),
    frequency: z.enum(FREQUENCIES, { errorMap: () => ({ message: "Takrorlanish: daily, weekly yoki monthly" }) }),
    startDate: dateField("Boshlanish sanasi YYYY-MM-DD formatida bo'lishi kerak"),
    endDate: dateField("Tugash sanasi YYYY-MM-DD formatida bo'lishi kerak").nullable().optional(),
    active: z.boolean().optional().default(true),
    loan: refField,
  })
  .superRefine((v, ctx) => {
    if (v.endDate && v.endDate < v.startDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: "Tugash sanasi boshlanishdan oldin bo'lmasin" });
    }
  });
