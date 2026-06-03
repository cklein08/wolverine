const STORAGE_KEY = 'wolverine-mobile-tester';
const PERSONA_KEY = 'wolverine-mobile-persona';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let config = { siteUrl: 'https://main--wolverine--cklein08.aem.page', personas: [] };
let deferredInstallPrompt = null;

function loadTester() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function saveTester(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function savePersona(id) {
  localStorage.setItem(PERSONA_KEY, id);
}

function getPersona() {
  return localStorage.getItem(PERSONA_KEY);
}

function showScreen(id) {
  $$('.screen').forEach((el) => el.classList.toggle('active', el.id === id));
  $$('.tab-bar button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.screen === id);
  });
}

function experienceUrl(persona, type = 'landing') {
  const base = config.siteUrl.replace(/\/$/, '');
  const p = config.personas.find((x) => x.id === persona.id) || persona;
  const path = type === 'home' ? '' : (p.landingPath || `/${p.id}`).replace(/^\//, '');
  const url = new URL(path ? `${base}/${path}` : `${base}/`);
  if (p.segmentId) url.searchParams.set('forge-preview-segment', p.segmentId);
  return url.toString();
}

function toast(channel, title, body, opts = {}) {
  const stack = $('#toast-stack');
  const el = document.createElement('div');
  el.className = 'toast';
  if (opts.link) {
    el.innerHTML = `<strong>${channel}</strong>${title}<br>${body}<br><a href="${opts.link}" style="color:#86efac;font-weight:700">Open →</a>`;
  } else {
    el.innerHTML = `<strong>${channel}</strong>${title}<br>${body}`;
  }
  stack.appendChild(el);
  setTimeout(() => el.remove(), opts.duration || 4500);
}

async function fetchJourney(personaId) {
  try {
    const res = await fetch(`/api/social/journey/${personaId}`);
    if (res.ok) return res.json();
  } catch {
    /* static HLX site */
  }
  try {
    const res = await fetch(`/social/journey/${personaId}.json`);
    if (res.ok) return res.json();
  } catch {
    /* ignore */
  }
  return null;
}

/** Demo pacing: 60s journey steps play in ~800ms in the PWA. */
const DEMO_STEP_MS = 800;

const CHANNEL_ICON = { email: '📧', sms: '💬', push: '🔔' };

async function showSystemPush(step) {
  const title = step.title || 'Wolverine Mobile';
  const body = step.body || '';
  const options = {
    body,
    icon: step.icon || '/mobile-app/icons/icon-192.png',
    badge: '/mobile-app/icons/icon-192.png',
    data: { url: step.link },
  };
  if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, options);
      return;
    } catch {
      /* fall through to toast */
    }
  }
  toast(`${CHANNEL_ICON.push} Push`, title, body, { link: step.link, duration: 5500 });
}

async function simulateJourney(persona) {
  const journey = await fetchJourney(persona.id);
  if (!journey?.steps?.length) {
    await simulateJourneyFallback(persona);
    return;
  }

  for (const step of journey.steps) {
    if (step.channel === 'web') continue;
    if (step.channel === 'email') {
      toast(`${CHANNEL_ICON.email} Email`, step.subject || 'Campaign email', step.preheader || step.headline || step.label);
      if (step.delayAfterPrevSeconds) await delay(DEMO_STEP_MS);
    } else if (step.channel === 'sms') {
      toast(`${CHANNEL_ICON.sms} SMS`, step.sender || 'Wolverine Mobile', step.body || '', {
        link: step.link,
        duration: 5500,
      });
      await delay(DEMO_STEP_MS);
    } else if (step.channel === 'push') {
      await showSystemPush(step);
      await delay(DEMO_STEP_MS);
    }
  }
}

async function simulateJourneyFallback(persona) {
  const isLoyalty = persona.goal === 'loyalty';
  toast('Email', persona.headline || 'Campaign message', 'Tap to view your personalized offer.');
  await delay(isLoyalty ? DEMO_STEP_MS : 400);
  if (isLoyalty) {
    toast('Email', 'Follow-up (60s)', 'We noticed you have not opened yet — second touch.');
    await delay(DEMO_STEP_MS);
    toast('SMS', 'Wolverine Mobile', 'Your family plan offer is waiting.');
    await delay(600);
  } else {
    toast('SMS', 'Wolverine Mobile', 'Still thinking? Your exclusive offer ends soon.');
    await delay(600);
  }
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function openExperience(persona, type = 'landing') {
  savePersona(persona.id);
  window.location.href = experienceUrl(persona, type);
}

function renderPersonas() {
  const list = $('#persona-list');
  list.innerHTML = '';
  config.personas.forEach((p) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'persona-card';
    btn.innerHTML = `
      <span class="goal">${p.goal || 'campaign'}</span>
      <h3>${p.label}</h3>
      <p>${p.tagline || p.headline || ''}</p>
    `;
    btn.addEventListener('click', () => openPersonaModal(p));
    list.appendChild(btn);
  });
}

