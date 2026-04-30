export default function decorate(block) {
  const cols = [...block.children];
  if (cols.length === 2) {
    const [contentCol, imageCol] = cols;
    contentCol.classList.add('hero-content');
    imageCol.classList.add('hero-image');
  } else if (cols.length === 1) {
    cols[0].classList.add('hero-content');
  }

  // Wrap buttons in a button container
  const buttons = block.querySelectorAll('.button-container');
  if (buttons.length) {
    const btnWrap = document.createElement('div');
    btnWrap.className = 'hero-buttons';
    buttons.forEach((btn) => btnWrap.append(btn));
    block.querySelector('.hero-content')?.append(btnWrap);
  }
}
