const { assertLoginAllowed, clearLoginFailures, recordLoginFailure, setSessionCookie, verifyCredentials } = require('../server/authentication');
const { assertSameOrigin, handleError, readJson, requireMethod, sendJson } = require('../server/http');

module.exports = async function login(request, response) {
  if (!requireMethod(request, response, ['POST'])) return;
  try {
    assertSameOrigin(request);
    assertLoginAllowed(request);
    const { username, password } = await readJson(request);
    if (!verifyCredentials(username, password)) {
      recordLoginFailure(request);
      await new Promise(resolve => setTimeout(resolve, 650));
      return sendJson(response, 401, { error: 'Invalid username or password.' });
    }
    clearLoginFailures(request);
    setSessionCookie(response, String(username));
    sendJson(response, 200, { authenticated: true });
  } catch (error) {
    handleError(response, error);
  }
};
