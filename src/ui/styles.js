import { BASE_CSS } from './theme.js';

export const STYLES = `
${BASE_CSS}

/* ============================================ */
/* Home: paper / ink editorial                    */
/* ============================================ */
.visually-hidden {
  position: absolute !important;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.grain {
  position: fixed;
  inset: 0;
  z-index: 80;
  pointer-events: none;
  opacity: 0.16;
  mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 180px 180px;
}

.home {
  overflow-x: clip;
}

.skip-link {
  position: fixed;
  top: 10px;
  left: 10px;
  z-index: 90;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  background: var(--color-text);
  color: var(--color-surface);
  font-size: 14px;
  text-decoration: none;
  transform: translateY(-200%);
}

.skip-link:focus-visible {
  transform: none;
}

.hero {
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

.hero-glow {
  position: absolute;
  z-index: 0;
  top: -240px;
  right: -160px;
  width: min(900px, 78vw);
  height: min(900px, 78vw);
  pointer-events: none;
  border-radius: 50%;
  background:
    radial-gradient(circle at 52% 46%, rgba(196, 152, 92, 0.20), rgba(196, 152, 92, 0) 62%),
    radial-gradient(circle at 26% 72%, rgba(79, 107, 82, 0.09), rgba(79, 107, 82, 0) 58%);
  -webkit-mask-image: radial-gradient(circle at 50% 50%, #000 0%, rgba(0,0,0,0.85) 46%, transparent 74%);
  mask-image: radial-gradient(circle at 50% 50%, #000 0%, rgba(0,0,0,0.85) 46%, transparent 74%);
  animation: breathe 16s ease-in-out infinite;
}

.specks {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.speck {
  position: absolute;
  border-radius: 50%;
  background: rgba(120, 94, 58, 0.3);
  opacity: 0;
  animation: speck-rise var(--dur, 28s) linear var(--delay, 0s) infinite;
}

.hero-inner {
  position: relative;
  z-index: 1;
  max-width: 760px;
  margin: 0 auto;
  padding: clamp(26px, 4vw, 42px) clamp(20px, 4.4vw, 44px) 0;
}

.hero-copy {
  max-width: 720px;
  margin: 0 auto 30px;
  text-align: center;
}

.greet-row {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px 14px;
  min-height: 44px;
  margin-bottom: 22px;
}

.greet {
  font-family: var(--font-display);
  font-size: clamp(17px, 1.5vw, 20px);
  line-height: 1.5;
  color: var(--color-terracotta);
  letter-spacing: 0.01em;
}

.greet-hello {
  font-weight: 600;
}

.greet-line {
  color: color-mix(in srgb, var(--color-terracotta) 78%, var(--color-text));
}

.greeting-shuffle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 10px 0 8px;
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text-tertiary);
  font-family: var(--font-sans);
  font-size: 12.5px;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: color var(--duration-fast) ease, background-color var(--duration-fast) ease;
}

.greeting-shuffle::before {
  content: '↻';
  color: var(--color-ochre);
  font-size: 14px;
  line-height: 1;
}

.greeting-shuffle:hover {
  color: var(--color-text);
  background: var(--color-fill);
}

.hero-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(33px, 4.4vw, 58px);
  line-height: 1.24;
  letter-spacing: 0;
  color: var(--color-text);
  margin-bottom: 22px;
}

.hero-title > span {
  display: block;
}

html[lang="en"] .hero-title {
  font-size: clamp(30px, 4vw, 52px);
  line-height: 1.2;
}

.hero-subtitle {
  max-width: 34em;
  margin: 0 auto;
  font-size: clamp(15px, 1.15vw, 16.5px);
  line-height: 1.8;
  color: var(--color-text-secondary);
}

.hero-form {
  max-width: 680px;
  margin: 0 auto;
}

/* ---------- share card ---------- */

.upload-card {
  background: var(--color-surface);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-card);
  padding: clamp(18px, 2.2vw, 26px);
  box-shadow: var(--shadow-card);
  text-align: left;
}

.remix-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 14px;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  background: var(--color-surface-2);
  font-size: 13px;
  color: var(--color-text-secondary);
}

.remix-banner a {
  font-weight: 600;
  color: var(--color-link);
}

.card-head {
  margin-bottom: 18px;
}

.card-title {
  font-size: 22px;
  font-weight: 600;
  line-height: 1.4;
}

.card-sub {
  margin-top: 4px;
  font-size: 13.5px;
  color: var(--color-text-tertiary);
}

.upload-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 3px;
  padding: 4px;
  background: var(--paper-deep);
  border-radius: var(--radius-md);
  margin-bottom: 16px;
}

.upload-tab {
  min-height: 40px;
  padding: 0 4px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--color-text-secondary);
  font-family: var(--font-sans);
  font-size: 14px;
  cursor: pointer;
  transition: background-color var(--duration-fast) ease, color var(--duration-fast) ease,
    box-shadow var(--duration-fast) ease;
}

.upload-tab:hover {
  color: var(--color-text);
}

.upload-tab.active,
.upload-tab[aria-selected="true"] {
  background: var(--color-surface);
  color: var(--color-text);
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(60, 46, 28, 0.12);
}

.upload-panel {
  display: none;
}

.upload-panel.active {
  display: block;
}

/* drop zone */

.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-height: 158px;
  padding: 26px 18px;
  border: 1px dashed var(--color-hairline-strong);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-input) 55%, transparent);
  text-align: center;
  cursor: pointer;
  transition: border-color var(--duration-fast) ease, background-color var(--duration-fast) ease;
}

.drop-zone:hover,
.drop-zone.dragover {
  border-color: var(--color-text-tertiary);
  background: var(--color-input);
}

.drop-zone.dragover {
  border-style: solid;
  border-color: var(--color-accent);
  background: var(--success-bg);
}

.drop-zone svg {
  width: 26px;
  height: 26px;
  color: var(--color-ochre);
  margin-bottom: 2px;
  transition: color var(--duration-fast) ease, transform var(--duration-fast) var(--ease-out);
}

.drop-zone:hover svg,
.drop-zone.dragover svg {
  color: var(--color-accent);
  transform: translateY(-2px);
}

.drop-title {
  font-size: 14.5px;
  font-weight: 500;
  color: var(--color-text);
  line-height: 1.5;
}

.drop-title .link {
  color: var(--color-link);
  font-weight: 600;
  margin-left: 4px;
}

.drop-sub {
  font-size: 12.5px;
  color: var(--color-text-tertiary);
  line-height: 1.5;
}

input[type=file] {
  display: none;
}

/* folder gate */

.folder-gate {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-height: 158px;
  padding: 20px;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-input) 55%, transparent);
}

.folder-gate-icon {
  width: 24px;
  height: 24px;
  color: var(--color-ochre);
}

.folder-gate h3 {
  font-size: 16.5px;
  font-weight: 600;
}

.folder-gate p {
  font-size: 13px;
  line-height: 1.65;
  color: var(--color-text-secondary);
}

.folder-gate .btn {
  margin-top: 4px;
}

.folder-note {
  margin-top: 10px;
  font-size: 12.5px;
  color: var(--color-accent);
}

.folder-hide[hidden] {
  display: none !important;
}

#folderInfo {
  margin-top: 10px;
  color: var(--color-text-secondary);
}

/* code panel */

.code-textarea {
  width: 100%;
  min-height: 152px;
  height: auto;
  padding: 12px 14px;
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-md);
  background: var(--color-input);
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.7;
  resize: vertical;
  transition: border-color var(--duration-fast) ease, box-shadow var(--duration-fast) ease;
}

.code-textarea:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: var(--shadow-glow);
}

/* advanced options */

.upload-options {
  margin-top: 14px;
  border-top: 1px solid var(--color-hairline);
}

.upload-options summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 44px;
  padding: 0 2px;
  font-size: 13.5px;
  color: var(--color-text-secondary);
  cursor: pointer;
  list-style: none;
}

.upload-options summary::-webkit-details-marker {
  display: none;
}

.upload-options summary::after {
  content: '⌄';
  color: var(--color-text-tertiary);
  font-size: 15px;
  transform: translateY(-2px);
  transition: transform var(--duration-fast) ease;
}

.upload-options[open] summary::after {
  transform: translateY(2px) rotate(180deg);
}

.upload-options summary:hover {
  color: var(--color-text);
}

.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  padding: 4px 0 14px;
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

.upgrade-section {
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px dashed var(--color-hairline);
}

.upgrade-btn {
  width: 100%;
  min-height: 42px;
  padding: 10px var(--space-4);
  background: var(--color-accent);
  color: #fbf7ee;
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--duration-fast) ease;
}

.upgrade-btn:hover {
  background: var(--color-accent-strong);
}

/* generate button */

.btn-upload {
  width: 100%;
  min-height: 48px;
  margin-top: 10px;
  font-size: 15px;
  letter-spacing: 0.02em;
}

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

/* result */

.result-box {
  margin-top: var(--space-5);
  padding: var(--space-4);
  background: var(--success-bg);
  border: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
  border-radius: var(--radius-md);
  animation: result-in 0.3s var(--ease-out);
}

.result-box[hidden] {
  display: none;
}

.result-box.error {
  background: var(--error-bg);
  border-color: color-mix(in srgb, var(--error) 35%, transparent);
}

@keyframes result-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.result-url {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--color-input);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-sm);
  padding: 6px 6px 6px 14px;
}

.result-url input {
  flex: 1;
  border: none;
  background: transparent;
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0;
  color: var(--color-text);
  outline: none;
  padding: 6px 0;
  min-width: 0;
}

.result-url .action-btn {
  flex-shrink: 0;
  border-radius: 8px;
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

/* ---------- trust strip ---------- */

.trust {
  margin-top: clamp(48px, 6vw, 84px);
  border-top: 1px solid var(--color-hairline);
  border-bottom: 1px solid var(--color-hairline);
  background: color-mix(in srgb, var(--color-input) 32%, transparent);
}

.trust-inner {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 30px clamp(20px, 4.4vw, 44px);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.trust-item {
  padding: 4px 26px;
}

.trust-item:first-child { padding-left: 0; }
.trust-item:last-child { padding-right: 0; }
.trust-item + .trust-item { border-left: 1px solid var(--color-hairline); }

.trust-item h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 5px;
}

.trust-item p {
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--color-text-secondary);
  max-width: 26em;
}

/* ---------- single badge showcase ---------- */

.badge-showcase {
  padding: clamp(52px, 7vw, 96px) 0;
  background:
    radial-gradient(ellipse at 12% 0%, rgba(196, 152, 92, 0.10), transparent 55%),
    var(--paper-deep);
}

.badge-inner {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 clamp(20px, 4.4vw, 44px);
}

.badge-copy {
  max-width: 40em;
  margin-bottom: 30px;
}

.badge-copy h2 {
  font-size: clamp(25px, 3.1vw, 36px);
  font-weight: 600;
  line-height: 1.35;
  margin-bottom: 12px;
}

.badge-copy p {
  font-size: 14.5px;
  line-height: 1.8;
  color: var(--color-text-secondary);
}

.badge-swatches {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.badge-swatch {
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-card);
  overflow: hidden;
  background: var(--color-surface);
}

.badge-swatch figcaption {
  padding: 11px 16px;
  font-size: 12px;
  letter-spacing: 0.1em;
  color: var(--color-text-tertiary);
  border-bottom: 1px solid var(--color-hairline);
}

.badge-swatch-light figcaption {
  background: rgba(255, 255, 255, 0.55);
}

.badge-swatch-ink figcaption {
  background: #1f1c15;
  border-color: rgba(255, 255, 255, 0.12);
  color: #a49c8c;
}

.badge-stage {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  min-height: 168px;
  padding: 18px;
}

.badge-swatch-light .badge-stage { background: #fdfbf6; }
.badge-swatch-ink .badge-stage { background: #17150f; }

.demo-badge {
  display: inline-flex;
  align-items: center;
  height: 38px;
  padding: 0 4px 0 11px;
  border: 1px solid rgba(28, 26, 23, 0.14);
  border-radius: var(--radius-pill);
  background: rgba(255, 255, 255, 0.86);
  color: #38342c;
  font-family: var(--font-sans);
  font-size: 13px;
  line-height: 1;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(28, 26, 23, 0.07);
}

.demo-badge-brand {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  align-self: stretch;
  padding: 0 9px 0 0;
  color: inherit;
  text-decoration: none;
  border-radius: var(--radius-pill);
}

.demo-badge-brand:hover .demo-badge-text { text-decoration: underline; text-underline-offset: 3px; }

.demo-badge-mark {
  width: 15px;
  height: 15px;
  color: var(--color-terracotta);
}

.demo-badge-mark svg { width: 100%; height: 100%; display: block; }

.demo-badge-text { font-size: 12.5px; color: #524d43; }
.demo-badge-text b { font-weight: 600; color: #2c2820; }

.demo-badge-div {
  width: 1px;
  height: 14px;
  background: rgba(28, 26, 23, 0.16);
  flex: none;
}

.demo-badge-link {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 10px 0 11px;
  color: #6a6357;
  font-size: 12.5px;
  text-decoration: none;
}

.demo-badge-link:hover { color: #2c2820; text-decoration: underline; text-underline-offset: 3px; }

.demo-badge-dark {
  background: rgba(24, 21, 16, 0.62);
  border-color: rgba(255, 255, 255, 0.16);
  color: #f2ece0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.demo-badge-dark .demo-badge-text { color: #c9c1b1; }
.demo-badge-dark .demo-badge-text b { color: #f6f1e6; }
.demo-badge-dark .demo-badge-div { background: rgba(255, 255, 255, 0.22); }
.demo-badge-dark .demo-badge-link { color: #b6ad9c; }
.demo-badge-dark .demo-badge-link:hover { color: #fff8ea; }
.demo-badge-dark .demo-badge-mark { color: #c9875f; }

.badge-status {
  margin-top: 20px;
  font-size: 13px;
  color: var(--color-text-tertiary);
}

/* ---------- more tools index ---------- */

.more-tools {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: clamp(44px, 6vw, 80px) clamp(20px, 4.4vw, 44px) 0;
}

.more-tools-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}

.more-tools-head h2 {
  font-size: clamp(21px, 2.6vw, 28px);
  font-weight: 600;
}

.more-tools-head p {
  max-width: 34em;
  font-size: 13.5px;
  color: var(--color-text-tertiary);
  text-align: right;
}

.more-tools-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 40px;
}

.tool-link {
  display: flex;
  align-items: baseline;
  gap: 14px;
  padding: 17px 0;
  border-top: 1px solid var(--color-hairline);
  color: var(--color-text);
  text-decoration: none;
  transition: color var(--duration-fast) ease;
}

.tool-link:nth-child(-n+2) {
  border-top: 1px solid var(--color-hairline);
}

.tool-link:hover {
  color: var(--color-link);
}

.tool-num {
  flex: none;
  width: 24px;
  font-family: var(--font-display);
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.tool-body {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.tool-body strong {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
}

.tool-body span {
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--color-text-tertiary);
}

.tool-arrow {
  margin-left: auto;
  color: var(--color-text-tertiary);
  font-size: 15px;
  transition: transform var(--duration-fast) var(--ease-out), color var(--duration-fast) ease;
}

.tool-link:hover .tool-arrow {
  color: var(--color-link);
  transform: translate(2px, -2px);
}

/* ---------- ambient keyframes ---------- */

@keyframes breathe {
  0%, 100% { opacity: 0.82; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.045); }
}

@keyframes speck-rise {
  0% { opacity: 0; transform: translate3d(0, 24px, 0); }
  12% { opacity: 0.75; }
  70% { opacity: 0.35; }
  100% { opacity: 0; transform: translate3d(var(--drift, 14px), -190px, 0); }
}

/* ---------- responsive ---------- */

@media (max-width: 1023px) {
  .hero-inner {
    padding-top: clamp(20px, 4vw, 34px);
  }
  .hero-glow {
    top: -320px;
    right: -240px;
    width: min(760px, 120vw);
    height: min(760px, 120vw);
  }
  .hero-title { font-size: clamp(32px, 6.4vw, 48px); }
  .greet-row { margin-bottom: 16px; }
}

@media (max-width: 767px) {
  .hero-inner { padding-top: 18px; }
  .hero-copy { margin-bottom: 22px; }
  .greet-row { margin-bottom: 14px; gap: 0 10px; }
  .hero-title { font-size: clamp(29px, 8.4vw, 38px); line-height: 1.3; margin-bottom: 16px; }
  html[lang="en"] .hero-title { font-size: clamp(27px, 7.4vw, 34px); }
  .hero-subtitle { font-size: 15px; line-height: 1.75; }
  .trust-inner { grid-template-columns: minmax(0, 1fr); padding-top: 10px; padding-bottom: 10px; }
  .trust-item { padding: 18px 0; }
  .trust-item + .trust-item { border-left: 0; border-top: 1px solid var(--color-hairline); }
  .badge-swatches { grid-template-columns: minmax(0, 1fr); }
  .badge-stage { min-height: 148px; padding: 16px; }
  .demo-badge { height: 36px; }
  .options-grid { grid-template-columns: 1fr; }
  .more-tools-head { flex-direction: column; gap: 4px; }
  .more-tools-head p { text-align: left; }
  .more-tools-grid { grid-template-columns: 1fr; }
  .tool-link:nth-child(-n+2) { border-top: 1px solid var(--color-hairline); }
}

@media (max-width: 380px) {
  .upload-card { padding: 16px; }
  .upload-tabs { gap: 2px; padding: 3px; }
  .upload-tab { font-size: 13px; }
}

@media (prefers-reduced-motion: reduce) {
  .hero-glow { animation: none; opacity: 0.9; }
  .speck { display: none; }
}

@media (prefers-color-scheme: dark) {
  .grain { opacity: 0.08; mix-blend-mode: screen; }
  .drop-zone,
  .folder-gate { background: rgba(255, 255, 255, 0.025); }
  .drop-zone:hover,
  .drop-zone.dragover { background: rgba(255, 255, 255, 0.05); }
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
  background: var(--success-bg);
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
  background: var(--color-surface-2);
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
/* More tools — home page */
.tools {
  max-width: 1080px;
  margin: 0 auto;
  padding: var(--space-10) var(--space-5) var(--space-8);
}
.tools-head { text-align: center; margin-bottom: var(--space-6); }
.tools-head h2 { font-size: clamp(22px, 3vw, 28px); margin: 0 0 8px; }
.tools-desc { color: var(--color-text-secondary); margin: 0; }
.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
.tool-card {
  display: block;
  padding: 20px;
  border: 1px solid var(--color-hairline);
  border-radius: 16px;
  background: var(--color-surface);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s ease, transform 0.15s ease;
}
.tool-card:hover {
  border-color: var(--color-hairline-strong);
  transform: translateY(-2px);
}
.tool-card .tool-icon { font-size: 24px; margin-bottom: 10px; }
.tool-card h3 { margin: 0 0 6px; font-size: 16px; }
.tool-card p { margin: 0; font-size: 13.5px; line-height: 1.6; color: var(--color-text-secondary); }

`;
