// Browser-side transport for the WVY website assistant.
// Talks to the /api/wvy-chat endpoint served by wvy-website-agent/server.js.
// The chat UI (js/mascot.js) drives this; persistence lives in wvy-chats.js.
(() => {
  const ENDPOINT = "/api/wvy-chat";
  const TIMEOUT_MS = 45000;

  // The page WVY should consider "current" — server maps it to a known page so
  // questions like "what is this page about" resolve without the user saying it.
  function pageContext() {
    return `${location.pathname}${location.hash}`;
  }

  async function send(messages, page) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, page: page || pageContext() }),
      });
    } finally {
      clearTimeout(timer);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "WVY model request failed.");
    data.reply = (data.reply || "I got you.").trim();
    return data;
  }

  // Resolve a navigation target to an href that works from any directory depth.
  function routeToHref(navigation) {
    if (!navigation || !navigation.path) return "";
    if (navigation.external || /^https?:|^mailto:/i.test(navigation.path)) return navigation.path;
    const root = /\/(docs|wvyworld)(\/|$)/.test(location.pathname) ? "../" : "";
    return root + navigation.path;
  }

  function offlineReply(error) {
    const detail = error && error.message ? ` (${error.message})` : "";
    return `i'm having trouble reaching my model server right now${detail}. start the WVY website agent and i'll wake back up.`;
  }

  window.WVYAgent = { pageContext, send, routeToHref, offlineReply };
})();
