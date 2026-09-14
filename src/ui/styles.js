export const STYLES = `
:root {
  --bg:#fafafa;--surface:#fff;--surface-hover:#f5f5f5;--primary:#000;--primary-hover:#333;
  --text-main:#171717;--text-muted:#666;--border:#e5e5e5;--border-focus:#999;
  --radius:12px;--radius-sm:8px;--shadow-md:0 4px 12px rgba(0,0,0,.06);
  --shadow-lg:0 12px 24px rgba(0,0,0,.08);--success:#10b981;--success-bg:#ecfdf5;
  --error:#ef4444;--error-bg:#fef2f2;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg:#0a0a0a;--surface:#111;--surface-hover:#1a1a1a;--primary:#fff;--primary-hover:#e5e5e5;
    --text-main:#ededed;--text-muted:#a3a3a3;--border:#262626;--border-focus:#525252;
    --shadow-md:0 4px 12px rgba(0,0,0,.3);--shadow-lg:0 12px 24px rgba(0,0,0,.4);
    --success-bg:rgba(16,185,129,.1);--error-bg:rgba(239,68,68,.1);
  }
}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  background:var(--bg);color:var(--text-main);line-height:1.6;display:flex;justify-content:center;
  align-items:center;min-height:100vh;padding:20px;transition:background-color .3s,color .3s}
.container{background:var(--surface);width:100%;max-width:520px;border-radius:20px;
  box-shadow:var(--shadow-lg);overflow:hidden;border:1px solid var(--border);
  animation:fadeIn .5s cubic-bezier(.16,1,.3,1);position:relative}
@keyframes fadeIn{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
.lang-switch{position:absolute;top:16px;right:16px;background:var(--bg);border:1px solid var(--border);
  border-radius:6px;padding:5px 10px;font-size:12px;font-weight:500;color:var(--text-muted);
  cursor:pointer;transition:all .2s;font-family:inherit;z-index:10}
.lang-switch:hover{color:var(--text-main);background:var(--surface-hover)}
.header{padding:32px 28px 20px;text-align:center}
.header h1{font-size:24px;font-weight:700;letter-spacing:-.5px;margin-bottom:4px}
.header p{font-size:14px;color:var(--text-muted)}
.account-button{margin-top:14px;background:transparent;border:1px solid var(--border);border-radius:999px;
  padding:7px 14px;color:var(--text-main);font:500 12px inherit;cursor:pointer;transition:all .2s}
.account-button:hover{background:var(--surface-hover);border-color:var(--border-focus)}
.tabs{display:flex;padding:0 28px;gap:24px;border-bottom:1px solid var(--border)}
.tab{padding:12px 0;font-size:14px;font-weight:500;color:var(--text-muted);cursor:pointer;
  transition:color .2s;position:relative;user-select:none}
.tab:hover,.tab.active{color:var(--text-main)}
.tab.active::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:2px;
  background:var(--text-main);border-radius:2px 2px 0 0;animation:tabIndicator .3s cubic-bezier(.16,1,.3,1)}
@keyframes tabIndicator{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.form-content{padding:24px 28px 28px}
.upload-options{border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:20px;background:var(--bg)}
.check-row{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:600;cursor:pointer}
.check-row input{width:16px;height:16px;accent-color:var(--primary)}
.check-row input:disabled{cursor:not-allowed}
.option-hint{font-size:12px;color:var(--text-muted);margin:5px 0 0 25px}
#encryptDetails{margin:13px 0 0 25px}
.select-label{display:block;font-size:12px;color:var(--text-muted);margin-bottom:6px}
select,.account-input{width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);
  font-size:13px;background:var(--surface);color:var(--text-main);font-family:inherit}
select:focus,.account-input:focus{outline:none;border-color:var(--border-focus);box-shadow:0 0 0 3px rgba(128,128,128,.1)}
#passphraseInput{margin-top:9px}
.panel{display:none}
.panel.active{display:block;animation:slideUp .3s cubic-bezier(.16,1,.3,1)}
@keyframes slideUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.drop-zone{border:1.5px dashed var(--border);border-radius:var(--radius);padding:40px 20px;
  text-align:center;cursor:pointer;transition:all .25s;background:var(--bg);margin-bottom:20px}
.drop-zone:hover,.drop-zone.dragover{border-color:var(--text-main);background:var(--surface-hover)}
.drop-zone.dragover{transform:scale(1.01)}
.drop-zone svg{width:32px;height:32px;color:var(--text-muted);margin-bottom:12px;transition:color .2s,transform .2s}
.drop-zone:hover svg,.drop-zone.dragover svg{color:var(--text-main);transform:translateY(-2px)}
.drop-zone p{font-size:14px;color:var(--text-muted)}
.drop-zone .link{color:var(--text-main);font-weight:500;text-decoration:underline;text-underline-offset:2px}
input[type=file]{display:none}
textarea{width:100%;height:180px;padding:14px;border:1px solid var(--border);border-radius:var(--radius-sm);
  font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;line-height:1.6;
  resize:vertical;margin-bottom:20px;transition:border-color .2s,box-shadow .2s;background:var(--bg);color:var(--text-main)}
textarea:focus{outline:none;border-color:var(--border-focus);box-shadow:0 0 0 3px rgba(128,128,128,.1);background:var(--surface)}
textarea::placeholder{color:var(--text-muted);opacity:.7}
.input-group{margin-bottom:20px}
.input-group label{display:block;font-size:13px;font-weight:500;margin-bottom:8px;color:var(--text-main)}
.input-group .optional{color:var(--text-muted);font-weight:400}
.input-group input[type=text]{width:100%;padding:12px 14px;border:1px solid var(--border);
  border-radius:var(--radius-sm);font-size:14px;transition:border-color .2s,box-shadow .2s;
  background:var(--bg);color:var(--text-main)}
.input-group input[type=text]:focus{outline:none;border-color:var(--border-focus);
  box-shadow:0 0 0 3px rgba(128,128,128,.1);background:var(--surface)}
.btn{width:100%;padding:14px;background:var(--primary);color:var(--surface);border:none;
  border-radius:var(--radius-sm);font-size:15px;font-weight:600;cursor:pointer;
  transition:background .2s,transform .1s,box-shadow .2s;display:flex;align-items:center;
  justify-content:center;gap:8px;font-family:inherit}
.btn:hover{background:var(--primary-hover);box-shadow:var(--shadow-md)}
.btn:active{transform:scale(.98)}
.btn:disabled{opacity:.6;cursor:not-allowed;transform:none;box-shadow:none}
.result-box{display:none;margin-top:24px;padding:16px;border-radius:var(--radius-sm);
  animation:fadeIn .3s;border:1px solid transparent}
.result-box.success{background:var(--success-bg);border-color:rgba(16,185,129,.2)}
.result-box.error{background:var(--error-bg);border-color:rgba(239,68,68,.2)}
.result-box h3{font-size:14px;font-weight:600;margin-bottom:12px}
.result-hint{font-size:12px;color:var(--text-muted);margin:-5px 0 10px}
.result-box.success h3{color:var(--success)}
.result-box.error h3{color:var(--error)}
.result-url{display:flex;align-items:center;background:var(--surface);border:1px solid var(--border);
  border-radius:6px;padding:6px 10px;transition:border-color .2s}
.result-url:focus-within{border-color:var(--border-focus)}
.result-url input{flex:1;border:none;font-size:13px;color:var(--text-main);background:transparent;
  outline:none;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;padding:6px 0}
.result-actions{display:flex;gap:8px;margin-top:10px}
.action-btn{flex:1;background:var(--bg);border:1px solid var(--border);padding:9px 12px;
  border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;
  color:var(--text-main);text-align:center;font-family:inherit}
.action-btn:hover{background:var(--surface-hover)}
.action-btn.copied{background:var(--success);color:#fff;border-color:var(--success)}
.action-btn.primary{background:var(--primary);color:var(--surface);border-color:var(--primary)}
.action-btn.primary:hover{background:var(--primary-hover)}
.spinner{width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-radius:50%;
  border-top-color:#fff;animation:spin .6s linear infinite}
@media (prefers-color-scheme: dark){.spinner{border:2px solid rgba(0,0,0,.3);border-top-color:#000}}
@keyframes spin{to{transform:rotate(360deg)}}
.modal{position:fixed;inset:0;background:rgba(0,0,0,.6);display:none;align-items:center;
  justify-content:center;z-index:1000;padding:20px;animation:fadeIn .2s;backdrop-filter:blur(4px)}
.modal.active{display:flex}
.modal-content{background:var(--surface);border-radius:16px;padding:20px;max-width:420px;
  width:100%;box-shadow:0 20px 40px rgba(0,0,0,.2);animation:modalIn .3s cubic-bezier(.16,1,.3,1);
  max-height:90vh;overflow-y:auto}
@keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
.modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.modal-title{font-size:16px;font-weight:600}
.modal-close{background:transparent;border:none;font-size:22px;line-height:1;color:var(--text-muted);
  cursor:pointer;padding:4px 8px;border-radius:6px;transition:background .2s}
.modal-close:hover{background:var(--surface-hover);color:var(--text-main)}
.account-modal{max-width:390px}
.account-heading{font-size:14px;font-weight:600;margin-bottom:14px}
.account-input{background:var(--bg)}
.modal-message{min-height:20px;margin-top:10px;font-size:12px;color:var(--error)}
.text-button{border:0;background:transparent;color:var(--text-muted);font:500 12px inherit;cursor:pointer;padding:4px 0}
.text-button:hover{color:var(--text-main);text-decoration:underline;text-underline-offset:3px}
.account-email{font-size:13px;color:var(--text-muted);margin-bottom:12px;word-break:break-word}
.asset-section{border-top:1px solid var(--border);margin-top:20px;padding-top:18px}
.asset-list{display:grid;gap:8px}
.asset-empty{font-size:12px;color:var(--text-muted)}
.asset-row{display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:var(--radius-sm);padding:9px 10px}
.asset-row a{flex:1;min-width:0;color:var(--text-main);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.asset-row small{color:var(--text-muted);font-size:11px;white-space:nowrap}
.asset-delete{border:0;background:transparent;color:var(--error);font:500 11px inherit;cursor:pointer;padding:3px}
.asset-title{font-size:13px;font-weight:500;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.asset-tags{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px}
.asset-tag{font-size:10px;padding:2px 6px;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text-muted)}
.metadata-fields{margin-bottom:20px}
.metadata-fields textarea{height:60px;resize:none}
#shareCanvas{width:100%;height:auto;border-radius:12px;border:1px solid var(--border);display:block}
.modal-footer{margin-top:16px}
`;