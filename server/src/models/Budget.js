import mongoose from 'mongoose';
import { EXPENSE_CATEGORIES } from '../utils/categories.js';

// Limit har oy uchun takrorlanadi: har bir foydalanuvchi uchun bitta kategoriyaga bitta yozuv.
const budgetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    limit: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isInteger, message: "Limit butun son bo'lishi kerak" },
    },
  },
  { timestamps: true },
);

budgetSchema.index({ user: 1, category: 1 }, { unique: true });

budgetSchema.set('toJSON', {
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.user;
    return ret;
  },
});

export const Budget = mongoose.model('Budget', budgetSchema);
