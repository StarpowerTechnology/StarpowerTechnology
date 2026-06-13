// ===== ⌘K command palette =====
(() => {
  const palette = document.getElementById("palette");
  const input = document.getElementById("paletteInput");
  const results = document.getElementById("paletteResults");
  if (!palette) return;

  // detect docs subdirectory so links work from both levels
  const root = /\/(docs|wvyworld)(\/|$)/.test(location.pathname) ? "../" : "";

  const COMMANDS = [
    { label: "wvy.world", kind: "page", icon: "◆", action: () => location.href = root + "wvyworld/" },
    { label: "Starpower Studio — dataset builder", kind: "page", icon: "◆", action: () => location.href = "/studio" },
    { label: "Home", kind: "page", icon: "★", action: () => location.href = root + "index.html" },
    { label: "Docs — Introduction", kind: "docs", icon: "▸", action: () => location.href = root + "docs/index.html" },
    { label: "WVY OpenSource", kind: "devtool", icon: "▸", action: () => location.href = root + "docs/wvy-opensource.html" },
    { label: "Starpower Autonomy", kind: "devtool", icon: "▸", action: () => location.href = root + "docs/starpower-autonomy.html" },
    { label: "Voice Agents", kind: "devtool", icon: "▸", action: () => location.href = root + "docs/voice-agents.html" },
    { label: "YouTube Researcher", kind: "devtool", icon: "▸", action: () => location.href = root + "docs/youtube-researcher.html" },
    { label: "Autonomous Researcher", kind: "devtool", icon: "▸", action: () => location.href = root + "docs/autonomous-researcher.html" },
    { label: "Simple Groupchat", kind: "devtool", icon: "▸", action: () => location.href = root + "docs/simple-groupchat.html" },
    { label: "SuperWVY", kind: "architecture", icon: "◇", action: () => location.href = root + "docs/superwvy.html" },
    { label: "Savvy", kind: "architecture", icon: "◇", action: () => location.href = root + "docs/savvy.html" },
    { label: "WVY Custom Models", kind: "architecture", icon: "◇", action: () => location.href = root + "docs/wvy-custom-models.html" },
    { label: "Research agenda", kind: "section", icon: "¶", action: () => location.href = root + "index.html#mission" },
    { label: "WVY for iPhone", kind: "section", icon: "¶", action: () => location.href = root + "index.html#app" },
    { label: "Contact Starpower", kind: "mail", icon: "@", action: () => location.href = "mailto:hello@starpower.technology" },
  ];

  let filtered = COMMANDS;
  let sel = 0;

  function render() {
    results.innerHTML = "";
    filtered.forEach((cmd, i) => {
      const div = document.createElement("div");
      div.className = "pal-item" + (i === sel ? " sel" : "");
      div.innerHTML = `<span class="pal-icon">${cmd.icon}</span><span>${cmd.label}</span><span class="pal-kind">${cmd.kind}</span>`;
      div.addEventListener("click", () => { close(); cmd.action(); });
      div.addEventListener("mousemove", () => { sel = i; render(); });
      results.appendChild(div);
    });
    if (!filtered.length) {
      results.innerHTML = `<div class="pal-item">no matches — try "docs" or "wvy"</div>`;
    }
  }

  function open() {
    palette.classList.remove("hidden");
    input.value = "";
    filtered = COMMANDS;
    sel = 0;
    render();
    input.focus();
  }
  function close() { palette.classList.add("hidden"); }

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      palette.classList.contains("hidden") ? open() : close();
    }
    if (palette.classList.contains("hidden")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(sel + 1, filtered.length - 1); render(); }
    if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(sel - 1, 0); render(); }
    if (e.key === "Enter" && filtered[sel]) { close(); filtered[sel].action(); }
  });

  input.addEventListener("input", () => {
    const q = input.value.toLowerCase();
    filtered = COMMANDS.filter((c) => (c.label + " " + c.kind).toLowerCase().includes(q));
    sel = 0;
    render();
  });

  palette.addEventListener("click", (e) => { if (e.target === palette) close(); });
  const hint = document.getElementById("paletteHint");
  if (hint) hint.addEventListener("click", open);
})();
