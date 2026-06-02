const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const WAIT_MS = 60_000;
const PUSH_WAIT_MS = 30_000;

const CHANNEL_ICON = { email: '📧', sms: '💬', push: '🔔', web: '🌐' };
const params = new URLSearchParams(location.search);

let catalog = { personas: [] };
let currentId = params.get('persona') || null;
let journey = null;
let emails = [];
let smsMessages = [];
let pushMessages = [];
let converted = false;
let timerId = null;
let waitEnd = 0;
let pendingTimerAction = null;

async function api(path, opts = {}) {
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function showChannel(name) {
  $$('.channel-tab').forEach((t) => t.classList.toggle('active', t.dataset.channel === name));
  $$('.channel-panel').forEach((p) => p.classList.remove('active'));
  $(`#panel-${name}`)?.classList.add('active');
}

function clearTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
  waitEnd = 0;
  pendingTimerAction = null;
  $('#timer-label').textContent = '';
  $('#btn-skip-wait').hidden = true;
}

function startTimer(ms, onDone, label) {
  clearTimer();
  pendingTimerAction = onDone;
  waitEnd = Date.now() + ms;
  $('#btn-skip-wait').hidden = false;
  const tick = () => {
    const left = Math.max(0, waitEnd - Date.now());
    const sec = Math.ceil(left / 1000);
    $('#timer-label').textContent = label.replace('{s}', String(sec));
    if (left <= 0) {
      const action = pendingTimerAction;
      clearTimer();
      action?.();
    }
  };
  tick();
  timerId = setInterval(tick, 250);
}

function renderPersonas() {
  const list = $('#persona-list');
  list.innerHTML = '';
  catalog.personas.forEach((p) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `persona-btn${p.id === currentId ? ' active' : ''}`;
    btn.innerHTML = `<span class="goal">${p.campaignGoal}</span><strong>${p.label}</strong>`;
    btn.addEventListener('click', () => {
      history.replaceState(null, '', `?persona=${p.id}`);
      loadPersona(p.id);
    });
    list.appendChild(btn);
  });
}

function renderTimeline() {
  const ol = $('#timeline');
  if (!journey?.steps?.length) {
    ol.innerHTML = '';
    return;
  }
  ol.innerHTML = journey.steps
    .map((s) => {
      let cls = '';
      if (s.channel === 'email' && emails.find((e) => e.id === s.id)?.read) cls = 'done';
      if (s.channel === 'sms' && smsMessages.some((m) => m.stepId === s.id)) cls = 'done';
      if (s.channel === 'push' && pushMessages.some((m) => m.stepId === s.id)) cls = 'done';
      if (s.channel === 'web' && converted) cls = 'done';
      const icon = CHANNEL_ICON[s.channel] || s.channel;
      const text =
        s.channel === 'email'
          ? `${s.subject}`
          : s.channel === 'sms'
            ? s.body?.slice(0, 48)
            : s.channel === 'push'
              ? s.body?.slice(0, 48)
              : s.label;
      return `<li class="${cls}"><span class="ch-icon">${icon}</span>${escapeHtml(text || s.label || '')}</li>`;
    })
    .join('');
}

