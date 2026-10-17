import { z } from 'zod';
import { typeField } from './common.js';

const label = z.string({ required_error: 'Nomini kiriting' }).trim().min(2, 'Nom kamida 2 ta belgi').max(30, 'Nom 30 belgidan oshmasin');
// Ikonka — bitta emoji (yoki qisqa belgi). Uzunlik UTF-16 birliklarida cheklanadi.
const icon = z.string().trim().min(1).max(8, 'Ikonka juda uzun').optional();

export const categoryCreateSchema = z.object({ type: typeField, label, icon });
export const categoryUpdateSchema = z.object({ label, icon });
