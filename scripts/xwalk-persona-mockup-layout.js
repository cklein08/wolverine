/**
 * Persona offer pages: hide promo chrome, fix layout when HLX flattens fragment HTML.
 */

const FAMILY_LINE_RE = /^(\d+(?:st|nd|rd|th) line)\b/i;

function isFamilyCtaParagraph(p) {
  const a = p?.querySelector?.('a');
  return a && /shop\s*now/i.test(a.textContent || '');
}

function isFamilyLineParagraph(p) {
  return p?.tagName === 'P' && FAMILY_LINE_RE.test((p.textContent || '').trim());
}

function lineLabelFromParagraph(p) {
  const m = (p.textContent || '').trim().match(FAMILY_LINE_RE);
  return m ? m[1] : '';
}

function priceHtmlFromParagraph(p) {
  const del = p.querySelector('del');
  const strong = p.querySelector('strong');
  const em = p.querySelector('em');
  if (!del && !strong) {
    const m = (p.textContent || '').match(/\$\d+/);
    return m ? `<span class="xwalk-family-now">${m[0]}</span>` : '';
  }
  const was = del ? del.textContent.trim() : '';
  const now = strong ? strong.textContent.trim() : '';
  const off = em ? em.textContent.trim() : '';
  return `<span class="xwalk-family-price"><s class="xwalk-family-was">${was}</s> <strong class="xwalk-family-now">${now}</strong>${off ? ` <em class="xwalk-family-off">${off}</em>` : ''}</span>`;
}

function pillToneForRow(rowIndex) {
  return rowIndex < 2 ? 'dark' : 'accent';
}

function buildFamilyRowHtml(rowIndex, label, priceHtml, pillText) {
  const band = rowIndex % 2 === 0 ? 'a' : 'b';
  const tone = pillToneForRow(rowIndex);
  return `<div class="xwalk-family-row xwalk-family-row--${band}">
  <span class="xwalk-family-line-label">${label}</span>
  <span class="xwalk-family-line-price">${priceHtml}</span>
  <p class="xwalk-family-pill xwalk-family-pill--${tone}">${pillText}</p>
</div>`;
}

function parseFamilyOffers(section) {
  const nodes = [...section.children];
  const heroPicture = section.querySelector('picture');
  const offers = [];
  let i = 0;

  while (i < nodes.length) {
    const node = nodes[i];
    if (node.tagName !== 'H2') {
      i += 1;
      continue;
    }
    const title = node.textContent.trim();
    const rows = [];
    let ctaHref = '/plans';
    i += 1;
    while (i < nodes.length && nodes[i].tagName !== 'H2') {
      const el = nodes[i];
      if (el.tagName === 'P' && isFamilyCtaParagraph(el)) {
        ctaHref = el.querySelector('a')?.getAttribute('href') || ctaHref;
        i += 1;
        break;
      }
      if (el.tagName === 'P' && isFamilyLineParagraph(el)) {
        const label = lineLabelFromParagraph(el);
        const priceHtml = priceHtmlFromParagraph(el);
        i += 1;
        let pillText = '';
        if (i < nodes.length && nodes[i].tagName === 'P' && !isFamilyLineParagraph(nodes[i]) && !isFamilyCtaParagraph(nodes[i])) {
          pillText = nodes[i].textContent.trim();
          i += 1;
        }
        rows.push({ label, priceHtml, pillText });
        continue;
      }
      i += 1;
    }
    if (rows.length) offers.push({ title, rows, ctaHref });
  }

  return { heroPicture, offers };
}

