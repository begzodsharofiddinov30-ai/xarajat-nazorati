import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    // Parol almashtirilganda yoki "hamma qurilmadan chiqish" bosilganda oshadi: eski tokenlar yaroqsiz bo'ladi.
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

userSchema.set('toJSON', {
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.passwordHash;
    delete ret.tokenVersion;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
