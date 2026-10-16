// Sahifa yuklanishida oq-qora "miltillash" bo'lmasligi uchun mavzu React'dan oldin qo'llanadi.
// Alohida fayl: production'dagi Content-Security-Policy inline skriptlarni bloklaydi.
(function () {
  var t = 'system';
  try {
    t = localStorage.getItem('xn_theme') || 'system';
  } catch (e) {}
  var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
})();
