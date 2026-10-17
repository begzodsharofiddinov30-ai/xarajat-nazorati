import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// Oldindan keshlanadigan public fayllar (ilova internetsiz ochilishi uchun).
const PUBLIC_PRECACHE = ['/index.html', '/theme-init.js', '/manifest.webmanifest', '/icons/icon-192.png'];

// Service worker'ni build paytida yaratadi (qo'shimcha paketsiz): src/sw.js ga shu build'dagi JS/CSS fayllar
// ro'yxati va versiya yoziladi. Shriftlardan faqat lotin yozuvi oldindan keshlanadi, qolganlari kerak bo'lganda.
function serviceWorker() {
  return {
    name: 'xn-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle)
        .filter((f) => /^assets\/.+\.(js|css)$/.test(f) || /^assets\/inter-latin(-ext)?-wght/.test(f))
        .map((f) => `/${f}`);
      const files = [...PUBLIC_PRECACHE, ...assets.sort()];

      const template = readFileSync(new URL('./src/sw.js', import.meta.url), 'utf8');
      const hash = createHash('sha256').update(template).update(files.join('\n'));
      for (const f of PUBLIC_PRECACHE.slice(1)) hash.update(readFileSync(new URL(`./public${f}`, import.meta.url)));
      const version = hash.digest('hex').slice(0, 12);

      const source = template
        .replace("'__SW_VERSION__'", JSON.stringify(version))
        .replace("['__SW_PRECACHE__']", JSON.stringify(files));
      if (source.includes('__SW_')) this.error("sw.js shablonidagi belgilar almashtirilmadi");
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serviceWorker()],
  server: {
    port: 5173,
    // Dev rejimida /api so'rovlari backendga proksi qilinadi, CORS sozlash shart emas.
    proxy: { '/api': 'http://localhost:4000' },
  },
});
