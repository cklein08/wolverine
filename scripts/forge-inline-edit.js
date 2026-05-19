/**
 * FORGE inline editing on EDS preview sites (*.aem.page).
 * Inserts via admin.da.live + IMS token (com_kit / daFetch style). Optional ?forge-api= for local FORGE server.
 */

import { insertBlockOnDaPageClient } from './forge-inline-edit-da.js';

const FORGE_EDIT_PARAM = 'forge-edit';
const FORGE_ORG_PARAM = 'forge-org';
const FORGE_REPO_PARAM = 'forge-repo';
const FORGE_API_PARAM = 'forge-api';

const BLOCK_REGISTRY = {
  hero: { label: 'Banner / Hero', category: 'content' },
  banner: { label: 'Banner', category: 'content' },
  cards: { label: 'Cards', category: 'content' },
  carousel: { label: 'Carousel', category: 'content' },
  columns: { label: 'Columns', category: 'content' },
  fragment: { label: 'Fragment', category: 'content' },
  'product-list': { label: 'Product grid / carousel', category: 'commerce' },
  'product-carousel': { label: 'Product carousel', category: 'commerce' },
  'product-teaser': { label: 'Product teaser', category: 'commerce' },
  'product-detail': { label: 'Product detail', category: 'commerce' },
  minicart: { label: 'Mini cart', category: 'commerce' },
  checkout: { label: 'Checkout', category: 'commerce' },
};

const PICKER_GROUPS = [
  { category: 'content', items: ['hero', 'cards', 'carousel', 'columns'] },
  { category: 'commerce', items: ['product-list', 'product-teaser', 'product-carousel'] },
];

function isEditMode() {
  const params = new URLSearchParams(window.location.search);
  const fe = params.get(FORGE_EDIT_PARAM);
  if (fe === '1' || fe === 'true') return true;
  const vse = params.get('vse') || params.get('cse');
  return vse === 'forge';
}

function resolveOrgRepo() {
  const params = new URLSearchParams(window.location.search);
  let org = params.get(FORGE_ORG_PARAM);
  let repo = params.get(FORGE_REPO_PARAM);
  if (!org || !repo) {
    const m = window.location.hostname.match(/^main--(.+)--([^.]+)\.aem\.page$/);
    if (m) {
      repo = repo || m[1];
      org = org || m[2];
    }
  }
  return { org, repo };
}

function resolveForgeApiBase() {
  const meta = document.querySelector('meta[name="forge:api"]');
  if (meta?.content) return meta.content.replace(/\/$/, '');
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get(FORGE_API_PARAM);
  if (fromQuery) return fromQuery.replace(/\/$/, '');
  return '';
}

function resolveDaToken() {
  try {
    return sessionStorage.getItem('forge_da_token') || localStorage.getItem('forge_da_token') || '';
  } catch {
    return '';
  }
}

function storeDaToken(token) {
  const t = String(token || '').trim();
  if (!t) return;
  try {
    sessionStorage.setItem('forge_da_token', t);
  } catch {
    /* ignore */
  }
}

function promptDaToken() {
  return new Promise((resolve) => {
    document.querySelector('.forge-edit-token-backdrop')?.remove();
    const backdrop = document.createElement('div');
    backdrop.className = 'forge-edit-dialog-backdrop forge-edit-token-backdrop';
    const dialog = document.createElement('div');
    dialog.className = 'forge-edit-dialog';
    dialog.innerHTML = `
      <header>Document Authoring sign-in</header>
      <div class="dialog-body">
        <p style="margin:0 0 12px;font-size:0.875rem;line-height:1.45">
          Paste your <strong>da.live</strong> IMS token (<code>tokenValue</code> from localStorage, starts with <code>eyJ</code>),
          or open <a href="https://da.live" target="_blank" rel="noopener">da.live</a> in this browser and sign in, then retry.
        </p>
        <input type="password" id="forgeDaTokenField" placeholder="eyJ…" autocomplete="off"
          style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;font-family:monospace;font-size:12px" />
      </div>
      <footer>
        <button type="button" data-action="cancel">Cancel</button>
        <button type="button" class="primary" data-action="save">Save token</button>
      </footer>
    `;
    backdrop.append(dialog);
    document.body.append(backdrop);
    const field = dialog.querySelector('#forgeDaTokenField');
    field?.focus();
    dialog.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
      backdrop.remove();
      resolve('');
    });
    dialog.querySelector('[data-action="save"]')?.addEventListener('click', () => {
      const val = field?.value?.trim() || '';
      backdrop.remove();
      if (val) storeDaToken(val);
      resolve(val);
    });
  });
}

