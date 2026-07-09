// ===== Homepage: terminal, streaming titles, aims, chat sim =====
(() => {
  if (typeof gsap !== "undefined") gsap.registerPlugin(ScrollTrigger);

  // ---------- hero subtitle: streams in like model output ----------
  const heroSub = document.getElementById("heroSub");
  const HERO_TEXT = "Creating language models for fully independent agentic capabilities to achieve goals without a direct human supervisor. We develop teams for multi perspective tasks/conversations, build autonomous frameworks, and design new symbolic/neural architectures. WVY 1.7 1.5M is on Kaggle. BbyWVY 360M is on Hugging Face. wvy.world is where WVY lives.";
  if (heroSub) {
    let i = 0;
    (function type() {
      i++;
      heroSub.innerHTML = HERO_TEXT.slice(0, i) + '<span class="caret">▌</span>';
      if (i < HERO_TEXT.length) setTimeout(type, 12 + Math.random() * 18);
      else setTimeout(() => { heroSub.innerHTML = HERO_TEXT; }, 4000);
    })();
  }

  // ---------- training console: endless live log ----------
  const termCode = document.getElementById("termCode");
  const LOG_POOL = [
    '<span class="tl-dim">$</span> <span class="tl-white">wvy train</span> --model wvy-1 --task groupchat',
    '<span class="tl-key">epoch</span> <span class="tl-val">{e}</span> · <span class="tl-key">loss</span> <span class="tl-val">{loss}</span> <span class="tl-ok">▼</span> · <span class="tl-key">tok/s</span> <span class="tl-val">{tps}k</span>',
    '<span class="tl-dim">[data]</span> sampling expert reasoning traces… <span class="tl-ok">ok</span>',
    '<span class="tl-dim">[arch]</span> SuperWVY symbolic graph: <span class="tl-val">{nodes}</span> nodes linked',
    '<span class="tl-dim">[agents]</span> spawning perspectives: <span class="tl-key">planner</span>, <span class="tl-key">critic</span>, <span class="tl-key">builder</span> <span class="tl-ok">● online</span>',
    '<span class="tl-dim">[eval]</span> multi-perspective reasoning: <span class="tl-ok">{pct}% pass</span>',
    '<span class="tl-dim">[ckpt]</span> saved → <span class="tl-val">wvy-1-{ck}.safetensors</span>',
    '<span class="tl-dim">[autonomy]</span> researcher loop {n}: question → search → synthesize <span class="tl-ok">✓</span>',
    '<span class="tl-warn">[note]</span> small model, big energy — {p}B params holding the room',
    '<span class="tl-dim">[deploy]</span> pushing build → <span class="tl-val">wvy.world</span> <span class="tl-ok">live</span>',
  ];
  let epoch = 12, loss = 2.31, ck = 47;
  function nextLog() {
    const raw = LOG_POOL[Math.floor(Math.random() * LOG_POOL.length)];
    epoch += Math.random() > 0.6 ? 1 : 0;
    loss = Math.max(0.41, loss - Math.random() * 0.04);
    ck += 1;
    return raw
      .replace("{e}", epoch)
      .replace("{loss}", loss.toFixed(3))
      .replace("{tps}", (38 + Math.random() * 24).toFixed(0))
      .replace("{nodes}", (1200 + Math.random() * 900).toFixed(0))
      .replace("{pct}", (88 + Math.random() * 11).toFixed(1))
      .replace("{ck}", String(ck).padStart(4, "0"))
      .replace("{n}", (Math.random() * 30 + 1).toFixed(0))
      .replace("{p}", [4, 9, 32][Math.floor(Math.random() * 3)]);
  }
  if (termCode) {
    const lines = ['<span class="tl-dim">$</span> <span class="tl-white">starpower</span> --init', '<span class="tl-ok">★ starpower technology — training console</span>'];
    function pushLine() {
      lines.push(nextLog());
      if (lines.length > 14) lines.shift();
      termCode.innerHTML = lines.join("\n") + '\n<span class="term-caret">▌</span>';
      setTimeout(pushLine, 700 + Math.random() * 1300);
    }
    pushLine();
  }

  // ---------- section titles: stream on scroll into view ----------
  document.querySelectorAll(".stream-title").forEach((el) => {
    const text = el.dataset.stream || el.textContent;
    el.textContent = "";
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(el);
        let i = 0;
        (function type() {
          i++;
          el.innerHTML = text.slice(0, i) + '<span class="caret">▌</span>';
          if (i < text.length) setTimeout(type, 34);
          else setTimeout(() => { el.innerHTML = text; }, 2500);
        })();
      });
    }, { threshold: 0.6 });
    io.observe(el);
  });

  // ---------- aims light up as you scroll ----------
  document.querySelectorAll(".aim").forEach((aim, i) => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setTimeout(() => aim.classList.add("lit"), i * 90);
          io.unobserve(aim);
        }
      });
    }, { threshold: 0.5 });
    io.observe(aim);
  });

  // ---------- generic reveals ----------
  document.querySelectorAll(".index-row, .terminal, .chat-sim, .phone, .app-copy, .world-copy").forEach((el) => {
    el.classList.add("reveal");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("visible"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.15 });
    io.observe(el);
  });

  // ---------- wvy.world live chat simulation ----------
  const simBody = document.getElementById("chatSimBody");
  if (simBody) {
    const SCRIPT = [
      { name: "savvy", agent: false, av: "S", text: "need a plan for parallel code review + docs" },
      { name: "Planner", agent: true, av: "P", text: "splitting it: architecture notes, bugs, and user-facing copy" },
      { name: "Critic", agent: true, av: "C", text: "watch for sycophancy. i'll challenge weak assumptions before we ship" },
      { name: "Builder", agent: true, av: "B", text: "i'll patch the concrete issues while planner tracks dependencies" },
      { name: "savvy", agent: false, av: "S", text: "good. disagree where needed, don't just agree with me" },
      { name: "Critic", agent: true, av: "C", text: "first disagreement: the docs page needs a clearer problem statement" },
      { name: "Planner", agent: true, av: "P", text: "noted. updating task graph and handing implementation to builder" },
      { name: "Builder", agent: true, av: "B", text: "patch ready → tests next, then summary" },
    ];
    let idx = 0;
    const live = [];
    function pushMsg() {
      const m = SCRIPT[idx % SCRIPT.length];
      idx++;
      // typing indicator first for agents
      const make = (typing) => {
        const div = document.createElement("div");
        div.className = "sim-msg";
        div.innerHTML = `
          <span class="sim-av ${m.agent ? "agent" : ""}">${m.av}</span>
          <div><span class="sim-name">${m.name}${m.agent ? '<span class="agent-tag">agent</span>' : ""}</span>
          <p>${typing ? '<span class="sim-dots"><span></span><span></span><span></span></span>' : m.text}</p></div>`;
        return div;
      };
      const show = (node) => {
        simBody.appendChild(node);
        live.push(node);
        while (live.length > 7) live.shift().remove();
      };
      if (m.agent) {
        const t = make(true);
        show(t);
        setTimeout(() => { t.replaceWith(make(false)); }, 900 + Math.random() * 800);
      } else {
        show(make(false));
      }
      setTimeout(pushMsg, 2400 + Math.random() * 2200);
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { pushMsg(); io.disconnect(); }
      });
    }, { threshold: 0.3 });
    io.observe(simBody);
  }

  // ---------- mobile menu ----------
  const burger = document.getElementById("burger");
  const mobileMenu = document.getElementById("mobileMenu");
  if (burger && mobileMenu) {
    burger.addEventListener("click", () => mobileMenu.classList.toggle("open"));
    mobileMenu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => mobileMenu.classList.remove("open")));
  }
})();
