// Sahifa yuklanishida oq-qora "miltillash" bo'lmasligi uchun mavzu React'dan oldin qo'llanadi.
// Alohida fayl: production'dagi Content-Security-Policy inline skriptlarni bloklaydi.
(function () {
  var t = 'dark';
  try {
    t = localStorage.getItem('xn_theme') || 'dark';
  } catch (e) {}
  var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  // Telefon status paneli rangi mavzuga mos bo'lishi uchun.
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#09090b' : '#ffffff');
})();
