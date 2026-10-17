import mongoose from 'mongoose';
import { Recurring } from '../models/Recurring.js';
import { materializeRecurring } from '../services/recurringService.js';
import { assertCategory } from '../services/categoryService.js';
import { assertPhone } from '../services/phoneService.js';
import { ApiError } from '../utils/ApiError.js';
import { parseDateOnly, todayUtcStr } from '../utils/month.js';
import { firstIndexOnOrAfter, occurrenceDate } from '../utils/recurrence.js';

const notFound = () => ApiError.notFound('Takroriy qoida topilmadi', 'RECURRING_NOT_FOUND');

function ownedFilter(req) {
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound();
  return { _id: req.params.id, user: req.user.id };
}

const withNext = (rule) => ({
  ...rule.toJSON(),
  nextDate: (() => {
    const d = occurrenceDate(rule.startDate, rule.frequency, rule.nextIndex);
    return rule.endDate && d > rule.endDate ? null : d.toISOString().slice(0, 10);
  })(),
});

export async function listRecurring(req, res) {
  await materializeRecurring(req.user.id);
  const rules = await Recurring.find({ user: req.user.id }).sort({ active: -1, createdAt: -1 });
  res.json({ data: rules.map(withNext) });
}

export async function createRecurring(req, res) {
  const { startDate, endDate, ...rest } = req.valid.body;
  await assertCategory(req.user.id, rest.type, rest.category);
  await assertPhone(req.user.id, rest.phone, rest.category);
  const rule = await Recurring.create({
    ...rest,
    phone: rest.phone ?? undefined,
    user: req.user.id,
    startDate: parseDateOnly(startDate),
    endDate: endDate ? parseDateOnly(endDate) : null,
  });
  // Boshlanish sanasi o'tgan bo'lsa, o'tgan sanalar uchun yozuvlar darhol yaratiladi.
  await materializeRecurring(req.user.id);
  res.status(201).json({ data: withNext(await Recurring.findById(rule._id)) });
}

// Qoida o'zgartirilsa, yangi sozlama bugundan boshlab amal qiladi: o'tmishda yaratilgan yozuvlarga tegilmaydi.
export async function updateRecurring(req, res) {
  const { startDate, endDate, ...rest } = req.valid.body;
  const rule = await Recurring.findOne(ownedFilter(req));
  if (!rule) throw notFound();
  await assertCategory(req.user.id, rest.type, rest.category);
  await assertPhone(req.user.id, rest.phone, rest.category);

  const newStart = parseDateOnly(startDate);
  const scheduleChanged =
    newStart.getTime() !== rule.startDate.getTime() || rest.frequency !== rule.frequency;

  rule.set({ ...rest, phone: rest.phone ?? undefined, startDate: newStart, endDate: endDate ? parseDateOnly(endDate) : null });
  if (scheduleChanged) {
    rule.nextIndex = firstIndexOnOrAfter(newStart, rest.frequency, parseDateOnly(todayUtcStr()));
  }
  await rule.save();
  await materializeRecurring(req.user.id);
  res.json({ data: withNext(await Recurring.findById(rule._id)) });
}

// Qoida o'chirilganda avval yaratilgan tranzaksiyalar saqlanib qoladi.
export async function deleteRecurring(req, res) {
  const { deletedCount } = await Recurring.deleteOne(ownedFilter(req));
  if (!deletedCount) throw notFound();
  res.status(204).end();
}
