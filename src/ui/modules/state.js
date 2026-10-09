function initialLang() {
  if (typeof window === 'undefined') return 'zh';
  const param = new URLSearchParams(window.location.search).get('lang');
  if (param === 'zh' || param === 'en') return param;
  try {
    const saved = window.localStorage.getItem('osh_lang');
    if (saved === 'zh' || saved === 'en') return saved;
  } catch {}
  return window.CURRENT_LANG === 'zh' || window.CURRENT_LANG === 'en' ? window.CURRENT_LANG : 'zh';
}

export const state = {
  user: null,
  canEncrypt: false,
  lang: initialLang(),
  authMode: 'login',
};
