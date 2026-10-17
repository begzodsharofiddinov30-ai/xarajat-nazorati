import mongoose from 'mongoose';
import { TYPES } from '../utils/categories.js';

// Foydalanuvchining o'z kategoriyalari. Tranzaksiyada kalit sifatida `c_<id>` saqlanadi.
const categorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: TYPES, required: true },
    label: { type: String, required: true, trim: true, minlength: 2, maxlength: 30 },
    icon: { type: String, trim: true, maxlength: 8, default: '📦' },
  },
  { timestamps: true },
);

categorySchema.index({ user: 1, type: 1, label: 1 }, { unique: true });

categorySchema.virtual('key').get(function key() {
  return `c_${this._id}`;
});

categorySchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id);
    ret.custom = true;
    delete ret._id;
    delete ret.user;
    return ret;
  },
});

export const Category = mongoose.model('Category', categorySchema);
