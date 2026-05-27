/**
 * Applies Boost-style layout classes when HLX delivery strips author classes from DA HTML.
 */
export function decorateBoostLayout(doc = document) {
  const main = doc.querySelector('main');
  if (!main) return;

  const isBoostHome =
    /save when you shop online/i.test(main.textContent || '') ||
    [...main.querySelectorAll('a')].some((a) => /get the deal/i.test(a.textContent || ''));

  if (!isBoostHome) return;

  doc.body?.classList.add('xwalk-boost-page');
  if (main.dataset.xwalkBoostDecorated) return;
  main.dataset.xwalkBoostDecorated = '1';
  main.classList.add('xwalk-boost-main');

  const sections = [...main.children].filter((el) => el.tagName === 'DIV');
  sections.forEach((section) => {
    const text = section.textContent || '';

    if (text.includes('Trade in your iPhone') && section.querySelector('a[href="/phones"]')) {
      section.classList.add('xwalk-promo-strip');
    }
    if (/save when you shop online/i.test(text)) {
      section.classList.add('xwalk-shop-online-head');
    }
    if (/save up to \$2,400/i.test(text)) {
      section.classList.add('xwalk-savings-banner');
    }

    const dealCtas = [...section.querySelectorAll('a')].filter((a) =>
      /get the deal/i.test(a.textContent || ''),
    );
    const columnCards = [
      ...section.querySelectorAll(':scope > div > div'),
      ...section.querySelectorAll(':scope > div'),
    ].filter((el, i, arr) => {
      if (!el.querySelector('h3')) return false;
      return !arr.some((other) => other !== el && other.contains(el));
    });

    if (dealCtas.length >= 2 || columnCards.length >= 4) {
      section.classList.add('xwalk-boost-deals');
      if (!section.classList.contains('columns')) section.classList.add('columns');

      columnCards.slice(0, 4).forEach((col) => {
        const card =
          col.querySelector('.xwalk-deal-card') ||
          col.querySelector(':scope > div') ||
          col;
        card.classList.add('xwalk-deal-card');
        const firstP = card.querySelector('p');
        if (firstP && !firstP.classList.contains('xwalk-deal-badge')) {
          firstP.classList.add('xwalk-deal-badge');
        }
        const imgWrap = card.querySelector('picture')?.parentElement;
        if (imgWrap && imgWrap.tagName === 'DIV') imgWrap.classList.add('xwalk-deal-media');
        const cta = card.querySelector('a[href]');
        if (cta && /get the deal/i.test(cta.textContent || '')) {
          cta.classList.add('xwalk-deal-cta');
          cta.closest('p')?.classList.add('xwalk-deal-cta-wrap');
        }
      });
    }
  });

  const nav = doc.querySelector('header nav') || doc.querySelector('main.xwalk-nav');
  if (nav) nav.classList.add('xwalk-nav-boost');
}

if (typeof document !== 'undefined') {
  decorateBoostLayout();
  document.addEventListener('DOMContentLoaded', () => decorateBoostLayout());
  if (typeof MutationObserver !== 'undefined') {
    const obs = new MutationObserver(() => decorateBoostLayout());
    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), 8000);
  }
}
