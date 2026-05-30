const jwt = require('jsonwebtoken');
const ActiveSession = require('../models/ActiveSession');

const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Contains orgId, role, etc.

    // Single-device login validation
    // Prioritize specific user IDs over orgId, because orgId is used as a fallback for Org Admins
    const identifier = decoded.studentId || decoded.teacherId || decoded.adminId || decoded.userId || decoded.orgId;
    if (identifier) {
      const session = await ActiveSession.findOne({ userId: identifier });
      
      // If no session exists or the session tokens do not match, the token is invalid (logged out or logged in elsewhere)
      if (!session || session.sessionToken !== decoded.sessionToken) {
        return res.status(401).json({ error: 'Session expired or logged in from another device', showLoginpage: true });
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token', showLoginpage: true });
  }
};

module.exports = auth;
