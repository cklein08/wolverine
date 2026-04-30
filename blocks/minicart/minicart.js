import {
  getCart, removeFromCart, updateQty,
} from '../../scripts/commerce.js';

let aside;
let backdrop;

function formatPrice(n) {
  return `$${Number(n).toFixed(2)}`;
}

function renderItems(cart) {
  if (!cart.items.length) {
    return `<div class="minicart-empty">
      <p>Your cart is empty</p>
      <a href="/products" class="button primary">Browse Products</a>
    </div>`;
  }
  return `<ul class="minicart-items">${cart.items.map((item) => `
    <li class="minicart-item" data-id="${item.id}">
      <img src="${item.image}" alt="${item.title}" class="minicart-item-img" width="60" height="60" loading="lazy">
      <div class="minicart-item-info">
        <span class="minicart-item-title">${item.title}</span>
        <span class="minicart-item-price">${formatPrice(item.price)}</span>
        <div class="minicart-item-qty">
          <button class="minicart-qty-minus" aria-label="Decrease">−</button>
          <span>${item.qty}</span>
          <button class="minicart-qty-plus" aria-label="Increase">+</button>
        </div>
      </div>
      <button class="minicart-item-remove" aria-label="Remove">✕</button>
    </li>`).join('')}</ul>`;
}

function renderFooter(cart) {
  if (!cart.items.length) return '';
  const count = cart.items.reduce((s, i) => s + i.qty, 0);
  return `<div class="minicart-footer">
    <div class="minicart-subtotal">
      <span>Subtotal (${count} item${count !== 1 ? 's' : ''})</span>
      <span class="minicart-subtotal-price">${formatPrice(cart.total)}</span>
    </div>
    <a href="/checkout" class="minicart-checkout button primary">Proceed to Checkout</a>
  </div>`;
}

function render() {
  const cart = getCart();
  aside.innerHTML = `
    <div class="minicart-header">
      <h2>Your Cart</h2>
      <button class="minicart-close" aria-label="Close cart">✕</button>
    </div>
    <div class="minicart-body">${renderItems(cart)}</div>
    ${renderFooter(cart)}`;

  aside.querySelector('.minicart-close').addEventListener('click', toggleMinicart);

  aside.querySelectorAll('.minicart-item').forEach((li) => {
    const id = li.dataset.id;
    const cart2 = getCart();
    const item = cart2.items.find((i) => i.id === id);
    if (!item) return;

    li.querySelector('.minicart-qty-minus')?.addEventListener('click', () => updateQty(id, item.qty - 1));
    li.querySelector('.minicart-qty-plus')?.addEventListener('click', () => updateQty(id, item.qty + 1));
    li.querySelector('.minicart-item-remove')?.addEventListener('click', () => removeFromCart(id));
  });
}

export function toggleMinicart() {
  if (!aside) return;
  const active = aside.classList.toggle('is-active');
  backdrop.classList.toggle('is-active', active);
  document.body.style.overflow = active ? 'hidden' : '';
}

export default function decorate(block) {
  // Create aside drawer
  aside = document.createElement('aside');
  aside.className = 'minicart';
  document.body.appendChild(aside);

  // Create backdrop
  backdrop = document.createElement('div');
  backdrop.className = 'minicart-backdrop';
  backdrop.addEventListener('click', toggleMinicart);
  document.body.appendChild(backdrop);

  // Initial render
  render();

  // Listen for cart updates
  document.addEventListener('aem:cart-updated', () => {
    render();
    if (!aside.classList.contains('is-active')) {
      aside.classList.add('is-active');
      backdrop.classList.add('is-active');
      document.body.style.overflow = 'hidden';
    }
  });

  // Hide the block wrapper itself
  if (block) block.style.display = 'none';
}
