import { addToCart } from '../../scripts/commerce.js';

export default async function decorate(block) {
  const blockText = block.textContent.trim();
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id') || blockText;

  let products = [];
  try {
    const resp = await fetch('/products.json');
    const json = await resp.json();
    products = json.data || json;
  } catch {
    block.innerHTML = '<p class="product-detail-not-found">Unable to load product.</p>';
    return;
  }

  const product = products.find((p) => String(p.id) === String(productId));
  if (!product) {
    block.innerHTML = '<p class="product-detail-not-found">Product not found. <a href="/products/">Browse all products</a></p>';
    return;
  }

  document.title = `${product.title} | Wolverine Mobile`;

  block.textContent = '';
  block.innerHTML = `
    <nav class="pdp-breadcrumb" aria-label="Breadcrumb">
      <a href="/products/">← Back to shop</a>
    </nav>
    <div class="pdp-layout">
      <div class="pdp-image">
        <img src="${product.image}" alt="${product.title}" loading="eager" width="800" height="800">
      </div>
      <div class="pdp-info">
        <span class="pdp-category">${product.category}</span>
        <h1 class="pdp-title">${product.title}</h1>
        <p class="pdp-sku">SKU: ${product.sku || product.id}</p>
        <p class="pdp-price">$${Number(product.price).toFixed(2)}</p>
        <p class="pdp-description">${product.description || ""}</p>
        <div class="pdp-actions">
          <div class="pdp-qty">
            <button type="button" class="pdp-qty-minus" aria-label="Decrease quantity">−</button>
            <input type="number" class="pdp-qty-input" value="1" min="1" max="99" aria-label="Quantity">
            <button type="button" class="pdp-qty-plus" aria-label="Increase quantity">+</button>
          </div>
          <button type="button" class="pdp-atc">Add to cart</button>
        </div>
      </div>
    </div>`;

  const qtyInput = block.querySelector('.pdp-qty-input');
  block.querySelector('.pdp-qty-minus').addEventListener('click', () => {
    qtyInput.value = String(Math.max(1, Number(qtyInput.value) - 1));
  });
  block.querySelector('.pdp-qty-plus').addEventListener('click', () => {
    qtyInput.value = String(Number(qtyInput.value) + 1);
  });

  block.querySelector('.pdp-atc').addEventListener('click', () => {
    const qty = Number(qtyInput.value);
    for (let i = 0; i < qty; i += 1) {
      addToCart({ id: product.id, title: product.title, price: Number(product.price), image: product.image });
    }
  });
}
