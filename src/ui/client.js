import { state } from './modules/state.js';
import { applyLang, toggleLang } from './modules/i18n.js';
import { initAuth } from './modules/auth.js';
import { initUpload } from './modules/upload.js';
import { initTabs, initCopyButton, initUpgradeModal } from './modules/ui.js';
import { initShare } from './modules/share.js';

window.toggleLang = toggleLang;

applyLang(state.lang);
initAuth();
initUpload();
initTabs();
initCopyButton();
initUpgradeModal();
initShare();

if (window.updatePricingDisplay) {
  window.updatePricingDisplay(state.lang);
}
