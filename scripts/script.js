document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const section = document.querySelector(this.getAttribute('href'));
    if (section) section.scrollIntoView({ behavior: 'smooth' });
  });
});

// - Cookie Functions -
function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days*864e5).toUTCString();
  document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
}

function getCookie(name) {
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=');
    return parts[0] === name ? decodeURIComponent(parts[1]) : r
  }, null);
}

// — Constants & Setup —
const canvas = document.getElementById("background-canvas");
const ctx = canvas.getContext("2d");

const parallax_multiplier = -0.1;

let width, height;
function resizeCanvas() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const colors = [
  { hex: '#140041', weight: 0.05 },
  { hex: '#4d1a8f', weight: 0.15 },
  { hex: '#732ea8', weight: 0.2 },
  { hex: '#35a5d3', weight: 0.3 },
  { hex: '#6ed1f7', weight: 0.3 }
];

let pointer = { x: -9999, y: -9999 }; // hidden initially
let pointerActive = false;

let marbles = [];
let fragments = [];
let shockwaves = [];

let flag_clicked = false;

let popCount = parseInt(getCookie("popCount") || "0", 10);
const counterBox = document.getElementById("marble-counter");
let hideCounterTimeout = null;

function incrementPopCounter() {
  if (getCookie("cookieConsent") !== "allow") return;

  popCount++;
  setCookie("popCount", popCount);
  counterBox.textContent = `Marbles popped: ${popCount}`;
  counterBox.style.opacity = 1;

  if (hideCounterTimeout) clearTimeout(hideCounterTimeout);
  hideCounterTimeout = setTimeout(() => {
    counterBox.style.opacity = 0;
  }, 5000);
}

// - Main Code -
function getColorSpawnX(color) {
  const idx = colors.findIndex(c => c.hex === color);
  const weight = colors[idx]?.weight || 0.2;
  const offset = colors.slice(0, idx).reduce((sum, c) => sum + c.weight, 0);
  return (offset + Math.random() * weight) * width;
}

function createMarble(color = null, fadeIn = true) {
  const isPipis = Math.random() < 0.0001; // 1 in 10000 chance
  const c = isPipis ? "#00BFFF" : color || colors[Math.floor(Math.random() * colors.length)].hex;

  return {
    x: getColorSpawnX(c),
    y: Math.random() * height - (window.scrollY * parallax_multiplier),
    r: isPipis ? 12 : Math.random() * 10 + 5,
    dx: (Math.random() - 0.5) * 0.7,
    dy: (Math.random() - 0.5) * 0.7,
    color: c,
    alpha: fadeIn ? 0 : 1,
    fadeIn,
    fading: false,
    birth: performance.now(),
    lifetime: (20 + Math.random() * 40) * 1000,
    pipis: isPipis
  };
}

function createFragment(x, y, mr, color) {
  return {
    x, y,
    r: Math.random() * Math.ceil(mr / 4) + 3,
    dx: (Math.random() - 0.5) * 2,
    dy: (Math.random() - 0.5) * 2,
    color,
    alpha: 1,
    life: 1
  };
}

function createShockwave(x, y, r, color) {
  return {
    x, y,
    r: 0,
    maxR: 10 + r * 7,
    alpha: 0.4,
    color
  };
}

let max_marble_count = 50 + Math.floor(Math.random() * 50)
for (let i = 0; i < max_marble_count; i++) marbles.push(createMarble());

// Pointer tracking
document.addEventListener("pointermove", e => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointerActive = true;
});

document.addEventListener("pointerleave", () => {
  pointerActive = false;
  pointer.x = -9999; pointer.y = -9999;
});

// Click/tap to pop and track pointer too othgerwise it wont work
document.addEventListener("pointerdown", e => {
  if (e.target.closest("a, button")) return;
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointerActive = true;

  if (e.target.closest("a, button")) return;
  const mx = e.clientX, my = e.clientY;
  flag_clicked = true;

  marbles.forEach((m, i) => {
    const adjY = m.y + window.scrollY * parallax_multiplier;

    if (Math.hypot(mx - m.x, my - adjY) < m.r + 2) {
      let fragment_count = 2 + Math.ceil(Math.random() * 4);
      for (let j = 0; j < fragment_count; j++) fragments.push(createFragment(m.x, m.y, m.r, m.color));
      shockwaves.push(createShockwave(m.x, m.y, m.r, m.color));
      marbles.splice(i, 1);
      setTimeout(() => marbles.push(createMarble()), 300);
      incrementPopCounter();
    }
  });
});

