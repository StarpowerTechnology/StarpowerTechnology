// ===== Starpower docs shell: sidebar, TOC, copy buttons, pager, shared UI =====
(() => {
  // ---------- inject shared chrome (starfield, mascot, chat, palette) ----------
  // docs pages stay lean; this runs before stars.js / palette.js / mascot.js
  document.body.insertAdjacentHTML("afterbegin", '<canvas id="stars"></canvas>');
  document.body.insertAdjacentHTML("beforeend", `
    <div id="mascot" aria-label="WVY star — click to chat, drag to throw">
      <div class="mascot-inner">
        <img src="../assets/logo-blank.png" alt="" draggable="false" />
        <svg viewBox="0 0 100 100" class="mascot-eyes">
          <ellipse class="star-eye eye-l" cx="44.3" cy="45.1" rx="1.5" ry="4.4" fill="#000"/>
          <ellipse class="star-eye eye-r" cx="50" cy="45.3" rx="1.5" ry="4.4" fill="#000"/>
        </svg>
      </div>
    </div>
    <div id="warpCatcher" class="warp-catcher"></div>
    <div id="starBubble" class="star-bubble hidden">
      <span class="sb-text"></span>
    </div>
    <div id="expBar" class="exp-bar">
      <form id="expForm" class="exp-form">
        <span class="mono prompt-mark">›</span>
        <input id="expInput" type="text" placeholder="talk to WVY…" autocomplete="off" />
        <button type="submit" class="exp-send mono">send ↑</button>
      </form>
      <div class="exp-hint mono">your messages float away · everything's saved · click out to read the log</div>
    </div>
    <div id="starChat" class="star-chat hidden">
      <div class="star-chat-head">
        <span class="mono chat-head-title">★ wvy assistant</span>
        <div class="chat-tabs mono" aria-label="Chat views">
          <button id="starChatTab" class="chat-tab active" type="button">chat</button>
          <button id="starChatListTab" class="chat-tab" type="button">chats</button>
        </div>
        <button id="starChatClose" class="chat-x mono">esc</button>
      </div>
      <div class="star-chat-log" id="starChatLog"></div>
      <div class="star-chat-list hidden" id="starChatList"></div>
      <form id="starChatForm" class="star-chat-form">
        <span class="mono prompt-mark">›</span>
        <input id="starChatInput" type="text" placeholder="ask me about WVY..." autocomplete="off" />
      </form>
    </div>
    <div id="palette" class="palette hidden">
      <div class="palette-box">
        <div class="palette-input-row">
          <span class="mono prompt-mark">›</span>
          <input id="paletteInput" type="text" placeholder="type a command or search..." autocomplete="off" />
          <span class="mono kbd">esc</span>
        </div>
        <div class="palette-results" id="paletteResults"></div>
      </div>
    </div>`);

  // ---------- nav model (single source of truth) ----------
  const NAV = [
    {
      group: "Getting Started",
      items: [{ file: "index.html", name: "Introduction" }],
    },
    {
      group: "DevTools",
      items: [
        { file: "wvy-opensource.html", name: "WVY OpenSource" },
        { file: "starpower-autonomy.html", name: "Starpower Autonomy" },
        { file: "voice-agents.html", name: "Voice Agents" },
        { file: "youtube-researcher.html", name: "YouTube Researcher" },
        { file: "autonomous-researcher.html", name: "Autonomous Researcher" },
        { file: "simple-groupchat.html", name: "Simple Groupchat" },
      ],
    },
    {
      group: "Architectures",
      items: [
        { file: "superwvy.html", name: "SuperWVY", tag: "R&D" },
        { file: "savvy.html", name: "Savvy", tag: "R&D" },
        { file: "wvy-custom-models.html", name: "WVY Custom Models" },
      ],
    },
  ];

  const current = location.pathname.split("/").pop() || "index.html";

  // ---------- sidebar ----------
  const sidebar = document.getElementById("docsSidebar");
  if (sidebar) {
    sidebar.innerHTML = NAV.map((g) => `
      <div class="side-group">
        <h5>${g.group}</h5>
        ${g.items.map((it) => `
          <a href="${it.file}" class="${it.file === current ? "active" : ""}">
            ${it.name}${it.tag ? `<span class="side-tag">${it.tag}</span>` : ""}
          </a>`).join("")}
      </div>`).join("");
  }

  // ---------- pager ----------
  const flat = NAV.flatMap((g) => g.items);
  const idx = flat.findIndex((it) => it.file === current);
  const pager = document.getElementById("docsPager");
  if (pager && idx !== -1) {
    const prev = flat[idx - 1];
    const next = flat[idx + 1];
    pager.className = "docs-pager";
    pager.innerHTML =
      (prev ? `<a class="pager-link prev" href="${prev.file}"><span class="pl-dir">← PREV</span><span class="pl-name">${prev.name}</span></a>` : "") +
      (next ? `<a class="pager-link next" href="${next.file}"><span class="pl-dir">NEXT →</span><span class="pl-name">${next.name}</span></a>` : "");
  }

  // ---------- right TOC from h2s ----------
  const toc = document.getElementById("docsToc");
  const heads = document.querySelectorAll(".docs-main h2[id]");
  if (toc && heads.length) {
    toc.innerHTML = "<h5>On this page</h5>" +
      [...heads].map((h) => `<a href="#${h.id}" data-id="${h.id}">${h.textContent}</a>`).join("");
    const links = toc.querySelectorAll("a");
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          links.forEach((l) => l.classList.toggle("active", l.dataset.id === entry.target.id));
        }
      });
    }, { rootMargin: "-80px 0px -70% 0px" });
    heads.forEach((h) => spy.observe(h));
  }

  // ---------- copy buttons on every code block ----------
  document.querySelectorAll(".code-block").forEach((block) => {
    const bar = block.querySelector(".code-block-bar");
    const pre = block.querySelector("pre");
    if (!bar || !pre) return;
    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.textContent = "copy";
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(pre.textContent.trim());
        btn.textContent = "copied ✓";
        btn.classList.add("copied");
        setTimeout(() => { btn.textContent = "copy"; btn.classList.remove("copied"); }, 1600);
      } catch {
        btn.textContent = "ctrl+c?";
      }
    });
    bar.appendChild(btn);
  });

  // ---------- mobile menu ----------
  const burger = document.getElementById("burger");
  const mobileMenu = document.getElementById("mobileMenu");
  if (burger && mobileMenu) {
    burger.addEventListener("click", () => mobileMenu.classList.toggle("open"));
  }
})();
