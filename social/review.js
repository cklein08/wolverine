const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let catalog = { personas: [] };
let currentId = null;
let currentEmail = null;
let currentSms = null;
let currentSmsMessageId = null;
let currentPush = null;
let currentPushMessageId = null;
let activeChannel = 'email';
let integration = null;

function setStatus(msg, isError = false) {
  const el = $('#status-msg');
  el.textContent = msg;
  el.classList.toggle('error', isError);
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function showChannel(channel) {
  activeChannel = channel;
  $$('.channel-btn').forEach((b) => b.classList.toggle('active', b.dataset.channel === channel));
  $$('.channel-view').forEach((v) => v.classList.toggle('active', v.id === `panel-${channel}`));
  $('.email-only')?.classList.toggle('hidden', channel !== 'email');
  $('#edit-email').hidden = channel !== 'email';
  $('#edit-sms').hidden = channel !== 'sms';
  $('#edit-push').hidden = channel !== 'push';
}

function renderPersonaList() {
  const list = $('#persona-list');
  list.innerHTML = '';
  catalog.personas.forEach((p) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `persona-btn${p.id === currentId ? ' active' : ''}`;
    btn.innerHTML = `
      <span class="goal">${p.campaignGoal || 'campaign'}</span>
      <strong>${p.label}</strong>
      <div class="status ${p.emailStatus === 'approved' ? 'approved' : ''}">Email: ${p.emailStatus || 'missing'}</div>
      <div class="status ${p.smsStatus === 'approved' ? 'approved' : ''}">SMS: ${p.smsStatus || 'missing'} (${p.smsCount || 0})</div>
      <div class="status ${p.pushStatus === 'approved' ? 'approved' : ''}">Push: ${p.pushStatus || 'missing'} (${p.pushCount || 0})</div>
    `;
    btn.addEventListener('click', () => selectPersona(p.id));
    list.appendChild(btn);
  });
}

function renderAjoPanel() {
  const persona =
    integration?.personas?.find((p) => p.id === currentId) ||
    catalog.personas?.find((p) => p.id === currentId);
  const ajo = persona?.ajo || {};
  const rtcdp = persona?.rtcdp || {};
  const fields = [
    ['RT CDP segment', `${rtcdp.segmentName || persona?.segmentName || '—'}`],
    ['Segment ID', `<code>${escapeHtml(rtcdp.segmentId || persona?.segmentId || '—')}</code>`],
    ['AJO campaign', escapeHtml(ajo.campaignName || persona?.campaignName || '—')],
    ['Campaign ID', `<code>${escapeHtml(ajo.campaignId || persona?.campaignId || '—')}</code>`],
    ['AJO journey', escapeHtml(ajo.journeyName || persona?.journeyName || '—')],
    ['Journey ID', `<code>${escapeHtml(ajo.journeyId || persona?.journeyId || '—')}</code>`],
  ];
  $('#ajo-fields').innerHTML = fields.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');

  const segmentUrl = rtcdp.segmentUrl || persona?.segmentUrl || '#';
  const campaignUrl = ajo.campaignUrl || persona?.ajoCampaignUrl || '#';
  const journeyUrl = ajo.journeyUrl || persona?.ajoJourneyUrl || '#';
  const segmentLink = $('#ajo-segment-link');
  const campaignLink = $('#ajo-campaign-link');
  const journeyLink = $('#ajo-journey-link');
  segmentLink.href = segmentUrl;
  campaignLink.href = campaignUrl;
  journeyLink.href = journeyUrl;
  segmentLink.toggleAttribute('aria-disabled', segmentUrl === '#');
  campaignLink.toggleAttribute('aria-disabled', campaignUrl === '#');
  journeyLink.toggleAttribute('aria-disabled', journeyUrl === '#');
}

