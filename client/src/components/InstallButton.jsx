import { useState } from 'react';
import { useToast } from '../context/ToastContext.jsx';
import { browserKind, promptInstall, usePwa } from '../pwa.js';
import { DownloadIcon } from './icons.jsx';
import { Modal } from './Modal.jsx';

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" className="inline h-4 w-4 align-[-2px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
  </svg>
);
const AddIcon = () => (
  <svg viewBox="0 0 24 24" className="inline h-4 w-4 align-[-2px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);
const Key = ({ children }) => (
  <b className="rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold dark:bg-slate-800">{children}</b>
);

// Android APK: GitHub Actions yig'adi (.github/workflows/android.yml) va shu saytga joylaydi.
// O'z domenimizdan to'g'ri Content-Type bilan beriladi (vercel.json), shunda telefon uni ilova sifatida o'rnatadi.
export const APK_URL = '/download/xarajat-nazorati.apk';
const isAndroid = () => /Android/i.test(navigator.userAgent);

// Telefon tili o'zbekcha, ruscha yoki inglizcha bo'lishi mumkin, shuning uchun menyu nomlari uch tilda.
const HOME = (
  <>
    <Key>Bosh ekranga qo'shish</Key> (rus. «На экран Домой», ingl. «Add to Home Screen»)
  </>
);

const GUIDES = {
  'ios-safari': {
    note: "iPhone'da Apple \"Yuklab olish\" tugmasiga ruxsat bermaydi, ilova shu usulda o'rnatiladi:",
    steps: [
      <>
        Pastdagi <Key>⋯</Key> tugmasini, so'ng <Key><ShareIcon /> Ulashish</Key> ni bosing. Eski iOS'da Ulashish tugmasi
        to'g'ridan-to'g'ri pastda turadi (iPad'da yuqorida).
      </>,
      <>Ochilgan ro'yxatni pastga suring va {HOME} ni tanlang.</>,
      <>
        O'ng yuqoridagi <Key>Qo'shish</Key> («Добавить», «Add») ni bosing.
      </>,
      <>Bosh ekranda qizil «X» ikonkasi paydo bo'ladi. Ilovani endi shundan oching.</>,
    ],
  },
  'ios-other': {
    note: "iPhone'da ilovani Safari orqali o'rnatish eng oson:",
    steps: [
      <>
        Manzil satri yonidagi <Key><ShareIcon /></Key> tugmasini bosing va {HOME} ni tanlang.
      </>,
      <>Agar bu band bo'lmasa, havolani nusxalab, Safari'da oching va o'sha yerda xuddi shunday qiling.</>,
    ],
    copy: true,
  },
  'in-app': {
    note: "Telegram yoki Instagram ichidagi brauzer ilovani o'rnata olmaydi. Saytni oddiy brauzerda oching:",
    steps: [
      <>
        Yuqoridagi <Key>⋮</Key> yoki <Key>⋯</Key> menyusidan <Key>Brauzerda ochish</Key> («Открыть в браузере») ni tanlang.
      </>,
      <>Yoki pastdagi tugma bilan havolani nusxalab, Chrome (iPhone'da Safari) ga joylang.</>,
      <>Keyin shu yerdagi «Ilovani o'rnatish» tugmasini yana bosing.</>,
    ],
    copy: true,
  },
  samsung: {
    steps: [
      <>
        Manzil satridagi <Key><DownloadIcon className="inline h-4 w-4 align-[-2px]" /></Key> belgisini bosing, yoki
      </>,
      <>
        pastdagi <Key>☰</Key> menyusi → <Key><AddIcon /> Sahifani qo'shish</Key> → <Key>Bosh ekran</Key> ni tanlang.
      </>,
    ],
  },
  'android-chrome': {
    steps: [
      <>
        O'ng yuqoridagi <Key>⋮</Key> menyusini oching.
      </>,
      <>
        <Key>Ilovani o'rnatish</Key> («Установить приложение», «Install app») yoki {HOME} ni tanlang.
      </>,
      <>
        <Key>O'rnatish</Key> ni bosing. Ilova bosh ekranga va ilovalar ro'yxatiga qo'shiladi.
      </>,
    ],
  },
  'android-other': {
    note: 'Bu brauzerda ilova to\'liq o\'rnatilmasligi mumkin. Eng yaxshisi Chrome\'da ochish:',
    steps: [
      <>Havolani nusxalab, Chrome'da oching va «Ilovani o'rnatish» ni yana bosing.</>,
      <>
        Yoki shu brauzer menyusidan (<Key>⋮</Key> yoki <Key>☰</Key>) {HOME} («Ярлык на рабочий стол») ni tanlang.
      </>,
    ],
    copy: true,
  },
  desktop: {
    steps: [
      <>
        Chrome yoki Edge'da manzil satrining o'ng tomonidagi <Key><DownloadIcon className="inline h-4 w-4 align-[-2px]" /></Key> (yoki <Key>⊕</Key>) belgisini bosing.
      </>,
      <>Mac'dagi Safari'da: «Fayl» menyusi → «Dock'ka qo'shish» («Add to Dock»).</>,
    ],
  },
};

// "Ilovani o'rnatish" tugmasi: brauzer ruxsat bersa darhol o'rnatadi, aks holda shu qurilma uchun yo'riqnoma ochadi.
// Ilova allaqachon o'rnatilgan (alohida oynada ochilgan) bo'lsa, ko'rinmaydi.
export function InstallButton({ variant = 'primary', className = '' }) {
  const { canInstall, installed } = usePwa();
  const [open, setOpen] = useState(false);
  const toast = useToast();

  if (installed) return null;

  async function onClick() {
    if (canInstall) {
      if (await promptInstall()) toast("Ilova o'rnatildi. Uni bosh ekrandan ochishingiz mumkin");
      return;
    }
    setOpen(true);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      toast('Havola nusxalandi');
    } catch {
      toast(window.location.origin, 'warning');
    }
  }

  const guide = GUIDES[browserKind()];
  const android = isAndroid();

  return (
    <>
      {variant === 'menu' ? (
        <button role="menuitem" className={className} onClick={onClick}>
          <DownloadIcon className="h-4.5 w-4.5 text-brand-600 dark:text-brand-400" />
          Ilovani o'rnatish
        </button>
      ) : variant === 'icon' ? (
        <button className={`btn-icon text-brand-600 dark:text-brand-400 ${className}`} onClick={onClick} aria-label="Ilovani o'rnatish" title="Ilovani o'rnatish">
          <DownloadIcon />
        </button>
      ) : variant === 'link' ? (
        <button className={`inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:underline dark:text-brand-400 ${className}`} onClick={onClick}>
          <DownloadIcon className="h-4 w-4" /> Ilovani telefonga o'rnatish
        </button>
      ) : (
        <button className={`btn-primary ${className}`} onClick={onClick}>
          <DownloadIcon className="h-4 w-4" /> Ilovani o'rnatish
        </button>
      )}

      {open && (
        <Modal title="Ilovani o'rnatish" onClose={() => setOpen(false)}>
          <div className="space-y-4 text-sm">
            {android && (
              <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-900/60 dark:bg-brand-950/40">
                <a className="btn-primary w-full" href={APK_URL} rel="noopener">
                  <DownloadIcon className="h-4 w-4" /> Android ilovani yuklab olish (APK)
                </a>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  Yuklangan <b>xarajat-nazorati.apk</b> faylini oching. Telefon so'rasa, shu brauzerga{' '}
                  <b>«Noma'lum manbalardan o'rnatish»</b> («Неизвестные источники») ga ruxsat bering va <b>O'rnatish</b> ni bosing.
                </p>
              </div>
            )}
            {android && <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Yoki brauzer orqali</p>}
            {guide.note && <p className="text-slate-600 dark:text-slate-300">{guide.note}</p>}
            <ol className="space-y-3">
              {guide.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 leading-relaxed text-slate-700 dark:text-slate-200">{step}</span>
                </li>
              ))}
            </ol>
            <div className="flex gap-2">
              {guide.copy && (
                <button className="btn-secondary flex-1" onClick={copyLink}>
                  Havolani nusxalash
                </button>
              )}
              <button className="btn-primary flex-1" onClick={() => setOpen(false)}>
                Tushunarli
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
