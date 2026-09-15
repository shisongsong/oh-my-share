export const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

:root {
  /* Pixel colors */
  --pixel-black: #1a1a2e;
  --pixel-dark: #16213e;
  --pixel-gray: #4a4a6a;
  --pixel-light: #e8e8e8;
  --pixel-white: #f5f5f5;
  
  /* Gradient colors */
  --gradient-start: #ff6b6b;
  --gradient-end: #4ecdc4;
  --gradient: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
  
  /* Theme colors */
  --bg: #f0f0f5;
  --surface: rgba(255,255,255,0.95);
  --surface-hover: rgba(255,255,255,0.85);
  --text-main: var(--pixel-black);
  --text-muted: var(--pixel-gray);
  --border: var(--pixel-black);
  
  /* Pixel sizing */
  --pixel-size: 4px;
  --radius: 0px;
  --radius-sm: 0px;
  
  /* Shadows - pixel style */
  --shadow-pixel: 
    var(--pixel-size) 0 0 0 var(--pixel-black),
    calc(-1 * var(--pixel-size)) 0 0 0 var(--pixel-black),
    0 var(--pixel-size) 0 0 var(--pixel-black),
    0 calc(-1 * var(--pixel-size)) 0 0 var(--pixel-black);
  
  --shadow-pixel-lg: 
    calc(2 * var(--pixel-size)) 0 0 0 var(--pixel-black),
    calc(-2 * var(--pixel-size)) 0 0 0 var(--pixel-black),
    0 calc(2 * var(--pixel-size)) 0 0 var(--pixel-black),
    0 calc(-2 * var(--pixel-size)) 0 0 var(--pixel-black);
  
  /* Success/Error */
  --success: #2ecc71;
  --success-bg: rgba(46,204,113,0.1);
  --error: #e74c3c;
  --error-bg: rgba(231,76,60,0.1);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0a0a15;
    --surface: rgba(26,26,46,0.95);
    --surface-hover: rgba(26,26,46,0.85);
    --text-main: var(--pixel-light);
    --text-muted: #8888aa;
    --border: var(--pixel-light);
  }
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

body {
  font-family: 'Press Start 2P', monospace;
  background: var(--bg);
  background-image: 
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 20px 20px;
  color: var(--text-main);
  line-height: 2;
  min-height: 100vh;
  padding: 20px;
  transition: background-color .3s, color .3s;
}

/* Container - responsive */
.container {
  background: var(--surface);
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
  position: relative;
  animation: fadeIn .5s cubic-bezier(.16,1,.3,1);
  box-shadow: var(--shadow-pixel-lg);
  border: var(--pixel-size) solid var(--border);
}

@media (min-width: 768px) {
  .container {
    padding: 32px 40px;
  }
}

@media (min-width: 1200px) {
  .container {
    max-width: 1000px;
  }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Language switch - pixel style */
.lang-switch {
  position: absolute;
  top: 16px;
  right: 16px;
  background: var(--gradient);
  border: 3px solid var(--border);
  padding: 8px 12px;
  font-family: inherit;
  font-size: 8px;
  color: var(--pixel-white);
  cursor: pointer;
  transition: transform .1s;
  box-shadow: 3px 3px 0 0 var(--border);
}

.lang-switch:hover {
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0 0 var(--border);
}

.lang-switch:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 0 var(--border);
}

/* Header */
.header {
  text-align: center;
  padding: 20px 0 30px;
  border-bottom: var(--pixel-size) dashed var(--border);
  margin-bottom: 24px;
}

