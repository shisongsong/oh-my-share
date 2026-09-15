export const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Silkscreen:wght@400;700&family=VT323&display=swap');

/* ============================================ */
/* 亮色模式（默认）                              */
/* ============================================ */
:root {
  /* 背景层级 */
  --color-bg: #f5f5f0;
  --color-bg-elevated: #ffffff;
  --color-bg-input: #ffffff;

  /* 边框 */
  --color-border: #1a1a1a;
  --color-border-muted: rgba(26,26,26,0.3);

  /* 文字 */
  --color-text: #1a1a1a;
  --color-text-muted: #5a5a5a;
  --color-text-subtle: #9a9a9a;

  /* 强调色 */
  --color-accent-pink: #ff5c7c;
  --color-accent-cyan: #5ce1d4;
  --color-accent: #ff5c7c;
  --color-highlight: #ff6b4a;

  /* 渐变（跨主题完全一致） */
  --gradient-primary: linear-gradient(90deg, #ff5c7c 0%, #5ce1d4 100%);
  --gradient-primary-reverse: linear-gradient(90deg, #5ce1d4 0%, #ff5c7c 100%);

  /* 边框尺寸 */
  --border-width: 3px;
  --border-width-thick: 4px;
  --border-radius: 0;

  /* 像素风阴影 */
  --shadow-pixel: 4px 4px 0 rgba(26,26,26,0.15);
  --shadow-pixel-hover: 2px 2px 0 rgba(26,26,26,0.15);
  --shadow-glow-pink: 0 0 0 3px rgba(255,92,124,0.3);
  --shadow-glow-cyan: 0 0 0 3px rgba(92,225,212,0.3);

  /* 间距 */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* 字体 */
  --font-pixel: 'Press Start 2P', monospace;
  --font-pixel-body: 'Silkscreen', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'VT323', ui-monospace, SFMono-Regular, Menlo, monospace;

  /* 布局 */
  --max-width: 1100px;
  --container-padding: 24px;

  /* 动效 */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-step: steps(4, end);
  --duration-fast: 100ms;
  --duration-base: 150ms;
  --duration-slow: 250ms;

  /* 成功/错误 */
  --success: #2ecc71;
  --success-bg: rgba(46,204,113,0.1);
  --error: #e74c3c;
  --error-bg: rgba(231,76,60,0.1);

  color-scheme: light dark;
}

/* ============================================ */
/* 暗色模式                                     */
/* ============================================ */
@media (prefers-color-scheme: dark) {
  :root {
    /* 背景层级 */
    --color-bg: #0f1423;
    --color-bg-elevated: #14192d;
    --color-bg-input: #0a0e1a;

    /* 边框 */
    --color-border: #ffffff;
    --color-border-muted: rgba(255,255,255,0.3);

    /* 文字 */
    --color-text: #f5f5f5;
    --color-text-muted: #8b93a7;
    --color-text-subtle: #5a6178;

    /* 强调色（不变） */
    --color-accent-pink: #ff5c7c;
    --color-accent-cyan: #5ce1d4;
    --color-accent: #ff5c7c;
    --color-highlight: #ff6b4a;

    /* 渐变（不变） */
    --gradient-primary: linear-gradient(90deg, #ff5c7c 0%, #5ce1d4 100%);
    --gradient-primary-reverse: linear-gradient(90deg, #5ce1d4 0%, #ff5c7c 100%);

    /* 阴影 */
    --shadow-pixel: 4px 4px 0 rgba(255,255,255,0.15);
    --shadow-pixel-hover: 2px 2px 0 rgba(255,255,255,0.15);
    --shadow-glow-pink: 0 0 0 3px rgba(255,92,124,0.3);
    --shadow-glow-cyan: 0 0 0 3px rgba(92,225,212,0.3);
  }
}

/* ============================================ */
/* 基础重置                                     */
/* ============================================ */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

body {
  font-family: var(--font-pixel-body);
  background: var(--color-bg);
  background-image: 
    linear-gradient(rgba(128,128,128,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(128,128,128,0.03) 1px, transparent 1px);
  background-size: 20px 20px;
  color: var(--color-text);
  line-height: 1.6;
  min-height: 100vh;
  padding: var(--space-5);
  transition: background-color var(--duration-base), color var(--duration-base);
}

/* ============================================ */
/* 容器                                         */
/* ============================================ */
.container {
  background: var(--color-bg-elevated);
  width: 100%;
  max-width: var(--max-width);
  margin: 0 auto;
  padding: var(--container-padding);
  position: relative;
  border: var(--border-width) solid var(--color-border);
  box-shadow: var(--shadow-pixel);
}

@media (min-width: 768px) {
  .container {
    padding: var(--space-8) var(--space-10);
  }
}

/* ============================================ */
/* 语言切换按钮                                  */
/* ============================================ */
.lang-switch {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
  background: var(--gradient-primary);
  border: var(--border-width) solid var(--color-border);
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-pixel-body);
  font-size: 13px;
  color: #ffffff;
  cursor: pointer;
  transition: transform var(--duration-fast), box-shadow var(--duration-fast);
  box-shadow: var(--shadow-pixel);
}

.lang-switch:hover {
  transform: translate(2px, 2px);
  box-shadow: var(--shadow-pixel-hover);
}

.lang-switch:active {
  transform: translate(4px, 4px);
  box-shadow: none;
}

/* ============================================ */
/* 头部                                         */
/* ============================================ */
.header {
  text-align: center;
  padding: var(--space-5) 0 var(--space-8);
  border-bottom: var(--border-width) dashed var(--color-border);
  margin-bottom: var(--space-6);
}

.header h1 {
  font-family: var(--font-pixel);
  font-size: 20px;
  letter-spacing: 2px;
  margin-bottom: var(--space-3);
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

@media (min-width: 768px) {
  .header h1 {
    font-size: 24px;
  }
}

.header p {
  font-size: 14px;
  color: var(--color-text-muted);
}

.account-button {
  margin-top: var(--space-4);
  background: var(--color-bg-elevated);
  border: var(--border-width) solid var(--color-border);
  padding: var(--space-3) var(--space-4);
  color: var(--color-text);
  font-family: var(--font-pixel-body);
  font-size: 13px;
  cursor: pointer;
  transition: transform var(--duration-fast), box-shadow var(--duration-fast);
  box-shadow: var(--shadow-pixel);
}

.account-button:hover {
  transform: translate(2px, 2px);
  box-shadow: var(--shadow-pixel-hover);
}

/* ============================================ */
/* Tab 切换                                     */
/* ============================================ */
.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  margin-bottom: var(--space-8);
}

.tab {
  border: var(--border-width) solid var(--color-border);
  padding: var(--space-5);
  font-family: var(--font-pixel-body);
  font-size: 14px;
  text-align: center;
  cursor: pointer;
  transition: all var(--duration-fast);
  color: var(--color-text);
  background: transparent;
}

.tab.active {
  background: var(--gradient-primary);
  color: #ffffff;
  font-weight: 700;
}

.tab:not(.active):hover {
  background: rgba(128,128,128,0.08);
  transform: translate(2px, 2px);
}

/* ============================================ */
/* 表单内容                                     */
/* ============================================ */
.form-content {
  padding: 0;
}

/* ============================================ */
/* 上传选项                                     */
/* ============================================ */
.upload-options {
  border: var(--border-width) solid var(--color-border);
  padding: var(--space-4);
  margin-bottom: var(--space-5);
  background: var(--color-bg-elevated);
}

.check-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
}

.check-row input {
  width: 16px;
  height: 16px;
  accent-color: var(--color-accent-pink);
}

.check-row input:disabled {
  cursor: not-allowed;
}

.option-hint {
  font-size: 11px;
  color: var(--color-text-muted);
  margin: var(--space-2) 0 0 28px;
}

#encryptDetails {
  margin: var(--space-4) 0 0 28px;
}

.select-label {
  display: block;
  font-size: 11px;
  color: var(--color-text-muted);
  margin-bottom: var(--space-2);
}

/* ============================================ */
/* 输入框                                       */
/* ============================================ */
.input, select, .account-input, .input-group input[type=text] {
  font-family: var(--font-mono);
  font-size: 16px;
  padding: var(--space-4);
  background: var(--color-bg-input);
  color: var(--color-text);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius);
  width: 100%;
  transition: box-shadow var(--duration-fast);
}

.input:focus, select:focus, .account-input:focus, .input-group input[type=text]:focus {
  outline: none;
  box-shadow: var(--shadow-glow-cyan);
}

.input::placeholder, .input-group input[type=text]::placeholder {
  color: var(--color-text-subtle);
  font-family: var(--font-pixel-body);
  font-size: 13px;
}

#passphraseInput {
  margin-top: var(--space-3);
}

