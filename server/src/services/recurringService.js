import { Recurring } from '../models/Recurring.js';
import { Transaction } from '../models/Transaction.js';
import { todayUtcStr, parseDateOnly } from '../utils/month.js';
import { dueOccurrences, pendingOccurrences } from '../utils/recurrence.js';

// Foydalanuvchining takroriy qoidalari bo'yicha bugungacha yaratilishi kerak bo'lgan tranzaksiyalarni yaratadi.
// So'rov paytida chaqiriladi, shuning uchun serverless (Vercel) muhitida doimiy jarayon bo'lmasa ham hech narsa o'tib ketmaydi.
// Takror chaqirish xavfsiz: (user, recurring, date) bo'yicha unikal indeks ikki marta yozishga yo'l qo'ymaydi.
export async function materializeRecurring(userId, todayStr = todayUtcStr()) {
  const rules = await Recurring.find({ user: userId, active: true, startDate: { $lte: parseDateOnly(todayStr) } });
  if (!rules.length) return 0;

  const today = parseDateOnly(todayStr);
  let created = 0;

  for (const rule of rules) {
    const { dates, nextIndex } = dueOccurrences({
      start: rule.startDate,
      frequency: rule.frequency,
      end: rule.endDate,
      nextIndex: rule.nextIndex,
      today,
    });
    if (!dates.length) continue;

    const docs = dates.map((date) => ({
      user: userId,
      type: rule.type,
      amount: rule.amount,
      category: rule.category,
      note: rule.note,
      date,
      recurring: rule._id,
      ...(rule.phone && { phone: rule.phone }),
    }));

    try {
      const res = await Transaction.insertMany(docs, { ordered: false });
      created += res.length;
    } catch (err) {
      // Parallel so'rov allaqachon yaratgan bo'lsa (E11000) — bu normal; boshqa xatolarni yuqoriga uzatamiz.
      const writeErrors = err.writeErrors ?? [];
      const onlyDuplicates = writeErrors.length > 0 && writeErrors.every((e) => (e.err?.code ?? e.code) === 11000);
      if (!onlyDuplicates) throw err;
      created += err.insertedDocs?.length ?? 0;
    }

    await Recurring.updateOne({ _id: rule._id }, { $max: { nextIndex } });
  }
  return created;
}

// Oy oxirigacha hali yaratilmagan takroriy yozuvlar (prognoz uchun): [{ type, category, amount, date }]
export async function pendingRecurringInMonth(userId, rangeEnd) {
  const rules = await Recurring.find({ user: userId, active: true }).lean();
  const out = [];
  for (const rule of rules) {
    const dates = pendingOccurrences({
      start: rule.startDate,
      frequency: rule.frequency,
      end: rule.endDate,
      nextIndex: rule.nextIndex,
      rangeEnd,
    });
    for (const date of dates) out.push({ type: rule.type, category: rule.category, amount: rule.amount, date });
  }
  return out;
}
