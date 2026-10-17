import { z } from 'zod';
import { LOAN_KINDS, LOAN_METHODS } from '../utils/loan.js';
import { amountField, dateField, noteField, todayField } from './common.js';

export const loanBodySchema = z.object({
  name: z.string().trim().min(1, 'Nomini kiriting').max(40, 'Nom 40 belgidan oshmasin'),
  lender: z.string().trim().max(50, '50 belgidan oshmasin').optional().default(''),
  kind: z.enum(LOAN_KINDS).default('credit'),
  principal: amountField,
  annualRate: z
    .number({ required_error: 'Foizni kiriting', invalid_type_error: "Foiz son bo'lishi kerak" })
    .min(0, "Foiz manfiy bo'lmasin")
    .max(200, 'Foiz juda katta')
    .refine((v) => Math.round(v * 100) === v * 100, "Foiz ko'pi bilan 2 xona kasr bo'lsin"),
  termMonths: z
    .number({ required_error: 'Muddatni kiriting', invalid_type_error: "Muddat son bo'lishi kerak" })
    .int('Muddat butun oylarda')
    .min(1, 'Muddat kamida 1 oy')
    .max(360, "Muddat 360 oydan oshmasin"),
  firstPaymentDate: dateField('Birinchi to\'lov sanasini kiriting'),
  method: z.enum(LOAN_METHODS).default('annuity'),
  closed: z.boolean().optional().default(false),
});

export const loanPaymentSchema = z.object({
  // Berilmasa keyingi to'lov summasi olinadi.
  amount: amountField.optional(),
  date: dateField().optional(),
  note: noteField(),
});

export const loanQuerySchema = z.object({ today: todayField });
