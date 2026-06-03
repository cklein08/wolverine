/**
 * Family BYOD landing grid — runs from scripts.js after decorateBlocks.
 */

const PRIMARY = '#1DB954';
const SECONDARY = '#0E7A3A';
const MINT_PAGE = '#eef8f1';
const MINT_ROW = '#f3fbf6';
const MINT_PILL = '#d8f3e0';
const DARK_PILL = '#1a1a1a';
const LINE_RE = /^(\d+(?:st|nd|rd|th) line)\b/i;

function isFamilyPage() {
  return /family-texas/.test((window.location?.pathname || '').replace(/\/$/, ''));
}

function injectFamilyStyles(doc) {
  if (doc.getElementById('forge-family-plans-live')) return;
  const style = doc.createElement('style');
  style.id = 'forge-family-plans-live';
  style.textContent = `
.xwalk-family-plans-page{background:${MINT_PAGE}!important;width:100%!important}
.xwalk-family-row{display:grid!important;grid-template-columns:92px 168px minmax(0,1fr)!important;gap:12px 32px!important;align-items:center!important;padding:22px 28px!important;background:${MINT_ROW}!important;width:100%!important;box-sizing:border-box!important}
.xwalk-family-line-label{font-weight:800!important;color:#111!important;font-size:1.0625rem!important}
.xwalk-family-line-price{font-weight:900!important;font-size:1.4rem!important;color:${PRIMARY}!important}
.xwalk-family-was{text-decoration:line-through!important;color:${PRIMARY}!important}
.xwalk-family-now{color:${PRIMARY}!important;font-weight:900!important}
.xwalk-family-off{font-style:italic!important;color:${SECONDARY}!important;margin-left:6px!important}
.xwalk-family-pill--dark{background:${DARK_PILL}!important;color:#fff!important;border-radius:999px!important;padding:14px 24px!important;text-align:center!important;margin:0!important;width:100%!important;box-sizing:border-box!important;font-size:0.8125rem!important;line-height:1.4!important}
.xwalk-family-pill--accent{background:${MINT_PILL}!important;color:${SECONDARY}!important;border:1px solid ${PRIMARY}!important;border-radius:999px!important;padding:14px 24px!important;text-align:center!important;margin:0!important;font-weight:700!important;width:100%!important;box-sizing:border-box!important;font-size:0.8125rem!important;line-height:1.4!important}
.xwalk-family-title{color:${PRIMARY}!important;font-family:"Arial Black",Arial,sans-serif!important;font-size:1.65rem!important;font-weight:900!important;margin:0 0 28px!important}
.xwalk-family-main{background:${MINT_PAGE}!important;padding:36px 40px 56px!important;max-width:1040px!important;margin:0 auto!important}
.xwalk-family-cta{display:inline-block!important;background:${PRIMARY}!important;color:#fff!important;font-size:1.625rem!important;font-weight:900!important;padding:20px 56px!important;border-radius:14px!important;text-decoration:none!important;font-family:"Arial Black",Arial,sans-serif!important}
.xwalk-family-cta-wrap{text-align:center!important;margin:40px 0 0!important}
body.xwalk-persona-offer-page--family-texas main{display:block!important;max-width:none!important;padding:0!important;background:${MINT_PAGE}!important;grid-template-columns:1fr!important}
`.trim();
  doc.head.appendChild(style);
}

function paintRow(row, idx) {
  row.style.cssText = `display:grid;grid-template-columns:92px 168px minmax(0,1fr);gap:12px 32px;align-items:center;padding:22px 28px;background:${MINT_ROW};width:100%;box-sizing:border-box;`;
  row.querySelector('.xwalk-family-line-label')?.style.setProperty('color', '#111', 'important');
  row.querySelector('.xwalk-family-line-label')?.style.setProperty('font-weight', '800', 'important');
  row.querySelector('.xwalk-family-line-price')?.style.setProperty('color', PRIMARY, 'important');
  const pill = row.querySelector('.xwalk-family-pill');
  if (pill) {
    pill.style.cssText =
      idx < 2
        ? `margin:0;padding:14px 24px;border-radius:999px;text-align:center;width:100%;background:${DARK_PILL};color:#fff;font-size:0.8125rem;line-height:1.4;box-sizing:border-box;`
        : `margin:0;padding:14px 24px;border-radius:999px;text-align:center;width:100%;background:${MINT_PILL};color:${SECONDARY};font-weight:700;border:1px solid ${PRIMARY};font-size:0.8125rem;line-height:1.4;box-sizing:border-box;`;
  }
}

function isCta(p) {
  return p?.tagName === 'P' && p.querySelector('a') && /shop\s*now/i.test(p.textContent || '');
}
function isLine(p) {
  return p?.tagName === 'P' && LINE_RE.test((p.textContent || '').trim());
}

