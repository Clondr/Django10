document.querySelectorAll('.zoomable-img').forEach((img) => {
  img.addEventListener('click', () => {
    img.classList.toggle('zoomed');
  });
});