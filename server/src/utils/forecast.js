// Oy oxirigacha xarajat prognozi (sof funksiya).
// Mantiq: takroriy to'lovlar (ijara, obuna) alohida hisoblanadi: ular tempga ko'paytirilmaydi,
// faqat hali yaratilmagan bo'lsa oxirida qo'shiladi. Qolgan ("o'zgaruvchan") xarajatlar bugungacha
// bo'lgan kunlik o'rtacha bo'yicha oy oxirigacha davom etadi deb olinadi.

export function confidenceFor(daysElapsed) {
  if (daysElapsed < 5) return 'low';
  if (daysElapsed < 12) return 'medium';
  return 'high';
}

export function projectSpending({ spent, recurringSpent = 0, upcomingRecurring = 0, daysElapsed, daysInMonth }) {
  const elapsed = Math.min(Math.max(daysElapsed, 1), daysInMonth);
  const remaining = daysInMonth - elapsed;
  const variableSoFar = Math.max(spent - recurringSpent, 0);
  const dailyAverage = variableSoFar / elapsed;
  const projected = spent + dailyAverage * remaining + upcomingRecurring;
  return {
    projected: Math.round(projected),
    dailyAverage: Math.round(dailyAverage),
    daysElapsed: elapsed,
    daysRemaining: remaining,
  };
}
