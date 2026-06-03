/**
 * Boost footer layout when HLX/DA flattens footer.html (no xwalk-* classes).
 */
(function () {
  const PRIMARY = '#1DB954';
  const TEXT = '#ffffff';
  const SOCIAL_ICON = { Facebook: 'f', X: 'X', Instagram: 'ig', YouTube: '▶' };

  function footerWrap() {
    const all = document.querySelectorAll('footer .footer');
    for (const el of all) {
      if (el.querySelector(':scope > .section')) return el;
    }
    return all[all.length - 1] || null;
  }

  function footerHost() {
    const wrap = footerWrap();
    if (!wrap) return null;
    return (
      wrap.querySelector('main.xwalk-footer-boost, main.xwalk-footer, main') || wrap
    );
  }

  function sectionContent(section) {
    return section.querySelector('.default-content-wrapper') || section;
  }

  function sectionDivs(host) {
    const sections = [...host.children].filter(
      (el) => el.tagName === 'DIV' && el.classList.contains('section'),
    );
    if (sections.length) return sections;
    return [...host.children].filter((el) => el.tagName === 'DIV');
  }

  function showFooterContent() {
    document.querySelectorAll('footer .footer').forEach((el) => {
      el.style.visibility = 'visible';
      el.style.opacity = '1';
    });
    const block = document.querySelector('footer .footer.block[data-block-status="loaded"]');
    block?.querySelectorAll('.footer').forEach((el) => {
      el.style.visibility = 'visible';
      el.style.opacity = '1';
    });
  }

  function fixLogos(scope) {
    scope.querySelectorAll('.xwalk-footer-brand, .xwalk-footer-top-brand').forEach((brand) => {
      brand.style.overflow = 'visible';
      brand.style.maxWidth = 'none';
    });
    scope.querySelectorAll('.xwalk-footer-brand img, .xwalk-footer-top-brand img, picture img').forEach((img) => {
      const pic = img.closest('picture');
      if (pic) {
        pic.style.cssText = 'display:block;line-height:0;overflow:visible;max-width:100%;';
      }
      img.style.cssText =
        'display:block!important;height:auto!important;width:auto!important;max-width:220px!important;max-height:72px!important;object-fit:contain!important;object-position:left center!important;';
      img.removeAttribute('height');
    });
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

  function paintSocial(scope) {
    scope.querySelectorAll('.xwalk-footer-social a, ul a[href*="facebook"], ul a[href*="twitter"], ul a[href*="instagram"], ul a[href*="youtube"]').forEach(paintSocialLink);
  }

  function styleColumnsGrid(grid) {
    grid.className = 'xwalk-footer-columns';
    grid.style.cssText =
      'display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:28px 32px!important;padding:32px 0 28px!important;width:100%!important;box-sizing:border-box!important;visibility:visible!important;opacity:1!important;';
    grid.querySelectorAll('.xwalk-footer-col').forEach((col) => {
      col.style.cssText = 'visibility:visible!important;opacity:1!important;color:' + TEXT + '!important;';
      col.querySelectorAll('a').forEach((a) => {
        a.style.color = 'rgba(255,255,255,0.92)';
      });
    });
  }

  function splitFlatColumns(section) {
    const content = sectionContent(section);
    if (content.querySelector('.xwalk-footer-columns')) {
      styleColumnsGrid(content.querySelector('.xwalk-footer-columns'));
      return true;
    }

    const nodes = [...content.children];
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
    if (!groups.length) return false;

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
    picked.forEach(({ title, nodes }) => {
      const col = document.createElement('div');
      col.className = 'xwalk-footer-col';
      title.style.cssText =
        'margin:0 0 12px;font-family:Arial Black,Arial,sans-serif;font-size:0.8125rem;letter-spacing:0.06em;text-transform:uppercase;color:' +
        TEXT +
        ';';
      col.append(title, ...nodes);
      nodes.forEach((n) => {
        if (n.tagName === 'UL') {
          n.style.cssText = 'list-style:none;padding:0;margin:0;';
          n.querySelectorAll('li').forEach((li) => {
            li.style.margin = '0 0 8px';
          });
          n.querySelectorAll('a').forEach((a) => {
            a.style.cssText = 'color:color-mix(in srgb,#fff 92%,transparent);text-decoration:none;font-size:0.9375rem;';
          });
        }
      });
      grid.append(col);
    });
    content.replaceChildren(grid);
    styleColumnsGrid(grid);
    return true;
  }

  function buildTopFromFlat(section) {
    const content = sectionContent(section);
    const socialLabel = [...content.querySelectorAll('p')].find((p) =>
      /connect with us on social/i.test(p.textContent || ''),
    );
    const socialUl = content.querySelector('ul');
    if (!socialLabel || !socialUl) return false;

    const brandPs = [...content.children].filter(
      (el) => el.tagName === 'P' && el !== socialLabel,
    );

    const top = document.createElement('div');
    top.className = 'xwalk-footer-top';
    top.style.cssText =
      'display:grid;grid-template-columns:1fr auto;align-items:start;gap:24px 40px;padding:32px 0 28px;border-bottom:1px solid color-mix(in srgb,#86EFAC 20%,transparent);width:100%;box-sizing:border-box;';

    const brand = document.createElement('div');
    brand.className = 'xwalk-footer-top-brand';
    brand.style.cssText = 'max-width:420px;overflow:visible;';
    brandPs.forEach((p) => {
      p.style.color = TEXT;
      p.style.margin = '0 0 8px';
      brand.append(p);
    });

    const socialWrap = document.createElement('div');
    socialWrap.className = 'xwalk-footer-top-social';
    socialWrap.style.textAlign = 'right';
    socialLabel.style.cssText =
      'margin:0 0 12px;font-size:0.875rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:color-mix(in srgb,#fff 88%,transparent);';
    socialUl.style.cssText =
      'display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px;list-style:none;padding:0;margin:0;';
    socialUl.querySelectorAll('a').forEach(paintSocialLink);
    socialWrap.append(socialLabel, socialUl);

    top.append(brand, socialWrap);
    content.replaceChildren(top);
    fixLogos(top);
    return true;
  }

  function enhanceTop(section) {
    if (section.classList.contains('xwalk-footer-top') || section.querySelector('.xwalk-footer-top')) {
      const top = section.classList.contains('xwalk-footer-top') ? section : section.querySelector('.xwalk-footer-top');
      top.style.cssText =
        'display:grid;grid-template-columns:1fr auto;align-items:start;gap:24px 40px;padding:32px 0 28px;border-bottom:1px solid color-mix(in srgb,#86EFAC 20%,transparent);width:100%;box-sizing:border-box;';
      const brand = top.querySelector('.xwalk-footer-top-brand');
      if (brand) brand.style.cssText = 'max-width:420px;overflow:visible;';
      fixLogos(top);
      paintSocial(top);
      top.querySelectorAll('p').forEach((p) => {
        if (!p.classList.contains('xwalk-footer-social-label')) p.style.color = TEXT;
      });
      return;
    }
    buildTopFromFlat(section);
  }

  function decorateNewsletter(section) {
    const h2 = section.querySelector('h2');
    if (!h2 || !/scoop/i.test(h2.textContent || '')) return;

    section.className = 'xwalk-footer-newsletter';
    section.style.cssText =
      'padding:28px 0 32px;border-top:1px solid color-mix(in srgb,#86EFAC 18%,transparent);border-bottom:1px solid color-mix(in srgb,#86EFAC 18%,transparent);text-align:left;max-width:none;margin:0;color:' +
      TEXT +
      ';';

    const desc = [...section.querySelectorAll('p')].find((p) => !p.classList.contains('xwalk-footer-newsletter-form'));
    if (desc) desc.style.margin = '0 0 20px';

    if (section.querySelector('.xwalk-footer-newsletter-form input')) return;

    const oldForm = [...section.querySelectorAll('p')].find(
      (p) => p !== desc && /subscribe|email/i.test(p.textContent || ''),
    );
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

  function isReady(host) {
    const links = host.querySelectorAll('.xwalk-footer-col a, .xwalk-footer-columns a');
    return links.length >= 4;
  }

  function run() {
    showFooterContent();
    const wrap = footerWrap();
    const host = footerHost();
    if (!wrap || !host) return;
    if (host.dataset.xwalkFooterBoost === '1' && isReady(host)) return;

    const sections = sectionDivs(host);
    if (sections.length < 2) return;

    host.classList.add('xwalk-footer-boost');
    host.style.cssText =
      'display:block;max-width:1280px;margin:0 auto;padding:0 32px 32px;box-sizing:border-box;color:' +
      TEXT +
      ';visibility:visible;opacity:1;min-height:0;';
    wrap.style.minHeight = '0';

    enhanceTop(sections[0]);
    if (!splitFlatColumns(sections[1])) return;
    if (sections[2]) decorateNewsletter(sections[2]);
    if (sections[3]) {
      sections[3].className = 'xwalk-footer-legal';
      sections[3].style.cssText = 'padding:24px 0 8px;text-align:center;color:color-mix(in srgb,#fff 75%,transparent);';
    }

    fixLogos(host);
    paintSocial(host);

    if (!isReady(host)) return;

    host.dataset.xwalkFooterBoost = '1';
    document.documentElement.classList.add('xwalk-footer-boost-ready');
  }

  globalThis.xwalkFooterBoostDecorate = run;

  document.addEventListener('DOMContentLoaded', () => setTimeout(run, 0));
  document.addEventListener('aem:loaded', () => setTimeout(run, 0));
  for (const ms of [100, 400, 1000, 2500]) setTimeout(run, ms);
})();
