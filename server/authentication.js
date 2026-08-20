const crypto = require('node:crypto');

const COOKIE_NAME = 'starpower_admin';
const SESSION_SECONDS = 12 * 60 * 60;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_ATTEMPTS = 5;
const loginAttempts = new Map();

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw Object.assign(new Error(`Missing server configuration: ${name}`), { statusCode: 500 });
  return value;
}

function parseCookies(request) {
  return String(request.headers.cookie || '').split(';').reduce((cookies, pair) => {
    const separator = pair.indexOf('=');
    if (separator < 0) return cookies;
    const name = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    if (name) cookies[name] = value;
    return cookies;
  }, {});
}

function safeEqualHex(left, right) {
  if (!/^[a-f0-9]+$/i.test(left) || !/^[a-f0-9]+$/i.test(right)) return false;
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function clientAddress(request) {
  return String(request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}

function assertLoginAllowed(request) {
  const key = clientAddress(request);
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record || now - record.startedAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 0, startedAt: now });
    return;
  }
  if (record.count >= LOGIN_ATTEMPTS) {
    throw Object.assign(new Error('Too many login attempts. Try again later.'), { statusCode: 429 });
  }
}

function recordLoginFailure(request) {
  const key = clientAddress(request);
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record || now - record.startedAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, startedAt: now });
    return;
  }
  record.count += 1;
}

function clearLoginFailures(request) {
  loginAttempts.delete(clientAddress(request));
}

function verifyCredentials(username, password) {
  const expectedUsername = requiredEnvironment('ADMIN_USERNAME');
  const salt = requiredEnvironment('ADMIN_PASSWORD_SALT');
  const expectedHash = requiredEnvironment('ADMIN_PASSWORD_HASH');
  const actualHash = crypto.scryptSync(String(password || ''), salt, 64).toString('hex');
  const usernameMatch = crypto.timingSafeEqual(
    crypto.createHash('sha256').update(String(username || '')).digest(),
    crypto.createHash('sha256').update(expectedUsername).digest(),
  );
  return usernameMatch && safeEqualHex(actualHash, expectedHash);
}

function signSession(username) {
  const payload = Buffer.from(JSON.stringify({ username, expiresAt: Date.now() + SESSION_SECONDS * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', requiredEnvironment('SESSION_SECRET')).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function readSession(request) {
  const token = parseCookies(request)[COOKIE_NAME];
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expectedSignature = crypto.createHmac('sha256', requiredEnvironment('SESSION_SECRET')).update(payload).digest('base64url');
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (session.expiresAt <= Date.now() || session.username !== requiredEnvironment('ADMIN_USERNAME')) return null;
    return session;
  } catch {
    return null;
  }
}

function requireSession(request) {
  const session = readSession(request);
  if (!session) throw Object.assign(new Error('Authentication required.'), { statusCode: 401 });
  return session;
}

function setSessionCookie(response, username) {
  response.setHeader('Set-Cookie', `${COOKIE_NAME}=${signSession(username)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`);
}

function clearSessionCookie(response) {
  response.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
}

module.exports = {
  assertLoginAllowed,
  clearLoginFailures,
  clearSessionCookie,
  readSession,
  recordLoginFailure,
  requireSession,
  setSessionCookie,
  verifyCredentials,
};
