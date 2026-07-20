export async function loadFragment(path) {
  const resp = await fetch(`${path}.html`);
  if (resp.ok) {
    const main = document.createElement('main');
    main.innerHTML = await resp.text();
    // Decorate the fragment sections
    const { decorateMain } = await import('../../scripts/scripts.js');
    if (decorateMain) decorateMain(main);

    // Load all sections (makes them visible and loads their blocks)
    const { loadSections } = await import('../../scripts/aem.js');
    if (loadSections) await loadSections(main);

    return main;
  }
  return null;
}

export default async function decorate(block) {
  const link = block.querySelector('a');
  const path = link ? link.getAttribute('href') : block.textContent.trim();
  const fragment = await loadFragment(path);
  if (fragment) {
    const section = document.createElement('div');
    while (fragment.firstElementChild) section.append(fragment.firstElementChild);
    block.closest('.section').classList.add(...section.classList);
    block.closest('.section').dataset.sectionStatus = 'loaded';
    block.replaceChildren(...section.childNodes);
  }
}