function renderEmailList() {
  const ul = $('#email-list');
  ul.innerHTML = '';
  emails.forEach((em) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = em.read ? 'read' : 'unread';
    if (em.active) btn.classList.add('active');
    btn.innerHTML = `<strong>${escapeHtml(em.subject)}</strong><div class="meta">${em.read ? 'Read' : 'Unread'} · ${escapeHtml(em.label)}</div>`;
    btn.addEventListener('click', () => openEmail(em));
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

function addEmailFromStep(step) {
  if (emails.some((e) => e.id === step.id)) return;
  emails.push({
    id: step.id,
    subject: step.subject,
    preheader: step.preheader,
    previewPath: step.previewPath,
    ctaUrl: step.ctaUrl,
    ctaLabel: step.ctaLabel,
    label: step.label,
    read: false,
    active: false,
  });
  renderEmailList();
  renderTimeline();
}

function openEmail(em) {
  emails.forEach((e) => {
    e.active = e.id === em.id;
  });
  em.read = true;
  renderEmailList();
  renderTimeline();

  if (em.id === 'email-1' && journey?.campaignGoal === 'loyalty') {
    clearTimer();
  }

  $('#email-empty').hidden = true;
  $('#email-open').hidden = false;
  $('#email-subject').textContent = em.subject;
  $('#email-preheader').textContent = em.preheader || '';
  $('#email-frame').src = `${em.previewPath}?t=${Date.now()}`;
  const cta = $('#email-cta');
  cta.href = em.ctaUrl;
  cta.textContent = em.ctaLabel || 'Open personalized offer';

  const noConv = $('#btn-no-conversion');
  noConv.hidden = journey?.campaignGoal === 'loyalty';
  if (journey?.campaignGoal === 'acquisition') {
    clearTimer();
  }
  showChannel('email');
}

function getSmsSteps() {
  return (journey?.steps || []).filter((s) => s.channel === 'sms');
}

function demoDelayMs(seconds = 0) {
  if (seconds >= 60) return WAIT_MS;
  if (seconds >= 30) return PUSH_WAIT_MS;
  return 2000;
}

function deliverNextSms() {
  const steps = getSmsSteps();
  const next = steps.find((s) => !smsMessages.some((m) => m.stepId === s.id));
  if (!next) {
    deliverNextPush();
    return;
  }
  addSmsFromStep(next);
  const idx = steps.indexOf(next);
  const following = steps[idx + 1];
  if (following?.delayAfterPrevSeconds) {
    startTimer(demoDelayMs(following.delayAfterPrevSeconds), deliverNextSms, `Next SMS in {s}s`);
  } else {
    deliverNextPush();
  }
}

function getPushSteps() {
  return (journey?.steps || []).filter((s) => s.channel === 'push');
}

function deliverNextPush() {
  const steps = getPushSteps();
  const next = steps.find((s) => !pushMessages.some((m) => m.stepId === s.id));
  if (!next) return;
  addPushFromStep(next);
  const idx = steps.indexOf(next);
  const following = steps[idx + 1];
  if (following?.delayAfterPrevSeconds) {
    startTimer(demoDelayMs(following.delayAfterPrevSeconds), deliverNextPush, `Next push in {s}s`);
  }
}

function addPushFromStep(step) {
  if (pushMessages.some((m) => m.stepId === step.id)) return;
  pushMessages.push({ stepId: step.id, ...step });
  renderPush();
  renderTimeline();
  showChannel('push');
  if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((reg) =>
        reg.showNotification(step.title || 'Wolverine Mobile', {
          body: step.body || '',
          icon: step.icon || '/mobile-app/icons/icon-192.png',
          data: { url: step.link },
        }),
      )
      .catch(() => {});
  }
}

function renderPush() {
  const root = $('#push-inbox');
  if (!pushMessages.length) {
    root.innerHTML = '<p class="push-inbox-empty">App push alerts appear after the SMS sequence.</p>';
    return;
  }
  root.innerHTML = `
    <div class="push-lock-screen">
      <p class="lock-screen-time">9:41</p>
      ${pushMessages
        .map(
          (m) => `
        <div class="push-card" data-link="${encodeURIComponent(m.link || '')}">
          <strong>${escapeHtml(m.title || 'Wolverine Mobile')}</strong>
          <p>${escapeHtml(m.body || '')}</p>
        </div>`,
        )
        .join('')}
    </div>`;
  $$('.push-card', root).forEach((card) => {
    card.addEventListener('click', () => {
      const link = decodeURIComponent(card.dataset.link || '');
      if (link) window.open(link, '_blank', 'noopener');
    });
  });
}

function deliverSms() {
  deliverNextSms();
}

function addSmsFromStep(step) {
  if (smsMessages.some((m) => m.stepId === step.id)) return;
  smsMessages.push({ stepId: step.id, ...step });
  renderSms();
  renderTimeline();
  showChannel('sms');
}

function renderSms() {
  const thread = $('#sms-thread');
  if (!smsMessages.length) {
    thread.innerHTML = '<p class="empty-state">SMS messages appear after journey timers.</p>';
    return;
  }
  thread.innerHTML = smsMessages
    .map(
      (m) => `
    <div>
      <div class="sms-meta">${escapeHtml(m.sender || 'Wolverine Mobile')} · ${escapeHtml(m.label || m.stepId || '')}</div>
      <div class="sms-bubble tap" data-link="${encodeURIComponent(m.link || '')}">
        ${escapeHtml(m.body || '')}
        ${m.shortLink ? `<br><span class="sms-short">${escapeHtml(m.shortLink)}</span>` : ''}
        ${m.link ? `<br><a href="${escapeHtml(m.link)}" title="${escapeHtml(m.link)}">Full link →</a>` : ''}
      </div>
    </div>`,
    )
    .join('');
  $$('.sms-bubble.tap', thread).forEach((b) => {
    b.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') return;
      const link = decodeURIComponent(b.dataset.link || '');
      if (link) window.open(link, '_blank', 'noopener');
    });
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function startLoyaltyFlow() {
  const email2 = journey.steps.find((s) => s.id === 'email-2');
  if (!email2) return;
  startTimer(
    WAIT_MS,
    () => {
      addEmailFromStep(email2);
      openEmail(emails.find((e) => e.id === 'email-2'));
      setTimeout(deliverSms, 800);
    },
    '2nd email in {s}s — first email not opened',
  );
}

function startAcquisitionSmsTimer() {
  if (converted) return;
  startTimer(
    WAIT_MS,
    deliverSms,
    'SMS follow-up in {s}s — no conversion',
  );
}

function resetJourney() {
  clearTimer();
  converted = false;
  smsMessages = [];
  pushMessages = [];
  emails = [];
  $('#email-empty').hidden = false;
  $('#email-open').hidden = true;
  beginJourney();
}

function beginJourney() {
  const first = journey?.steps?.find((s) => s.channel === 'email' && s.id === 'email-1');
  if (first) addEmailFromStep(first);

  if (journey?.campaignGoal === 'loyalty') {
    startLoyaltyFlow();
  }

  renderTimeline();
  renderSms();
  renderPush();
  showChannel('email');
}

async function loadMessagesBundle(id) {
  try {
    return await api(`/api/social/messages/${id}`);
  } catch {
    const res = await fetch(`/social/messages/${id}.json`);
    if (!res.ok) throw new Error('Messages not found — run npm run social:generate and republish');
    return res.json();
  }
}

async function loadPersona(id) {
  currentId = id;
  clearTimer();
  renderPersonas();
  const data = await loadMessagesBundle(id);
  journey = data.journey;
  converted = false;
  smsMessages = [];
  pushMessages = [];
  emails = [];
  $('#email-empty').hidden = false;
  $('#email-open').hidden = true;
  beginJourney();
}

async function init() {
  if ('Notification' in window && Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch {
      /* optional */
    }
  }

  $$('.channel-tab').forEach((tab) => {
    tab.addEventListener('click', () => showChannel(tab.dataset.channel));
  });

  $('#btn-reset').addEventListener('click', resetJourney);

  $('#btn-skip-wait').addEventListener('click', () => {
    waitEnd = Date.now();
  });

  $('#btn-leave-unread').addEventListener('click', () => {
    const em = emails.find((e) => e.id === 'email-1');
    if (em) {
      em.read = false;
      em.active = false;
      renderEmailList();
    }
    $('#email-open').hidden = true;
    $('#email-empty').hidden = false;
    if (journey?.campaignGoal === 'loyalty') startLoyaltyFlow();
  });

  $('#email-cta').addEventListener('click', () => {
    converted = true;
    clearTimer();
    renderTimeline();
  });

  $('#btn-no-conversion').addEventListener('click', () => {
    $('#email-open').hidden = true;
    $('#email-empty').hidden = false;
    startAcquisitionSmsTimer();
  });

  try {
    try {
      catalog = await api('/api/social/catalog');
      if (catalog.personas.some((p) => p.emailStatus === 'missing')) {
        await api('/api/social/generate', { method: 'POST', body: '{}' });
        catalog = await api('/api/social/catalog');
      }
    } catch {
      const res = await fetch('/social/catalog.json');
      if (!res.ok) throw new Error('Social catalog not found on site');
      catalog = await res.json();
    }
    renderPersonas();
    const startId = currentId || catalog.personas[0]?.id;
    if (startId) await loadPersona(startId);
  } catch (e) {
    $('#timer-label').textContent = e.message;
  }
}

init();
