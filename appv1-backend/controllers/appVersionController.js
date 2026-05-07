const AppVersion = require('../models/AppVersion');
const bcrypt = require('bcryptjs');

// Hardcoded hashed PIN for '988698'
// Generated via: bcrypt.hash('988698', 12)
const HASHED_PIN = '$2b$12$qGt7jFLe.jDrbpRS9m1Jw.9unOsD75BDocnX1.FbG4RA3P6WpyKqq'; // Hashed PIN for '988698'


// CREATE OR UPDATE VERSION (Single version pattern)
exports.createVersion = async (req, res) => {
  try {
    const { downloadUrl, version, notes, deployedDate, pin } = req.body;

    if (!pin) {
      return res.status(400).json({ success: false, message: 'PIN is required' });
    }

    // Verify PIN (Hardcoded 988698)
    const isPinValid = await bcrypt.compare(pin, HASHED_PIN); 
    if (!isPinValid) {
      return res.status(401).json({ success: false, message: 'Invalid PIN' });
    }

    if (!downloadUrl || !version) {
      return res.status(400).json({ success: false, message: 'downloadUrl and version are required' });
    }

    // Find the existing version or create a new one
    let appVersion = await AppVersion.findOne();

    if (appVersion) {
      // Update existing
      appVersion.downloadUrl = downloadUrl;
      appVersion.version = version;
      appVersion.notes = notes || appVersion.notes;
      appVersion.deployedDate = deployedDate ? new Date(deployedDate) : appVersion.deployedDate;
      appVersion.lastUpdatedDate = new Date();
      appVersion.isLatest = true;
      await appVersion.save();
    } else {
      // Create first one
      appVersion = await AppVersion.create({
        downloadUrl,
        version,
        notes,
        deployedDate: deployedDate ? new Date(deployedDate) : new Date(),
        lastUpdatedDate: new Date(),
        isLatest: true
      });
    }

    res.status(200).json({
      success: true,
      message: 'App version updated successfully',
      data: appVersion
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET ALL VERSIONS (Public as requested)
exports.getAllVersions = async (req, res) => {
  try {
    const versions = await AppVersion.find().sort({ deployedDate: -1 });
    res.json({
      success: true,
      count: versions.length,
      data: versions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// GET LATEST VERSION (Publicly accessible)
exports.getLatestVersion = async (req, res) => {
  try {
    const version = await AppVersion.findOne({ isLatest: true });
    if (!version) {
      return res.status(404).json({ success: false, message: 'No versions found' });
    }
    res.json({
      success: true,
      data: version
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE VERSION
exports.updateVersion = async (req, res) => {
  try {
    const { id } = req.params;
    const { pin, ...otherData } = req.body;

    if (!pin) {
      return res.status(400).json({ success: false, message: 'PIN is required' });
    }

    // Verify PIN
    const isPinValid = await bcrypt.compare(pin, HASHED_PIN);
    if (!isPinValid) {
      return res.status(401).json({ success: false, message: 'Invalid PIN' });
    }

    const updateData = { ...otherData, lastUpdatedDate: new Date() };

    
    // If setting as latest, unset others
    if (updateData.isLatest === true) {
      await AppVersion.updateMany({ _id: { $ne: id } }, { $set: { isLatest: false } });
    }

    const version = await AppVersion.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!version) {
      return res.status(404).json({ success: false, message: 'Version not found' });
    }

    res.json({
      success: true,
      data: version
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE VERSION
exports.deleteVersion = async (req, res) => {
  try {
    const { id } = req.params;
    const version = await AppVersion.findByIdAndDelete(id);
    
    if (!version) {
      return res.status(404).json({ success: false, message: 'Version not found' });
    }

    res.json({
      success: true,
      message: 'Version deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