/* ============================================ */
/* 面板                                         */
/* ============================================ */
.panel {
  display: none;
}

.panel.active {
  display: block;
}

/* ============================================ */
/* Drop Zone                                    */
/* ============================================ */
.drop-zone {
  border: var(--border-width-thick) dashed var(--color-border);
  padding: var(--space-10) var(--space-5);
  text-align: center;
  cursor: pointer;
  transition: all var(--duration-base);
  background: var(--color-bg-elevated);
  margin-bottom: var(--space-5);
}

.drop-zone:hover, .drop-zone.dragover {
  border-color: var(--color-accent-pink);
  background: rgba(128,128,128,0.03);
}

.drop-zone.dragover {
  transform: scale(1.02);
}

.drop-zone svg {
  width: 48px;
  height: 48px;
  color: var(--color-text-muted);
  margin-bottom: var(--space-4);
  transition: transform var(--duration-base);
}

.drop-zone:hover svg, .drop-zone.dragover svg {
  color: var(--color-accent-pink);
  transform: translateY(-4px);
}

.drop-zone p {
  font-size: 13px;
  color: var(--color-text-muted);
}

.drop-zone .link {
  color: var(--color-highlight);
  font-weight: bold;
  text-decoration: underline;
  text-underline-offset: 4px;
}

