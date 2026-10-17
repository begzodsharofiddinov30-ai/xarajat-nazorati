import mongoose from 'mongoose';

export const MAX_CONTRIBUTIONS = 500;

const contributionSchema = new mongoose.Schema({
  // Musbat — qo'shildi, manfiy — qaytarib olindi.
  amount: {
    type: Number,
    required: true,
    validate: { validator: (n) => Number.isInteger(n) && n !== 0, message: "Summa nolga teng bo'lmagan butun son bo'lishi kerak" },
  },
  date: { type: Date, required: true },
  note: { type: String, trim: true, maxlength: 100, default: '' },
});

const goalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    targetAmount: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isInteger, message: "Maqsad summasi butun son bo'lishi kerak" },
    },
    deadline: { type: Date, default: null },
    contributions: { type: [contributionSchema], default: [] },
  },
  { timestamps: true },
);

goalSchema.index({ user: 1, createdAt: -1 });

export const Goal = mongoose.model('Goal', goalSchema);
