// Tayyor kategoriyalar + foydalanuvchining o'z kategoriyalari (kalit: "c_<id>").
// O'z kategoriyalar serverdan yuklangach setCustomCategories() orqali shu ro'yxatlarga qo'shiladi, shuning uchun
// CATEGORY_LABELS[key] va categoriesFor(type) ni ishlatadigan barcha komponentlar o'zgarishsiz ishlaydi.
const BASE_EXPENSE = [
  'food',
  'transport',
  'housing',
  'utilities',
  'health',
  'education',
  'entertainment',
  'clothing',
  'mobile',
  'other',
];
const BASE_INCOME = ['salary', 'freelance', 'gift', 'other_income'];

// Massivlar joyida o'zgartiriladi: boshqa fayllar import qilgan havolalar yangilanib turadi.
export const EXPENSE_CATEGORIES = [...BASE_EXPENSE];
export const INCOME_CATEGORIES = [...BASE_INCOME];

const BASE_LABELS = {
  food: 'Oziq-ovqat',
  transport: 'Transport',
  housing: 'Uy-joy',
  utilities: 'Kommunal',
  health: "Sog'liq",
  education: "Ta'lim",
  entertainment: "Ko'ngilochar",
  clothing: 'Kiyim',
  mobile: 'Mobil aloqa',
  other: 'Boshqa',
  salary: 'Maosh',
  freelance: 'Frilans',
  gift: "Sovg'a",
  other_income: 'Boshqa daromad',
};

const BASE_ICONS = {
  food: '🛒',
  transport: '🚕',
  housing: '🏠',
  utilities: '💡',
  health: '💊',
  education: '📚',
  entertainment: '🎬',
  clothing: '👕',
  mobile: '📱',
  other: '📦',
  salary: '💼',
  freelance: '💻',
  gift: '🎁',
  other_income: '💰',
};

export const CATEGORY_LABELS = { ...BASE_LABELS };
export const CATEGORY_ICONS = { ...BASE_ICONS };

export const TYPE_LABELS = { income: 'Daromad', expense: 'Xarajat' };

export const isCustomKey = (key) => /^c_[0-9a-f]{24}$/.test(key ?? '');

// Boshlang'ich holat = bo'sh ro'yxat: bo'sh ro'yxat qayta yuklanganda daraxt keraksiz qayta chizilmaydi.
let customSignature = '[]';

// Serverdan kelgan o'z kategoriyalarni ro'yxatlarga joylaydi. Ro'yxat o'zgargan bo'lsa true qaytaradi.
export function setCustomCategories(list = []) {
  const signature = JSON.stringify(list.map((c) => [c.key, c.type, c.label, c.icon]));
  if (signature === customSignature) return false;
  customSignature = signature;

  for (const key of Object.keys(CATEGORY_LABELS)) {
    if (!(key in BASE_LABELS)) {
      delete CATEGORY_LABELS[key];
      delete CATEGORY_ICONS[key];
    }
  }
  EXPENSE_CATEGORIES.length = 0;
  EXPENSE_CATEGORIES.push(...BASE_EXPENSE);
  INCOME_CATEGORIES.length = 0;
  INCOME_CATEGORIES.push(...BASE_INCOME);

  // "Boshqa" har doim ro'yxat oxirida turadi; o'z kategoriyalar uning oldiga qo'shiladi.
  for (const c of list) {
    CATEGORY_LABELS[c.key] = c.label;
    CATEGORY_ICONS[c.key] = c.icon || '📦';
    const target = c.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    target.splice(target.length - 1, 0, c.key);
  }
  return true;
}

export const categoriesFor = (type) => (type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES);

// Import uchun: { expense: [{ key, label }], income: [...] }
export function categoryIndex() {
  const toList = (keys) => keys.map((key) => ({ key, label: CATEGORY_LABELS[key] }));
  return { expense: toList(EXPENSE_CATEGORIES), income: toList(INCOME_CATEGORIES) };
}
