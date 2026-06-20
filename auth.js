const crypto = require('crypto');

const SECRET = process.env.JWT_SECRET || process.env.ADMIN_PASSWORD || 'faq-secret-change-me';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function createToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    exp: Date.now() + TTL_MS
  };
  const data = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('hex');
  return Buffer.from(JSON.stringify({ data, sig })).toString('base64url');
}

function verifyToken(token) {
  try {
    const parsed = JSON.parse(Buffer.from(token, 'base64url').toString());
    const expected = crypto.createHmac('sha256', SECRET).update(parsed.data).digest('hex');
    if (parsed.sig !== expected) return null;
    const payload = JSON.parse(parsed.data);
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = { createToken, verifyToken };