function sectionLabel(el) {
  const heading = el.querySelector('h1, h2, h3, h4');
  const text = heading?.textContent?.trim();
  if (text) return text.length > 48 ? `${text.slice(0, 45)}…` : text;
  const para = el.querySelector('p');
  const pText = para?.textContent?.trim();
  if (pText) return pText.length > 48 ? `${pText.slice(0, 45)}…` : pText;
  return 'Content section';
}

function classifyBlock(el) {
  const classes = [...el.classList];
  for (const name of Object.keys(BLOCK_REGISTRY)) {
    if (classes.includes(name)) return { id: name, ...BLOCK_REGISTRY[name] };
  }
  if (el.closest('header')) return { id: 'header', label: 'Header', category: 'content' };
  if (el.closest('footer')) return { id: 'footer', label: 'Footer', category: 'content' };
  const sectionClass = classes.find((c) => c && c !== 'section');
  if (sectionClass) {
    return {
      id: sectionClass,
      label: sectionLabel(el),
      category: BLOCK_REGISTRY[sectionClass]?.category || 'content',
    };
  }
  return { id: 'section', label: sectionLabel(el), category: 'content' };
}

function daEditUrl(pagePath) {
  const { org, repo } = resolveOrgRepo();
  if (!org || !repo) return null;
  const slug = pagePath.replace(/^\//, '').replace(/\/$/, '') || 'index';
  return `https://da.live/edit#/${org}/${repo}/${slug}`;
}

function currentPagePath() {
  let p = window.location.pathname.replace(/\.html$/, '');
  if (p.endsWith('/')) p = p.slice(0, -1);
  if (!p || p === '/') return 'index';
  return p.replace(/^\//, '');
}

function showToast(message, isError = false) {
  document.querySelector('.forge-edit-toast')?.remove();
  const el = document.createElement('div');
  el.className = 'forge-edit-toast';
  el.setAttribute('role', 'status');
  if (isError) el.style.background = '#c9252d';
  el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.remove(), 5000);
}

function showBanner() {
  if (document.querySelector('.forge-edit-banner')) return;
  const bar = document.createElement('div');
  bar.className = 'forge-edit-banner';
  bar.setAttribute('role', 'status');
  const { org, repo } = resolveOrgRepo();
  const target = org && repo ? `${org}/${repo}` : 'preview site';
  const daUrl = daEditUrl(currentPagePath());
  const daBtn = daUrl
    ? `<a class="forge-edit-banner__da" href="${daUrl}" target="_blank" rel="noopener">Edit page in Document Authoring</a>`
    : '';
  const pageLabel = currentPagePath() === 'index' ? 'Home' : currentPagePath();
  bar.innerHTML = `<strong>FORGE inline edit</strong>
    <span>${target} · ${pageLabel}</span>
    ${daBtn}
    <span class="forge-edit-banner__hint">Right-click sections · + Add component</span>`;
  document.body.prepend(bar);
  document.documentElement.classList.add('forge-edit-active');
}

function decorateBlock(el, meta) {
  if (el.dataset.forgeEditDecorated) return;
  el.dataset.forgeEditDecorated = '1';
  el.classList.add('forge-edit-block', `forge-edit-block--${meta.category}`);
  el.dataset.forgeComponentType = meta.category;
  el.dataset.forgeBlockId = meta.id;
  const badge = document.createElement('span');
  badge.className = 'forge-edit-badge';
  badge.textContent = `${meta.label} (${meta.category})`;
  el.append(badge);
}

function findBlocks(root) {
  const selectors = Object.keys(BLOCK_REGISTRY)
    .map((c) => `main .${c}, main div.${c}`)
    .join(', ');
  const found = new Set();
  root.querySelectorAll(selectors).forEach((el) => {
    if (!found.has(el)) found.add(el);
  });
  // Every top-level section in main is editable (Franklin default + named blocks).
  root.querySelectorAll('main > div').forEach((section) => {
    if (!found.has(section)) found.add(section);
  });
  return [...found];
}

function insertDropZones(main) {
  main.querySelectorAll('.forge-edit-drop-zone').forEach((z) => z.remove());
  const sections = [...main.children].filter((n) => n.tagName === 'DIV');
  sections.forEach((section, i) => {
    const zone = document.createElement('div');
    zone.className = 'forge-edit-drop-zone';
    zone.dataset.forgeDropIndex = String(i);
    zone.textContent = '+ Add component (saves to Document Authoring)';
    zone.addEventListener('click', () => openAddDialog({ afterIndex: i }));
    section.after(zone);
  });
}

async function insertBlockViaForgeApi(blockId, afterIndex, apiBase) {
  const { org, repo } = resolveOrgRepo();
  const headers = { 'Content-Type': 'application/json' };
  const daToken = resolveDaToken();
  if (daToken) headers['X-Forge-Da-Token'] = daToken;

  const res = await fetch(`${apiBase}/api/inline-edit/insert-block`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      org,
      repo,
      pagePath: currentPagePath(),
      blockId,
      afterIndex,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.hint || `Insert failed (${res.status})`);
  }
  return data;
}

