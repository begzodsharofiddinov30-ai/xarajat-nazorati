import mongoose from 'mongoose';
import { ALL_CATEGORIES, TYPES } from '../utils/categories.js';

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
    category: { type: String, enum: ALL_CATEGORIES, required: true },
    date: { type: Date, required: true },
    note: { type: String, trim: true, maxlength: 200, default: '' },
  },
  { timestamps: true },
);

transactionSchema.index({ user: 1, date: -1 });

transactionSchema.set('toJSON', {
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.user;
    ret.date = ret.date.toISOString().slice(0, 10);
    return ret;
  },
});

export const Transaction = mongoose.model('Transaction', transactionSchema);