function openPersonaModal(persona) {
  const modal = $('#journey-modal');
  const title = $('#modal-title');
  const steps = $('#modal-steps');
  const openBtn = $('#modal-open');
  title.textContent = persona.label;
  steps.innerHTML = '';
  openBtn.onclick = null;
  $('#modal-simulate').onclick = null;

  (async () => {
    const journeySteps = await fetchJourney(persona.id);
    const labels = journeySteps?.steps?.length
      ? journeySteps.steps
          .filter((s) => s.channel !== 'web')
          .map((s) => {
            const icon = CHANNEL_ICON[s.channel] || '·';
            if (s.channel === 'email') return `${icon} Email: ${s.subject}`;
            if (s.channel === 'sms') return `${icon} SMS: ${(s.body || '').slice(0, 40)}…`;
            if (s.channel === 'push') return `${icon} Push: ${(s.body || '').slice(0, 40)}…`;
            return `${icon} ${s.label || s.channel}`;
          })
      : persona.goal === 'loyalty'
        ? ['📧 Email → no open', '📧 2nd email (60s)', '💬 SMS', '🔔 App push', '🌐 Landing']
        : ['📧 Email + CTA', '🌐 Landing', '💬 SMS (60s)', '🔔 Push', '🌐 Home'];
    labels.forEach((s) => {
      const li = document.createElement('li');
      li.textContent = s;
      steps.appendChild(li);
    });
    openBtn.onclick = async () => {
      modal.classList.remove('open');
      await simulateJourney(persona);
      openExperience(persona, 'landing');
    };
    $('#modal-simulate').onclick = async () => {
      modal.classList.remove('open');
      await simulateJourney(persona);
      showScreen('screen-profiles');
    };
    modal.classList.add('open');
  })();
}

const FALLBACK_PERSONAS = [
  {
    id: 'family-texas',
    label: 'Texas Family',
    goal: 'loyalty',
    segmentId: '9597981f-358d-4203-82e8-1a10362d81a0',
    landingPath: '/family-texas',
    headline: 'Keep your family connected',
    tagline: 'Plans for adults and kids in Texas',
  },
  {
    id: 'single-woman-nyc',
    label: 'Single Young Woman, NYC',
    goal: 'acquisition',
    segmentId: 'a0747189-7e95-4ae2-a0b2-0a7907bbfd09',
    landingPath: '/single-woman-nyc',
    headline: 'You run this city',
    tagline: 'Razr for your on-the-go NYC lifestyle',
  },
  {
    id: 'college-student',
    label: 'College Student',
    goal: 'acquisition',
    segmentId: '8d2b1883-3808-4880-a8f8-843fe5cbfe6c',
    landingPath: '/college-student',
    headline: 'Wireless that fits your semester',
    tagline: 'Affordable data on campus',
  },
];

async function loadConfig() {
  try {
    const res = await fetch('/api/mobile-app/config');
    if (res.ok) {
      const data = await res.json();
      config = { ...config, ...data };
    }
  } catch {
    /* static HLX site */
  }
  if (!config.personas?.length) {
    try {
      const res = await fetch('/mobile-app/config.json');
      if (res.ok) {
        const data = await res.json();
        config = { ...config, ...data };
      }
    } catch {
      /* ignore */
    }
  }
  if (!config.personas?.length) config.personas = FALLBACK_PERSONAS;
}

function setupTabs() {
  $$('.tab-bar button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const screen = btn.dataset.screen;
      if (screen === 'screen-experience') {
        const id = getPersona();
        const persona = config.personas.find((p) => p.id === id) || config.personas[0];
        if (persona) openExperience(persona, 'home');
        return;
      }
      showScreen(screen);
    });
  });
}

function setupInstall() {
  const banner = $('#install-banner');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    banner.classList.add('visible');
  });
  $('#install-btn')?.addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      banner.classList.remove('visible');
    } else if (/iphone|ipad/i.test(navigator.userAgent)) {
      alert('Tap Share in Safari, then "Add to Home Screen" to install Wolverine Mobile.');
    }
  });
  if (/iphone|ipad/i.test(navigator.userAgent) && !window.navigator.standalone) {
    banner.classList.add('visible');
    $('#install-banner p').textContent = 'Install: Safari → Share → Add to Home Screen';
  }
}

function setupServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/mobile-app/sw.js', { scope: '/mobile-app/' }).catch(() => {});
  }
}

async function init() {
  setupServiceWorker();
  if ('Notification' in window && Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch {
      /* optional for demo */
    }
  }
  setupTabs();
  setupInstall();

  $('#journey-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'journey-modal') $('#journey-modal').classList.remove('open');
  });
  $$('[data-close-modal]').forEach((el) =>
    el.addEventListener('click', () => $('#journey-modal').classList.remove('open')),
  );

  await loadConfig();
  renderPersonas();

  const tester = loadTester();
  setTimeout(() => {
    if (tester) {
      $('#tester-email').value = tester.email || '';
      $('#tester-phone').value = tester.phone || '';
      showScreen('screen-profiles');
    } else {
      showScreen('screen-onboard');
    }
  }, 900);

  $('#onboard-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveTester({
      email: $('#tester-email').value.trim(),
      phone: $('#tester-phone').value.trim(),
    });
    showScreen('screen-profiles');
  });

  $('#btn-skip').addEventListener('click', () => {
    saveTester({ email: 'demo@test.com', phone: '' });
    showScreen('screen-profiles');
  });
}

init();