.header h1 {
  font-size: 16px;
  letter-spacing: 2px;
  margin-bottom: 12px;
  background: var(--gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header p {
  font-size: 8px;
  color: var(--text-muted);
}

.account-button {
  margin-top: 16px;
  background: var(--surface);
  border: 3px solid var(--border);
  padding: 10px 16px;
  color: var(--text-main);
  font-family: inherit;
  font-size: 8px;
  cursor: pointer;
  transition: all .1s;
  box-shadow: 3px 3px 0 0 var(--border);
}

.account-button:hover {
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0 0 var(--border);
}

/* Tabs - pixel style */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.tab {
  flex: 1;
  padding: 12px 8px;
  font-family: inherit;
  font-size: 8px;
  color: var(--text-muted);
  background: var(--surface);
  border: 3px solid var(--border);
  cursor: pointer;
  transition: all .1s;
  text-align: center;
  box-shadow: 3px 3px 0 0 var(--border);
}

.tab:hover {
  background: var(--surface-hover);
}

.tab.active {
  background: var(--gradient);
  color: var(--pixel-white);
  box-shadow: 3px 3px 0 0 var(--border);
  transform: translate(-2px, -2px);
}

/* Form content */
.form-content {
  padding: 0;
}

/* Upload options */
.upload-options {
  border: 3px solid var(--border);
  padding: 16px;
  margin-bottom: 20px;
  background: var(--surface);
  box-shadow: 3px 3px 0 0 var(--border);
}

.check-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 8px;
  font-weight: bold;
  cursor: pointer;
}

.check-row input {
  width: 16px;
  height: 16px;
  accent-color: var(--gradient-start);
}

.check-row input:disabled {
  cursor: not-allowed;
}

.option-hint {
  font-size: 7px;
  color: var(--text-muted);
  margin: 8px 0 0 28px;
}

#encryptDetails {
  margin: 16px 0 0 28px;
}

.select-label {
  display: block;
  font-size: 7px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

select, .account-input {
  width: 100%;
  padding: 12px;
  border: 3px solid var(--border);
  font-family: inherit;
  font-size: 8px;
  background: var(--surface);
  color: var(--text-main);
  box-shadow: 3px 3px 0 0 var(--border);
}

select:focus, .account-input:focus {
  outline: none;
  box-shadow: 3px 3px 0 0 var(--gradient-start);
}

#passphraseInput {
  margin-top: 12px;
}

/* Panels */
.panel {
  display: none;
}

.panel.active {
  display: block;
  animation: slideUp .3s cubic-bezier(.16,1,.3,1);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Drop zone - pixel style */
.drop-zone {
  border: 4px dashed var(--border);
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all .2s;
  background: var(--surface);
  margin-bottom: 20px;
  box-shadow: var(--shadow-pixel);
}

.drop-zone:hover, .drop-zone.dragover {
  border-color: var(--gradient-start);
  background: var(--surface-hover);
}

.drop-zone.dragover {
  transform: scale(1.02);
}

.drop-zone svg {
  width: 40px;
  height: 40px;
  color: var(--text-muted);
  margin-bottom: 16px;
  transition: transform .2s;
}

.drop-zone:hover svg, .drop-zone.dragover svg {
  color: var(--gradient-start);
  transform: translateY(-4px);
}

.drop-zone p {
  font-size: 8px;
  color: var(--text-muted);
}

.drop-zone .link {
  color: var(--gradient-start);
  font-weight: bold;
  text-decoration: underline;
  text-underline-offset: 4px;
}

input[type=file] {
  display: none;
}

/* Textarea - pixel style */
textarea {
  width: 100%;
  height: 180px;
  padding: 16px;
  border: 3px solid var(--border);
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.8;
  resize: vertical;
  margin-bottom: 20px;
  transition: all .2s;
  background: var(--bg);
  color: var(--text-main);
  box-shadow: 3px 3px 0 0 var(--border);
}

textarea:focus {
  outline: none;
  box-shadow: 3px 3px 0 0 var(--gradient-start);
  background: var(--surface);
}

textarea::placeholder {
  color: var(--text-muted);
  opacity: .7;
}

/* Input groups */
.input-group {
  margin-bottom: 20px;
}

.input-group label {
  display: block;
  font-size: 8px;
  font-weight: bold;
  margin-bottom: 10px;
  color: var(--text-main);
}

.input-group .optional {
  color: var(--text-muted);
  font-weight: normal;
}

.input-group input[type=text] {
  width: 100%;
  padding: 12px;
  border: 3px solid var(--border);
  font-family: inherit;
  font-size: 8px;
  transition: all .2s;
  background: var(--surface);
  color: var(--text-main);
  box-shadow: 3px 3px 0 0 var(--border);
}

.input-group input[type=text]:focus {
  outline: none;
  box-shadow: 3px 3px 0 0 var(--gradient-start);
}

/* Buttons - pixel style */
.btn {
  width: 100%;
  padding: 16px;
  background: var(--gradient);
  color: var(--pixel-white);
  border: 3px solid var(--border);
  font-family: inherit;
  font-size: 10px;
  font-weight: bold;
  cursor: pointer;
  transition: all .1s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 4px 4px 0 0 var(--border);
}

.btn:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 0 var(--border);
}

