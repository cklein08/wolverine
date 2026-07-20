import { getCartCount } from './commerce.js';

/**
 * Initialize commerce features: minicart, cart icon in header.
 */
export default function initCommerce() {
  // Load commerce CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `${window.hlx?.codeBasePath || ''}/styles/commerce.css`;
  document.head.appendChild(link);

  // Load minicart CSS
  const minicartCSS = document.createElement('link');
  minicartCSS.rel = 'stylesheet';
  minicartCSS.href = `${window.hlx?.codeBasePath || ''}/blocks/minicart/minicart.css`;
  document.head.appendChild(minicartCSS);

  // Create minicart block placeholder and load JS
  const minicartDiv = document.createElement('div');
  minicartDiv.className = 'minicart-wrapper';
  minicartDiv.style.display = 'none';
  document.body.appendChild(minicartDiv);

  import('../blocks/minicart/minicart.js').then((mod) => {
    mod.default(minicartDiv);

    // Expose toggle globally for cart icon
    window.toggleMinicart = mod.toggleMinicart;
  });

  // Add cart icon to header
  function injectCartIcon() {
    const nav = document.querySelector('header nav');
    if (!nav) {
      setTimeout(injectCartIcon, 200);
      return;
    }

    // Don't add twice
    if (nav.querySelector('.nav-cart-btn')) return;

    const cartBtn = document.createElement('button');
    cartBtn.className = 'nav-cart-btn';
    cartBtn.setAttribute('aria-label', 'Shopping Cart');
    cartBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg><span class="nav-cart-badge" style="display:none">0</span>`;
    cartBtn.addEventListener('click', () => {
      if (window.toggleMinicart) window.toggleMinicart();
    });
    nav.appendChild(cartBtn);

    updateBadge();
  }

  function updateBadge() {
    const badge = document.querySelector('.nav-cart-badge');
    if (!badge) return;
    const count = getCartCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? '' : 'none';
  }

  document.addEventListener('aem:cart-updated', updateBadge);

  // Wait for header to load then inject cart icon
  setTimeout(injectCartIcon, 500);
}

// Auto-init
initCommerce();
