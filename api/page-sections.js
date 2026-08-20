const { requireSession } = require('../server/authentication');
const { createIdentifier, identifier, optionalText, pageId, text } = require('../server/content-schema');
const { loadContent, publishContent } = require('../server/github-content');
const { assertSameOrigin, handleError, readJson, requireMethod, sendJson } = require('../server/http');

module.exports = async function pageSections(request, response) {
  if (!requireMethod(request, response, ['POST'])) return;
  try {
    assertSameOrigin(request);
    requireSession(request);
    const input = await readJson(request);
    const page = pageId(input.page);
    const action = String(input.action || 'create');
    const content = await loadContent();
    const sections = content.pages[page].sections;
    let section;

    if (action === 'create') {
      section = {
        id: createIdentifier('section'),
        title: text(input.title, 'Title', 140),
        subtitle: optionalText(input.subtitle, 240),
        body: text(input.body, 'Body', 20_000),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      sections.push(section);
    } else if (action === 'update') {
      const id = identifier(input.id);
      section = sections.find(item => item.id === id);
      if (!section) throw Object.assign(new Error('Section not found.'), { statusCode: 404 });
      section.title = text(input.title, 'Title', 140);
      section.subtitle = optionalText(input.subtitle, 240);
      section.body = text(input.body, 'Body', 20_000);
      section.updatedAt = new Date().toISOString();
    } else if (action === 'delete') {
      const id = identifier(input.id);
      const index = sections.findIndex(item => item.id === id);
      if (index < 0) throw Object.assign(new Error('Section not found.'), { statusCode: 404 });
      [section] = sections.splice(index, 1);
    } else {
      throw Object.assign(new Error('Invalid section action.'), { statusCode: 400 });
    }

    const commitSha = await publishContent(content, `${action === 'delete' ? 'Remove' : action === 'update' ? 'Update' : 'Publish'} ${page} page section`);
    sendJson(response, 200, { content, section, commitSha });
  } catch (error) {
    handleError(response, error);
  }
};