input[type=file] {
  display: none;
}

/* ============================================ */
/* Textarea                                     */
/* ============================================ */
textarea {
  width: 100%;
  height: 180px;
  padding: var(--space-4);
  border: var(--border-width) solid var(--color-border);
  font-family: var(--font-mono);
  font-size: 16px;
  line-height: 1.6;
  resize: vertical;
  margin-bottom: var(--space-5);
  transition: box-shadow var(--duration-fast);
  background: var(--color-bg-input);
  color: var(--color-text);
}

textarea:focus {
  outline: none;
  box-shadow: var(--shadow-glow-cyan);
}

textarea::placeholder {
  color: var(--color-text-subtle);
  font-family: var(--font-pixel-body);
  font-size: 13px;
}

/* ============================================ */
/* 输入组                                       */
/* ============================================ */
.input-group {
  margin-bottom: var(--space-5);
}

.input-group label {
  display: block;
  font-size: 13px;
  font-weight: bold;
  margin-bottom: var(--space-3);
  color: var(--color-text);
}

.input-group .optional {
  color: var(--color-text-muted);
  font-weight: normal;
}

/* ============================================ */
/* 按钮                                         */
/* ============================================ */
.btn-gradient {
  width: 100%;
  padding: var(--space-4) var(--space-6);
  background: var(--gradient-primary);
  color: #ffffff;
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius);
  font-family: var(--font-pixel-body);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform var(--duration-fast), box-shadow var(--duration-fast);
  text-transform: uppercase;
  letter-spacing: 2px;
  text-shadow: 1px 1px 0 rgba(0,0,0,0.2);
}

