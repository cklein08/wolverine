export default function decorate(block) {
  const cols = [...block.children];
  const colCount = cols.length;
  block.classList.add(`columns-${colCount}-cols`);
  cols.forEach((col) => {
    col.classList.add('column');
    const pic = col.querySelector('picture');
    if (pic) {
      const picWrap = pic.closest('div');
      if (picWrap && picWrap.children.length === 1) {
        picWrap.classList.add('column-image');
      }
    }
  });
}
