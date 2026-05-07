const jwt = require('jsonwebtoken');

const superAdminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No access token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if role is super_admin
    if (decoded.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Not a Super Admin'
      });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired access token'
    });
  }
};

module.exports = superAdminAuth;
