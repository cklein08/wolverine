/**
 * Boost footer layout when HLX/DA flattens footer.html (no xwalk-* classes).
 */
(function () {
  const PRIMARY = '#1DB954';
  const SOCIAL_ICON = { Facebook: 'f', X: 'X', Instagram: 'ig', YouTube: '▶' };

  function footerRoot() {
    return document.querySelector('footer .footer') || document.querySelector('footer');
  }

  function paintSocialLink(a) {
    const href = a.getAttribute('href') || '';
    const label = (a.getAttribute('aria-label') || a.textContent || '').trim();
    let key = Object.keys(SOCIAL_ICON).find((k) => label.toLowerCase().includes(k.toLowerCase()));
    if (!key && /facebook/i.test(href)) key = 'Facebook';
    if (!key && /twitter|x\.com/i.test(href)) key = 'X';
    if (!key && /instagram/i.test(href)) key = 'Instagram';
    if (!key && /youtube/i.test(href)) key = 'YouTube';
    const glyph = key ? SOCIAL_ICON[key] : label.slice(0, 2) || '•';
    if (key) a.setAttribute('aria-label', key);
    a.innerHTML = `<span aria-hidden="true">${glyph}</span>`;
    a.style.cssText =
      'display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:#1a1a1a;color:#fff;font-weight:800;font-size:0.8125rem;text-decoration:none;line-height:1;';
  }

  function splitLinkColumns(section) {
    const nodes = [...section.children];
    const groups = [];
    let group = null;
    for (const el of nodes) {
      if (el.tagName === 'P' && el.querySelector('strong')) {
        if (group) groups.push(group);
        group = { title: el, nodes: [] };
        continue;
      }
      if (group) group.nodes.push(el);
    }
    if (group) groups.push(group);

    const byTitle = new Map(groups.map((g) => [g.title.textContent.trim().toLowerCase(), g]));
    const support = byTitle.get('support');
    const legal = byTitle.get('legal');
    if (support && legal) {
      support.nodes.push(...legal.nodes);
      byTitle.delete('legal');
    }

    const order = ['shop', 'plans', 'about', 'support'];
    const picked = order.map((k) => byTitle.get(k)).filter(Boolean);
    if (!picked.length) return false;

    const grid = document.createElement('div');
    grid.className = 'xwalk-footer-columns';
    grid.style.cssText =
      'display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:28px 32px;padding:32px 0 28px;width:100%;box-sizing:border-box;';

    picked.forEach(({ title, nodes }) => {
      const col = document.createElement('div');
      col.className = 'xwalk-footer-col';
      title.style.cssText = 'margin:0 0 12px;font-family:Arial Black,Arial,sans-serif;font-size:0.8125rem;letter-spacing:0.06em;text-transform:uppercase;';
      col.append(title, ...nodes);
      nodes.forEach((n) => {
        if (n.tagName === 'UL') {
          n.style.cssText = 'list-style:none;padding:0;margin:0;';
          n.querySelectorAll('li').forEach((li) => {
            li.style.margin = '0 0 8px';
          });
        }
      });
      grid.append(col);
    });

    section.replaceChildren(grid);
    return true;
  }

  function decorateTop(section) {
    const socialLabel = [...section.querySelectorAll('p')].find((p) =>
      /connect with us on social/i.test(p.textContent || ''),
    );
    const socialUl = section.querySelector('ul');
    if (!socialLabel || !socialUl) return;

    const brandPs = [...section.querySelectorAll(':scope > p')].filter(
      (p) => p !== socialLabel && !p.querySelector('ul'),
    );

    const top = document.createElement('div');
    top.className = 'xwalk-footer-top';
    top.style.cssText =
      'display:grid;grid-template-columns:1fr auto;align-items:start;gap:24px 40px;padding:32px 0 28px;border-bottom:1px solid color-mix(in srgb,#86EFAC 20%,transparent);width:100%;box-sizing:border-box;';

    const brand = document.createElement('div');
    brand.className = 'xwalk-footer-top-brand';
    brand.style.maxWidth = '360px';
    brandPs.forEach((p) => brand.append(p));

    const socialWrap = document.createElement('div');
    socialWrap.className = 'xwalk-footer-top-social';
    socialWrap.style.textAlign = 'right';
    socialLabel.style.cssText =
      'margin:0 0 12px;font-size:0.875rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;';
    socialUl.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px;list-style:none;padding:0;margin:0;';
    socialUl.querySelectorAll('a').forEach(paintSocialLink);
    socialWrap.append(socialLabel, socialUl);

    top.append(brand, socialWrap);
    section.replaceChildren(top);
  }

  function decorateNewsletter(section) {
    const h2 = section.querySelector('h2');
    if (!h2 || !/scoop/i.test(h2.textContent || '')) return;

    section.className = 'xwalk-footer-newsletter';
    section.style.cssText =
      'padding:28px 0 32px;border-top:1px solid color-mix(in srgb,#86EFAC 18%,transparent);border-bottom:1px solid color-mix(in srgb,#86EFAC 18%,transparent);text-align:left;max-width:none;margin:0;';

    const desc = section.querySelector('p:not(.xwalk-footer-newsletter-form)');
    if (desc) desc.style.margin = '0 0 20px';

    const oldForm = [...section.querySelectorAll('p')].find((p) => p !== desc && /subscribe|email/i.test(p.textContent || ''));
    if (!oldForm) return;

    const form = document.createElement('p');
    form.className = 'xwalk-footer-newsletter-form';
    form.style.cssText = 'display:flex;flex-wrap:nowrap;align-items:stretch;gap:12px;margin:0;';

    const label = document.createElement('label');
    label.htmlFor = 'xwalk-footer-email';
    label.textContent = 'Email address';
    label.style.cssText =
      'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;';

    const input = document.createElement('input');
    input.type = 'email';
    input.id = 'xwalk-footer-email';
    input.name = 'email';
    input.placeholder = 'Email address';
    input.autocomplete = 'email';
    input.style.cssText =
      'flex:0 1 25%;width:25%;min-width:160px;max-width:280px;padding:12px 16px;border:1px solid color-mix(in srgb,#fff 35%,transparent);border-radius:4px;background:#0A1A0F;color:#fff;font-size:1rem;box-sizing:border-box;';

    const sub = document.createElement('a');
    sub.href = oldForm.querySelector('a[href]')?.getAttribute('href') || '/customer/login';
    sub.className = 'xwalk-footer-subscribe-btn';
    sub.textContent = 'Subscribe';
    sub.style.cssText =
      `display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;padding:12px 28px;background:${PRIMARY};color:#000;font-weight:800;text-decoration:none;border-radius:4px;font-size:0.9375rem;white-space:nowrap;`;

    form.append(label, input, sub);
    oldForm.replaceWith(form);
  }

  function run() {
    const root = footerRoot();
    if (!root || root.dataset.xwalkFooterBoost === '1') return;

    const sections = [...root.querySelectorAll(':scope > div')];
    if (sections.length < 2) return;

    decorateTop(sections[0]);
    splitLinkColumns(sections[1]);
    if (sections[2]) decorateNewsletter(sections[2]);
    if (sections[3]) {
      sections[3].className = 'xwalk-footer-legal';
      sections[3].style.textAlign = 'center';
    }

    root.style.maxWidth = '1280px';
    root.style.margin = '0 auto';
    root.style.padding = '0 32px 32px';
    root.style.boxSizing = 'border-box';
    root.dataset.xwalkFooterBoost = '1';
    document.documentElement.classList.add('xwalk-footer-boost-ready');
  }

  function schedule() {
    run();
  }

  globalThis.xwalkFooterBoostDecorate = run;

  document.addEventListener('DOMContentLoaded', schedule);
  document.addEventListener('aem:loaded', schedule);
  for (const ms of [0, 200, 600, 1200, 2500, 5000]) setTimeout(schedule, ms);

  const footer = document.querySelector('footer');
  if (footer) {
    new MutationObserver(() => schedule()).observe(footer, { childList: true, subtree: true });
  }
})();
