/**
 * Applies Boost-style layout classes when HLX delivery strips author classes from DA HTML.
 */
export function decorateBoostLayout(doc = document) {
  const main = doc.querySelector('main');
  if (!main || main.dataset.xwalkBoostDecorated) return;
  main.dataset.xwalkBoostDecorated = '1';
  main.classList.add('xwalk-boost-main');

  const children = [...main.children].filter((el) => el.tagName === 'DIV');
  children.forEach((section, i) => {
    const text = section.textContent || '';
    if (text.includes('Trade in your iPhone') && section.querySelector('a[href="/phones"]')) {
      section.classList.add('xwalk-promo-strip');
    }
    if (/save when you shop online/i.test(text)) {
      section.classList.add('xwalk-shop-online-head');
    }
    const dealCards = section.querySelectorAll(':scope > div > div');
    const hasDealCta = [...section.querySelectorAll('a')].some((a) =>
      /get the deal/i.test(a.textContent || ''),
    );
    if (hasDealCta || dealCards.length >= 4) {
      section.classList.add('xwalk-boost-deals');
      dealCards.forEach((col) => {
        if (col.querySelector('h3')) col.classList.add('xwalk-deal-card');
      });
    }
    if (/save up to \$2,400/i.test(text)) {
      section.classList.add('xwalk-savings-banner');
    }
  });

  const nav = doc.querySelector('header nav') || doc.querySelector('main.xwalk-nav');
  if (nav) nav.classList.add('xwalk-nav-boost');
}

if (typeof document !== 'undefined') {
  decorateBoostLayout();
  document.addEventListener('DOMContentLoaded', () => decorateBoostLayout());
}
