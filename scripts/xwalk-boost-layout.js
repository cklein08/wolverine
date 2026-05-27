/**
 * Boost retail layout + hero fixes when HLX strips classes / personalization attrs.
 */

function tagDealCardInternals(card) {
  const firstP = card.querySelector(':scope > p');
  if (firstP && !firstP.classList.contains('xwalk-deal-badge')) {
    firstP.classList.add('xwalk-deal-badge');
  }
  const picture = card.querySelector('picture');
  if (picture?.parentElement?.tagName === 'P') {
    const media = document.createElement('div');
    media.className = 'xwalk-deal-media';
    picture.parentElement.replaceWith(media);
    media.appendChild(picture);
  }
  card.querySelectorAll('a').forEach((a) => {
    if (/get the deal/i.test(a.textContent || '')) {
      a.classList.add('xwalk-deal-cta');
      a.closest('p')?.classList.add('xwalk-deal-cta-wrap');
    }
  });
}

function splitFlatDealSection(section) {
  const dealCtas = [...section.querySelectorAll('a')].filter((a) =>
    /get the deal/i.test(a.textContent || ''),
  );
  if (dealCtas.length < 2 || section.querySelector('.xwalk-deal-card')) return false;

  const groups = [];
  let batch = [];
  for (const el of [...section.children]) {
    batch.push(el);
    const hasCta = [...el.querySelectorAll('a')].some((a) =>
      /get the deal/i.test(a.textContent || ''),
    );
    if (hasCta) {
      groups.push(batch);
      batch = [];
    }
  }
  if (batch.length) groups.push(batch);
  if (groups.length < 2) return false;

  const row = document.createElement('div');
  groups.slice(0, 4).forEach((nodes) => {
    const col = document.createElement('div');
    const card = document.createElement('div');
    card.className = 'xwalk-deal-card';
    nodes.forEach((n) => card.appendChild(n));
    tagDealCardInternals(card);
    col.appendChild(card);
    row.appendChild(col);
  });

  section.replaceChildren(row);
  section.classList.add('columns', 'xwalk-boost-deals');
  return true;
}

/** HLX shows every personalization variant when data-forge-* is stripped — keep last h1 stack. */
function collapseDuplicateHero(section) {
  const h1s = [...section.querySelectorAll(':scope > h1')];
  if (h1s.length <= 1) return;
  const keep = h1s[h1s.length - 1];
  let anchor = keep;
  while (anchor.previousElementSibling) {
    anchor = anchor.previousElementSibling;
    if (anchor.querySelector('picture')) break;
  }
  while (section.firstChild && section.firstChild !== anchor) {
    section.firstChild.remove();
  }
}

function fixHeroBackground(section) {
  if (section.querySelector('.xwalk-hero-bg')) return;
  const picP = section.querySelector(':scope > p:has(picture)');
  if (!picP) return;
  const bg = document.createElement('div');
  bg.className = 'xwalk-hero-bg';
  const picture = picP.querySelector('picture');
  if (picture) {
    picP.replaceWith(bg);
    bg.appendChild(picture);
  }
}

function decorateHeroSections(main) {
  const sections = [...main.children].filter((el) => el.tagName === 'DIV');
  sections.forEach((section) => {
    if (section.querySelector('#save-when-you-shop-online')) {
      section.classList.add('xwalk-retail-hero');
      return;
    }
    if (section.querySelector('[id*="shop-phones"]')) {
      section.classList.add('xwalk-phones-head');
      return;
    }
    if (!section.querySelector(':scope > h1') || section.querySelector(':scope > h3')) return;
    if (section.querySelector('a') && /get the deal/i.test(section.textContent || '')) return;

    collapseDuplicateHero(section);
    fixHeroBackground(section);
    section.classList.add('xwalk-hero-section');
  });
}

export function decorateBoostLayout(doc = document) {
  const main = doc.querySelector('main');
  if (!main) return;

  decorateHeroSections(main);

  const isBoostRetail =
    /save when you shop online/i.test(main.textContent || '') ||
    /shop phones\s*&\s*devices/i.test(main.textContent || '') ||
    [...main.querySelectorAll('a')].some((a) => /get the deal/i.test(a.textContent || ''));

  if (isBoostRetail) {
    doc.body?.classList.add('xwalk-boost-page');
    main.classList.add('xwalk-boost-main');
  }

  const sections = [...main.children].filter((el) => el.tagName === 'DIV');
  sections.forEach((section) => {
    const text = section.textContent || '';

    if (text.includes('Trade in your iPhone') && section.querySelector('a[href="/phones"]')) {
      section.classList.add('xwalk-promo-strip');
    }
    if (/save when you shop online|shop phones & devices/i.test(text)) {
      section.classList.add('xwalk-retail-hero', 'xwalk-shop-online-head');
    }
    if (/save up to \$2,400/i.test(text)) {
      section.classList.add('xwalk-savings-banner');
    }

    const dealCtas = [...section.querySelectorAll('a')].filter((a) =>
      /get the deal/i.test(a.textContent || ''),
    );
    if (dealCtas.length >= 2) splitFlatDealSection(section);

    if (section.querySelector('h3') && section.querySelector('picture') && dealCtas.length <= 1) {
      const isPhone = /shop now/i.test(section.textContent || '');
      section.classList.add(isPhone ? 'xwalk-phone-section' : 'xwalk-deal-section');
      const card = section.querySelector('.xwalk-phone-card') || section.querySelector('.xwalk-deal-card') || section;
      card.classList.add(isPhone ? 'xwalk-phone-card' : 'xwalk-deal-card');
      if (!isPhone) tagDealCardInternals(card);
      else {
        const picP = section.querySelector(':scope > p:has(picture)');
        if (picP && !picP.classList.contains('xwalk-phone-media')) {
          picP.classList.add('xwalk-phone-media');
        }
      }
    }
  });

  const nav = doc.querySelector('header nav') || doc.querySelector('main.xwalk-nav');
  if (nav) nav.classList.add('xwalk-nav-boost');

  main.dataset.xwalkBoostDecorated = '1';
}

if (typeof document !== 'undefined') {
  const run = () => decorateBoostLayout();
  run();
  document.addEventListener('DOMContentLoaded', run);
}
