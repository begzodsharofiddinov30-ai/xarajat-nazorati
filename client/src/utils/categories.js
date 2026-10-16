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

export const CATEGORY_ICONS = {
  food: '🛒',
  transport: '🚕',
  housing: '🏠',
  utilities: '💡',
  health: '💊',
  education: '📚',
  entertainment: '🎬',
  clothing: '👕',
  other: '📦',
  salary: '💼',
  freelance: '💻',
  gift: '🎁',
  other_income: '💰',
};

export const TYPE_LABELS = { income: 'Daromad', expense: 'Xarajat' };

export const categoriesFor = (type) => (type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES);
