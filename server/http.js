const MAX_BODY_BYTES = 4_400_000;

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(payload));
}

function requireMethod(request, response, allowedMethods) {
  if (allowedMethods.includes(request.method)) return true;
  response.setHeader('Allow', allowedMethods.join(', '));
  sendJson(response, 405, { error: 'Method not allowed.' });
  return false;
}

function assertSameOrigin(request) {
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (!origin || !host) throw Object.assign(new Error('Invalid request origin.'), { statusCode: 403 });
  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw Object.assign(new Error('Invalid request origin.'), { statusCode: 403 });
  }
  if (originHost !== host) throw Object.assign(new Error('Invalid request origin.'), { statusCode: 403 });
}

async function readJson(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('Request is too large.'), { statusCode: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw Object.assign(new Error('Invalid JSON request.'), { statusCode: 400 });
  }
}

function handleError(response, error) {
  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  const message = statusCode === 500 ? 'The server could not complete the request.' : error.message;
  sendJson(response, statusCode, { error: message });
}

module.exports = { assertSameOrigin, handleError, readJson, requireMethod, sendJson };
