import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  block.textContent = '';
  const footer = document.createElement('div');
  footer.classList.add('footer');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  block.append(footer);
  const run = () => globalThis.xwalkFooterBoostDecorate?.();
  run();
  requestAnimationFrame(run);
  setTimeout(run, 150);
  setTimeout(run, 600);
}
