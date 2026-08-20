const { requireSession } = require('../server/authentication');
const { createIdentifier, identifier, optionalText, slug, text } = require('../server/content-schema');
const { loadContent, publishContent } = require('../server/github-content');
const { assertSameOrigin, handleError, readJson, requireMethod, sendJson } = require('../server/http');

const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_IMAGE_BYTES = 3_000_000;

function articleDate(value) {
  const normalized = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number.isNaN(Date.parse(`${normalized}T00:00:00Z`))) {
    throw Object.assign(new Error('Enter a valid article date.'), { statusCode: 400 });
  }
  return normalized;
}

function prepareImage(input, articleSlug) {
  if (!input) return null;
  const extension = IMAGE_TYPES[input.type];
  if (!extension || typeof input.base64 !== 'string') throw Object.assign(new Error('Use a PNG, JPG or WebP image.'), { statusCode: 400 });
  const bytes = Buffer.from(input.base64, 'base64');
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES || bytes.toString('base64').replace(/=+$/, '') !== input.base64.replace(/\s/g, '').replace(/=+$/, '')) {
    throw Object.assign(new Error('The image must be smaller than 3 MB.'), { statusCode: 400 });
  }
  const path = `content-images/${articleSlug}.${extension}`;
  return { path, base64: bytes.toString('base64'), publicPath: `/${path}` };
}

module.exports = async function researchArticles(request, response) {
  if (!requireMethod(request, response, ['POST'])) return;
  try {
    assertSameOrigin(request);
    requireSession(request);
    const input = await readJson(request);
    const action = String(input.action || 'create');
    const content = await loadContent();
    let article;
    let image = null;

    if (action === 'create') {
      const title = text(input.title, 'Title', 160);
      const articleSlug = `${slug(title)}-${Date.now().toString(36)}`;
      image = prepareImage(input.image, articleSlug);
      if (!image) throw Object.assign(new Error('Article image is required.'), { statusCode: 400 });
      article = {
        id: createIdentifier('article'),
        slug: articleSlug,
        title,
        subtitle: text(input.subtitle, 'Subtitle', 280),
        date: articleDate(input.date),
        image: image.publicPath,
        body: text(input.body, 'Article body', 80_000),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      content.researchArticles.unshift(article);
    } else if (action === 'update') {
      const id = identifier(input.id);
      article = content.researchArticles.find(item => item.id === id);
      if (!article) throw Object.assign(new Error('Article not found.'), { statusCode: 404 });
      image = prepareImage(input.image, `${article.slug}-${Date.now().toString(36)}`);
      article.title = text(input.title, 'Title', 160);
      article.subtitle = text(input.subtitle, 'Subtitle', 280);
      article.date = articleDate(input.date);
      article.body = text(input.body, 'Article body', 80_000);
      if (image) article.image = image.publicPath;
      article.updatedAt = new Date().toISOString();
    } else if (action === 'delete') {
      const id = identifier(input.id);
      const index = content.researchArticles.findIndex(item => item.id === id);
      if (index < 0) throw Object.assign(new Error('Article not found.'), { statusCode: 404 });
      [article] = content.researchArticles.splice(index, 1);
    } else {
      throw Object.assign(new Error('Invalid article action.'), { statusCode: 400 });
    }

    const commitSha = await publishContent(content, `${action === 'delete' ? 'Remove' : action === 'update' ? 'Update' : 'Publish'} research article: ${article.title}`, image && { path: image.path, base64: image.base64 });
    sendJson(response, 200, { content, article, commitSha });
  } catch (error) {
    handleError(response, error);
  }
};
