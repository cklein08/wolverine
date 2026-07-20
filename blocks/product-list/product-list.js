import { addToCart } from '../../scripts/commerce.js';

function renderFilters(products, block) {
  const categories = [...new Set(products.map((p) => p.category))];
  const bar = document.createElement('div');
  bar.className = 'product-filter-bar';

  const allBtn = document.createElement('button');
  allBtn.textContent = 'All';
  allBtn.className = 'filter-btn active';
  allBtn.dataset.category = '';
  bar.appendChild(allBtn);

  categories.forEach((cat) => {
    const btn = document.createElement('button');
    btn.textContent = cat;
    btn.className = 'filter-btn';
    btn.dataset.category = cat;
    bar.appendChild(btn);
  });

  const sortBtn = document.createElement('button');
  sortBtn.className = 'sort-btn';
  sortBtn.textContent = 'Price ↑';
  sortBtn.dataset.dir = 'asc';
  bar.appendChild(sortBtn);

  return bar;
}

function renderCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';
  card.dataset.category = product.category;
  card.innerHTML = `
    <div class="product-card-image">
      <img src="${product.image}" alt="${product.title}" loading="lazy" width="300" height="300">
    </div>
    <div class="product-card-body">
      <span class="product-card-category">${product.category}</span>
      <h3 class="product-card-title">${product.title}</h3>
      <p class="product-card-price">$${Number(product.price).toFixed(2)}</p>
      <button class="product-card-atc button primary"
        data-product-id="${product.id}"
        data-product-price="${product.price}"
        data-product-title="${product.title}"
        data-product-image="${product.image}">Add to Cart</button>
    </div>`;
  card.querySelector('.product-card-atc').addEventListener('click', (e) => {
    e.preventDefault();
    addToCart({
      id: product.id,
      title: product.title,
      price: Number(product.price),
      image: product.image,
    });
  });
  return card;
}

export default async function decorate(block) {
  let products = [];
  try {
    const resp = await fetch('/products.json');
    const json = await resp.json();
    products = json.data || json;
  } catch (e) {
    block.innerHTML = '<p>Unable to load products.</p>';
    return;
  }

  block.textContent = '';

  const filterBar = renderFilters(products, block);
  block.appendChild(filterBar);

  const grid = document.createElement('div');
  grid.className = 'product-grid';
  products.forEach((p) => grid.appendChild(renderCard(p)));
  block.appendChild(grid);

  // Filter logic
  filterBar.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
      filterBar.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
      e.target.classList.add('active');
      const cat = e.target.dataset.category;
      grid.querySelectorAll('.product-card').forEach((card) => {
        card.style.display = (!cat || card.dataset.category === cat) ? '' : 'none';
      });
    }
    if (e.target.classList.contains('sort-btn')) {
      const dir = e.target.dataset.dir === 'asc' ? 'desc' : 'asc';
      e.target.dataset.dir = dir;
      e.target.textContent = dir === 'asc' ? 'Price ↑' : 'Price ↓';
      const cards = [...grid.querySelectorAll('.product-card')];
      cards.sort((a, b) => {
        const pa = parseFloat(a.querySelector('.product-card-price').textContent.replace('$', ''));
        const pb = parseFloat(b.querySelector('.product-card-price').textContent.replace('$', ''));
        return dir === 'asc' ? pa - pb : pb - pa;
      });
      cards.forEach((c) => grid.appendChild(c));
    }
  });
}
