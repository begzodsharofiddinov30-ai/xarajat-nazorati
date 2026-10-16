// Orqa fonda sekin suzuvchi qizil yorug'lik dog'lari va ingichka to'r.
// Faqat CSS transform animatsiyasi (blur filtrisiz) — telefonda ham yengil ishlaydi.
// "Harakatni kamaytirish" sozlamasi yoqilgan bo'lsa, animatsiya o'chadi (index.css).
export function AnimatedBackground() {
  return (
    <div className="animated-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="bg-blob bg-blob-1" />
      <div className="bg-blob bg-blob-2" />
      <div className="bg-blob bg-blob-3" />
      <div className="bg-grid" />
    </div>
  );
}
