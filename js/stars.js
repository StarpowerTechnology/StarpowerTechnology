// ===== Starpower starfield — parallax layers, twinkle, shooting stars =====
(() => {
  const canvas = document.getElementById("stars");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let W, H, dpr;
  let stars = [];
  let shooters = [];
  let mouseX = 0.5, mouseY = 0.5;
  let scrollY = 0;

  const LAYERS = [
    { count: 90, size: [0.4, 1.0], speed: 0.012, parallax: 6 },   // far
    { count: 50, size: [0.8, 1.6], speed: 0.022, parallax: 14 },  // mid
    { count: 22, size: [1.2, 2.4], speed: 0.035, parallax: 26 },  // near
  ];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    stars = [];
    LAYERS.forEach((layer, li) => {
      const count = Math.round(layer.count * (W / 1400));
      for (let i = 0; i < Math.max(count, 24); i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: layer.size[0] + Math.random() * (layer.size[1] - layer.size[0]),
          layer: li,
          tw: Math.random() * Math.PI * 2,          // twinkle phase
          twSpeed: 0.4 + Math.random() * 1.2,
          drift: layer.speed * (0.5 + Math.random()),
        });
      }
    });
  }

  function spawnShooter() {
    const fromLeft = Math.random() > 0.5;
    shooters.push({
      x: fromLeft ? -60 : Math.random() * W,
      y: Math.random() * H * 0.45,
      vx: (fromLeft ? 1 : 0.6 + Math.random() * 0.5) * (9 + Math.random() * 7),
      vy: 3 + Math.random() * 3.5,
      life: 1,
      decay: 0.012 + Math.random() * 0.01,
    });
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 16.6, 3);
    last = now;
    ctx.clearRect(0, 0, W, H);

    // stars
    for (const s of stars) {
      const layer = LAYERS[s.layer];
      s.tw += 0.016 * s.twSpeed * dt;
      s.y += s.drift * dt;
      if (s.y > H + 4) { s.y = -4; s.x = Math.random() * W; }

      const px = (mouseX - 0.5) * layer.parallax;
      const py = (mouseY - 0.5) * layer.parallax - (scrollY * layer.parallax) / 90;
      const alpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s.tw));

      ctx.globalAlpha = alpha * (0.5 + s.layer * 0.25);
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(s.x + px, ((s.y + py) % (H + 8) + H + 8) % (H + 8) - 4, s.r, 0, Math.PI * 2);
      ctx.fill();

      // cross-sparkle on the biggest stars
      if (s.r > 1.9 && alpha > 0.8) {
        ctx.globalAlpha = (alpha - 0.8) * 1.5;
        ctx.fillRect(s.x + px - s.r * 3, s.y + py - 0.4, s.r * 6, 0.8);
        ctx.fillRect(s.x + px - 0.4, s.y + py - s.r * 3, 0.8, s.r * 6);
      }
    }

    // shooting stars
    for (let i = shooters.length - 1; i >= 0; i--) {
      const sh = shooters[i];
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      sh.life -= sh.decay * dt;
      if (sh.life <= 0 || sh.x > W + 120 || sh.y > H + 120) { shooters.splice(i, 1); continue; }

      const len = 70 * sh.life;
      const grad = ctx.createLinearGradient(sh.x, sh.y, sh.x - sh.vx * len / 10, sh.y - sh.vy * len / 10);
      grad.addColorStop(0, `rgba(255,255,255,${0.9 * sh.life})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.globalAlpha = 1;
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(sh.x, sh.y);
      ctx.lineTo(sh.x - sh.vx * len / 10, sh.y - sh.vy * len / 10);
      ctx.stroke();

      ctx.fillStyle = `rgba(255,255,255,${sh.life})`;
      ctx.beginPath();
      ctx.arc(sh.x, sh.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX / W;
    mouseY = e.clientY / H;
  }, { passive: true });
  window.addEventListener("scroll", () => { scrollY = window.scrollY; }, { passive: true });

  // a shooting star every few seconds, sometimes a double
  setInterval(() => {
    if (document.hidden) return;
    spawnShooter();
    if (Math.random() > 0.7) setTimeout(spawnShooter, 300 + Math.random() * 500);
  }, 3800);

  resize();
  spawnShooter();
  requestAnimationFrame(frame);
})();
