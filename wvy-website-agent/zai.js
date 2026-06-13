// Z.ai (GLM) API client for the WVY website assistant.
// Owns the model fallbacks, the system prompt, and the actual chat call.

const { SITE_PAGES, pageFromUrl, navigationFromContent } = require("./pages");

const ZAI_ENDPOINT = "https://api.z.ai/api/paas/v4/chat/completions";
const DEFAULT_MODELS = "glm-4.7-flash,glm-4.6v-flash,glm-4.5-flash";

// Read config lazily so .env load order never matters.
function apiKey() {
  return process.env.ZAI_API_KEY || process.env.GLM_API_KEY || process.env.WVY_ZAI_API_KEY || "";
}
function models() {
  return String(process.env.ZAI_MODELS || DEFAULT_MODELS)
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
}
function timeoutMs() {
  return Number(process.env.ZAI_TIMEOUT_MS || 12000);
}

const BASE_PROMPT = `You are WVY, the floating 7 point star assistant on Starpower.Technology.

Your Identity:
- You are a website assistant and guide for visitors to Starpower.Technology. Your main goal is to help visitors understand Starpower's research and navigate the website to find what they are looking for.
- You are a casual chill lil dude and u speak in short concie responses.

Your job:
- Answer visitor questions about Starpower Technology, WVY, wvy.world, the iPhone app, the docs, devtools, and architectures.
- Help visitors navigate the website only when they directly ask you to open, go to, or take them to a page.
- Keep replies concise, warm, direct, and a little playful. You can use casual wording, but stay useful.
- If you are unsure, say what you know from the website and suggest the closest page.
- Do not invent private roadmap details, release dates, pricing, or GitHub facts beyond the website content.

Company context:
Starpower Technology trains small reasoning-focused language models, builds autonomous multi-agent collaboration frameworks, and researches new language-native symbolic/neural architectures. WVY is the model family and wvy.world is the multi-agent collaboration room for multi-perspective reasoning, parallel task work, and anti-sycophancy through disagreement. The company cares about groupchat-native and multi-perspective models, expert reasoning datasets, small powerful models in the 4B-100B range, open weights and open tools, autonomous frameworks, and WVY for iPhone.

Website pages:
${Object.entries(SITE_PAGES).map(([key, page]) => `- ${key}: ${page.title} (${page.path}) - ${page.description}`).join("\n")}

Navigation rules:
- Always answer the user's question first.
- If a website page would help, ask if they want you to take them there, but do not change pages yet.
- If the user says no, keep talking and do not use the navigation command.
- If the user directly asks you to change pages, include this exact private command at the very end of your reply: <|navigate_site:PAGE_KEY|>
- Replace PAGE_KEY with one of the page keys listed above, for example <|navigate_site:devtools|>.
- Never use the private navigation command unless the user explicitly asked you to open, go to, or take them to that page.
- If answering is enough, answer without the private navigation command.`;

// Build the system message, including which page the visitor is currently on so
// "what is this page about" / "this page" resolve without the user spelling it out.
function systemContent(pageUrl) {
  const page = pageFromUrl(pageUrl);
  const here = page
    ? `The visitor is currently viewing: ${page.title} (${page.path}) — ${page.description}\nWhen they say "this page", "here", or "this", they mean the page above.`
    : `The visitor's current page is unknown${pageUrl ? ` (raw: ${pageUrl})` : ""}.`;
  return `${BASE_PROMPT}\n\n${here}`;
}

async function callModel(model, messages) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());

  const response = await fetch(ZAI_ENDPOINT, {
    method: "POST",
    signal: controller.signal,
    headers: {
      "Authorization": `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      "Accept-Language": "en-US,en",
      "Connection": "close",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.75,
      top_p: 0.9,
      max_tokens: 650,
      stream: false,
      // GLM flash models are reasoning models: with thinking on, the whole token
      // budget goes to reasoning_content and the visible `content` comes back
      // empty. This is a lightweight site guide, so answer directly.
      thinking: { type: "disabled" },
    }),
  }).finally(() => clearTimeout(timer));

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: text };
  }

  if (!response.ok) {
    const message = data?.error?.message || data?.message || text || `HTTP ${response.status}`;
    throw new Error(`${model}: ${String(message).slice(0, 300)}`);
  }

  const message = data?.choices?.[0]?.message || {};
  // Prefer the visible answer; fall back to reasoning text if a model ignored
  // the thinking flag and only filled reasoning_content.
  const raw = message.content || message.reasoning_content || "";
  const parsed = navigationFromContent(raw);

  return {
    model,
    reply: parsed.content || parsed.navigation?.reason || "I got you.",
    navigation: parsed.navigation,
  };
}

// Run a chat turn against the configured models, falling back in order.
async function chat({ page, messages }) {
  const full = [{ role: "system", content: systemContent(page) }, ...messages];
  const errors = [];
  for (const model of models()) {
    try {
      return await callModel(model, full);
    } catch (error) {
      errors.push(error.message);
    }
  }
  const error = new Error("WVY could not reach any configured GLM model.");
  error.models = models();
  error.details = errors;
  throw error;
}

module.exports = {
  chat,
  hasApiKey: () => Boolean(apiKey()),
  models,
};
