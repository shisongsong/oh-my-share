import { t } from './i18n.js';

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

export function generateShareImage(url) {
  if (typeof qrcode === 'undefined') {
    alert(t('imgFail'));
    return;
  }

  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();

  const image = new Image();
  image.onload = () => {
    const width = 640;
    const height = 900;
    const devicePixelRatio = 2;
    const canvas = document.getElementById('shareCanvas');

    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = '100%';
    canvas.style.maxWidth = '380px';

    const context = canvas.getContext('2d');
    context.scale(devicePixelRatio, devicePixelRatio);

    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height);

    const gradient = context.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#6366f1');
    gradient.addColorStop(1, '#8b5cf6');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, 8);

    context.fillStyle = '#171717';
    context.font = 'bold 36px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('Oh My Share', width / 2, 90);

    context.fillStyle = '#666';
    context.font = '16px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif';
    context.fillText(t('subtitle'), width / 2, 130);

    const qrSize = 360;
    const qrX = (width - qrSize) / 2;
    const qrY = 200;

    context.fillStyle = '#f8fafc';
    roundedRect(context, qrX - 20, qrY - 20, qrSize + 40, qrSize + 40, 16);
    context.fill();

    context.drawImage(image, qrX, qrY, qrSize, qrSize);

    context.fillStyle = '#171717';
    context.font = 'bold 20px -apple-system,sans-serif';
    context.fillText(t('imageHint'), width / 2, qrY + qrSize + 80);

    context.fillStyle = '#94a3b8';
    context.font = '14px ui-monospace,monospace';
    const displayUrl = url.length > 55 ? url.slice(0, 52) + '...' : url;
    context.fillText(displayUrl, width / 2, qrY + qrSize + 120);

    context.strokeStyle = '#e5e5e5';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(80, height - 100);
    context.lineTo(width - 80, height - 100);
    context.stroke();

    context.fillStyle = '#cbd5e1';
    context.font = '13px -apple-system,sans-serif';
    context.fillText('Powered by Cloudflare Workers', width / 2, height - 60);

    document.getElementById('imageModal').classList.add('active');
  };

  image.onerror = () => alert(t('imgFail'));
  image.src = qr.createDataURL(8, 0);
}

export function downloadImage() {
  const canvas = document.getElementById('shareCanvas');
  if (!canvas.width) return;

  canvas.toBlob((blob) => {
    const link = document.createElement('a');
    link.download = 'oh-my-share.png';
    link.href = URL.createObjectURL(blob);
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }, 'image/png');
}

export function closeImageModal() {
  document.getElementById('imageModal').classList.remove('active');
}

export function initShare() {
  document.getElementById('imgBtn').addEventListener('click', () => {
    const urlInput = document.getElementById('resultUrl');
    if (urlInput.value) generateShareImage(urlInput.value);
  });

  document.getElementById('downloadBtn').addEventListener('click', downloadImage);

  document.getElementById('imageModal').addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeImageModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeImageModal();
  });
}
