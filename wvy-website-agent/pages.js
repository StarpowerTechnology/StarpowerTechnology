// Shared catalog of Starpower.Technology pages.
// Used by the system prompt, by current-page detection (so WVY knows where the
// visitor is), and by the in-reply navigation command.

const SITE_PAGES = {
  home: {
    title: "Home",
    path: "index.html",
    description: "Main Starpower Technology landing page, research agenda, devtools, app preview, and wvy.world section.",
  },
  research: {
    title: "Research Agenda",
    path: "index.html#mission",
    description: "The six-part Starpower research agenda: groupchat-native models, expert reasoning, small powerful models, open weights, autonomy, and iPhone.",
  },
  devtools: {
    title: "DevTools Docs",
    path: "docs/index.html",
    description: "Docs introduction and index for Starpower devtools and architectures.",
  },
  app: {
    title: "WVY for iPhone",
    path: "index.html#app",
    description: "The coming WVY iPhone app section with screenshots and TestFlight status.",
  },
  wvy_world: {
    title: "wvy.world",
    path: "wvyworld/",
    description: "Internal Starpower page explaining wvy.world, the WVY multi-agent collaboration room for multi-perspective reasoning and parallel tasks.",
  },
  studio: {
    title: "Starpower Studio",
    path: "/studio",
    external: true,
    description: "Browser-based dataset builder for SFT data: a chat-style editor for user/assistant/system turns, JSONL export, cloud-saved projects, and public dataset sharing.",
  },
  wvy_opensource: {
    title: "WVY OpenSource",
    path: "docs/wvy-opensource.html",
    description: "Swift macOS app for autonomous multi-agent rooms, with independent sleep/wake agents and separate perspectives.",
  },
  starpower_autonomy: {
    title: "Starpower Autonomy",
    path: "docs/starpower-autonomy.html",
    description: "Production autonomous runtime where WVY and Savvy run as isolated minds with communicate, filemanagement, and websearch signals.",
  },
  voice_agents: {
    title: "Voice Agents",
    path: "docs/voice-agents.html",
    description: "Hands-free voice orchestration over backend agents that search, write, and read results back.",
  },
  youtube_researcher: {
    title: "YouTube Researcher",
    path: "docs/youtube-researcher.html",
    description: "Agent that searches YouTube, downloads audio, transcribes with Whisper, and answers from what it watched.",
  },
  autonomous_researcher: {
    title: "Autonomous Researcher",
    path: "docs/autonomous-researcher.html",
    description: "Self-directed Savvy research agent with tools, mental notes, and a reflection loop.",
  },
  simple_groupchat: {
    title: "Simple Groupchat",
    path: "docs/simple-groupchat.html",
    description: "Two autonomous Telegram agents, WVY and Savvy, sharing a room, challenging assumptions, and reasoning from separate perspectives.",
  },
  superwvy: {
    title: "SuperWVY",
    path: "docs/superwvy.html",
    description: "Language-native symbolic/neural architecture research built around letters, morphemes, words, hierarchy, and meaning units.",
  },
  savvy: {
    title: "Savvy",
    path: "docs/savvy.html",
    description: "Symbolic/neural hybrid designed to be an autonomous researcher trained on expert thinking patterns.",
  },
  wvy_custom_models: {
    title: "WVY Custom Models",
    path: "docs/wvy-custom-models.html",
    description: "Small-model training roadmap on Qwen and GLM, focused on polished datasets, information use, and reasoning per parameter.",
  },
  contact: {
    title: "Contact Starpower",
    path: "mailto:hello@starpower.technology",
    external: true,
    description: "Email Starpower Technology.",
  },
};

// Normalize a path so "/", "", and "wvyworld/" all resolve to a comparable form.
function normalizePath(raw) {
  let path = String(raw || "").replace(/^\/+/, "");
  if (path === "" || path.endsWith("/")) path += "index.html";
  return path;
}

// Map a visitor URL (pathname + optional hash, or a full URL) to the closest
// known page so WVY can answer "what is this page about" without guessing.
function pageFromUrl(rawUrl) {
  let input = String(rawUrl || "").trim();
  if (!input) return null;

  if (/^https?:\/\//i.test(input)) {
    try {
      const u = new URL(input);
      input = u.pathname + u.hash;
    } catch {
      /* fall through and treat it as a plain path */
    }
  }

  const [rawPath, rawHash = ""] = input.split("#");
  const path = normalizePath(rawPath);
  const hash = rawHash ? `#${rawHash}` : "";

  let exact = null;
  let pathOnly = null;
  for (const [key, page] of Object.entries(SITE_PAGES)) {
    if (page.external) continue;
    const [pp, ph = ""] = String(page.path).split("#");
    const pagePath = normalizePath(pp);
    const pageHash = ph ? `#${ph}` : "";
    if (pagePath === path && pageHash === hash) exact = { key, page };
    if (pagePath === path && !pathOnly) pathOnly = { key, page };
  }

  const hit = exact || pathOnly;
  return hit ? { key: hit.key, ...hit.page } : null;
}

// Pull a <|navigate_site:KEY|> command out of a model reply and resolve it to a
// real page. Returns the cleaned text plus the navigation target (if any).
function navigationFromContent(content) {
  let navigation = null;
  const cleaned = String(content || "").replace(/<\|navigate_site:([a-z0-9_]+)\|>/gi, (match, pageKey) => {
    const key = String(pageKey || "").toLowerCase();
    const page = SITE_PAGES[key];
    if (page && !navigation) {
      navigation = {
        key,
        title: page.title,
        path: page.path,
        external: Boolean(page.external),
        reason: `Opening ${page.title}.`,
      };
    }
    return "";
  }).trim();

  return { content: cleaned, navigation };
}

module.exports = { SITE_PAGES, pageFromUrl, navigationFromContent };
