/**
 * Persona offer pages: lock body class, hide site promo chrome, keep mockup layout when HLX strips classes.
 */
export function decoratePersonaMockupPage(doc = document) {
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
}
