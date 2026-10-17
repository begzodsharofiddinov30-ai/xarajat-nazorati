import { describe, expect, it } from 'vitest';
import { mapRows, parseAmountCell, parseCsv, parseDate } from '../../client/src/utils/csvImport.js';

const index = {
  expense: [
    { key: 'food', label: 'Oziq-ovqat' },
    { key: 'other', label: 'Boshqa' },
    { key: `c_${'a'.repeat(24)}`, label: 'Uy hayvonlari' },
  ],
  income: [
    { key: 'salary', label: 'Maosh' },
    { key: 'other_income', label: 'Boshqa daromad' },
  ],
};

describe('CSV import tahlili (client/src/utils/csvImport.js)', () => {
  it("qo'shtirnoq, vergul, BOM va CRLF bilan ishlaydi", () => {
    const rows = parseCsv('﻿Sana,Izoh\r\n2026-10-05,"Korzinka, Chilonzor"\r\n2026-10-06,"Say ""hi"""\r\n');
    expect(rows).toEqual([
      ['Sana', 'Izoh'],
      ['2026-10-05', 'Korzinka, Chilonzor'],
      ['2026-10-06', 'Say "hi"'],
    ]);
  });

  it("nuqtali vergul ajratgichni o'zi aniqlaydi", () => {
    expect(parseCsv('Date;Amount\n2026-10-05;1000')).toEqual([
      ['Date', 'Amount'],
      ['2026-10-05', '1000'],
    ]);
  });

  it("eksport formatini o'qiydi: tur, kategoriya nomi va ishorali summa", () => {
    const csv = "Sana,Tur,Kategoriya,Summa (so'm),Izoh\r\n2026-10-05,Xarajat,Oziq-ovqat,-50000,Non\r\n2026-10-01,Daromad,Maosh,5000000,";
    const { items, errors } = mapRows(parseCsv(csv), index);
    expect(errors).toEqual([]);
    expect(items).toEqual([
      { row: 2, type: 'expense', amount: 50_000, category: 'food', date: '2026-10-05', note: 'Non', guessed: false },
      { row: 3, type: 'income', amount: 5_000_000, category: 'salary', date: '2026-10-01', note: '', guessed: false },
    ]);
  });

  it("o'z kategoriyasini nomi bo'yicha topadi, noma'lumini 'Boshqa' ga qo'yadi va belgilaydi", () => {
    const csv = 'Sana,Tur,Kategoriya,Summa\n2026-10-09,Xarajat,uy hayvonlari,70000\n2026-10-10,Xarajat,Noma\'lum,1000';
    const { items } = mapRows(parseCsv(csv), index);
    expect(items[0]).toMatchObject({ category: `c_${'a'.repeat(24)}`, guessed: false });
    expect(items[1]).toMatchObject({ category: 'other', guessed: true });
  });

  it("tur ustuni bo'lmasa, ishora bo'yicha aniqlaydi; boshqa sana va summa formatlarini tushunadi", () => {
    const { items } = mapRows(parseCsv('Date;Amount;Description\n15/10/2026;-12 000;Taksi\n16.10.2026;3 000 000;Maosh'), index);
    expect(items.map((i) => [i.type, i.amount, i.date])).toEqual([
      ['expense', 12_000, '2026-10-15'],
      ['income', 3_000_000, '2026-10-16'],
    ]);
  });

  it("yaroqsiz qatorlarni sabab bilan qaytaradi, qolganlarini saqlaydi", () => {
    const csv = 'Sana,Tur,Summa\n2026-02-30,Xarajat,100\n2026-10-05,Xarajat,abc\n2026-10-05,Noma\'lum,100\n2026-10-05,Xarajat,100';
    const { items, errors } = mapRows(parseCsv(csv), index);
    expect(items).toHaveLength(1);
    expect(errors.map((e) => e.row)).toEqual([2, 3, 4]);
  });

  it("sarlavhasiz yoki ustunlari yetishmaydigan faylni rad etadi", () => {
    expect(mapRows(parseCsv('a,b\n1,2'), index).errors[0].row).toBe(0);
    expect(mapRows(parseCsv('Sana,Summa'), index).errors).toHaveLength(1);
  });

  it('summa va sana yordamchilari', () => {
    expect(parseAmountCell('1,250,000')).toBe(1_250_000);
    expect(parseAmountCell("50 000 so'm")).toBe(50_000);
    expect(parseAmountCell('(5000)')).toBe(-5000);
    expect(parseAmountCell('abc')).toBeNull();
    expect(parseDate('2026-2-3')).toBe('2026-02-03');
    expect(parseDate('31/04/2026')).toBeNull();
  });
});