function buildFamilyPlansDom(doc, section, parsed) {
  const { heroPicture, offers } = parsed;
  const root = doc.createElement('div');
  root.className = 'xwalk-persona-mockup xwalk-family-plans-page';
  root.dataset.personaId = 'family-texas';

  if (heroPicture) {
    const hero = doc.createElement('figure');
    hero.className = 'xwalk-family-hero';
    const img = heroPicture.querySelector('img');
    const figureImg = doc.createElement('img');
    if (img) {
      figureImg.src = img.currentSrc || img.src;
      figureImg.alt = img.alt || 'Texas family outdoors';
      figureImg.loading = 'eager';
      figureImg.decoding = 'async';
    }
    hero.append(figureImg);
    root.append(hero);
  }

  const main = doc.createElement('section');
  main.className = 'xwalk-family-main';
  const wrap = doc.createElement('div');
  wrap.className = 'xwalk-family-offers';

  offers.forEach((offer, offerIndex) => {
    const shell = doc.createElement('div');
    shell.className = 'xwalk-family-offer';
    if (offerIndex > 0) {
      shell.hidden = true;
      shell.style.display = 'none';
    }

    const h2 = doc.createElement('h2');
    h2.className = 'xwalk-family-title';
    h2.textContent = offer.title;
    shell.append(h2);

    const grid = doc.createElement('div');
    grid.className = 'xwalk-family-grid';
    offer.rows.forEach((row, idx) => {
      grid.insertAdjacentHTML('beforeend', buildFamilyRowHtml(idx, row.label, row.priceHtml, row.pillText));
    });
    shell.append(grid);

    const ctaWrap = doc.createElement('p');
    ctaWrap.className = 'xwalk-family-cta-wrap';
    ctaWrap.innerHTML = `<a class="xwalk-family-cta" href="${offer.ctaHref}">Shop Now →</a>`;
    shell.append(ctaWrap);

    wrap.append(shell);
  });

  main.append(wrap);
  root.append(main);
  return root;
}

export function decorateFamilyTexasPage(doc = document) {
  const path = (doc.location?.pathname || '').replace(/\/$/, '');
  if (path !== '/family-texas') return false;

  doc.body?.classList.add('xwalk-persona-offer-page', 'xwalk-persona-offer-page--family-texas');

  if (doc.querySelector('.xwalk-family-plans-page')) {
    return true;
  }

  const section = doc.querySelector('main > div');
  if (!section) return false;

  const parsed = parseFamilyOffers(section);
  if (!parsed.offers.length) return false;

  const built = buildFamilyPlansDom(doc, section, parsed);
  section.replaceChildren(built);

  const main = doc.querySelector('main');
  if (main && !main.dataset.xwalkPersonaMockup) {
    main.dataset.xwalkPersonaMockup = '1';
    main.style.display = 'block';
    main.style.maxWidth = 'none';
    main.style.padding = '0';
    main.style.background = '#fff';
  }

  doc.querySelectorAll('header .xwalk-promo-strip, .fragment.xwalk-promo-strip').forEach((el) => {
    el.style.display = 'none';
  });

  return true;
}

export function decoratePersonaMockupPage(doc = document) {
  if (decorateFamilyTexasPage(doc)) return;

  const mockup = doc.querySelector('.xwalk-persona-mockup');
  if (!mockup) return;

  doc.body?.classList.add('xwalk-persona-offer-page');

  const path = (doc.location?.pathname || '').replace(/\/$/, '');
  if (/^\/(family-texas|single-woman-nyc|college-student)$/.test(path)) {
    doc.body.classList.add(`xwalk-persona-offer-page--${path.slice(1)}`);
  }

  doc.querySelectorAll('header .xwalk-promo-strip, .fragment.xwalk-promo-strip').forEach((el) => {
    el.style.display = 'none';
  });

  const main = doc.querySelector('main');
  if (main && !main.dataset.xwalkPersonaMockup) {
    main.dataset.xwalkPersonaMockup = '1';
    main.style.display = 'block';
    main.style.maxWidth = 'none';
    main.style.padding = '0';
    main.style.background = '#fff';
  }

  mockup.querySelectorAll('[data-forge-variant][hidden]').forEach((el) => {
    el.hidden = true;
    el.style.display = 'none';
  });
  const first = mockup.querySelector('[data-forge-variant]');
  if (first) {
    first.hidden = false;
    first.style.display = '';
  }
}

if (typeof document !== 'undefined') {
  const run = () => decoratePersonaMockupPage();
  run();
  document.addEventListener('DOMContentLoaded', run);
  document.addEventListener('aem:loaded', run);
  new MutationObserver(() => {
    if (decorateFamilyTexasPage(document)) return;
  }).observe(document.documentElement, { childList: true, subtree: true });
}
