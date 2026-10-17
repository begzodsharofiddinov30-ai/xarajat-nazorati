import { materializeRecurring } from '../services/recurringService.js';

// Ma'lumot o'qiladigan so'rovlardan oldin takroriy qoidalar bo'yicha yetishmayotgan tranzaksiyalarni yaratadi.
export async function catchUpRecurring(req, _res, next) {
  if (req.method === 'GET') await materializeRecurring(req.user.id);
  next();
}
