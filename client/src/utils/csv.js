import { CATEGORY_LABELS, TYPE_LABELS } from './categories.js';

function cell(value) {
  const s = String(value ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function transactionsToCsv(transactions) {
  const header = ['Sana', 'Tur', 'Kategoriya', "Summa (so'm)", 'Izoh'];
  const rows = transactions.map((t) => [
    t.date,
    TYPE_LABELS[t.type],
    CATEGORY_LABELS[t.category] ?? t.category,
    t.type === 'expense' ? -t.amount : t.amount,
    t.note,
  ]);
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
}

export function downloadCsv(filename, csv) {
  // BOM bo'lmasa, Excel o'zbekcha harflarni (o', g') buzib ko'rsatadi.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