function renderMeta() {
  const email = currentEmail;
  const meta = email?.metadata || {};
  const fields = [
    ['Email status', email?.status || '—'],
    ['SMS status', currentSms?.status || '—'],
    ['Push status', currentPush?.status || '—'],
    ['Landing CTA', email?.ctaUrl || '—'],
  ];
  $('#meta-fields').innerHTML = fields
    .map(([k, v]) => `<dt>${k}</dt><dd>${escapeHtml(v)}</dd>`)
    .join('');
  renderAjoPanel();
}

function downloadExport(path) {
  window.location.href = path;
}

function renderEmailChecklist(email) {
  const products = email.products || [];
  const checks = [
    { label: 'Subject line present', pass: Boolean(email.subject?.trim()) },
    { label: 'Preheader present', pass: Boolean(email.preheader?.trim()) },
    { label: 'Three product tiles with pricing', pass: products.length >= 3 && products.every((p) => p.price && p.name) },
    { label: 'CTA links to personalized landing', pass: /forge-preview-segment=/.test(email.ctaUrl || '') },
  ];
  $('#checklist').innerHTML = checks
    .map((c) => `<li class="${c.pass ? 'pass' : 'fail'}">${c.pass ? '✓' : '○'} ${c.label}</li>`)
    .join('');
}

function renderSmsChecklist(msg) {
  if (!msg) {
    $('#sms-checklist').innerHTML = '';
    return;
  }
  const checks = [
    { label: 'Within 160 chars (1 segment)', pass: (msg.charCount || 0) <= 160 },
    { label: 'GSM-7 compatible', pass: msg.gsm7 !== false },
    { label: 'Short link present', pass: Boolean(msg.shortLink) },
    { label: 'Full landing URL configured', pass: /forge-preview-segment=/.test(msg.link || '') },
  ];
  $('#sms-checklist').innerHTML = checks
    .map((c) => `<li class="${c.pass ? 'pass' : 'fail'}">${c.pass ? '✓' : '○'} ${c.label}</li>`)
    .join('');
}

function fillEmailForm(email) {
  const form = $('#edit-form');
  form.subject.value = email.subject || '';
  form.preheader.value = email.preheader || '';
  form.headline.value = email.headline || '';
  form.tagline.value = email.tagline || '';
  form.ctaLabel.value = email.ctaLabel || '';
}

