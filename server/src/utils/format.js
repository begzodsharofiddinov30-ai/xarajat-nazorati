export function formatSom(n) {
  return `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so'm`;
}

export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
