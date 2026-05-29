const Organization = require('../models/Organization');

const checkOrgStatus = async (req, res, next) => {
  try {
    const orgId = req.user?.orgId;
    
    // Bypass org check for super admins
    if (req.user?.role === 'super_admin') {
      return next();
    }

    if (!orgId) {
      return res.status(400).json({ error: 'Organization ID not found in token' });
    }

    const organization = await Organization.findOne({ orgId });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    if (organization.isActive === false) {
      return res.status(403).json({ 
        error: 'Organization Deactivated',
        message: 'Your organization has been deactivated. Please contact support.' 
      });
    }

    next();
  } catch (error) {
    console.error('CheckOrgStatus error:', error);
    res.status(500).json({ error: 'Internal server error during organization status check' });
  }
};

module.exports = checkOrgStatus;
