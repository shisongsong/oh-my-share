import { t } from './i18n.js';

export async function request(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: text };
  }
  if (!response.ok) {
    const translated = data.code && t(data.code) !== data.code ? t(data.code) : null;
    throw new Error(translated || data.error || t('authError'));
  }
  return data;
}

export function get(url) {
  return request(url, { headers: { Accept: 'application/json' } });
}

export function post(url, body) {
  return request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function postForm(url, formData) {
  return request(url, { method: 'POST', body: formData });
}

export function del(url) {
  return request(url, { method: 'DELETE' });
}
