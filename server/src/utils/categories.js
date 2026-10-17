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

// Foydalanuvchi o'zi qo'shgan kategoriyalar kaliti: "c_" + Category _id (24 ta hex belgi).
export const CUSTOM_KEY_RE = /^c_[0-9a-f]{24}$/;
export const isCustomKey = (key) => CUSTOM_KEY_RE.test(key);
export const isBuiltinCategory = (key) => ALL_CATEGORIES.includes(key);