.btn-gradient:hover {
  transform: translate(2px, 2px);
  box-shadow: var(--shadow-pixel-hover);
}

.btn-gradient:active {
  transform: translate(4px, 4px);
  box-shadow: none;
}

.btn-gradient:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn {
  width: 100%;
  padding: var(--space-4) var(--space-6);
  background: var(--gradient-primary);
  color: #ffffff;
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius);
  font-family: var(--font-pixel-body);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform var(--duration-fast), box-shadow var(--duration-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  box-shadow: var(--shadow-pixel);
  text-shadow: 1px 1px 0 rgba(0,0,0,0.2);
}

.btn:hover {
  transform: translate(2px, 2px);
  box-shadow: var(--shadow-pixel-hover);
}

.btn:active {
  transform: translate(4px, 4px);
  box-shadow: none;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-outline {
  background: transparent;
  color: var(--color-text);
  border: var(--border-width) solid var(--color-border);
  padding: var(--space-4) var(--space-5);
  font-family: var(--font-pixel-body);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--duration-fast);
}

.btn-outline:hover {
  background: rgba(128,128,128,0.08);
  transform: translate(2px, 2px);
}

/* ============================================ */
/* 结果区                                       */
/* ============================================ */
.result-box {
  display: none;
  margin-top: var(--space-6);
  padding: var(--space-5);
  border: var(--border-width) solid var(--color-border);
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
  font-size: 14px;
  margin-bottom: var(--space-3);
}

.result-hint {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-bottom: var(--space-3);
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
  background: var(--color-bg);
  border: var(--border-width) solid var(--color-border);
  padding: var(--space-2) var(--space-3);
}

.result-url input {
  flex: 1;
  border: none;
  font-family: var(--font-mono);
  font-size: 16px;
  color: var(--color-text);
  background: transparent;
  outline: none;
  padding: var(--space-1) 0;
}

.result-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.action-btn {
  flex: 1;
  background: var(--color-bg-elevated);
  border: var(--border-width) solid var(--color-border);
  padding: var(--space-3);
  font-family: var(--font-pixel-body);
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  transition: transform var(--duration-fast), box-shadow var(--duration-fast);
  color: var(--color-text);
  text-align: center;
  box-shadow: var(--shadow-pixel);
}

.action-btn:hover {
  transform: translate(2px, 2px);
  box-shadow: var(--shadow-pixel-hover);
}

.action-btn.copied {
  background: var(--success);
  color: #ffffff;
  border-color: var(--success);
}

.action-btn.primary {
  background: var(--gradient-primary);
  color: #ffffff;
  border-color: var(--color-border);
}

/* ============================================ */
/* Loading 像素动画                             */
/* ============================================ */
.spinner-pixel {
  display: inline-flex;
  gap: 4px;
}

.spinner-pixel span {
  display: inline-block;
  font-size: 12px;
  animation: pixel-bounce 0.6s steps(2) infinite;
}

.spinner-pixel span:nth-child(2) { animation-delay: 0.1s; }
.spinner-pixel span:nth-child(3) { animation-delay: 0.2s; }

@keyframes pixel-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

/* ============================================ */
/* Modal                                        */
/* ============================================ */
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.8);
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
  background: var(--color-bg-elevated);
  padding: var(--space-6);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  border: var(--border-width-thick) solid var(--color-border);
  box-shadow: var(--shadow-pixel);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-5);
  padding-bottom: var(--space-4);
  border-bottom: var(--border-width) dashed var(--color-border);
}

.modal-title {
  font-size: 14px;
  font-weight: bold;
}

.modal-close {
  background: var(--gradient-primary);
  border: var(--border-width) solid var(--color-border);
  font-size: 14px;
  color: #ffffff;
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  box-shadow: var(--shadow-pixel);
}

.modal-close:hover {
  transform: translate(2px, 2px);
  box-shadow: var(--shadow-pixel-hover);
}

