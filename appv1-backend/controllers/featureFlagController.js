const FeatureDefinition = require('../models/FeatureDefinition');
const OrgFeatureFlag = require('../models/OrgFeatureFlag');

// Create a unique feature enum (Super Admin typically)
exports.createFeatureDefinition = async (req, res) => {
  try {
    // Basic super admin restriction check (optional, assuming 'superadmin' role)
    if (req.user && req.user.role && req.user.role !== 'superadmin' && req.user.role !== 'admin') {
       return res.status(403).json({ error: 'Unauthorized to define new features' });
    }

    const { key, name, description, defaultEnabled } = req.body;
    if (!key || !name) {
      return res.status(400).json({ error: 'Feature key and name are required' });
    }

    const upperKey = key.toUpperCase().trim();
    let feature = await FeatureDefinition.findOne({ key: upperKey });
    if (feature) {
      return res.status(400).json({ error: `Feature with key ${upperKey} already exists` });
    }

    feature = await FeatureDefinition.create({
      key: upperKey,
      name,
      description,
      defaultEnabled: defaultEnabled || false
    });

    res.status(201).json({ success: true, message: 'Feature definition created', feature });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all feature definitions
exports.getFeatureDefinitions = async (req, res) => {
  try {
    const features = await FeatureDefinition.find().sort({ createdAt: -1 });
    res.json({ success: true, count: features.length, features });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Toggle a feature for a specific org (Super Admin)
exports.toggleOrgFeatureFlag = async (req, res) => {
  try {
    if (req.user && req.user.role && req.user.role !== 'superadmin' && req.user.role !== 'admin') {
       return res.status(403).json({ error: 'Unauthorized to toggle features' });
    }

    const { orgId } = req.params;
    const { featureKey, isEnabled } = req.body;

    if (!featureKey || isEnabled === undefined) {
      return res.status(400).json({ error: 'featureKey and isEnabled are required' });
    }

    const upperKey = featureKey.toUpperCase().trim();
    
    // Ensure the feature exists first
    const featureDef = await FeatureDefinition.findOne({ key: upperKey });
    if (!featureDef) {
      return res.status(404).json({ error: `Feature definition ${upperKey} not found. Please create it first.` });
    }

    let orgFlags = await OrgFeatureFlag.findOne({ orgId });
    if (!orgFlags) {
      orgFlags = new OrgFeatureFlag({ orgId, flags: {} });
    }

    orgFlags.flags.set(upperKey, Boolean(isEnabled));
    await orgFlags.save();

    res.json({ success: true, message: `Feature ${upperKey} set to ${isEnabled} for org ${orgId}`, flags: orgFlags.flags });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get effective feature flags for an org (Private for the app to consume)
exports.getOrgFeatureFlags = async (req, res) => {
  try {
    const orgId = req.params.orgId || req.user?.orgId;
    if (!orgId) {
      return res.status(400).json({ error: 'orgId is required' });
    }

    // 1. Get all definitions to know what features exist
    const definitions = await FeatureDefinition.find();
    
    // 2. Get org-specific overrides
    const orgFlags = await OrgFeatureFlag.findOne({ orgId });

    const effectiveFlags = {};

    definitions.forEach(def => {
      // Start with default (which is usually false)
      effectiveFlags[def.key] = def.defaultEnabled;

      // Override if the org has an explicit toggle set
      if (orgFlags && orgFlags.flags && orgFlags.flags.has(def.key)) {
        effectiveFlags[def.key] = orgFlags.flags.get(def.key);
      }
    });

    res.json({ success: true, flags: effectiveFlags });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
