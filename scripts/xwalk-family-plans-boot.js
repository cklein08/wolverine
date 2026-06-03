/** Family BYOD page — inject grid CSS + rebuild DOM (HLX strips classes). */
(function () {
  const PRIMARY = '#1DB954';
  const SECONDARY = '#0E7A3A';
  const MINT_PAGE = '#eef8f1';
  const MINT_ROW = '#f3fbf6';
  const MINT_PILL = '#d8f3e0';
  const DARK_PILL = '#1a1a1a';
  const LINE_RE = /^(\d+(?:st|nd|rd|th) line|Phone|Plan|Talk|Data boost|Hotspot|Global roaming)\b/i;

  function injectCss() {
    if (document.getElementById('forge-family-plans')) return;
    const s = document.createElement('style');
    s.id = 'forge-family-plans';
    s.textContent = document.getElementById('forge-family-plans-data')?.textContent || '';
    if (!s.textContent) {
      s.textContent = [
        '.xwalk-family-plans-page{background:' + MINT_PAGE + '!important;width:100%!important}',
        '.xwalk-family-row{display:grid!important;grid-template-columns:92px 168px minmax(0,1fr)!important;gap:12px 32px!important;align-items:center!important;padding:22px 28px!important;background:' + MINT_ROW + '!important;width:100%!important}',
        '.xwalk-family-line-label{font-weight:800!important;color:#111!important}',
        '.xwalk-family-line-price{font-weight:900!important;font-size:1.4rem!important;color:' + PRIMARY + '!important}',
        '.xwalk-family-pill--dark{background:' + DARK_PILL + '!important;color:#fff!important;border-radius:999px!important;padding:14px 24px!important;text-align:center!important;width:100%!important}',
        '.xwalk-family-pill--accent{background:' + MINT_PILL + '!important;color:' + SECONDARY + '!important;border:1px solid ' + PRIMARY + '!important;border-radius:999px!important;padding:14px 24px!important;text-align:center!important;width:100%!important;font-weight:700!important}',
        '.xwalk-family-title{color:' + PRIMARY + '!important;font-family:Arial Black,Arial,sans-serif!important;font-size:1.65rem!important;font-weight:900!important}',
        '.xwalk-family-cta{display:inline-block!important;background:' + PRIMARY + '!important;color:#fff!important;font-size:1.625rem!important;font-weight:900!important;padding:20px 56px!important;border-radius:14px!important;text-decoration:none!important}',
        '.xwalk-family-cta-wrap{text-align:center!important;margin:40px 0 0!important}',
        'body.xwalk-persona-offer-page--family-texas main,body.xwalk-persona-offer-page--college-student main,body.xwalk-persona-offer-page--single-woman-nyc main{background:' + MINT_PAGE + '!important;display:block!important;max-width:none!important;padding:0!important}',
      ].join('');
    }
    document.head.appendChild(s);
  }

  function paintRow(row, idx) {
    row.style.cssText =
      'display:grid;grid-template-columns:92px 168px minmax(0,1fr);gap:12px 32px;align-items:center;padding:22px 28px;background:' +
      MINT_ROW +
      ';width:100%;box-sizing:border-box;';
    row.querySelector('.xwalk-family-line-label')?.style.setProperty('color', '#111', 'important');
    row.querySelector('.xwalk-family-line-label')?.style.setProperty('font-weight', '800', 'important');
    const price = row.querySelector('.xwalk-family-line-price');
    if (price) price.style.cssText = 'font-weight:900;font-size:1.4rem;color:' + PRIMARY + ';';
    const pill = row.querySelector('.xwalk-family-pill');
    if (pill) {
      if (idx < 2) pill.style.cssText = 'margin:0;padding:14px 24px;border-radius:999px;text-align:center;width:100%;background:' + DARK_PILL + ';color:#fff;font-size:0.8125rem;line-height:1.4;';
      else pill.style.cssText = 'margin:0;padding:14px 24px;border-radius:999px;text-align:center;width:100%;background:' + MINT_PILL + ';color:' + SECONDARY + ';font-weight:700;border:1px solid ' + PRIMARY + ';font-size:0.8125rem;line-height:1.4;';
    }
  }

  function isCta(p) {
    return p?.tagName === 'P' && p.querySelector('a') && /shop\s*now/i.test(p.textContent || '');
  }
  function isLine(p) {
    const t = (p.textContent || '').trim();
    return p?.tagName === 'P' && LINE_RE.test(t);
  }

  function lineLabel(p) {
    const t = (p.textContent || '').trim();
    const m = t.match(LINE_RE);
    return m ? m[1] : t.split(/\s+\$/)[0].trim();
  }

  function build(section) {
    const nodes = [...section.children];
    const offers = [];
    let headline = 'Keep your family connected';
    let i = 0;
    while (i < nodes.length) {
      if (nodes[i].tagName === 'H1') {
        headline = nodes[i].textContent.trim() || headline;
        i += 1;
        continue;
      }
      if (nodes[i].tagName === 'P' && nodes[i].querySelector('picture') && !nodes[i].querySelector('a[href="/"]')) {
        i += 1;
        continue;
      }
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
          const label = lineLabel(el);
          const del = el.querySelector('del');
          const strong = el.querySelector('strong');
          const em = el.querySelector('em');
          let priceHtml;
          if (!del && !strong) {
            const m = (el.textContent || '').match(/\$\d+/);
            priceHtml = '<span class="xwalk-family-now">' + (m ? m[0] : '') + '</span>';
          } else {
            priceHtml =
              '<span class="xwalk-family-price"><s class="xwalk-family-was">' +
              del.textContent +
              '</s> <strong class="xwalk-family-now">' +
              strong.textContent +
              '</strong>' +
              (em ? ' <em class="xwalk-family-off">' + em.textContent + '</em>' : '') +
              '</span>';
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
    root.className = 'xwalk-family-plans-page';
    root.style.cssText = 'background:' + MINT_PAGE + ';width:100%;';
    const main = document.createElement('section');
    main.className = 'xwalk-family-main';
    main.style.cssText = 'background:' + MINT_PAGE + ';padding:36px 40px 56px;max-width:1040px;margin:0 auto;';
    const h1 = document.createElement('h1');
    h1.className = 'xwalk-family-headline';
    h1.textContent = headline;
    h1.style.cssText =
      'margin:0 0 24px;font-family:Arial Black,Arial,sans-serif;font-size:1.75rem;font-weight:900;color:' +
      PRIMARY +
      ';';
    main.append(h1);
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
        rowEl.innerHTML =
          '<span class="xwalk-family-line-label">' +
          row.label +
          '</span><span class="xwalk-family-line-price">' +
          row.priceHtml +
          '</span><p class="xwalk-family-pill xwalk-family-pill--' +
          (ri < 2 ? 'dark' : 'accent') +
          '">' +
          row.pill +
          '</p>';
        grid.append(rowEl);
        paintRow(rowEl, ri);
      });
      shell.append(grid);
      const ctaWrap = document.createElement('p');
      ctaWrap.className = 'xwalk-family-cta-wrap';
      ctaWrap.innerHTML = '<a class="xwalk-family-cta" href="' + offer.cta + '">Shop Now →</a>';
      shell.append(ctaWrap);
      main.append(shell);
    });
    root.append(main);
    return root;
  }

  function run() {
    const path = (location.pathname || '').replace(/\/$/, '');
    if (path !== '/family-texas' && path !== '/college-student' && path !== '/single-woman-nyc') return;
    const personaId = path.slice(1);
    injectCss();
    document.body.classList.add('xwalk-persona-offer-page', 'xwalk-persona-offer-page--' + personaId);
    const main = document.querySelector('main');
    if (main) {
      main.classList.remove('xwalk-boost-main');
      main.style.cssText = 'display:block;max-width:none;padding:0;background:' + MINT_PAGE + ';';
    }
    if (document.querySelector('.xwalk-family-plans-page .xwalk-family-grid')) {
      document.querySelectorAll('.xwalk-family-row').forEach((r, i) => paintRow(r, i));
      return;
    }
    const section =
      document.querySelector('main > .section > div') ||
      document.querySelector('main > div') ||
      document.querySelector('.xwalk-family-plans > div > div');
    if (!section || !section.querySelector('h2')) return;
    if (section.querySelector('.xwalk-family-grid')) return;
    const built = build(section);
    section.replaceChildren(built);
  }

  function schedule() {
    run();
  }

  document.addEventListener('DOMContentLoaded', schedule);
  document.addEventListener('aem:loaded', schedule);
  for (const ms of [0, 100, 400, 800, 1500, 3000, 5000]) setTimeout(schedule, ms);

  const main = document.querySelector('main');
  if (main) {
    new MutationObserver(() => schedule()).observe(main, { childList: true, subtree: true });
  }
})();
