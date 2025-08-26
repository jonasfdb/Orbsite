// Tiny tilt: applies to .tilt cards
(function(){
  const cards = document.querySelectorAll('.tilt');
  const max = 10; // deg
  const damp = 20; // lower = snappier
  cards.forEach(card => {
    let rx = 0, ry = 0, tx = 0, ty = 0;
    const onMove = (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      rx = (py - 0.5) * -2 * max;
      ry = (px - 0.5) *  2 * max;
    };
    const onLeave = () => { rx = 0; ry = 0; };
    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
    // animation loop
    let raf;
    const animate = () => {
      tx += (rx - tx) / damp;
      ty += (ry - ty) / damp;
      card.style.transform = `perspective(800px) rotateX(${tx.toFixed(2)}deg) rotateY(${ty.toFixed(2)}deg) translateY(-2px)`;
      raf = requestAnimationFrame(animate);
    };
    animate();
  });

  // Reduce motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.tilt').forEach(c => c.style.transform='none');
  }
})();
