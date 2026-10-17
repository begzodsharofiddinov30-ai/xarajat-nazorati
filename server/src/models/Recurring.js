import mongoose from 'mongoose';
import { TYPES } from '../utils/categories.js';
import { FREQUENCIES } from '../utils/recurrence.js';

// Takroriy qoida. Tranzaksiyalar so'rov paytida "yetib olinadi" (services/recurringService.js),
// shuning uchun alohida rejalashtiruvchi (cron) kerak emas.
const recurringSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: TYPES, required: true },
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isInteger, message: "Summa butun son bo'lishi kerak" },
    },
    category: { type: String, required: true, maxlength: 40 },
    note: { type: String, trim: true, maxlength: 200, default: '' },
    frequency: { type: String, enum: FREQUENCIES, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    // Nechta uchrashuv allaqachon yaratilgan (keyingisi shu raqamli).
    nextIndex: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
    // Mobil aloqa to'lovi qaysi telefon raqamiga (Phone) qilingani.
    phone: { type: mongoose.Schema.Types.ObjectId, ref: 'Phone' },
  },
  { timestamps: true },
);

recurringSchema.index({ user: 1, active: 1 });

recurringSchema.set('toJSON', {
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.user;
    if (ret.phone) ret.phone = String(ret.phone);
    ret.startDate = ret.startDate.toISOString().slice(0, 10);
    ret.endDate = ret.endDate ? ret.endDate.toISOString().slice(0, 10) : null;
    return ret;
  },
});

export const Recurring = mongoose.model('Recurring', recurringSchema);
