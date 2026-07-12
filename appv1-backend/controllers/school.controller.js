const SchoolBasic  = require('../models/SchoolBasic.model');
const FeeStructure = require('../models/FeeStructure.model');
const Role         = require('../models/Role.model');
const { uploadToAzure, sharp } = require('../config/azureStorage');

// ══════════════════════════════════════════════════════════
//  MODULE 1 — SCHOOL BASIC DETAILS
// ══════════════════════════════════════════════════════════

// GET /api/org/school/basic?orgId=ORG123
exports.getBasicDetails = async (req, res) => {
  try {
    const { orgId } = req.query;
    if (!orgId) return res.status(400).json({ success: false, message: 'orgId is required.' });

    const doc = await SchoolBasic.findOne({ orgId });
    return res.json({ success: true, data: doc || null });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// PUT /api/org/school/basic  (upsert — create or update)
exports.upsertBasicDetails = async (req, res) => {
  try {
    const { orgId, schoolName, campusAddress, schoolEmail, primaryContact } = req.body;
    if (!orgId) return res.status(400).json({ success: false, message: 'orgId is required.' });

    let logoUrl;
    if (req.file) {
      const isImage = req.file.mimetype.startsWith('image/');
      if (!isImage) {
        return res.status(400).json({ success: false, message: 'Uploaded file must be an image.' });
      }

      // Optimize image using Sharp
      const optimizedBuffer = await sharp(req.file.buffer)
        .resize({ width: 500, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      const uploadResult = await uploadToAzure(
        optimizedBuffer,
        req.file.originalname.replace(/\.[^/.]+$/, "") + ".webp",
        'image/webp',
        'logos'
      );
      logoUrl = uploadResult.url;
    }

    const updateData = { orgId, schoolName, campusAddress, schoolEmail, primaryContact };
    if (logoUrl) {
      updateData.logoUrl = logoUrl;
    }

    const doc = await SchoolBasic.findOneAndUpdate(
      { orgId },
      updateData,
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return res.json({ success: true, message: 'Basic details saved.', data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// GET /api/org/school/logo/:orgId
exports.getLogo = async (req, res) => {
  try {
    const { orgId } = req.params;
    if (!orgId) return res.status(400).json({ success: false, message: 'orgId is required.' });

    const doc = await SchoolBasic.findOne({ orgId });
    if (!doc || !doc.logoUrl) {
      return res.status(404).json({ success: false, message: 'Logo not found for this organization.' });
    }
    
    return res.json({ success: true, logoUrl: doc.logoUrl });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════════════
//  MODULE 2 — FEE STRUCTURES
// ══════════════════════════════════════════════════════════

// GET /api/org/school/fee?orgId=ORG123
exports.getFeeStructures = async (req, res) => {
  try {
    const { orgId } = req.query;
    if (!orgId) return res.status(400).json({ success: false, message: 'orgId is required.' });

    const list = await FeeStructure.find({ orgId }).sort({ createdAt: -1 });
    return res.json({ success: true, data: list });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// POST /api/org/school/fee
exports.createFeeStructure = async (req, res) => {
  try {
    const { orgId, structureName, gradeFrom, gradeTo,
            feeAmount, hasBreakdown, breakdown } = req.body;

    if (!orgId) return res.status(400).json({ success: false, message: 'orgId is required.' });
    if (!structureName) return res.status(400).json({ success: false, message: 'structureName is required.' });

    const doc = await FeeStructure.create({
      orgId, structureName, gradeFrom, gradeTo,
      feeAmount, hasBreakdown,
      breakdown: hasBreakdown ? (breakdown || []) : [],
    });
    return res.status(201).json({ success: true, message: 'Fee structure created.', data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// PUT /api/org/school/fee/:feeId
exports.updateFeeStructure = async (req, res) => {
  try {
    const { feeId } = req.params;
    const { orgId, structureName, gradeFrom, gradeTo,
            feeAmount, hasBreakdown, breakdown } = req.body;

    if (!orgId) return res.status(400).json({ success: false, message: 'orgId is required.' });

    const doc = await FeeStructure.findOneAndUpdate(
      { _id: feeId, orgId },
      { structureName, gradeFrom, gradeTo,
        feeAmount, hasBreakdown,
        breakdown: hasBreakdown ? (breakdown || []) : [] },
      { new: true },
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Fee structure not found.' });
    return res.json({ success: true, message: 'Fee structure updated.', data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// DELETE /api/org/school/fee/:feeId
exports.deleteFeeStructure = async (req, res) => {
  try {
    const { feeId } = req.params;
    const { orgId } = req.query;
    if (!orgId) return res.status(400).json({ success: false, message: 'orgId is required.' });

    const doc = await FeeStructure.findOneAndDelete({ _id: feeId, orgId });
    if (!doc) return res.status(404).json({ success: false, message: 'Fee structure not found.' });
    return res.json({ success: true, message: 'Fee structure deleted.' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════════════
//  MODULE 3 — ROLES
// ══════════════════════════════════════════════════════════

// GET /api/org/school/roles?orgId=ORG123
exports.getRoles = async (req, res) => {
  try {
    const { orgId } = req.query;
    if (!orgId) return res.status(400).json({ success: false, message: 'orgId is required.' });

    const list = await Role.find({ orgId }).sort({ createdAt: -1 });
    return res.json({ success: true, data: list });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// POST /api/org/school/roles
exports.createRole = async (req, res) => {
  try {
    const { orgId, position, assignedTo } = req.body;
    if (!orgId)    return res.status(400).json({ success: false, message: 'orgId is required.' });
    if (!position) return res.status(400).json({ success: false, message: 'position is required.' });

    const doc = await Role.create({ orgId, position, assignedTo });
    return res.status(201).json({ success: true, message: 'Role created.', data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// PUT /api/org/school/roles/:roleId
exports.updateRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { orgId, position, assignedTo } = req.body;
    if (!orgId) return res.status(400).json({ success: false, message: 'orgId is required.' });

    const doc = await Role.findOneAndUpdate(
      { _id: roleId, orgId },
      { position, assignedTo },
      { new: true },
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Role not found.' });
    return res.json({ success: true, message: 'Role updated.', data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// DELETE /api/org/school/roles/:roleId
exports.deleteRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { orgId }  = req.query;
    if (!orgId) return res.status(400).json({ success: false, message: 'orgId is required.' });

    const doc = await Role.findOneAndDelete({ _id: roleId, orgId });
    if (!doc) return res.status(404).json({ success: false, message: 'Role not found.' });
    return res.json({ success: true, message: 'Role deleted.' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// GET /api/org/school/:orgId/public
exports.getPublicProfile = async (req, res) => {
  try {
    const { orgId } = req.params;
    if (!orgId) {
      return res.status(400).json({ success: false, message: 'orgId is required.' });
    }

    // Fetch SchoolBasic details
    const schoolBasic = await SchoolBasic.findOne({ orgId });
    
    // Fetch Organization details as fallback for name/address if SchoolBasic doesn't exist
    let schoolName = '';
    let address = '';
    let logoUrl = '';
    if (schoolBasic) {
      schoolName = schoolBasic.schoolName;
      address = schoolBasic.campusAddress;
      logoUrl = schoolBasic.logoUrl || '';
    } else {
      const org = await require('../models/Organization').findOne({ orgId });
      if (org) {
        schoolName = org.schoolName || org.name || '';
        address = org.campusAddress || org.address || '';
        logoUrl = org.logoUrl || '';
      }
    }

    // Fetch Roles
    const roles = await Role.find({ orgId }).sort({ createdAt: -1 });

    // Fetch Fee Structures
    const feeStructures = await FeeStructure.find({ orgId }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: {
        schoolName,
        address,
        logoUrl,
        roles,
        feeStructures
      }
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};