function animate() {
  ctx.clearRect(0, 0, width, height);
  const scrollOffset = window.scrollY * parallax_multiplier;

  // MARBLES
  marbles.forEach((m, i) => {
    if (pointerActive) {
      const adjY = m.y + scrollOffset;
      const dx = m.x - pointer.x;
      const dy = adjY - pointer.y;
      const dist = Math.hypot(dx, dy);
    
      if (flag_clicked) {
        setTimeout(() => flag_clicked = false, 100);

        if (dist < 200) {  // Ripple radius
          const force = 0.25 * (1 - dist / 200); // falloff
          m.dx += (dx / dist) * force;
          m.dy += (dy / dist) * force;
        }
      } else {
        if (dist < 100) {  // Ripple radius
          const force = -0.01 * (1 - dist / 100); // falloff
          m.dx += (dx / dist) * force;
          m.dy += (dy / dist) * force;
        }
      }
    }    

    const age = performance.now() - m.birth;
    if (!m.fading && age >= m.lifetime) m.fading = true;

    if (m.fadeIn) {
      m.alpha = Math.min(1, m.alpha + 0.02);
      if (m.alpha === 1) m.fadeIn = false;
    }

    m.x += m.dx;
    m.y += m.dy;

    if (m.x < 0 || m.x > width) m.dx *= -1;
    if (m.y < 0 - scrollOffset || m.y > height - scrollOffset) m.dy *= -1;

    if (m.fading) {
      m.alpha -= 0.02;
      if (m.alpha <= 0) {
        marbles.splice(i, 1);
        marbles.push(createMarble());
        return;
      }
    }

    ctx.globalAlpha = m.alpha;
    ctx.beginPath();
    if (m.pipis) {
      // Draw ellipse (wider)
      ctx.ellipse(m.x, m.y + scrollOffset, m.r * 1.2, m.r * 0.8, 0, 0, Math.PI * 2);
    } else {
      ctx.arc(m.x, m.y + scrollOffset, m.r, 0, Math.PI * 2);
    }
    ctx.fillStyle = m.color;
    ctx.fill();
    
  });

  // SHOCKWAVES
  shockwaves.forEach((s, i) => {
    s.r += 2;
    const progress = s.r / s.maxR;
    s.alpha = 0.4 * (1 - progress); // fade based on radius

    if (progress >= 1) {
      shockwaves.splice(i, 1);
      return;
    }

    const widthLine = Math.max(1, 20 * (1 - progress));

    ctx.save();
    ctx.globalAlpha = s.alpha;
    ctx.beginPath();
    ctx.arc(s.x, s.y + scrollOffset, s.r, 0, Math.PI * 2);
    ctx.lineWidth = widthLine;
    ctx.strokeStyle = s.color;
    ctx.shadowBlur = 20;
    ctx.shadowColor = s.color;
    ctx.stroke();
    ctx.restore();
  });

  // FRAGMENTS
  fragments.forEach((f, i) => {
    f.x += f.dx;
    f.y += f.dy;
    f.alpha -= 0.03;
    f.life -= 0.03;
    if (f.life <= 0) {
      fragments.splice(i, 1);
      return;
    }

    ctx.save();
    ctx.globalAlpha = f.alpha;
    ctx.shadowBlur = 10;
    ctx.shadowColor = f.color;
    ctx.beginPath();
    ctx.arc(f.x, f.y + scrollOffset, f.r, 0, Math.PI * 2);
    ctx.fillStyle = f.color;
    ctx.fill();
    ctx.restore();
  });

  ctx.globalAlpha = 1;
  requestAnimationFrame(animate);
}

animate();


// ─ Menu toggle logic 
const navToggle = document.getElementById('nav-toggle');
const sideNav   = document.getElementById('side-nav');

navToggle.addEventListener('click', () => {
  navToggle.classList.toggle('active');
  sideNav.classList.toggle('open');
});

// Close menu when a link is clicked
sideNav.querySelectorAll('a').forEach(link=>{
  link.addEventListener('click', ()=>{
    navToggle.classList.remove('active');
    sideNav.classList.remove('open');
  });
});

// ─ Cookie Banner ─
function showCookieBannerIfNeeded() {
  const consent = getCookie("cookieConsent");
  const banner = document.getElementById("cookie-banner");
  if (!consent && banner) {
    banner.style.display = "block";
  }
}

document.getElementById("accept-cookies")?.addEventListener("click", () => {
  setCookie("cookieConsent", "allow", 365);
  hideCookieBanner();
});

document.getElementById("decline-cookies")?.addEventListener("click", () => {
  setCookie("cookieConsent", "deny", 365);
  hideCookieBanner();
});

function hideCookieBanner() {
  const banner = document.getElementById("cookie-banner");
  if (!banner) return;
  banner.classList.add("hide");
  setTimeout(() => {
    banner.style.display = "none";
  }, 500); // matches animation duration
}

showCookieBannerIfNeeded();