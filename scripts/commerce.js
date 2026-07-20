// Cart stored in localStorage as JSON
const CART_KEY = 'wolverine-cart';

function getCart() {
  const raw = localStorage.getItem(CART_KEY);
  return raw ? JSON.parse(raw) : { items: [], total: 0 };
}

function saveCart(cart) {
  cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  document.dispatchEvent(new CustomEvent('aem:cart-updated', { detail: cart }));
}

export function addToCart(product) {
  // product = { id, title, price, image }
  const cart = getCart();
  const existing = cart.items.find((i) => i.id === product.id);
  if (existing) { existing.qty += 1; } else { cart.items.push({ ...product, qty: 1 }); }
  saveCart(cart);
  showToast(`${product.title} added to cart`);
}

export function removeFromCart(productId) {
  const cart = getCart();
  cart.items = cart.items.filter((i) => i.id !== productId);
  saveCart(cart);
}

export function updateQty(productId, qty) {
  const cart = getCart();
  const item = cart.items.find((i) => i.id === productId);
  if (item) {
    item.qty = Math.max(0, qty);
    if (item.qty === 0) removeFromCart(productId);
    else saveCart(cart);
  }
}

export function clearCart() {
  localStorage.removeItem(CART_KEY);
  document.dispatchEvent(new CustomEvent('aem:cart-updated', { detail: { items: [], total: 0 } }));
}

export function getCartCount() {
  return getCart().items.reduce((sum, i) => sum + i.qty, 0);
}

export { getCart };

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'cart-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}
