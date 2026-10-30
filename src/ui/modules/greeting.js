import { state } from './state.js';

const GREETINGS = {
  zh: {
    dawn: {
      hello: '早上好，',
      lines: ['今天也慢慢来。', '先给自己倒杯温水吧。', '天刚亮，不着急。'],
    },
    morning: {
      hello: '上午好，',
      lines: ['今天也有好好生活吗？', '先做一件小事，也算开始。', '不用急，上午还长。'],
    },
    noon: {
      hello: '中午好，',
      lines: ['饭吃了没？', '先离开屏幕一会儿。', '今天也辛苦了。'],
    },
    afternoon: {
      hello: '下午好，',
      lines: ['今天也有好好生活吗？', '泡杯茶再继续。', '做一点也算数。'],
    },
    evening: {
      hello: '晚上好，',
      lines: ['今天也有好好生活吗？', '今天辛苦了。', '把今天做的东西放上来吧。'],
    },
    late: {
      hello: '夜深了，',
      lines: ['今天也有好好生活吗？', '还在忙吗？记得留一点给自己。', '明天再分享也一样。'],
    },
  },
  en: {
    dawn: {
      hello: 'Good morning, ',
      lines: ['take it slowly today.', 'pour yourself a glass of warm water first.', 'the day is still young.'],
    },
    morning: {
      hello: 'Good morning, ',
      lines: ['did you take care of yourself today?', 'one small thing is a start.', 'no rush, the morning is long.'],
    },
    noon: {
      hello: 'Good afternoon, ',
      lines: ['have you eaten?', 'step away from the screen for a moment.', 'you did enough today.'],
    },
    afternoon: {
      hello: 'Good afternoon, ',
      lines: ['did you take care of yourself today?', 'make some tea before you continue.', 'a little is still something.'],
    },
    evening: {
      hello: 'Good evening, ',
      lines: ['did you take care of yourself today?', 'you did enough today.', 'put what you made today here.'],
    },
    late: {
      hello: "It's late, ",
      lines: ['did you take care of yourself today?', 'still busy? save a little for yourself.', 'tomorrow is fine too.'],
    },
  },
};

function slotForHour(hour) {
  if (hour >= 5 && hour < 9) return 'dawn';
  if (hour >= 9 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 14) return 'noon';
  if (hour >= 14 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 23) return 'evening';
  return 'late';
}

let slot = slotForHour(new Date().getHours());
let lineIndex = 0;
let rotateTimer = null;

function lang() {
  return state.lang === 'en' ? 'en' : 'zh';
}

function renderGreeting(announce) {
  const hello = document.getElementById('greetHello');
  const line = document.getElementById('greetLine');
  const live = document.getElementById('greetLive');
  if (!hello || !line) return;
  const data = GREETINGS[lang()][slot];
  hello.textContent = data.hello;
  line.textContent = data.lines[lineIndex];
  if (announce && live) live.textContent = data.hello + data.lines[lineIndex];
}

function nextLine() {
  const lines = GREETINGS[lang()][slot].lines;
  if (lines.length > 1) {
    let next = lineIndex;
    while (next === lineIndex) next = Math.floor(Math.random() * lines.length);
    lineIndex = next;
  }
  renderGreeting(true);
}

function startRotation() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (rotateTimer || reduce.matches) return;
  rotateTimer = window.setInterval(() => {
    if (!document.hidden) nextLine();
  }, 45000);
}

function buildSpecks() {
  const host = document.getElementById('specks');
  if (!host || host.childElementCount) return;
  for (let i = 0; i < 16; i += 1) {
    const speck = document.createElement('span');
    speck.className = 'speck';
    speck.style.left = (4 + Math.random() * 92).toFixed(2) + '%';
    speck.style.top = (20 + Math.random() * 70).toFixed(2) + '%';
    speck.style.width = (1.6 + Math.random() * 2.8).toFixed(2) + 'px';
    speck.style.height = speck.style.width;
    speck.style.setProperty('--dur', (24 + Math.random() * 22).toFixed(1) + 's');
    speck.style.setProperty('--delay', (-Math.random() * 40).toFixed(1) + 's');
    speck.style.setProperty('--drift', (Math.random() * 60 - 30).toFixed(1) + 'px');
    speck.style.background = Math.random() > 0.78
      ? 'rgba(79, 107, 82, 0.32)'
      : 'rgba(120, 94, 58, 0.3)';
    host.appendChild(speck);
  }
}

export function refreshGreeting() {
  slot = slotForHour(new Date().getHours());
  renderGreeting(false);
}

export function initGreeting() {
  renderGreeting(false);
  startRotation();
  buildSpecks();
  window.refreshGreeting = refreshGreeting;

  const shuffle = document.getElementById('greetingShuffle');
  if (!shuffle) return;
  shuffle.addEventListener('click', () => {
    nextLine();
    if (rotateTimer) {
      window.clearInterval(rotateTimer);
      rotateTimer = null;
    }
    startRotation();
  });
}
