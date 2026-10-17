import { z } from 'zod';
import { amountField, categoryKeyField, dateField, monthField, noteField, phoneRefField, typeField } from './common.js';

export { monthField };

export const transactionBodySchema = z.object({
  type: typeField,
  amount: amountField,
  category: categoryKeyField,
  date: dateField(),
  note: noteField(),
  phone: phoneRefField,
});

const SORTS = ['date_desc', 'date_asc', 'amount_desc', 'amount_asc'];

export const transactionListQuerySchema = z
  .object({
    month: monthField.optional(),
    // from/to berilsa, month e'tiborga olinmaydi.
    from: dateField().optional(),
    to: dateField().optional(),
    type: typeField.optional(),
    category: categoryKeyField.optional(),
    phone: z.string().regex(/^[0-9a-f]{24}$/).optional(),
    q: z.string().trim().max(100).optional(),
    minAmount: z.coerce.number().int().min(0).optional(),
    maxAmount: z.coerce.number().int().min(0).optional(),
    sort: z.enum(SORTS).default('date_desc'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(1000).default(500),
  })
  .superRefine((q, ctx) => {
    if (q.from && q.to && q.from > q.to) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: "Tugash sanasi boshlanishdan oldin bo'lmasin" });
    }
    if (q.minAmount != null && q.maxAmount != null && q.minAmount > q.maxAmount) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['maxAmount'], message: "Maksimal summa minimaldan kichik bo'lmasin" });
    }
  });

export const MAX_IMPORT_ROWS = 1000;

// Import: qatorlar alohida tekshiriladi (yaroqsizlari hisobotga tushadi), shuning uchun bu yerda faqat o'ram.
export const transactionImportSchema = z.object({
  rows: z.array(z.record(z.any())).min(1, "Import uchun qatorlar yo'q").max(MAX_IMPORT_ROWS, `Bir martada ${MAX_IMPORT_ROWS} tadan ko'p qator import qilib bo'lmaydi`),
  skipDuplicates: z.boolean().default(true),
});
