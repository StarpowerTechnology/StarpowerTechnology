const crypto = require('node:crypto');

const PAGE_IDS = ['models', 'arxiv-wvy-base', 'human-data-center', 'roadmap', 'sculpting', 'future-vision', 'research'];

function text(value, field, maximum) {
  const normalized = String(value || '').trim();
  if (!normalized) throw Object.assign(new Error(`${field} is required.`), { statusCode: 400 });
  if (normalized.length > maximum) throw Object.assign(new Error(`${field} is too long.`), { statusCode: 400 });
  return normalized;
}

function optionalText(value, maximum) {
  const normalized = String(value || '').trim();
  if (normalized.length > maximum) throw Object.assign(new Error('A field is too long.'), { statusCode: 400 });
  return normalized;
}

function pageId(value) {
  if (!PAGE_IDS.includes(value)) throw Object.assign(new Error('Invalid page.'), { statusCode: 400 });
  return value;
}

function identifier(value) {
  const normalized = String(value || '');
  if (!/^[a-z0-9-]{8,80}$/.test(normalized)) throw Object.assign(new Error('Invalid content identifier.'), { statusCode: 400 });
  return normalized;
}

function createIdentifier(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
}

function slug(value) {
  const normalized = String(value || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72);
  if (!normalized) throw Object.assign(new Error('The title must contain letters or numbers.'), { statusCode: 400 });
  return normalized;
}

function emptyContent() {
  return {
    version: 1,
    pages: Object.fromEntries(PAGE_IDS.map(page => [page, { sections: [] }])),
    researchArticles: [],
  };
}

function normalizeContent(content) {
  const normalized = emptyContent();
  if (!content || typeof content !== 'object') return normalized;
  for (const page of PAGE_IDS) {
    const sections = content.pages?.[page]?.sections;
    if (Array.isArray(sections)) normalized.pages[page].sections = sections;
  }
  if (Array.isArray(content.researchArticles)) normalized.researchArticles = content.researchArticles;
  return normalized;
}

module.exports = { PAGE_IDS, createIdentifier, emptyContent, identifier, normalizeContent, optionalText, pageId, slug, text };
