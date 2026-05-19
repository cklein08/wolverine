import { addToCart } from '../../scripts/commerce.js';

function productUrl(id) {
  return `/product/?id=${encodeURIComponent(id)}`;
}

function renderFilters(products) {
  const categories = [...new Set(products.map((p) => p.category))];
  const bar = document.createElement('div');
  bar.className = 'product-list-toolbar';

  const label = document.createElement('span');
  label.className = 'product-list-toolbar-label';
  label.textContent = 'Filter';
  bar.append(label);

  const allBtn = document.createElement('button');
  allBtn.textContent = 'All';
  allBtn.className = 'filter-btn active';
  allBtn.dataset.category = '';
  bar.append(allBtn);

  categories.forEach((cat) => {
    const btn = document.createElement('button');
    btn.textContent = cat;
    btn.className = 'filter-btn';
    btn.dataset.category = cat;
    bar.append(btn);
  });

  const sortBtn = document.createElement('button');
  sortBtn.className = 'sort-btn';
  sortBtn.textContent = 'Price ↑';
  sortBtn.dataset.dir = 'asc';
  bar.append(sortBtn);

  return bar;
}

function renderCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';
  card.dataset.category = product.category;
  const url = productUrl(product.id);
  card.innerHTML = `
    <div class="product-card-image">
      <a href="${url}" aria-label="View ${product.title}">
        <img src="${product.image}" alt="${product.title}" loading="lazy" width="400" height="400">
      </a>
    </div>
    <div class="product-card-body">
      <span class="product-card-category">${product.category}</span>
      <h3 class="product-card-title"><a href="${url}">${product.title}</a></h3>
      <p class="product-card-price">$${ Number(product.price).toFixed(2) }</p>
      <div class="product-card-actions">
        <a href="${url}" class="product-card-view">View details</a>
        <button type="button" class="product-card-atc"
          data-product-id="${product.id}"
          data-product-price="${product.price}"
          data-product-title="${product.title}"
          data-product-image="${product.image}">Add to cart</button>
      </div>
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
  } catch {
    block.innerHTML = <p class="product-list-empty">Unable to load products. Please try again later.</p>';
    return;
  }

  block.textContent = '';

  const filterBar = renderFilters(products);
  block.append(filterBar);

  const grid = document.createElement('div');
  grid.className = 'product-grid';
  if (!products.length) {
    grid.innerHTML = <p class="product-list-empty">No products found.</p>';
  } else {
    products.forEach((p) => grid.appendChild(renderCard(p)));
  }
  block.append(grid);

  filterBar.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
      filterBar.querySelectorAll('.filter-btn'').forEach((b) => b.classList.remove('active'));
      e.target.classList.add('active');
      const cat = e.target.dataset.category;
      grid.querySelectorAll('.product-card').forEach
((cardEl) => {
        cardEl.style.display = (!cat || cardEl.dataset.category === cat) ? '' : 'none';
      });
    }
    if (e.target.classList.contains('sort-btn')) {
      const dir = e.target.dataset.dir === 'asc' ? 'desc' : 'asc';
      e.target.dataset.dir = dir;
      e.target.textContent = dir === 'asc' ? 'Price ↑' : 'Price →';
      const cards = [...grid.querySelectorAll('.product-card')];
      cards.sort((a, b) => {
        const pa = parseFloat(a.querySelector('.product-card-price').textContent.replace('$', ''));
        const pb = parseFloat(b.querySelector('.product-card-price').textContent.replace('$', ''));
        return dir === 'asc' ? pa - pb : pb - pa;
      });
      cards.forEach(((c) => grid.appendChild(c));
    }
  });
}
