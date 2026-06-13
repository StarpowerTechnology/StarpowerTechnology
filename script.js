// ===== Code tabs =====
const tabs = document.querySelectorAll(".code-tab");
const panes = document.querySelectorAll(".code-body");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    panes.forEach((p) => {
      p.classList.toggle("hidden", p.dataset.pane !== tab.dataset.lang);
    });
  });
});

// ===== Hero terminal typing effect =====
const typedEl = document.getElementById("typed");
const phrases = [
  "WVY-1 online. Ready when you are.",
  "Spinning up agents for the groupchat...",
  "Hello from wvy.world 🌐",
  "Multiagent mode: engaged.",
];

let phraseIndex = 0;
let charIndex = 0;
let deleting = false;

function typeLoop() {
  const phrase = phrases[phraseIndex];

  if (!deleting) {
    charIndex++;
    typedEl.textContent = phrase.slice(0, charIndex);
    if (charIndex === phrase.length) {
      deleting = true;
      setTimeout(typeLoop, 2200);
      return;
    }
    setTimeout(typeLoop, 45 + Math.random() * 50);
  } else {
    charIndex--;
    typedEl.textContent = phrase.slice(0, charIndex);
    if (charIndex === 0) {
      deleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      setTimeout(typeLoop, 400);
      return;
    }
    setTimeout(typeLoop, 22);
  }
}

if (typedEl) typeLoop();

// ===== Scroll reveal =====
const revealTargets = document.querySelectorAll(
  ".card, .mission-card, .doc-item, .chat-mock, .world-content, .section-head, .code-window"
);
revealTargets.forEach((el) => el.classList.add("reveal"));

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);
revealTargets.forEach((el) => observer.observe(el));

// ===== Mobile menu =====
const burger = document.getElementById("burger");
const mobileMenu = document.getElementById("mobileMenu");

if (burger && mobileMenu) {
  burger.addEventListener("click", () => {
    mobileMenu.classList.toggle("open");
  });
  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => mobileMenu.classList.remove("open"));
  });
}
