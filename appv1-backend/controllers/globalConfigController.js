const GlobalConfig = require('../models/GlobalConfig');

exports.getGlobalConfigs = async (req, res) => {
  try {
    const configs = await GlobalConfig.find();
    res.json({ success: true, configs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateGlobalConfig = async (req, res) => {
  try {
    const { key, value, description } = req.body;
    
    if (!key) {
      return res.status(400).json({ success: false, error: "Key is required" });
    }

    const config = await GlobalConfig.findOneAndUpdate(
      { key },
      { value, description },
      { upsert: true, new: true }
    );

    res.json({ 
      success: true, 
      message: `Config ${key} updated successfully`,
      config 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