function buildFromSection(section) {
  const nodes = [...section.children];
  const heroPic = section.querySelector('picture');
  const offers = [];
  let i = 0;
  while (i < nodes.length) {
    if (nodes[i].tagName !== 'H2') {
      i += 1;
      continue;
    }
    const title = nodes[i].textContent.trim();
    const rows = [];
    let cta = '/plans';
    i += 1;
    while (i < nodes.length && nodes[i].tagName !== 'H2') {
      const el = nodes[i];
      if (isCta(el)) {
        cta = el.querySelector('a')?.getAttribute('href') || cta;
        i += 1;
        break;
      }
      if (isLine(el)) {
        const label = (el.textContent || '').trim().match(LINE_RE)?.[1] || '';
        const del = el.querySelector('del');
        const strong = el.querySelector('strong');
        const em = el.querySelector('em');
        let priceHtml;
        if (!del && !strong) {
          const m = (el.textContent || '').match(/\$\d+/);
          priceHtml = `<span class="xwalk-family-now">${m ? m[0] : ''}</span>`;
        } else {
          priceHtml = `<span class="xwalk-family-price"><s class="xwalk-family-was">${del.textContent}</s> <strong class="xwalk-family-now">${strong.textContent}</strong>${em ? ` <em class="xwalk-family-off">${em.textContent}</em>` : ''}</span>`;
        }
        i += 1;
        let pill = '';
        if (i < nodes.length && nodes[i].tagName === 'P' && !isLine(nodes[i]) && !isCta(nodes[i])) {
          pill = nodes[i].textContent.trim();
          i += 1;
        }
        rows.push({ label, priceHtml, pill });
        continue;
      }
      i += 1;
    }
    if (rows.length) offers.push({ title, rows, cta });
  }

  const root = document.createElement('div');
  root.className = 'xwalk-persona-mockup xwalk-family-plans-page';
  if (heroPic) {
    const fig = document.createElement('figure');
    fig.className = 'xwalk-family-hero';
    const img = heroPic.querySelector('img');
    if (img) {
      const ni = document.createElement('img');
      ni.src = img.currentSrc || img.src;
      ni.alt = img.alt || '';
      ni.style.cssText = 'display:block;width:100%;max-height:400px;object-fit:cover;';
      fig.append(ni);
    }
    root.append(fig);
  }
  const wrap = document.createElement('section');
  wrap.className = 'xwalk-family-main';
  wrap.style.background = MINT_PAGE;

  offers.forEach((offer, oi) => {
    const shell = document.createElement('div');
    shell.className = 'xwalk-family-offer';
    if (oi > 0) shell.hidden = true;
    const h2 = document.createElement('h2');
    h2.className = 'xwalk-family-title';
    h2.textContent = offer.title;
    if (oi === 0) h2.id = 'family-plans--bring-your-own-device';
    shell.append(h2);
    const grid = document.createElement('div');
    grid.className = 'xwalk-family-grid';
    offer.rows.forEach((row, ri) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'xwalk-family-row';
      rowEl.innerHTML = `<span class="xwalk-family-line-label">${row.label}</span><span class="xwalk-family-line-price">${row.priceHtml}</span><p class="xwalk-family-pill xwalk-family-pill--${ri < 2 ? 'dark' : 'accent'}">${row.pill}</p>`;
      grid.append(rowEl);
      paintRow(rowEl, ri);
    });
    shell.append(grid);
    const ctaP = document.createElement('p');
    ctaP.className = 'xwalk-family-cta-wrap';
    ctaP.innerHTML = `<a class="xwalk-family-cta" href="${offer.cta}">Shop Now →</a>`;
    shell.append(ctaP);
    wrap.append(shell);
  });
  root.append(wrap);
  return root;
}

function findContentRoot(main) {
  if (main.querySelector('.xwalk-family-plans-page .xwalk-family-grid')) return null;
  const roots = [
    ...main.querySelectorAll('.xwalk-family-plans .default-content-wrapper'),
    ...main.querySelectorAll('.xwalk-family-plans > div > div'),
    ...main.querySelectorAll(':scope > .section > div > div'),
    ...main.querySelectorAll(':scope > .section > div'),
    ...main.querySelectorAll(':scope > div'),
  ];
  for (const el of roots) {
    if (el.querySelector('#family-plans--bring-your-own-device, h2')) return el;
    if (/family plans/i.test(el.textContent || '') && el.querySelector('picture, h2')) return el;
  }
  return null;
}

/** @param {HTMLElement} main */
export function decorateFamilyTexasMain(main) {
  if (!isFamilyPage() || !main) return;

  injectFamilyStyles(document);
  document.body.classList.add('xwalk-persona-offer-page', 'xwalk-persona-offer-page--family-texas');
  main.classList.remove('xwalk-boost-main');
  main.style.display = 'block';
  main.style.maxWidth = 'none';
  main.style.padding = '0';
  main.style.background = MINT_PAGE;

  const existing = main.querySelector('.xwalk-family-plans-page');
  if (existing?.querySelector('.xwalk-family-grid')) {
    existing.querySelectorAll('.xwalk-family-row').forEach((r, i) => paintRow(r, i));
    return;
  }

  const section = findContentRoot(main);
  if (!section || section.querySelector('.xwalk-family-grid')) return;

  const built = buildFromSection(section);
  const host = section.closest('.default-content-wrapper') || section;
  host.replaceChildren(built);

  const block = main.querySelector('.xwalk-family-plans');
  if (block) block.classList.add('xwalk-family-plans-ready');
}
