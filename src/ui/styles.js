import { BASE_CSS } from './theme.js';

export const STYLES = `
${BASE_CSS}

/* ============================================ */
/* Hero                                         */
/* ============================================ */
.hero {
  position: relative;
  padding: 76px var(--space-5) 56px;
  text-align: center;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  top: -180px;
  left: 50%;
  transform: translateX(-50%);
  width: 900px;
  height: 480px;
  pointer-events: none;
  background:
    radial-gradient(420px 240px at 35% 40%, rgba(255,92,124,0.16), transparent 70%),
    radial-gradient(420px 240px at 65% 45%, rgba(92,225,212,0.16), transparent 70%);
}

.hero-content {
  position: relative;
  max-width: 720px;
  margin: 0 auto;
}

.hero-title {
  font-size: clamp(34px, 5.5vw, 54px);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.08;
  margin-bottom: var(--space-5);
}

.hero-subtitle {
  font-size: clamp(16px, 2vw, 19px);
  line-height: 1.5;
  color: var(--color-text-secondary);
  max-width: 560px;
  margin: 0 auto var(--space-10);
}

/* ============================================ */
/* Upload card                                  */
/* ============================================ */
.upload-card {
  background: var(--color-surface);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  text-align: left;
  padding: var(--space-5);
}

.upload-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
  padding: 3px;
  background: var(--color-fill);
  border-radius: 11px;
  margin-bottom: var(--space-5);
}

.upload-tab {
  border: none;
  padding: 9px 12px;
  background: transparent;
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: 8px;
  transition: background var(--duration-fast) ease, color var(--duration-fast) ease,
    box-shadow var(--duration-fast) ease;
}

.upload-tab.active {
  background: var(--color-surface);
  color: var(--color-text);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.04);
}

@media (prefers-color-scheme: dark) {
  .upload-tab.active {
    background: #636366;
    box-shadow: 0 1px 3px rgba(0,0,0,0.5);
  }
}

.upload-tab:hover:not(.active) {
  color: var(--color-text);
}

.upload-panel {
  display: none;
}

.upload-panel.active {
  display: block;
}

/* Drop zone */
.drop-zone {
  border: 1.5px dashed var(--color-hairline-strong);
  border-radius: 16px;
  padding: var(--space-10) var(--space-5);
  text-align: center;
  cursor: pointer;
  transition: border-color var(--duration-base) ease, background var(--duration-base) ease;
  background: transparent;
}

.drop-zone:hover,
.drop-zone.dragover {
  border-color: var(--color-accent-pink);
  background: rgba(255,92,124,0.05);
}

.drop-zone svg {
  width: 40px;
  height: 40px;
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-3);
  transition: color var(--duration-base) ease, transform var(--duration-base) var(--ease-out);
}

.drop-zone:hover svg,
.drop-zone.dragover svg {
  color: var(--color-accent-strong);
  transform: translateY(-3px);
}

.drop-zone p {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.drop-zone .link {
  color: var(--color-link);
  font-weight: 600;
}

input[type=file] {
  display: none;
}

/* Code textarea */
.code-textarea {
  width: 100%;
  min-height: 150px;
  height: auto;
  padding: 14px;
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-md);
  background: var(--color-input);
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 13.5px;
  line-height: 1.6;
  letter-spacing: 0;
  resize: vertical;
  margin-bottom: 0;
  transition: border-color var(--duration-fast) ease, box-shadow var(--duration-fast) ease;
}

.code-textarea:focus {
  outline: none;
  border-color: var(--color-accent-pink);
  box-shadow: var(--shadow-glow);
}

.code-textarea::placeholder {
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
  font-size: 13.5px;
}

textarea {
  width: 100%;
  height: 140px;
  padding: 12px 14px;
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 1.6;
  letter-spacing: 0;
  resize: vertical;
  margin-bottom: var(--space-4);
  background: var(--color-input);
  color: var(--color-text);
  transition: border-color var(--duration-fast) ease, box-shadow var(--duration-fast) ease;
}

textarea:focus {
  outline: none;
  border-color: var(--color-accent-pink);
  box-shadow: var(--shadow-glow);
}

textarea::placeholder {
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
  font-size: 14px;
}

/* Options (collapsible) */
.upload-options {
  border-top: 1px solid var(--color-hairline);
  margin-top: var(--space-5);
}

.upload-options > summary {
  list-style: none;
  cursor: pointer;
  padding: var(--space-4) 2px var(--space-2);
  font-size: 13.5px;
  font-weight: 500;
  color: var(--color-text-secondary);
  user-select: none;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: color var(--duration-fast) ease;
}

.upload-options > summary::-webkit-details-marker {
  display: none;
}

.upload-options > summary::before {
  content: '';
  width: 7px;
  height: 7px;
  border-right: 1.6px solid currentColor;
  border-bottom: 1.6px solid currentColor;
  transform: rotate(-45deg);
  transition: transform var(--duration-base) var(--ease-out);
  margin-top: -2px;
}

.upload-options[open] > summary::before {
  transform: rotate(45deg);
  margin-top: 2px;
}

.upload-options > summary:hover {
  color: var(--color-text);
}

.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3) var(--space-4);
  padding: var(--space-3) 0 var(--space-4);
}

.options-grid .input-group {
  margin-bottom: 0;
}

.upload-options .option-hint,
.upload-options .check-row,
.upload-options #encryptDetails,
.upload-options .upgrade-section {
  margin-left: 2px;
  margin-right: 2px;
}

.upload-options .check-row {
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px dashed var(--color-hairline);
}

#encryptDetails {
  margin-top: var(--space-3);
}

#passphraseInput {
  margin-top: var(--space-3);
}

/* Generate button */
.btn-upload {
  width: 100%;
  margin-top: var(--space-5);
  min-height: 48px;
  font-size: 15.5px;
}

/* Spinner inside button */
.spinner {
  width: 15px;
  height: 15px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #ffffff;
  border-radius: 50%;
  display: inline-block;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Result */
.result-box {
  margin-top: var(--space-5);
  padding: var(--space-4);
  background: var(--success-bg);
  border: 1px solid rgba(52,199,89,0.4);
  border-radius: 16px;
  animation: result-in 0.3s var(--ease-out);
}

.result-box[hidden] {
  display: none;
}

.result-box.error {
  background: var(--error-bg);
  border-color: rgba(255,59,48,0.4);
}

@keyframes result-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.result-url {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--color-surface);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: 6px 6px 6px 14px;
}

.result-url input {
  flex: 1;
  border: none;
  background: transparent;
  font-family: var(--font-mono);
  font-size: 13.5px;
  letter-spacing: 0;
  color: var(--color-text);
  outline: none;
  padding: 6px 0;
  min-width: 0;
}

.result-url .action-btn {
  flex-shrink: 0;
  border-radius: 9px;
}

.result-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.result-hint {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-3);
}

.result-box h3 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: var(--space-3);
}

.result-box.success h3 { color: var(--success); }
.result-box.error h3 { color: var(--error); }

/* ============================================ */
/* Features                                     */
/* ============================================ */
.features {
  padding: var(--space-8) var(--space-5) var(--space-4);
  max-width: var(--max-width);
  margin: 0 auto;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}

.feature-card {
  text-align: left;
  padding: var(--space-6) var(--space-5);
  border: 1px solid var(--color-hairline);
  border-radius: 16px;
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
  transition: transform var(--duration-base) var(--ease-out),
    box-shadow var(--duration-base) ease;
}

.feature-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-card-hover);
}

.feature-icon {
  width: 44px;
  height: 44px;
  border-radius: 11px;
  background: linear-gradient(135deg, rgba(255,92,124,0.14), rgba(92,225,212,0.14));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 21px;
  margin-bottom: var(--space-4);
}

.feature-card h3 {
  font-size: 14.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin-bottom: var(--space-2);
  color: var(--color-text);
}

.feature-card p {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.55;
}

@media (max-width: 860px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .features-grid {
    grid-template-columns: 1fr;
  }
}

/* ============================================ */
/* Legacy header account button (manage/stats)  */
/* ============================================ */
.header .account-button {
  margin-top: var(--space-4);
}

/* ============================================ */
/* Modal                                        */
/* ============================================ */
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.42);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-5);
}

.modal.active {
  display: flex;
}

.modal-content {
  background: var(--color-surface);
  padding: var(--space-6);
  max-width: 460px;
  width: 100%;
  max-height: 88vh;
  overflow-y: auto;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-modal);
  animation: modal-in 0.22s var(--ease-out);
}

@keyframes modal-in {
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-5);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-hairline);
}

.modal-title {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.modal-close {
  background: var(--color-fill);
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  font-size: 17px;
  line-height: 1;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--duration-fast) ease;
}

.modal-close:hover {
  background: var(--color-fill-hover);
}

.modal-message {
  min-height: 18px;
  margin-top: var(--space-3);
  font-size: 12.5px;
  color: var(--error);
  text-align: center;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.modal-footer .btn {
  min-height: 40px;
  font-size: 14px;
}

/* Account modal */
.account-modal {
  max-width: 400px;
}

.account-heading {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: var(--space-4);
}

.account-email {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-4);
  word-break: break-word;
}

.account-input {
  min-height: 44px;
}

#authForm .btn {
  width: 100%;
  margin-top: var(--space-1);
}

/* OAuth */
.oauth-divider {
  display: flex;
  align-items: center;
  margin: var(--space-5) 0;
  color: var(--color-text-tertiary);
  font-size: 12.5px;
  gap: var(--space-3);
}

.oauth-divider::before,
.oauth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-hairline);
}

.oauth-btn {
  width: 100%;
  min-height: 44px;
  padding: 10px var(--space-4);
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  transition: background var(--duration-fast) ease, transform var(--duration-fast) ease;
}

.oauth-btn:hover {
  background: var(--color-fill);
}

.oauth-btn:active {
  transform: scale(0.985);
}

.oauth-btn svg {
  flex-shrink: 0;
}

/* Asset list */
.asset-section {
  border-top: 1px solid var(--color-hairline);
  margin-top: var(--space-5);
  padding-top: var(--space-5);
}

.asset-list {
  display: grid;
  gap: var(--space-2);
}

.asset-empty {
  font-size: 12.5px;
  color: var(--color-text-tertiary);
  text-align: center;
  padding: var(--space-5);
}

.asset-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  background: var(--color-surface);
  transition: background var(--duration-fast) ease, border-color var(--duration-fast) ease;
}

.asset-row:hover {
  background: var(--color-fill);
}

.asset-row a {
  flex: 1;
  min-width: 0;
  color: var(--color-text);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-row small {
  color: var(--color-text-tertiary);
  font-size: 11.5px;
  white-space: nowrap;
}

.asset-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.asset-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: var(--space-1);
}

.asset-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  background: linear-gradient(135deg, rgba(255,92,124,0.15), rgba(92,225,212,0.15));
  color: var(--color-accent-strong);
  border-radius: var(--radius-pill);
}

.asset-actions {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-shrink: 0;
}

.asset-manage {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  background: var(--gradient-primary);
  color: #ffffff;
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  text-decoration: none;
  white-space: nowrap;
  transition: filter var(--duration-fast) ease, transform var(--duration-fast) ease;
}

.asset-manage:hover {
  filter: brightness(1.06);
}

.asset-delete {
  border: 1px solid var(--color-hairline-strong);
  background: transparent;
  color: var(--error);
  font-family: var(--font-sans);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: var(--radius-pill);
  transition: background var(--duration-fast) ease;
}

.asset-delete:hover {
  background: var(--error-bg);
}

.asset-publish {
  border: 1px solid var(--color-hairline-strong);
  background: transparent;
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: var(--radius-pill);
  transition: background var(--duration-fast) ease;
}

.asset-publish:hover {
  background: var(--color-fill);
}

.asset-publish:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.asset-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 700;
  color: var(--success);
  background: var(--success-bg);
  border-radius: var(--radius-pill);
  vertical-align: middle;
}

/* ============================================ */
/* Manage / edit pages                          */
/* ============================================ */
.form-content {
  padding: 0;
}

.manage-section {
  margin-top: var(--space-6);
  padding-top: var(--space-6);
  border-top: 1px solid var(--color-hairline);
}

.manage-list {
  margin-top: var(--space-4);
}

.manage-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 12px 14px;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  margin-bottom: var(--space-2);
  transition: background var(--duration-fast) ease;
}

.manage-item:hover {
  background: var(--color-fill);
}

.manage-item-info {
  flex: 1;
  min-width: 0;
}

.manage-item-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.manage-item-token {
  font-size: 11px;
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
  letter-spacing: 0;
}

.manage-item-actions {
  display: flex;
  gap: var(--space-2);
}

.manage-item-btn {
  border: 1px solid var(--color-hairline-strong);
  background: transparent;
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  white-space: nowrap;
  transition: background var(--duration-fast) ease;
}

.manage-item-btn:hover {
  background: var(--color-fill);
}

.manage-item-btn.primary {
  background: var(--gradient-primary);
  color: #ffffff;
  border-color: transparent;
  box-shadow: var(--shadow-btn);
}

.manage-item-btn.primary:hover {
  filter: brightness(1.05);
}

.manage-actions {
  margin-top: var(--space-4);
  text-align: center;
}

.empty-hint {
  font-size: 13px;
  color: var(--color-text-tertiary);
  text-align: center;
  padding: var(--space-4);
}

/* Metadata / protection / expiry */
.metadata-fields {
  margin-bottom: var(--space-4);
}

.metadata-fields textarea {
  height: 80px;
  resize: none;
}

.protection-options {
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
  background: var(--color-surface);
}

.protection-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.protection-field {
  margin-bottom: 0;
}

.protection-field label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.expiry-options {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.expiry-btn {
  padding: 7px 14px;
  border: 1px solid var(--color-hairline-strong);
  background: transparent;
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--radius-pill);
  transition: background var(--duration-fast) ease, color var(--duration-fast) ease;
}

.expiry-btn.active {
  background: var(--gradient-primary);
  color: #ffffff;
  border-color: transparent;
}

.expiry-btn:hover:not(.active) {
  background: var(--color-fill);
}

/* Upload options box (legacy layout) */
.upload-options-box,
.tabs {
  margin-bottom: var(--space-6);
}

.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.tab {
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  text-align: center;
  cursor: pointer;
  transition: all var(--duration-fast) ease;
  color: var(--color-text);
  background: transparent;
}

.tab.active {
  background: var(--gradient-primary);
  color: #ffffff;
  font-weight: 600;
  border-color: transparent;
}

.tab:not(.active):hover {
  background: var(--color-fill);
}

/* ============================================ */
/* Upgrade / pricing                            */
/* ============================================ */
.upgrade-section {
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px dashed var(--color-hairline);
}

.upgrade-btn {
  width: 100%;
  min-height: 42px;
  padding: 10px var(--space-4);
  background: var(--gradient-primary);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow-btn);
  transition: filter var(--duration-fast) ease, transform var(--duration-fast) ease;
}

.upgrade-btn:hover {
  filter: brightness(1.05);
  transform: translateY(-1px);
}

.upgrade-modal {
  max-width: 440px;
}

.upgrade-content {
  text-align: center;
}

.upgrade-desc {
  font-size: 13.5px;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-5);
}

.pricing-card {
  background: linear-gradient(135deg, rgba(255,92,124,0.10), rgba(92,225,212,0.10));
  border: 1px solid var(--color-hairline);
  border-radius: 16px;
  padding: var(--space-6);
  margin-bottom: var(--space-5);
}

.pricing-price {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.pricing-main {
  font-size: 36px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--color-text);
}

.pricing-alt {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.pricing-features {
  font-size: 12.5px;
  color: var(--color-text-secondary);
}

.payment-methods {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.payment-method {
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  background: var(--color-surface);
}

.payment-method h4 {
  font-size: 13.5px;
  font-weight: 600;
  margin-bottom: var(--space-1);
  color: var(--color-text);
}

.payment-method p {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.payment-note {
  font-size: 12.5px;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-4);
  padding: var(--space-3);
  background: var(--color-fill);
  border-radius: var(--radius-sm);
}

.upgrade-send-btn {
  width: 100%;
}

/* ============================================ */
/* Password page (styles.js fallback)           */
/* ============================================ */
.password-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--space-5);
}

.password-box {
  background: var(--color-surface);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-card);
  padding: var(--space-8);
  max-width: 400px;
  width: 100%;
  box-shadow: var(--shadow-card);
}

.password-box h2 {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: var(--space-4);
  text-align: center;
}

.password-box .input {
  margin-bottom: var(--space-4);
}

/* ============================================ */
/* Stats                                        */
/* ============================================ */
.stats-container {
  padding: 0;
}

.stat-card {
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
  background: var(--color-surface);
}

.stat-card h3 {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: var(--space-2);
  color: var(--color-text-secondary);
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-text);
}

.stat-chart {
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
  background: var(--color-surface);
}

/* ============================================ */
/* Spinner (pixel variant, legacy)              */
/* ============================================ */
.spinner-pixel {
  display: inline-flex;
  gap: 4px;
}

.spinner-pixel span {
  display: inline-block;
  font-size: 12px;
  animation: pixel-bounce 0.6s ease infinite;
}

.spinner-pixel span:nth-child(2) { animation-delay: 0.1s; }
.spinner-pixel span:nth-child(3) { animation-delay: 0.2s; }

@keyframes pixel-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

/* ============================================ */
/* Misc                                         */
/* ============================================ */
.scanlines::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    rgba(0,0,0,0.03) 0px,
    rgba(0,0,0,0.03) 1px,
    transparent 1px,
    transparent 3px
  );
}

/* ============================================ */
/* Responsive                                   */
/* ============================================ */
@media (max-width: 640px) {
  .hero {
    padding-top: 52px;
    padding-bottom: 40px;
  }

  .options-grid {
    grid-template-columns: 1fr;
  }

  .result-actions {
    flex-direction: column;
  }

  .asset-row {
    flex-wrap: wrap;
  }

  .payment-methods {
    grid-template-columns: 1fr;
  }

  .protection-row {
    grid-template-columns: 1fr;
  }

  .expiry-options {
    flex-direction: column;
  }

  .expiry-btn {
    width: 100%;
  }

  .tabs {
    grid-template-columns: 1fr;
  }

  .container {
    margin: var(--space-4) auto;
    padding: var(--space-5) var(--space-4);
    border-radius: 16px;
  }
}
`;