/* ============================================ */
/* 账户模态框                                   */
/* ============================================ */
.account-modal {
  max-width: 420px;
}

.account-heading {
  font-size: 14px;
  margin-bottom: var(--space-4);
}

.modal-message {
  min-height: 20px;
  margin-top: var(--space-3);
  font-size: 11px;
  color: var(--error);
}

.text-button {
  border: 0;
  background: transparent;
  color: var(--color-highlight);
  font-family: var(--font-pixel-body);
  font-size: 13px;
  cursor: pointer;
  padding: var(--space-2) 0;
  text-decoration: underline;
  text-underline-offset: 4px;
}

.text-button:hover {
  color: var(--color-accent-cyan);
}

.account-email {
  font-size: 13px;
  color: var(--color-text-muted);
  margin-bottom: var(--space-4);
  word-break: break-word;
}

/* ============================================ */
/* 资产列表                                     */
/* ============================================ */
.asset-section {
  border-top: var(--border-width) dashed var(--color-border);
  margin-top: var(--space-5);
  padding-top: var(--space-5);
}

.asset-list {
  display: grid;
  gap: var(--space-3);
}

.asset-empty {
  font-size: 11px;
  color: var(--color-text-muted);
  text-align: center;
  padding: var(--space-5);
}

.asset-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  border: var(--border-width) solid var(--color-border);
  padding: var(--space-3);
  background: var(--color-bg-elevated);
  box-shadow: var(--shadow-pixel);
  transition: transform var(--duration-fast), box-shadow var(--duration-fast);
}

.asset-row:hover {
  transform: translate(2px, 2px);
  box-shadow: var(--shadow-pixel-hover);
}

.asset-row a {
  flex: 1;
  min-width: 0;
  color: var(--color-text);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-row small {
  color: var(--color-text-muted);
  font-size: 10px;
  white-space: nowrap;
}

.asset-delete {
  border: var(--border-width) solid var(--error);
  background: transparent;
  color: var(--error);
  font-family: var(--font-pixel-body);
  font-size: 10px;
  font-weight: bold;
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
}

.asset-delete:hover {
  background: var(--error);
  color: #ffffff;
}

.asset-title {
  font-size: 13px;
  font-weight: bold;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.asset-tags {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
  margin-top: var(--space-1);
}

.asset-tag {
  font-size: 10px;
  padding: 2px 6px;
  background: var(--gradient-primary);
  color: #ffffff;
  border: 2px solid var(--color-border);
}

/* ============================================ */
/* 元数据字段                                   */
/* ============================================ */
.metadata-fields {
  margin-bottom: var(--space-5);
}

.metadata-fields textarea {
  height: 80px;
  resize: none;
}

/* ============================================ */
/* 高级选项折叠区                               */
/* ============================================ */
.advanced-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) 0;
  font-size: 13px;
  color: var(--color-text-muted);
  cursor: pointer;
  border: none;
  background: transparent;
  font-family: var(--font-pixel-body);
}

.advanced-toggle:hover {
  color: var(--color-text);
}

.advanced-toggle .arrow {
  transition: transform var(--duration-fast);
}

.advanced-toggle.open .arrow {
  transform: rotate(90deg);
}

.advanced-options {
  display: none;
  border: var(--border-width) solid var(--color-border);
  padding: var(--space-4);
  margin-top: var(--space-2);
  background: var(--color-bg);
}

.advanced-options.open {
  display: block;
}

