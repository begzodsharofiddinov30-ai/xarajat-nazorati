import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import { ApiError } from '../utils/ApiError.js';
import {
  CATEGORY_LABELS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  isCustomKey,
} from '../utils/categories.js';

const builtinFor = (type) => (type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES);

// Foydalanuvchining barcha kategoriyalari uchun tezkor qidiruv: { labelOf(key), isValid(type, key) }.
// Ko'p qatorni tekshirishda (import) bazaga bir marta murojaat qilish uchun.
export async function loadCategoryLookup(userId) {
  const custom = await Category.find({ user: userId }).lean();
  const byKey = new Map(custom.map((c) => [`c_${c._id}`, c]));
  return {
    labelOf: (key) => CATEGORY_LABELS[key] ?? byKey.get(key)?.label ?? key,
    isValid(type, key) {
      if (builtinFor(type).includes(key)) return true;
      return isCustomKey(key) && byKey.get(key)?.type === type;
    },
    customKeys: [...byKey.keys()],
  };
}

// Bitta kategoriyani tekshiradi; mos kelmasa forma maydoniga bog'lanadigan 400 xato tashlaydi.
export async function assertCategory(userId, type, key) {
  if (builtinFor(type).includes(key)) return;
  if (isCustomKey(key) && (await Category.exists({ _id: key.slice(2), user: userId, type }))) return;
  throw ApiError.badRequest("Ma'lumotlar noto'g'ri", 'VALIDATION_ERROR', [
    { path: 'category', message: "Kategoriya mavjud emas yoki tranzaksiya turiga mos emas" },
  ]);
}

export async function categoryLabel(userId, key) {
  if (CATEGORY_LABELS[key]) return CATEGORY_LABELS[key];
  if (!isCustomKey(key)) return key;
  const c = await Category.findOne({ _id: new mongoose.Types.ObjectId(key.slice(2)), user: userId }).lean();
  return c?.label ?? key;
}
