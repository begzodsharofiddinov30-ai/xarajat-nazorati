import mongoose from 'mongoose';
import { Phone } from '../models/Phone.js';
import { ApiError } from '../utils/ApiError.js';

export const MOBILE_CATEGORY = 'mobile';

// Tranzaksiya yoki takroriy qoidaga raqam bog'lansa: raqam shu foydalanuvchiniki va kategoriya "Mobil aloqa" bo'lishi kerak.
export async function assertPhone(userId, phoneId, category) {
  if (!phoneId) return;
  const fail = (message) => {
    throw ApiError.badRequest("Ma'lumotlar noto'g'ri", 'VALIDATION_ERROR', [{ path: 'phone', message }]);
  };
  if (category !== MOBILE_CATEGORY) fail('Raqam faqat "Mobil aloqa" kategoriyasidagi xarajatga bog\'lanadi');
  if (!mongoose.isValidObjectId(phoneId) || !(await Phone.exists({ _id: phoneId, user: userId }))) {
    fail('Raqam topilmadi');
  }
}
