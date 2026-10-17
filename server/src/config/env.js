import 'dotenv/config';
import { z } from 'zod';

const EXAMPLE_SECRET = 'change-me-to-a-long-random-string';

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    MONGO_URI: z.string().min(1, 'MONGO_URI kerak'),
    JWT_SECRET: z.string().min(16, "JWT_SECRET kamida 16 belgidan iborat bo'lishi kerak"),
    JWT_EXPIRES_IN: z.string().default('7d'),
    CLIENT_URL: z.string().default('http://localhost:5173'),
    // Vercel, Nginx kabi proksi orqasida 1 qo'ying: rate limit haqiqiy IP bo'yicha ishlaydi.
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    // Google Cloud'dagi OAuth Client ID (vergul bilan bir nechta). Bo'sh bo'lsa, Google orqali kirish o'chiq.
    GOOGLE_CLIENT_ID: z.string().default(''),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && (env.JWT_SECRET.length < 32 || env.JWT_SECRET === EXAMPLE_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: "Production'da kamida 32 belgili tasodifiy kalit kerak (namunadagi qiymat emas)",
      });
    }
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Muhit o'zgaruvchilari noto'g'ri:");
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