.btn:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 0 var(--border);
}

.btn:disabled {
  opacity: .6;
  cursor: not-allowed;
  transform: none;
  box-shadow: 4px 4px 0 0 var(--border);
}

/* Result box */
.result-box {
  display: none;
  margin-top: 24px;
  padding: 20px;
  animation: fadeIn .3s;
  border: 3px solid var(--border);
  box-shadow: var(--shadow-pixel);
}

.result-box.success {
  background: var(--success-bg);
  border-color: var(--success);
}

.result-box.error {
  background: var(--error-bg);
  border-color: var(--error);
}

.result-box h3 {
  font-size: 10px;
  margin-bottom: 12px;
}

.result-hint {
  font-size: 7px;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.result-box.success h3 {
  color: var(--success);
}

.result-box.error h3 {
  color: var(--error);
}

.result-url {
  display: flex;
  align-items: center;
  background: var(--bg);
  border: 2px solid var(--border);
  padding: 8px 12px;
}

.result-url input {
  flex: 1;
  border: none;
  font-family: 'Courier New', monospace;
  font-size: 10px;
  color: var(--text-main);
  background: transparent;
  outline: none;
  padding: 4px 0;
}

.result-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.action-btn {
  flex: 1;
  background: var(--surface);
  border: 3px solid var(--border);
  padding: 12px;
  font-family: inherit;
  font-size: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all .1s;
  color: var(--text-main);
  text-align: center;
  box-shadow: 3px 3px 0 0 var(--border);
}

.action-btn:hover {
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0 0 var(--border);
}

.action-btn.copied {
  background: var(--success);
  color: var(--pixel-white);
  border-color: var(--success);
}

.action-btn.primary {
  background: var(--gradient);
  color: var(--pixel-white);
  border-color: var(--border);
}

/* Spinner - pixel style */
.spinner {
  width: 12px;
  height: 12px;
  border: 3px solid rgba(255,255,255,.3);
  border-radius: 0;
  border-top-color: var(--pixel-white);
  animation: spin .6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Modal - pixel style */
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.8);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  animation: fadeIn .2s;
}

.modal.active {
  display: flex;
}

.modal-content {
  background: var(--surface);
  padding: 24px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: modalIn .3s cubic-bezier(.16,1,.3,1);
  border: 4px solid var(--border);
  box-shadow: 8px 8px 0 0 var(--border);
}

@keyframes modalIn {
  from { opacity: 0; transform: scale(.9); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 3px dashed var(--border);
}

.modal-title {
  font-size: 10px;
  font-weight: bold;
}

.modal-close {
  background: var(--gradient);
  border: 3px solid var(--border);
  font-size: 12px;
  color: var(--pixel-white);
  cursor: pointer;
  padding: 4px 8px;
  box-shadow: 2px 2px 0 0 var(--border);
}

.modal-close:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 0 var(--border);
}

.account-modal {
  max-width: 420px;
}

.account-heading {
  font-size: 10px;
  margin-bottom: 16px;
}

.modal-message {
  min-height: 20px;
  margin-top: 12px;
  font-size: 7px;
  color: var(--error);
}