function renderSmsList() {
  const ul = $('#sms-message-list');
  ul.innerHTML = '';
  (currentSms?.messages || []).forEach((m) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = m.id === currentSmsMessageId ? 'active' : '';
    btn.innerHTML = `<strong>${escapeHtml(m.label || m.id)}</strong><br><span class="muted">${m.charCount || 0} chars · ${m.segments || 1} seg</span>`;
    btn.addEventListener('click', () => selectSmsMessage(m.id));
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

function renderPushChecklist(msg) {
  if (!msg) {
    $('#push-checklist').innerHTML = '';
    return;
  }
  const checks = [
    { label: 'Title present', pass: Boolean(msg.title?.trim()) },
    { label: 'Body present', pass: Boolean(msg.body?.trim()) },
    { label: 'Deep link to landing', pass: /forge-preview-segment=/.test(msg.link || '') },
    { label: 'Body under 120 chars (recommended)', pass: (msg.body?.length || 0) <= 120 },
  ];
  $('#push-checklist').innerHTML = checks
    .map((c) => `<li class="${c.pass ? 'pass' : 'fail'}">${c.pass ? '✓' : '○'} ${c.label}</li>`)
    .join('');
}

function renderPushList() {
  const ul = $('#push-message-list');
  ul.innerHTML = '';
  (currentPush?.messages || []).forEach((m) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = m.id === currentPushMessageId ? 'active' : '';
    btn.innerHTML = `<strong>${escapeHtml(m.label || m.id)}</strong><br><span class="muted">${escapeHtml((m.body || '').slice(0, 40))}…</span>`;
    btn.addEventListener('click', () => selectPushMessage(m.id));
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

function selectPushMessage(id) {
  currentPushMessageId = id;
  const msg = currentPush?.messages?.find((m) => m.id === id);
  if (!msg) return;
  renderPushList();
  $('#push-preview-title').textContent = msg.title || 'Wolverine Mobile';
  $('#push-preview-body').textContent = msg.body || '';
  $('#push-title-input').value = msg.title || '';
  $('#push-body-input').value = msg.body || '';
  $('#push-stats').textContent = `${(msg.body || '').length} characters · fires ${msg.delayAfterPrevSeconds || 0}s after prior step`;
  $('#push-link-display').innerHTML = `Deep link: ${escapeHtml(msg.link || '')}`;
  renderPushChecklist(msg);
}

function selectSmsMessage(id) {
  currentSmsMessageId = id;
  const msg = currentSms?.messages?.find((m) => m.id === id);
  if (!msg) return;
  renderSmsList();
  $('#sms-sender').textContent = currentSms.sender || 'Wolverine Mobile';
  $('#sms-bubbles').innerHTML = `
    <div class="sms-bubble-preview">
      ${escapeHtml(msg.body || '')}
      <span class="short-link">${escapeHtml(msg.shortLink || '')}</span>
    </div>`;
  $('#sms-stats').textContent = `${msg.charCount || 0} characters · ${msg.segments || 1} segment(s)${msg.gsm7 === false ? ' · may use Unicode encoding' : ''}`;
  $('#sms-link-display').innerHTML = `Short: <code>${escapeHtml(msg.shortLink || '')}</code><br>Full: ${escapeHtml(msg.link || '')}`;
  $('#sms-body-input').value = msg.body || '';
  updateCharCountLive();
  renderSmsChecklist(msg);
}

function updateCharCountLive() {
  const text = $('#sms-body-input').value;
  const len = text.length;
  const segs = len <= 160 ? (len === 0 ? 0 : 1) : Math.ceil(len / 153);
  $('#sms-char-count').textContent = `${len} characters · ${segs} segment(s)`;
}

async function selectPersona(id) {
  currentId = id;
  renderPersonaList();
  setStatus('');
  try {
    const data = await api(`/api/social/messages/${id}`);
    currentEmail = data.email;
    currentSms = data.sms;
    currentPush = data.push;
    currentSmsMessageId = currentSms?.messages?.[0]?.id || null;
    currentPushMessageId = currentPush?.messages?.[0]?.id || null;

    const label =
      activeChannel === 'email'
        ? `${currentEmail.personaLabel} — ${currentEmail.subject}`
        : activeChannel === 'sms'
          ? `${currentSms?.personaLabel || currentEmail.personaLabel} — SMS (${currentSms?.messages?.length || 0})`
          : `${currentPush?.personaLabel || currentEmail.personaLabel} — Push (${currentPush?.messages?.length || 0})`;
    $('#preview-label').textContent = label;

    fillEmailForm(currentEmail);
    renderMeta();
    renderEmailChecklist(currentEmail);
    $('#email-preview').src = `${data.previewPath}?t=${Date.now()}`;

    renderSmsList();
    if (currentSmsMessageId) selectSmsMessage(currentSmsMessageId);
    renderPushList();
    if (currentPushMessageId) selectPushMessage(currentPushMessageId);
    const now = new Date();
    $('#lock-date').textContent = now.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  } catch (e) {
    setStatus(e.message, true);
  }
}

async function saveEmailEdits(extra = {}) {
  if (!currentId) return;
  const form = $('#edit-form');
  const body = {
    subject: form.subject.value.trim(),
    preheader: form.preheader.value.trim(),
    headline: form.headline.value.trim(),
    tagline: form.tagline.value.trim(),
    ctaLabel: form.ctaLabel.value.trim(),
    ...extra,
  };
  const data = await api(`/api/social/messages/${currentId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  currentEmail = data.email;
  await loadCatalog();
  await selectPersona(currentId);
  setStatus(extra.status === 'approved' ? 'Email approved.' : 'Email saved.');
}

async function savePushEdits(extra = {}) {
  if (!currentId || !currentPushMessageId) return;
  const body = {
    status: extra.status,
    messages: [
      {
        id: currentPushMessageId,
        title: $('#push-title-input').value.trim(),
        body: $('#push-body-input').value.trim(),
      },
    ],
  };
  const data = await api(`/api/social/messages/${currentId}/push`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  currentPush = data.push;
  await loadCatalog();
  await selectPersona(currentId);
  showChannel('push');
  setStatus(extra.status === 'approved' ? 'Push approved.' : 'Push saved.');
}

async function saveSmsEdits(extra = {}) {
  if (!currentId || !currentSmsMessageId) return;
  const body = {
    status: extra.status,
    messages: [{ id: currentSmsMessageId, body: $('#sms-body-input').value.trim() }],
  };
  const data = await api(`/api/social/messages/${currentId}/sms`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  currentSms = data.sms;
  await loadCatalog();
  await selectPersona(currentId);
  showChannel('sms');
  setStatus(extra.status === 'approved' ? 'SMS approved.' : 'SMS saved.');
}

async function loadCatalog() {
  catalog = await api('/api/social/catalog');
}

async function loadIntegration() {
  try {
    integration = await api('/api/social/integration');
  } catch {
    integration = null;
  }
}

async function init() {
  $$('.channel-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      showChannel(btn.dataset.channel);
      if (currentEmail) {
        const ch = btn.dataset.channel;
        $('#preview-label').textContent =
          ch === 'email'
            ? `${currentEmail.personaLabel} — ${currentEmail.subject}`
            : ch === 'sms'
              ? `${currentSms?.personaLabel || currentEmail.personaLabel} — SMS`
              : `${currentPush?.personaLabel || currentEmail.personaLabel} — Push`;
      }
    });
  });

  $$('.mode').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.mode').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      $('#email-preview').style.width = `${btn.dataset.width}px`;
    });
  });

  $('#edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await saveEmailEdits();
    } catch (err) {
      setStatus(err.message, true);
    }
  });

  $('#btn-approve-email').addEventListener('click', async () => {
    try {
      await saveEmailEdits({ status: 'approved' });
    } catch (err) {
      setStatus(err.message, true);
    }
  });

  $('#sms-edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await saveSmsEdits();
    } catch (err) {
      setStatus(err.message, true);
    }
  });

  $('#btn-approve-sms').addEventListener('click', async () => {
    try {
      await saveSmsEdits({ status: 'approved' });
    } catch (err) {
      setStatus(err.message, true);
    }
  });

  $('#push-edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await savePushEdits();
    } catch (err) {
      setStatus(err.message, true);
    }
  });

  $('#btn-approve-push').addEventListener('click', async () => {
    try {
      await savePushEdits({ status: 'approved' });
    } catch (err) {
      setStatus(err.message, true);
    }
  });

  $('#sms-body-input').addEventListener('input', updateCharCountLive);

  $('#btn-export-all').addEventListener('click', () => {
    downloadExport('/api/social/export');
    setStatus('Downloading AJO handoff zip (all personas)…');
  });

  $('#btn-export-persona').addEventListener('click', () => {
    if (!currentId) {
      setStatus('Select a persona first.', true);
      return;
    }
    downloadExport(`/api/social/export/${currentId}`);
    setStatus(`Downloading zip for ${currentId}…`);
  });

  $('#btn-regenerate-all').addEventListener('click', async () => {
    try {
      setStatus('Regenerating…');
      await api('/api/social/generate', { method: 'POST', body: '{}' });
      await loadCatalog();
      if (currentId) await selectPersona(currentId);
      setStatus('All messages regenerated.');
    } catch (err) {
      setStatus(err.message, true);
    }
  });

  try {
    await loadIntegration();
    await loadCatalog();
    if (catalog.personas.some((p) => p.emailStatus === 'missing')) {
      await api('/api/social/generate', { method: 'POST', body: '{}' });
      await loadCatalog();
    }
    renderPersonaList();
    if (catalog.personas[0]) await selectPersona(catalog.personas[0].id);
  } catch (err) {
    setStatus(err.message, true);
  }
}

init();
