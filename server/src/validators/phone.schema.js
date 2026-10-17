import { z } from 'zod';
import { OPERATORS, normalizePhone } from '../utils/phone.js';
import { monthField } from './common.js';

export const phoneBodySchema = z.object({
  label: z.string().trim().min(1, 'Nomini kiriting').max(30, 'Nom 30 belgidan oshmasin'),
  number: z
    .string({ required_error: 'Raqamni kiriting' })
    .transform((v, ctx) => {
      const n = normalizePhone(v);
      if (!n) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Raqam noto'g'ri. Masalan: +998 90 123 45 67" });
      return n ?? z.NEVER;
    }),
  // Berilmasa raqamdan aniqlanadi.
  operator: z.enum(OPERATORS).optional(),
});

export const phoneListQuerySchema = z.object({ month: monthField.optional() });
