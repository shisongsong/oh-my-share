import { t } from './i18n.js';

export function initTabs() {
  const tabs = document.querySelectorAll('.upload-tab');
  const panels = document.querySelectorAll('.upload-panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      panels.forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');

      const isCode = tab.dataset.target === 'panel-code';
      const slugInput = document.getElementById('slug-file');
      if (slugInput) {
        const key = isCode ? 'slugPlaceholderCode' : 'slugPlaceholderFile';
        slugInput.dataset.i18n = key;
        slugInput.placeholder = t(key);
      }

      // Hide result when switching tabs
      const resultBox = document.getElementById('resultBox');
      if (resultBox) resultBox.hidden = true;
    });
  });
}

export function initCopyButton() {
  document.getElementById('copyBtn').addEventListener('click', function () {
    const urlInput = document.getElementById('resultUrl');
    if (!urlInput.value) return;

    navigator.clipboard.writeText(urlInput.value).then(() => {
      this.textContent = t('copiedBtn');
      this.classList.add('copied');
      setTimeout(() => {
        this.textContent = t('copyBtn');
        this.classList.remove('copied');
      }, 2000);
    }).catch(() => {
      alert(t('errCopy'));
    });
  });
}

export function initUpgradeModal() {
  const upgradeBtn = document.getElementById('upgradeBtn');
  const upgradeModal = document.getElementById('upgradeModal');
  const upgradeSendBtn = document.getElementById('upgradeSendBtn');
  const upgradeSection = document.getElementById('upgradeSection');
  
  if (upgradeBtn) {
    upgradeBtn.addEventListener('click', () => {
      upgradeModal.classList.add('active');
    });
  }
  
  if (upgradeSendBtn) {
    upgradeSendBtn.addEventListener('click', () => {
      const subject = encodeURIComponent(t('upgradeEmailSubject'));
      const body = encodeURIComponent(t('upgradeEmailBody'));
      window.location.href = `mailto:1400875096@qq.com?subject=${subject}&body=${body}`;
    });
  }
  
  window.closeUpgradeModal = function() {
    upgradeModal.classList.remove('active');
  };
  
  window.updateUpgradeVisibility = function(isPaid) {
    if (upgradeSection) {
      upgradeSection.style.display = isPaid ? 'none' : 'block';
    }
  };
  
  window.updatePricingDisplay = function(lang) {
    const pricingMain = document.getElementById('pricingMain');
    const pricingAlt = document.getElementById('pricingAlt');
    if (pricingMain && pricingAlt) {
      if (lang === 'zh') {
        pricingMain.textContent = '¥9.9/月';
        pricingAlt.textContent = '$1.9/月';
      } else {
        pricingMain.textContent = '$1.9/月';
        pricingAlt.textContent = '¥9.9/月';
      }
    }
  };
}
