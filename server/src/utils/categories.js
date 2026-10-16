export const TYPES = ['income', 'expense'];

export const EXPENSE_CATEGORIES = [
  'food',
  'transport',
  'housing',
  'utilities',
  'health',
  'education',
  'entertainment',
  'clothing',
  'other',
];

export const INCOME_CATEGORIES = ['salary', 'freelance', 'gift', 'other_income'];

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export const CATEGORY_LABELS = {
  food: 'Oziq-ovqat',
  transport: 'Transport',
  housing: 'Uy-joy',
  utilities: 'Kommunal',
  health: "Sog'liq",
  education: "Ta'lim",
  entertainment: "Ko'ngilochar",
  clothing: 'Kiyim',
  other: 'Boshqa',
  salary: 'Maosh',
  freelance: 'Frilans',
  gift: "Sovg'a",
  other_income: 'Boshqa daromad',
};

export function isValidCategory(type, category) {
  const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return list.includes(category);
}
