const AppVersion = require('../models/AppVersion');

// CREATE NEW APP VERSION
exports.createVersion = async (req, res) => {
  try {
    const { downloadUrl, version, notes, deployedDate } = req.body;

    if (!downloadUrl || !version) {
      return res.status(400).json({ success: false, message: 'downloadUrl and version are required' });
    }

    // Mark all other versions as not latest
    await AppVersion.updateMany({}, { $set: { isLatest: false } });

    const appVersion = await AppVersion.create({
      downloadUrl,
      version,
      notes,
      deployedDate: deployedDate ? new Date(deployedDate) : new Date(),
      lastUpdatedDate: new Date(),
      isLatest: true
    });

    res.status(201).json({
      success: true,
      data: appVersion
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET ALL VERSIONS
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
    const updateData = { ...req.body, lastUpdatedDate: new Date() };
    
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
