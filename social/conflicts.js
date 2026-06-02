const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const RESOLUTION_LABELS = {
  suppress_overlap: 'Suppress overlap',
  stagger_launches: 'Stagger launches',
  arbitrate_priority: 'Arbitrate priority',
  human_review: 'Send to human review',
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatOverlap(n) {
  return new Intl.NumberFormat('en-US').format(n);
}

function render(data) {
  const root = $('#conflicts-root');
  const resolutions = (data.resolutions || []).map((id) => {
    const label = RESOLUTION_LABELS[id] || id.replace(/_/g, ' ');
    return `<button type="button" data-resolution="${escapeHtml(id)}">${escapeHtml(label)}</button>`;
  });

  root.innerHTML = `
    <div class="conflict-grid">
      <article class="campaign-card">
        <span class="status">${escapeHtml(data.campaignA?.status || 'active')}</span>
        <h3>${escapeHtml(data.campaignA?.name || 'Campaign A')}</h3>
        <p><strong>Audience:</strong> ${escapeHtml(data.campaignA?.audience || '—')}</p>
      </article>
      <article class="campaign-card">
        <span class="status">${escapeHtml(data.campaignB?.status || 'active')}</span>
        <h3>${escapeHtml(data.campaignB?.name || 'Campaign B')}</h3>
        <p><strong>Audience:</strong> ${escapeHtml(data.campaignB?.audience || '—')}</p>
      </article>
      <div class="overlap-panel">
        <p><strong>${formatOverlap(data.overlapProfiles || 0)}</strong> profiles overlap between these active campaigns.</p>
        <p class="muted">RT CDP detected a shared audience segment. Choose a resolution (demo — no live AJO write).</p>
        <div class="resolution-list">${resolutions.join('')}</div>
        <p id="conflict-toast" class="conflict-toast" hidden></p>
      </div>
    </div>`;

  $$('.resolution-list button', root).forEach((btn) => {
    btn.addEventListener('click', () => {
      const toast = $('#conflict-toast');
      const label = RESOLUTION_LABELS[btn.dataset.resolution] || btn.dataset.resolution;
      toast.hidden = false;
      toast.textContent = `Resolution recorded (demo): ${label}. In production this would update AJO campaign rules.`;
    });
  });
}

async function init() {
  try {
    const res = await fetch('/api/social/conflicts');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    render(data);
  } catch (e) {
    $('#conflicts-root').innerHTML = `<p class="loading error">${escapeHtml(e.message)}</p>`;
  }
}

init();
