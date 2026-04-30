import { getCart, clearCart } from '../../scripts/commerce.js';

function formatPrice(n) {
  return `$${Number(n).toFixed(2)}`;
}

function createConfetti() {
  const container = document.createElement('div');
  container.className = 'checkout-confetti';
  const colors = ['#E94560', '#0F3460', '#1A1A2E', '#FFD700', '#00C853'];
  for (let i = 0; i < 50; i += 1) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = `${Math.random() * 0.5}s`;
    piece.style.animationDuration = `${1 + Math.random() * 2}s`;
    container.appendChild(piece);
  }
  document.body.appendChild(container);
  setTimeout(() => container.remove(), 4000);
}

export default function decorate(block) {
  const cart = getCart();

  if (!cart.items.length) {
    block.innerHTML = `<div class="checkout-empty">
      <h2>Your cart is empty</h2>
      <p>Add some products before checking out.</p>
      <a href="/products" class="button primary">Browse Products</a>
    </div>`;
    return;
  }

  block.innerHTML = `
    <div class="checkout-layout">
      <div class="checkout-summary">
        <h2>Order Summary</h2>
        <table class="checkout-table">
          <thead>
            <tr>
              <th></th>
              <th>Product</th>
              <th>Qty</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${cart.items.map((item) => `
              <tr>
                <td><img src="${item.image}" alt="${item.title}" width="50" height="50" class="checkout-item-img"></td>
                <td>${item.title}<br><small>${formatPrice(item.price)} each</small></td>
                <td>${item.qty}</td>
                <td class="checkout-line-total">${formatPrice(item.price * item.qty)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
        <div class="checkout-grand-total">
          <span>Grand Total</span>
          <span>${formatPrice(cart.total)}</span>
        </div>
      </div>
      <div class="checkout-actions">
        <button class="checkout-place-order button primary">Place Order</button>
        <a href="/products" class="checkout-continue">← Continue Shopping</a>
      </div>
    </div>`;

  block.querySelector('.checkout-place-order').addEventListener('click', () => {
    clearCart();
    createConfetti();
    block.innerHTML = `<div class="checkout-success">
      <div class="checkout-success-icon">✓</div>
      <h2>Order Placed!</h2>
      <p>Thank you for your order. You'll receive a confirmation shortly.</p>
      <a href="/products" class="button primary">Continue Shopping</a>
    </div>`;
  });
}
