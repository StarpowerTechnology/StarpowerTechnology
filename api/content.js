const { requireSession } = require('../server/authentication');
const { loadContent } = require('../server/github-content');
const { handleError, requireMethod, sendJson } = require('../server/http');

module.exports = async function content(request, response) {
  if (!requireMethod(request, response, ['GET'])) return;
  try {
    requireSession(request);
    sendJson(response, 200, { content: await loadContent() });
  } catch (error) {
    handleError(response, error);
  }
};
