// ===== The Star — draggable 0G mascot + on-site assistant =====
(() => {
  const star = document.getElementById("mascot");
  if (!star || typeof gsap === "undefined") return;
  gsap.registerPlugin(Draggable, InertiaPlugin);

  const SIZE = () => star.offsetWidth;

  // start position: bottom-right, floating
  gsap.set(star, {
    x: window.innerWidth - SIZE() - 48,
    y: window.innerHeight - SIZE() - 56,
  });

  // ---- idle bob (paused while in 0G or dragging) ----
  const svg = star.querySelector(".mascot-inner");
  const bob = gsap.to(svg, {
    y: -10,
    rotation: 4,
    duration: 2.4,
    yoyo: true,
    repeat: -1,
    ease: "sine.inOut",
  });

  // ---- eyes: follow cursor + blink ----
  const eyes = star.querySelectorAll(".star-eye");
  let pointerX = window.innerWidth / 2, pointerY = window.innerHeight / 2;
  window.addEventListener("mousemove", (e) => { pointerX = e.clientX; pointerY = e.clientY; }, { passive: true });

  gsap.ticker.add(() => {
    const rect = star.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const ang = Math.atan2(pointerY - cy, pointerX - cx);
    const dist = Math.min(Math.hypot(pointerX - cx, pointerY - cy) / 90, 1) * 2.6;
    const dx = Math.cos(ang) * dist;
    const dy = Math.sin(ang) * dist;
    eyes.forEach((eye) => eye.style.transform = `translate(${dx}px, ${dy}px)`);

    // keep WVY's speech bubble pinned next to the star while it's talking
    if (bubbleVisible && !bubbleFloating) positionStarBubble(rect);
  });

  (function blink() {
    setTimeout(() => {
      gsap.to(eyes, { scaleY: 0.08, duration: 0.07, yoyo: true, repeat: 1, transformOrigin: "center" });
      if (Math.random() > 0.75) setTimeout(() => {
        gsap.to(eyes, { scaleY: 0.08, duration: 0.07, yoyo: true, repeat: 1 });
      }, 260);
      blink();
    }, 2200 + Math.random() * 3800);
  })();

  // ---- zero-gravity physics ----
  let vx = 0, vy = 0;
  let floating = false;
  let wasDragged = false;
  let floatStart = 0;
  let experience = false;

  const RESTITUTION = 0.92;   // edge bounce energy
  const SPACE_DRAG = 0.9996;  // basically frictionless
  const SETTLE = 18;          // px/s — below this it docks
  const FLOAT_FREE_MS = 3500; // pure 0G window; after this, drag ramps so it always settles

  function setWarp(on) {
    document.body.classList.toggle("warp", on);
  }

  function squash(nx, ny) {
    // squash along impact axis, mario-star style
    gsap.fromTo(svg,
      { scaleX: 1 - Math.abs(nx) * 0.25, scaleY: 1 - Math.abs(ny) * 0.25 },
      { scaleX: 1, scaleY: 1, duration: 0.5, ease: "elastic.out(1.2, 0.4)" }
    );
  }

  gsap.ticker.add((time, dt) => {
    if (!floating) return;
    const s = dt / 1000;
    const x = gsap.getProperty(star, "x") + vx * s;
    const y = gsap.getProperty(star, "y") + vy * s;
    const maxX = window.innerWidth - SIZE();
    const maxY = window.innerHeight - SIZE();

    let nx = x, ny = y;
    if (nx < 0) { nx = 0; vx = Math.abs(vx) * RESTITUTION; squash(1, 0); }
    else if (nx > maxX) { nx = maxX; vx = -Math.abs(vx) * RESTITUTION; squash(1, 0); }
    if (ny < 0) { ny = 0; vy = Math.abs(vy) * RESTITUTION; squash(0, 1); }
    else if (ny > maxY) { ny = maxY; vy = -Math.abs(vy) * RESTITUTION; squash(0, 1); }

    const overtime = performance.now() - floatStart - FLOAT_FREE_MS;
    const drag = overtime > 0 ? Math.max(0.965, SPACE_DRAG - overtime * 0.00002) : SPACE_DRAG;
    vx *= drag;
    vy *= drag;

    gsap.set(star, { x: nx, y: ny, rotation: `+=${vx * s * 0.05}` });

    if (Math.hypot(vx, vy) < SETTLE) {
      // stopped moving — but STAY in experience mode (blurred) and bob in place
      // until the user clicks the background to step out.
      floating = false;
      bob.play();
      gsap.to(star, { rotation: 0, duration: 0.8, ease: "power2.out" });
    }
  });

  InertiaPlugin.track(star, "x,y");

  Draggable.create(star, {
    type: "x,y",
    onPress() {
      floating = false;
      bob.pause();
      gsap.to(svg, { scale: 1.12, duration: 0.25, ease: "back.out(2)" });
      wasDragged = false;
    },
    onDragStart() { wasDragged = true; closeChat(); },
    onRelease() {
      gsap.to(svg, { scale: 1, duration: 0.3, ease: "back.out(1.5)" });
      if (!wasDragged) {
        // plain click. in experience mode it does nothing (drag to re-throw);
        // otherwise open the normal saved-chat popup.
        if (!experience) toggleChat();
        return;
      }
      // throw → zero gravity + experience mode
      vx = InertiaPlugin.getVelocity(star, "x");
      vy = InertiaPlugin.getVelocity(star, "y");
      if (Math.hypot(vx, vy) < SETTLE * 2) {
        bob.play(); // released gently → just dock
        return;
      }
      floating = true;
      floatStart = performance.now();
      enterExperience();
    },
  });

  window.addEventListener("resize", () => {
    const maxX = window.innerWidth - SIZE();
    const maxY = window.innerHeight - SIZE();
    gsap.set(star, {
      x: Math.min(gsap.getProperty(star, "x"), maxX),
      y: Math.min(gsap.getProperty(star, "y"), maxY),
    });
  });

  // ===================== STAR CHAT + EXPERIENCE =====================
  const chat = document.getElementById("starChat");
  const log = document.getElementById("starChatLog");
  const chatList = document.getElementById("starChatList");
  const form = document.getElementById("starChatForm");
  const input = document.getElementById("starChatInput");
  const closeBtn = document.getElementById("starChatClose");
  const chatTab = document.getElementById("starChatTab");
  const listTab = document.getElementById("starChatListTab");
  const chats = window.WVYChats;
  const agent = window.WVYAgent;

  const catcher = document.getElementById("warpCatcher");
  const expForm = document.getElementById("expForm");
  const expInput = document.getElementById("expInput");
  const starBubble = document.getElementById("starBubble");
  const sbText = starBubble ? starBubble.querySelector(".sb-text") : null;

  let chatOpen = false;
  let greeted = false;
  let bubbleVisible = false;
  let bubbleFloating = false;
  let bubbleTimer;
  let expEnteredAt = 0;
  let currentChat = chats ? chats.ensureCurrentChat() : { id: "memory", messages: [] };
  let activeView = chats ? chats.activeView() : "chat";
  greeted = currentChat.messages.length > 0;

  // ---------- experience mode (blurred 0G) ----------
  function enterExperience() {
    if (experience) return;
    experience = true;
    expEnteredAt = performance.now();
    setWarp(true);
    closeChat();
    setTimeout(() => { if (experience && expInput) expInput.focus(); }, 350);
    if (!greeted) {
      greeted = true;
      setTimeout(() => starBubbleSay("yo — i'm floating now ✦ talk to me from the bar down there. your words drift off into space, but i'm saving every one. click anywhere to step out and read it back."), 650);
    }
  }

  function exitExperience() {
    if (!experience) return;
    experience = false;
    floating = false;
    setWarp(false);
    hideStarBubble(true);
    bob.play();
    gsap.to(star, { rotation: 0, duration: 0.8, ease: "power2.out" });
    openChat();
  }

  if (catcher) catcher.addEventListener("click", () => {
    // ignore the trailing click that can follow a throw, so it doesn't insta-exit
    if (performance.now() - expEnteredAt < 500) return;
    exitExperience();
  });

  // ---------- WVY speech bubble (pinned to the star) ----------
  function positionStarBubble(rect) {
    rect = rect || star.getBoundingClientRect();
    const bw = starBubble.offsetWidth, bh = starBubble.offsetHeight;
    let left = rect.right + 14;
    if (left + bw > window.innerWidth - 12) left = rect.left - bw - 14;
    if (left < 12) left = 12;
    let top = rect.top - bh * 0.35;
    top = Math.max(12, Math.min(top, window.innerHeight - bh - 12));
    starBubble.style.left = left + "px";
    starBubble.style.top = top + "px";
  }

  function hideStarBubble(now) {
    clearTimeout(bubbleTimer);
    bubbleVisible = false;
    bubbleFloating = false;
    gsap.killTweensOf(starBubble);
    if (now) {
      starBubble.classList.add("hidden");
      gsap.set(starBubble, { y: 0, opacity: 1 });
    }
  }

  function floatBubbleAway() {
    bubbleFloating = true;
    gsap.to(starBubble, {
      y: "-=170", opacity: 0, duration: 2.2, ease: "power1.in",
      onComplete: () => {
        starBubble.classList.add("hidden");
        gsap.set(starBubble, { y: 0, opacity: 1 });
        bubbleVisible = false;
        bubbleFloating = false;
      },
    });
  }

  function starBubbleSay(text) {
    if (chats) {
      currentChat = chats.appendMessage("assistant", text) || currentChat;
      renderChatList();
    }
    addLine("star", text);            // always save to the log
    if (!experience) return;          // popup mode types in the window instead
    clearTimeout(bubbleTimer);
    gsap.killTweensOf(starBubble);
    bubbleFloating = false;
    bubbleVisible = true;
    starBubble.classList.remove("hidden");
    gsap.set(starBubble, { y: 0, opacity: 1 });
    let i = 0;
    (function type() {
      i++;
      sbText.innerHTML = text.slice(0, i) + (i < text.length ? '<span class="sb-caret">▌</span>' : "");
      positionStarBubble();
      if (i < text.length) bubbleTimer = setTimeout(type, 16 + Math.random() * 22);
      else bubbleTimer = setTimeout(floatBubbleAway, 2400 + text.length * 22);
    })();
  }

  function starBubbleThinking() {
    if (!experience) return;
    clearTimeout(bubbleTimer);
    gsap.killTweensOf(starBubble);
    bubbleFloating = false;
    bubbleVisible = true;
    starBubble.classList.remove("hidden");
    sbText.innerHTML = '<span class="sb-typing"><span></span><span></span><span></span></span>';
    gsap.set(starBubble, { y: 0, opacity: 1 });
    positionStarBubble();
  }

  // ---------- floating user message ----------
  function spawnFloatMsg(text) {
    const el = document.createElement("div");
    el.className = "float-msg";
    el.textContent = text;
    document.body.appendChild(el);
    gsap.set(el, { left: (40 + Math.random() * 20) + "%", bottom: 116, xPercent: -50, y: 24, opacity: 0 });
    gsap.timeline({ onComplete: () => el.remove() })
      .to(el, { opacity: 1, y: 0, duration: 0.4, ease: "back.out(1.6)" })
      .to(el, { y: -(window.innerHeight + 140), duration: 6.5, ease: "none" }, 0.25)
      .to(el, { opacity: 0, duration: 1.6 }, ">-2");
  }

  function positionChat() {
    const rect = star.getBoundingClientRect();
    const cw = chat.offsetWidth, ch = chat.offsetHeight;
    let left = rect.left - cw - 16;
    let top = rect.top - ch + rect.height;
    if (left < 12) left = rect.right + 16;
    if (left + cw > window.innerWidth - 12) left = window.innerWidth - cw - 12;
    top = Math.max(12, Math.min(top, window.innerHeight - ch - 12));
    chat.style.left = left + "px";
    chat.style.top = top + "px";
  }

  function addLine(cls, text) {
    const div = document.createElement("div");
    div.className = "chat-line " + cls;
    if (text) div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function renderMessages() {
    log.innerHTML = "";
    currentChat = chats ? chats.currentChat() : currentChat;
    currentChat.messages.forEach((message) => {
      addLine(message.role === "user" ? "you" : "star", message.content);
    });
  }

  function chatAgeLabel(timestamp) {
    const diff = Date.now() - Number(timestamp || Date.now());
    const minutes = Math.max(0, Math.round(diff / 60000));
    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
  }

  function renderChatList() {
    if (!chatList || !chats) return;
    const items = chats.listChats();
    chatList.innerHTML = "";

    const newBtn = document.createElement("button");
    newBtn.type = "button";
    newBtn.className = "chat-list-new";
    newBtn.textContent = "+ new chat";
    newBtn.addEventListener("click", () => {
      currentChat = chats.startNewChat();
      greeted = false;
      renderMessages();
      showChatView();
      openChat();
    });
    chatList.appendChild(newBtn);

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "chat-list-empty";
      empty.textContent = "no saved chats yet";
      chatList.appendChild(empty);
      return;
    }

    items.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chat-list-item" + (item.id === currentChat.id ? " active" : "");

      const title = document.createElement("span");
      title.className = "chat-list-title";
      title.textContent = item.title || "New chat";

      const meta = document.createElement("span");
      meta.className = "chat-list-meta";
      meta.textContent = `${item.messages.length} msgs · ${chatAgeLabel(item.updatedAt)}`;

      btn.append(title, meta);
      btn.addEventListener("click", () => {
        currentChat = chats.setCurrentChat(item.id);
        greeted = currentChat.messages.length > 0;
        renderMessages();
        showChatView();
        openChat();
      });
      chatList.appendChild(btn);
    });
  }

  function showChatView() {
    activeView = "chat";
    if (chats) chats.setView(activeView);
    chatTab?.classList.add("active");
    listTab?.classList.remove("active");
    log.classList.remove("hidden");
    form.classList.remove("hidden");
    chatList?.classList.add("hidden");
    if (chatOpen) input.focus();
  }

  function showListView() {
    activeView = "list";
    if (chats) chats.setView(activeView);
    renderChatList();
    chatTab?.classList.remove("active");
    listTab?.classList.add("active");
    log.classList.add("hidden");
    form.classList.add("hidden");
    chatList?.classList.remove("hidden");
  }

  let lastToggle = 0;
  function toggleChat() {
    const now = performance.now();
    if (now - lastToggle < 250) return; // guard against double-fired pointer events
    lastToggle = now;
    chatOpen ? closeChat() : openChat();
  }

  function openChat() {
    chatOpen = true;
    if (chats) chats.setOpen(true);
    chat.classList.remove("hidden");
    positionChat();
    gsap.fromTo(chat, { opacity: 0, scale: 0.92, y: 8 }, { opacity: 1, scale: 1, y: 0, duration: 0.25, ease: "back.out(1.6)" });
    if (activeView === "list") showListView();
    else showChatView();
    if (activeView === "chat" && !greeted && currentChat.messages.length === 0) {
      greeted = true;
      starSay("yo. i'm the star ★ — ask me anything about WVY, the architectures, or wvy.world. (you can also throw me.)");
    }
  }

  function closeChat() {
    if (!chatOpen) return;
    chatOpen = false;
    if (chats) chats.setOpen(false);
    chat.classList.add("hidden");
  }

  closeBtn.addEventListener("click", closeChat);
  chatTab?.addEventListener("click", showChatView);
  listTab?.addEventListener("click", showListView);
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (experience) exitExperience();
    else closeChat();
  });

  function starSay(text) {
    if (chats) {
      currentChat = chats.appendMessage("assistant", text) || currentChat;
      renderChatList();
    }
    const line = addLine("star", "");
    typeStarLine(line, text);
  }

  function typeStarLine(line, text) {
    let i = 0;
    (function type() {
      if (!chatOpen && i > 0) { line.textContent = text; return; }
      i++;
      line.textContent = text.slice(0, i);
      log.scrollTop = log.scrollHeight;
      if (i < text.length) setTimeout(type, 14 + Math.random() * 22);
    })();
  }

  function followNavigation(navigation) {
    const href = agent ? agent.routeToHref(navigation) : "";
    if (!href) return;
    if (chats) chats.setOpen(chatOpen);
    setTimeout(() => { location.href = href; }, 900);
  }

  // Snapshot the outgoing turn and mark it pending BEFORE the request, so a page
  // switch mid-reply can be resumed on the next page instead of being dropped.
  async function answer() {
    const messages = chats ? chats.contextMessages() : [];
    const page = agent ? agent.pageContext() : `${location.pathname}${location.hash}`;
    if (chats) chats.setPending({ chatId: currentChat.id, messages, page });
    if (!agent) throw new Error("WVY agent client not loaded.");
    return agent.send(messages, page);
  }

  function offlineReply(error) {
    return agent
      ? agent.offlineReply(error)
      : "i can't reach my model server right now. start the WVY website agent and i'll wake back up.";
  }

  // A real server/timeout error is final; a navigation-aborted request keeps its
  // pending slot so the next page can finish it.
  function dropPending(error) {
    if (chats && !(error && error.name === "AbortError")) chats.clearPending();
  }

  async function replyInChat() {
    const line = addLine("star", "WVY is thinking...");
    try {
      const data = await answer();
      if (chats) {
        currentChat = chats.appendMessage("assistant", data.reply) || currentChat;
        chats.clearPending();
        renderChatList();
      }
      typeStarLine(line, data.reply);
      followNavigation(data.navigation);
    } catch (error) {
      dropPending(error);
      typeStarLine(line, offlineReply(error));
    }
  }

  async function replyInBubble() {
    starBubbleThinking();
    try {
      const data = await answer();
      if (chats) chats.clearPending();
      starBubbleSay(data.reply); // starBubbleSay persists the assistant message
      followNavigation(data.navigation);
    } catch (error) {
      dropPending(error);
      starBubbleSay(offlineReply(error));
    }
  }

  // On load, finish any reply that was interrupted by a page switch.
  async function resumePending() {
    if (!chats || !agent) return;
    const pending = chats.getPending();
    if (!pending) return;
    const chat = chats.getChatById(pending.chatId);
    const last = chat && chat.messages[chat.messages.length - 1];
    if (last && last.role === "assistant") { chats.clearPending(); return; } // already answered
    try {
      const data = await agent.send(pending.messages, pending.page);
      currentChat = chats.appendMessage("assistant", data.reply) || currentChat;
      if (chatOpen) renderMessages();
      renderChatList();
      followNavigation(data.navigation);
    } catch {
      // couldn't finish it; nothing saved
    } finally {
      chats.clearPending();
    }
  }

  // popup form (normal mode) — types the reply into the window
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    if (chats) {
      currentChat = chats.appendMessage("user", q) || currentChat;
      renderChatList();
    }
    addLine("you", q);
    input.value = "";
    setTimeout(() => replyInChat(), 350 + Math.random() * 400);
  });

  // bottom bar (experience mode) — message floats up, WVY replies in a bubble
  if (expForm) expForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = expInput.value.trim();
    if (!q) return;
    if (chats) {
      currentChat = chats.appendMessage("user", q) || currentChat;
      renderChatList();
    }
    addLine("you", q);
    spawnFloatMsg(q);
    expInput.value = "";
    setTimeout(() => replyInBubble(), 500 + Math.random() * 400);
  });

  renderMessages();
  renderChatList();
  resumePending();
  if (chats && chats.shouldRestoreOpen()) {
    activeView = chats.activeView();
    requestAnimationFrame(openChat);
  }
})();