async function insertBlock(blockId, afterIndex) {
  const { org, repo } = resolveOrgRepo();
  if (!org || !repo) {
    showToast('Missing org/repo — add forge-org and forge-repo query params', true);
    return null;
  }

  const apiBase = resolveForgeApiBase();
  if (apiBase) {
    return insertBlockViaForgeApi(blockId, afterIndex, apiBase);
  }

  let token = resolveDaToken();
  if (!token) token = await promptDaToken();
  if (!token) {
    throw new Error('DA token required — sign in on da.live or paste tokenValue');
  }

  const result = await insertBlockOnDaPageClient({
    org,
    repo,
    pagePath: currentPagePath(),
    blockId,
    afterIndex,
    token,
  });
  if (!result.ok && result.needsToken) {
    const retry = await promptDaToken();
    if (retry) {
      return insertBlockOnDaPageClient({
        org,
        repo,
        pagePath: currentPagePath(),
        blockId,
        afterIndex,
        token: retry,
      });
    }
  }
  if (!result.ok) {
    throw new Error(result.error || 'Insert failed');
  }
  return result;
}

function openAddDialog({ afterIndex = -1, anchorEl = null } = {}) {
  document.querySelector('.forge-edit-dialog-backdrop')?.remove();

  const backdrop = document.createElement('div');
  backdrop.className = 'forge-edit-dialog-backdrop';
  const dialog = document.createElement('div');
  dialog.className = 'forge-edit-dialog';
  dialog.innerHTML = `
    <header>Add component</header>
    <div class="dialog-body"></div>
    <footer>
      <button type="button" data-action="cancel">Cancel</button>
    </footer>
  `;
  const body = dialog.querySelector('.dialog-body');

  for (const group of PICKER_GROUPS) {
    const wrap = document.createElement('div');
    wrap.className = 'block-group';
    wrap.innerHTML = `<h4>${group.category}</h4>`;
    for (const id of group.items) {
      const meta = BLOCK_REGISTRY[id];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `block-pick block-pick--${group.category}`;
      btn.textContent = meta?.label || id;
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = 'Saving…';
        try {
          const result = await insertBlock(id, afterIndex);
          backdrop.remove();
          showToast(`Added ${meta?.label || id} — reloading preview…`);
          if (result?.previewUrl) {
            window.location.href = result.previewUrl;
          } else {
            window.location.reload();
          }
        } catch (e) {
          btn.disabled = false;
          btn.textContent = meta?.label || id;
          showToast(e.message || 'Insert failed', true);
        }
      });
      wrap.append(btn);
    }
    body.append(wrap);
  }

  dialog.querySelector('[data-action="cancel"]')?.addEventListener('click', () => backdrop.remove());
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) backdrop.remove();
  });
  backdrop.append(dialog);
  document.body.append(backdrop);
  if (anchorEl) dialog.querySelector('header').textContent += ' (after selection)';
}

