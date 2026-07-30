const jwt = require('jsonwebtoken');

/**
 * Auth guard for the NammaSambrama admin panel.
 *
 * Always answers 401 with `showLoginpage: true` so the UI can redirect to the
 * login page on any auth failure (missing, malformed, invalid or expired token).
 *
 * Tokens are scoped — a token issued by the school app will not be accepted
 * here even though both are signed with the same JWT_SECRET.
 */
const nammasambramaAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided', showLoginpage: true });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.scope !== 'nammasambrama') {
      return res.status(401).json({ error: 'Invalid token scope', showLoginpage: true });
    }

    req.admin = decoded; // { adminId, username, email, scope }
    next();
  } catch (error) {
    const expired = error.name === 'TokenExpiredError';
    return res.status(401).json({
      error: expired ? 'Token expired' : 'Invalid token',
      showLoginpage: true
    });
  }
};

module.exports = nammasambramaAuth;