/* ============================================ */
/* 有效期选择                                   */
/* ============================================ */
.expiry-options {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.expiry-btn {
  padding: var(--space-2) var(--space-3);
  border: var(--border-width) solid var(--color-border);
  background: transparent;
  color: var(--color-text);
  font-family: var(--font-pixel-body);
  font-size: 11px;
  cursor: pointer;
  transition: all var(--duration-fast);
}

.expiry-btn.active {
  background: var(--gradient-primary);
  color: #ffffff;
}

.expiry-btn:hover:not(.active) {
  background: rgba(128,128,128,0.08);
}

/* ============================================ */
/* 升级区域                                     */
/* ============================================ */
.upgrade-section {
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: var(--border-width) dashed var(--color-border);
}

.upgrade-btn {
  width: 100%;
  padding: var(--space-3);
  background: linear-gradient(135deg, #f093fb, #f5576c);
  color: #ffffff;
  border: var(--border-width) solid var(--color-border);
  font-family: var(--font-pixel-body);
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  transition: transform var(--duration-fast), box-shadow var(--duration-fast);
  box-shadow: var(--shadow-pixel);
}

.upgrade-btn:hover {
  transform: translate(2px, 2px);
  box-shadow: var(--shadow-pixel-hover);
}

/* ============================================ */
/* 升级模态框                                   */
/* ============================================ */
.upgrade-modal {
  max-width: 450px;
}

.upgrade-content {
  text-align: center;
}

.upgrade-desc {
  font-size: 13px;
  color: var(--color-text-muted);
  margin-bottom: var(--space-5);
}

.pricing-card {
  background: var(--gradient-primary);
  border: var(--border-width-thick) solid var(--color-border);
  padding: var(--space-6);
  margin-bottom: var(--space-6);
  box-shadow: var(--shadow-pixel);
}

.pricing-price {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.pricing-main {
  font-size: 24px;
  font-weight: bold;
  color: #ffffff;
}

.pricing-alt {
  font-size: 14px;
  color: rgba(255,255,255,0.8);
}

.pricing-features {
  font-size: 11px;
  color: #ffffff;
  opacity: 0.9;
}

.payment-methods {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.payment-method {
  border: var(--border-width) solid var(--color-border);
  padding: var(--space-4);
  background: var(--color-bg);
  box-shadow: var(--shadow-pixel);
}

.payment-method h4 {
  font-size: 13px;
  margin-bottom: var(--space-2);
  color: var(--color-accent-pink);
}

.payment-method p {
  font-size: 11px;
  color: var(--color-text-muted);
}

.payment-note {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-bottom: var(--space-5);
  padding: var(--space-3);
  background: var(--color-bg);
  border: var(--border-width) dashed var(--color-border);
}

.upgrade-send-btn {
  background: linear-gradient(135deg, #4facfe, #00f2fe);
}

/* ============================================ */
/* 密码输入页（查看页用）                        */
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
  background: var(--color-bg-elevated);
  border: var(--border-width-thick) solid var(--color-border);
  padding: var(--space-8);
  max-width: 400px;
  width: 100%;
  box-shadow: var(--shadow-pixel);
}

.password-box h2 {
  font-family: var(--font-pixel);
  font-size: 14px;
  margin-bottom: var(--space-4);
  text-align: center;
}

.password-box .input {
  margin-bottom: var(--space-4);
}

/* ============================================ */
/* 统计页                                       */
/* ============================================ */
.stats-container {
  padding: var(--space-5);
}

.stat-card {
  border: var(--border-width) solid var(--color-border);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
  background: var(--color-bg-elevated);
  box-shadow: var(--shadow-pixel);
}

.stat-card h3 {
  font-size: 13px;
  margin-bottom: var(--space-3);
  color: var(--color-text-muted);
}

.stat-value {
  font-family: var(--font-pixel);
  font-size: 24px;
  color: var(--color-accent-pink);
}

.stat-chart {
  border: var(--border-width) solid var(--color-border);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
  background: var(--color-bg-elevated);
}

/* ============================================ */
/* 扫描线效果（可选）                            */
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
/* 响应式                                       */
/* ============================================ */
@media (max-width: 480px) {
  .container {
    padding: var(--space-4);
  }
  
  .header h1 {
    font-size: 14px;
  }
  
  .tabs {
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
  
  .expiry-options {
    flex-direction: column;
  }
  
  .expiry-btn {
    width: 100%;
  }
}
`;
