import mongoose from 'mongoose';
import { TYPES } from '../utils/categories.js';

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: TYPES, required: true },
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isInteger, message: "Summa butun son bo'lishi kerak" },
    },
    // Kategoriya tekshiruvi servis qatlamida: tayyor ro'yxat yoki foydalanuvchining o'z kategoriyasi (c_<id>).
    category: { type: String, required: true, maxlength: 40 },
    date: { type: Date, required: true },
    note: { type: String, trim: true, maxlength: 200, default: '' },
    // Takroriy qoidadan avtomatik yaratilgan bo'lsa, qoida _id si.
    recurring: { type: mongoose.Schema.Types.ObjectId, ref: 'Recurring' },
    // Kredit to'lovi qaysi kreditga (Loan) tegishli.
    loan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan' },
  },
  { timestamps: true },
);

transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, loan: 1 }, { sparse: true });
// Bitta qoida bitta kunga ikki marta tranzaksiya yarata olmaydi (bir vaqtdagi so'rovlar poygasidan himoya).
transactionSchema.index(
  { user: 1, recurring: 1, date: 1 },
  { unique: true, partialFilterExpression: { recurring: { $exists: true } } },
);

transactionSchema.set('toJSON', {
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.user;
    if (ret.loan) ret.loan = String(ret.loan);
    if (ret.recurring) ret.recurring = String(ret.recurring);
    ret.date = ret.date.toISOString().slice(0, 10);
    return ret;
  },
});

export const Transaction = mongoose.model('Transaction', transactionSchema);
