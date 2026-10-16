import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Dev rejimida /api so'rovlari backendga proksi qilinadi, CORS sozlash shart emas.
    proxy: { '/api': 'http://localhost:4000' },
  },
});
