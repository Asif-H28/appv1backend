const GlobalConfig = require('../models/GlobalConfig');
const bcrypt = require('bcryptjs');

// Hardcoded hashed PIN for '988698'
const HASHED_PIN = '$2b$12$qGt7jFLe.jDrbpRS9m1Jw.9unOsD75BDocnX1.FbG4RA3P6WpyKqq';

exports.getGlobalConfigs = async (req, res) => {
  try {
    const { orgId } = req.query;
    const filter = orgId ? { orgId } : { orgId: null };
    const configs = await GlobalConfig.find(filter);
    res.json({ success: true, configs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateGlobalConfig = async (req, res) => {
  try {
    const { key, value, description, pin, orgId } = req.body;
    
    if (!key) {
      return res.status(400).json({ success: false, error: "Key is required" });
    }

    if (!pin) {
      return res.status(400).json({ success: false, error: "PIN is required" });
    }

    // Verify PIN
    const isPinValid = await bcrypt.compare(pin, HASHED_PIN);
    if (!isPinValid) {
      return res.status(401).json({ success: false, error: "Invalid PIN" });
    }

    const config = await GlobalConfig.findOneAndUpdate(
      { key, orgId: orgId || null },
      { value, description },
      { upsert: true, new: true }
    );

    res.json({ 
      success: true, 
      message: `Config ${key} ${orgId ? `for org ${orgId}` : 'globally'} updated successfully`,
      config 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
