const { clearSessionCookie } = require('../server/authentication');
const { assertSameOrigin, handleError, requireMethod, sendJson } = require('../server/http');

module.exports = async function logout(request, response) {
  if (!requireMethod(request, response, ['POST'])) return;
  try {
    assertSameOrigin(request);
    clearSessionCookie(response);
    sendJson(response, 200, { authenticated: false });
  } catch (error) {
    handleError(response, error);
  }
};
