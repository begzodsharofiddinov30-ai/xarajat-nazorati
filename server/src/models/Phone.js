import mongoose from 'mongoose';
import { OPERATORS } from '../utils/phone.js';

// Foydalanuvchining telefon raqamlari (o'ziniki, oila a'zolariniki): mobil aloqa to'lovlari shularga bog'lanadi.
const phoneSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    label: { type: String, required: true, trim: true, minlength: 1, maxlength: 30 },
    // Faqat raqamlar: "998901234567"
    number: { type: String, required: true, match: /^998\d{9}$/ },
    operator: { type: String, enum: OPERATORS, required: true },
  },
  { timestamps: true },
);

phoneSchema.index({ user: 1, number: 1 }, { unique: true });

phoneSchema.set('toJSON', {
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.user;
    return ret;
  },
});

export const Phone = mongoose.model('Phone', phoneSchema);