.text-button {
  border: 0;
  background: transparent;
  color: var(--gradient-start);
  font-family: inherit;
  font-size: 8px;
  cursor: pointer;
  padding: 8px 0;
  text-decoration: underline;
  text-underline-offset: 4px;
}

.text-button:hover {
  color: var(--gradient-end);
}

.account-email {
  font-size: 8px;
  color: var(--text-muted);
  margin-bottom: 16px;
  word-break: break-word;
}

.asset-section {
  border-top: 3px dashed var(--border);
  margin-top: 20px;
  padding-top: 20px;
}

.asset-list {
  display: grid;
  gap: 12px;
}

.asset-empty {
  font-size: 7px;
  color: var(--text-muted);
  text-align: center;
  padding: 20px;
}

.asset-row {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 3px solid var(--border);
  padding: 12px;
  background: var(--surface);
  box-shadow: 3px 3px 0 0 var(--border);
  transition: all .1s;
}

.asset-row:hover {
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0 0 var(--border);
}

.asset-row a {
  flex: 1;
  min-width: 0;
  color: var(--text-main);
  font-size: 7px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-row small {
  color: var(--text-muted);
  font-size: 6px;
  white-space: nowrap;
}

.asset-delete {
  border: 2px solid var(--error);
  background: transparent;
  color: var(--error);
  font-family: inherit;
  font-size: 6px;
  font-weight: bold;
  cursor: pointer;
  padding: 4px 8px;
}

.asset-delete:hover {
  background: var(--error);
  color: var(--pixel-white);
}

.asset-title {
  font-size: 8px;
  font-weight: bold;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.asset-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
}

.asset-tag {
  font-size: 6px;
  padding: 2px 6px;
  background: var(--gradient);
  color: var(--pixel-white);
  border: 2px solid var(--border);
}

.metadata-fields {
  margin-bottom: 20px;
}

.metadata-fields textarea {
  height: 80px;
  resize: none;
}

/* Upgrade section */
.upgrade-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 2px dashed var(--border);
}

.upgrade-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #f093fb, #f5576c);
  color: var(--pixel-white);
  border: 3px solid var(--border);
  font-family: inherit;
  font-size: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all .1s;
  box-shadow: 3px 3px 0 0 var(--border);
}

.upgrade-btn:hover {
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0 0 var(--border);
}

.upgrade-modal {
  max-width: 450px;
}

.upgrade-content {
  text-align: center;
}

.upgrade-desc {
  font-size: 8px;
  color: var(--text-muted);
  margin-bottom: 20px;
}

.pricing-card {
  background: var(--gradient);
  border: 4px solid var(--border);
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 4px 4px 0 0 var(--border);
}

.pricing-price {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}

.pricing-main {
  font-size: 24px;
  font-weight: bold;
  color: var(--pixel-white);
}

.pricing-alt {
  font-size: 10px;
  color: rgba(255,255,255,0.8);
}

.pricing-features {
  font-size: 7px;
  color: var(--pixel-white);
  opacity: 0.9;
}

.payment-methods {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.payment-method {
  border: 3px solid var(--border);
  padding: 16px;
  background: var(--bg);
  box-shadow: 3px 3px 0 0 var(--border);
}

.payment-method h4 {
  font-size: 9px;
  margin-bottom: 8px;
  color: var(--gradient-start);
}

.payment-method p {
  font-size: 7px;
  color: var(--text-muted);
}

.payment-note {
  font-size: 7px;
  color: var(--text-muted);
  margin-bottom: 20px;
  padding: 12px;
  background: var(--bg);
  border: 2px dashed var(--border);
}

.upgrade-send-btn {
  background: linear-gradient(135deg, #4facfe, #00f2fe);
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .container {
    padding: 16px;
  }
  
  .header h1 {
    font-size: 12px;
  }
  
  .tabs {
    flex-direction: column;
    gap: 8px;
  }
  
  .tab {
    padding: 12px;
  }
  
  .result-actions {
    flex-direction: column;
  }
  
  .asset-row {
    flex-wrap: wrap;
  }
}
`;
