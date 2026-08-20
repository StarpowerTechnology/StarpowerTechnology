const { readSession } = require('../server/authentication');
const { handleError, requireMethod, sendJson } = require('../server/http');

module.exports = async function session(request, response) {
  if (!requireMethod(request, response, ['GET'])) return;
  try {
    const activeSession = readSession(request);
    sendJson(response, activeSession ? 200 : 401, { authenticated: Boolean(activeSession), username: activeSession?.username || null });
  } catch (error) {
    handleError(response, error);
  }
};
