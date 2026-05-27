/**
 * Boost-style layout when HLX strips classes and/or flattens columns into one div.
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

/** Split one flat HLX section (all deals in sequential <p> tags) into a 4-column grid. */
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

export function decorateBoostLayout(doc = document) {
  const main = doc.querySelector('main');
  if (!main) return;

  const isBoostHome =
    /save when you shop online/i.test(main.textContent || '') ||
    [...main.querySelectorAll('a')].some((a) => /get the deal/i.test(a.textContent || ''));

  if (!isBoostHome) return;

  doc.body?.classList.add('xwalk-boost-page');
  main.classList.add('xwalk-boost-main');

  const sections = [...main.children].filter((el) => el.tagName === 'DIV');

  sections.forEach((section) => {
    const text = section.textContent || '';

    if (text.includes('Trade in your iPhone') && section.querySelector('a[href="/phones"]')) {
      section.classList.add('xwalk-promo-strip');
    }
    if (/save when you shop online|shop phones & devices/i.test(text)) {
      section.classList.add('xwalk-shop-online-head');
    }
    if (/save up to \$2,400/i.test(text)) {
      section.classList.add('xwalk-savings-banner');
    }

    const dealCtas = [...section.querySelectorAll('a')].filter((a) =>
      /get the deal/i.test(a.textContent || ''),
    );

    if (dealCtas.length >= 2) {
      splitFlatDealSection(section);
    }

    const card =
      section.querySelector('.xwalk-deal-card') ||
      (section.querySelector('h3') && section.querySelector('a') ? section : null);
    if (card && card.querySelector('h3')) {
      section.classList.add('xwalk-deal-section');
      if (!card.classList.contains('xwalk-deal-card')) card.classList.add('xwalk-deal-card');
      tagDealCardInternals(card.classList.contains('xwalk-deal-card') ? card : section);
    }

    if (section.classList.contains('xwalk-boost-deals')) {
      section.querySelectorAll(':scope > div > div').forEach((col) => {
        const inner = col.querySelector('.xwalk-deal-card') || col;
        inner.classList.add('xwalk-deal-card');
        tagDealCardInternals(inner);
      });
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
