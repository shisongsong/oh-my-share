import { state } from './state.js';

const I18N_DATA = JSON.parse(document.getElementById('i18n-data').textContent);

export function t(key) {
  return I18N_DATA[state.lang]?.[key] || I18N_DATA.en?.[key] || key;
}

export function applyLang(lang) {
  state.lang = lang;
  const translations = I18N_DATA[lang];
  if (!translations) return;

  try {
    window.localStorage.setItem('osh_lang', lang);
  } catch {}

  // Keep server-rendered pages (landing / 404 / oauth / manage) in sync
  try {
    document.cookie = `osh_lang=${lang}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {}

  document.documentElement.lang = translations.htmlLang;
  document.title = 'Oh My Share - ' + translations.subtitle;

  const elements = document.querySelectorAll('[data-i18n]');
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const key = el.getAttribute('data-i18n');
    const value = translations[key];
    if (value === undefined) continue;

    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = value;
    } else if (el.dataset.loading === 'true') {
      continue;
    } else {
      el.textContent = value;
    }
  }

  const langButtonText = document.getElementById('langBtnText');
  if (langButtonText) langButtonText.textContent = lang === 'zh' ? 'EN' : '中文';
  
  if (window.updatePricingDisplay) {
    window.updatePricingDisplay(lang);
  }
}

export function toggleLang() {
  applyLang(state.lang === 'zh' ? 'en' : 'zh');
}

export function getTranslations() {
  return I18N_DATA[state.lang];
}
