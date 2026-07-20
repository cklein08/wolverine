export default function decorate(block) {
  const cards = [...block.children];
  cards.forEach((card) => {
    card.classList.add('card');

    const img = card.querySelector('picture');
    if (img) {
      const imageWrap = document.createElement('div');
      imageWrap.className = 'card-image';
      imageWrap.append(img);
      card.prepend(imageWrap);
    }

    const content = card.querySelector('div:not(.card-image)');
    if (content) {
      content.classList.add('card-content');
    }
  });
}
