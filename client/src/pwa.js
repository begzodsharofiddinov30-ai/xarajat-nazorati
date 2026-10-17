// PWA: service worker'ni ro'yxatdan o'tkazish, yangi versiya va o'rnatish taklifini kuzatish.
// Holat React'dan tashqarida saqlanadi: beforeinstallprompt hodisasi ilova chizilishidan oldin kelishi mumkin.
import { useSyncExternalStore } from 'react';

const listeners = new Set();
let installEvent = null;
let waitingWorker = null;

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

export const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

let state = { canInstall: false, installed: isStandalone(), updateReady: false };

function set(patch) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// { canInstall, installed, updateReady }
export const usePwa = () => useSyncExternalStore(subscribe, () => state);

// Android Chrome/Edge: brauzerning o'z o'rnatish oynasini keyinroq (tugma bosilganda) ko'rsatish uchun saqlab qo'yamiz.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvent = e;
  set({ canInstall: true });
});

window.addEventListener('appinstalled', () => {
  installEvent = null;
  set({ canInstall: false, installed: true });
});

export async function promptInstall() {
  if (!installEvent) return false;
  installEvent.prompt();
  const { outcome } = await installEvent.userChoice;
  installEvent = null;
  set({ canInstall: false });
  return outcome === 'accepted';
}

// Kutib turgan yangi versiyani ishga tushirib, sahifani qayta yuklaydi.
export function applyUpdate() {
  if (!waitingWorker) return window.location.reload();
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
  waitingWorker.postMessage('SKIP_WAITING');
}

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    let reg;
    try {
      reg = await navigator.serviceWorker.register('/sw.js');
    } catch {
      return; // Service worker bo'lmasa ham sayt oddiy ishlayveradi.
    }

    const track = (worker) => {
      if (!worker) return;
      const check = () => {
        // controller bor bo'lsa, bu birinchi o'rnatish emas, yangilanish.
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          waitingWorker = worker;
          set({ updateReady: true });
        }
      };
      check();
      worker.addEventListener('statechange', check);
    };
    track(reg.waiting);
    reg.addEventListener('updatefound', () => track(reg.installing));

    // Ilova uzoq ochiq tursa ham yangi versiya topilishi uchun: ekranga qaytganda va har soatda tekshiriladi.
    const update = () => reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && update());
    setInterval(update, 60 * 60 * 1000);
  });
}
