import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Faqat Google orqali ochilgan hisobda parol yo'q (null); keyin Sozlamalarda o'rnatish mumkin.
    passwordHash: { type: String, default: null, select: false },
    // Google hisobi (ID tokendagi "sub"). Bir Google hisobi faqat bitta foydalanuvchiga bog'lanadi.
    googleId: { type: String, default: undefined },
    // Email egasi tasdiqlanganmi (hozircha faqat Google orqali).
    emailVerified: { type: Boolean, default: false },
    // Parol almashtirilganda yoki "hamma qurilmadan chiqish" bosilganda oshadi: eski tokenlar yaroqsiz bo'ladi.
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

userSchema.index({ googleId: 1 }, { unique: true, sparse: true });

userSchema.set('toJSON', {
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    // passwordHash so'rovda tanlangan bo'lsagina (select('+passwordHash')) hasPassword aniq bo'ladi.
    if ('passwordHash' in ret) ret.hasPassword = Boolean(ret.passwordHash);
    ret.google = Boolean(ret.googleId);
    delete ret.passwordHash;
    delete ret.googleId;
    delete ret.emailVerified;
    delete ret.tokenVersion;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
