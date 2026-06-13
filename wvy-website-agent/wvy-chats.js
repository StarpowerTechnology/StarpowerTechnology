// Browser-side WVY chat persistence and session state.
(() => {
  const STORAGE_KEY = "starpower.wvy.chats.v1";
  const STATE_KEY = "starpower.wvy.chatState.v1";
  const PENDING_KEY = "starpower.wvy.pending.v1";
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
  const CONTEXT_LIMIT = 10;
  const MAX_MESSAGES_PER_CHAT = 80;
  const MAX_CHATS = 24;

  const now = () => Date.now();
  const newId = () => `chat_${now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // If storage is full or disabled, keep the current page usable.
    }
  }

  function createChat(title = "New chat") {
    const timestamp = now();
    return {
      id: newId(),
      title,
      createdAt: timestamp,
      updatedAt: timestamp,
      messages: [],
    };
  }

  function normalizeStore(store) {
    const safeStore = store && Array.isArray(store.chats) ? store : { chats: [] };
    safeStore.chats = safeStore.chats
      .filter((chat) => chat && chat.id)
      .map((chat) => ({
        id: String(chat.id),
        title: String(chat.title || "New chat").slice(0, 80),
        createdAt: Number(chat.createdAt || now()),
        updatedAt: Number(chat.updatedAt || chat.createdAt || now()),
        messages: Array.isArray(chat.messages)
          ? chat.messages
              .filter((message) => message && (message.role === "user" || message.role === "assistant"))
              .map((message) => ({
                role: message.role,
                content: String(message.content || "").slice(0, 2500),
                at: Number(message.at || now()),
              }))
              .slice(-MAX_MESSAGES_PER_CHAT)
          : [],
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_CHATS);
    return safeStore;
  }

  function readStore() {
    return normalizeStore(readJson(STORAGE_KEY, { chats: [] }));
  }

  function saveStore(store) {
    writeJson(STORAGE_KEY, normalizeStore(store));
  }

  function readState() {
    const state = readJson(STATE_KEY, {});
    return {
      currentChatId: state.currentChatId || "",
      chatOpen: Boolean(state.chatOpen),
      activeView: state.activeView === "list" ? "list" : "chat",
      lastActiveAt: Number(state.lastActiveAt || 0),
    };
  }

  function saveState(next) {
    writeJson(STATE_KEY, { ...readState(), ...next, lastActiveAt: now() });
  }

  function getChat(store, id) {
    return store.chats.find((chat) => chat.id === id) || null;
  }

  function getChatById(id) {
    return getChat(readStore(), id);
  }

  // ---- pending reply: a request that was sent but not yet answered ----
  // Lets an in-flight reply survive a page switch: the next page resumes it.
  function setPending(pending) {
    if (!pending || !pending.chatId) return;
    writeJson(PENDING_KEY, {
      chatId: String(pending.chatId),
      messages: Array.isArray(pending.messages) ? pending.messages : [],
      page: String(pending.page || ""),
      at: now(),
    });
  }

  function getPending() {
    const pending = readJson(PENDING_KEY, null);
    if (!pending || !pending.chatId) return null;
    // drop anything stale enough that resuming would be confusing
    if (now() - Number(pending.at || 0) > SESSION_TIMEOUT_MS) {
      clearPending();
      return null;
    }
    return pending;
  }

  function clearPending() {
    try {
      localStorage.removeItem(PENDING_KEY);
    } catch {
      // ignore
    }
  }

  function ensureCurrentChat() {
    const store = readStore();
    const state = readState();
    const expired = state.lastActiveAt && now() - state.lastActiveAt > SESSION_TIMEOUT_MS;
    let current = expired ? null : getChat(store, state.currentChatId);

    if (!current) {
      current = createChat();
      store.chats.unshift(current);
      saveStore(store);
      saveState({ currentChatId: current.id, activeView: "chat" });
    } else {
      saveState({ currentChatId: current.id });
    }

    return current;
  }

  function listChats() {
    return readStore().chats;
  }

  function currentChat() {
    return ensureCurrentChat();
  }

  function setCurrentChat(id) {
    const store = readStore();
    const chat = getChat(store, id);
    if (!chat) return ensureCurrentChat();
    saveState({ currentChatId: chat.id, activeView: "chat", chatOpen: true });
    return chat;
  }

  function startNewChat() {
    const store = readStore();
    const chat = createChat();
    store.chats.unshift(chat);
    saveStore(store);
    saveState({ currentChatId: chat.id, activeView: "chat", chatOpen: true });
    return chat;
  }

  function appendMessage(role, content) {
    const text = String(content || "").trim();
    if (!text || (role !== "user" && role !== "assistant")) return null;

    const store = readStore();
    const state = readState();
    let chat = getChat(store, state.currentChatId);
    if (!chat) {
      chat = createChat();
      store.chats.unshift(chat);
    }

    chat.messages.push({ role, content: text.slice(0, 2500), at: now() });
    chat.messages = chat.messages.slice(-MAX_MESSAGES_PER_CHAT);
    if (role === "user" && (!chat.title || chat.title === "New chat")) {
      chat.title = text.replace(/\s+/g, " ").slice(0, 42) || "New chat";
    }
    chat.updatedAt = now();

    saveStore(store);
    saveState({ currentChatId: chat.id });
    return chat;
  }

  function contextMessages() {
    return ensureCurrentChat().messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .slice(-CONTEXT_LIMIT)
      .map((message) => ({ role: message.role, content: message.content }));
  }

  function setOpen(chatOpen) {
    saveState({ chatOpen: Boolean(chatOpen) });
  }

  function shouldRestoreOpen() {
    return readState().chatOpen && now() - readState().lastActiveAt <= SESSION_TIMEOUT_MS;
  }

  function setView(activeView) {
    saveState({ activeView: activeView === "list" ? "list" : "chat" });
  }

  function activeView() {
    return readState().activeView;
  }

  window.WVYChats = {
    CONTEXT_LIMIT,
    MAX_MESSAGES_PER_CHAT,
    SESSION_TIMEOUT_MS,
    appendMessage,
    activeView,
    clearPending,
    contextMessages,
    currentChat,
    ensureCurrentChat,
    getChatById,
    getPending,
    listChats,
    setCurrentChat,
    setOpen,
    setPending,
    setView,
    shouldRestoreOpen,
    startNewChat,
  };
})();