let contextMenuEl = null;

function hideContextMenu() {
  contextMenuEl?.remove();
  contextMenuEl = null;
}

function showContextMenu(x, y, blockEl, meta) {
  hideContextMenu();
  const daUrl = daEditUrl(currentPagePath());
  const menu = document.createElement('ul');
  menu.className = 'forge-edit-menu';
  menu.innerHTML = `
    <li data-action="info">${meta.label} · ${meta.category}</li>
    <li class="menu-sep"></li>
    <li data-action="da" ${daUrl ? '' : 'class="disabled"'}>Edit in Document Authoring</li>
    <li data-action="ue">Open DA authoring shell</li>
    <li class="menu-sep"></li>
    <li data-action="add-after">Add component after…</li>
  `;
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  document.body.append(menu);
  contextMenuEl = menu;

  menu.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-action]');
    if (!li || li.classList.contains('disabled')) return;
    const action = li.dataset.action;
    hideContextMenu();
    if (action === 'da' && daUrl) window.open(daUrl, '_blank', 'noopener');
    else if (action === 'ue') {
      const { org, repo } = resolveOrgRepo();
      if (org && repo) window.open(`https://da.live/#/${org}/${repo}`, '_blank', 'noopener');
    } else if (action === 'add-after') {
      const main = document.querySelector('main');
      const sections = main ? [...main.children].filter((n) => n.tagName === 'DIV') : [];
      const idx = sections.indexOf(blockEl.closest('main > div') || blockEl);
      openAddDialog({ afterIndex: idx >= 0 ? idx : -1, anchorEl: blockEl });
    }
  });
}

function onContextMenu(e) {
  const block = e.target.closest('.forge-edit-block');
  if (!block) return;
  e.preventDefault();
  showContextMenu(e.clientX, e.clientY, block, classifyBlock(block));
}

function scanAndDecorate() {
  const main = document.querySelector('main');
  if (!main) return;
  findBlocks(main).forEach((el) => decorateBlock(el, classifyBlock(el)));
  insertDropZones(main);
}

window.addEventListener('message', (e) => {
  if (e.data?.type === 'forge:set-da-token' && e.data.token) {
    try {
      sessionStorage.setItem('forge_da_token', String(e.data.token));
    } catch {
      /* ignore */
    }
  }
});

function maybeRedirectToDaEditor() {
  const q = new URLSearchParams(window.location.search);
  if (q.get('forge-da') !== '1') return;
  const url = daEditUrl(currentPagePath());
  if (url) window.location.replace(url);
}

function init() {
  if (!isEditMode()) return;
  maybeRedirectToDaEditor();
  showBanner();
  scanAndDecorate();
  document.addEventListener('contextmenu', onContextMenu);
  document.addEventListener('click', () => hideContextMenu());

  const main = document.querySelector('main');
  if (main) {
    const obs = new MutationObserver(() => scanAndDecorate());
    obs.observe(main, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-block-status', 'class'],
    });
  }
  window.addEventListener('load', () => setTimeout(scanAndDecorate, 500));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
