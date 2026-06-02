const TeacherAdditionalRecord = require('../models/TeacherAdditionalRecord');

// Create or update the teacher additional record
exports.upsertRecord = async (req, res) => {
  try {
    const { teacherId, orgId, records } = req.body;
    
    if (!teacherId || !orgId) {
      return res.status(400).json({ error: 'teacherId and orgId are required' });
    }

    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'records must be an array' });
    }

    const updatedRecord = await TeacherAdditionalRecord.findOneAndUpdate(
      { teacherId, orgId },
      { records },
      { new: true, upsert: true }
    );

    res.status(200).json({ message: 'Record saved successfully', data: updatedRecord });
  } catch (error) {
    console.error('Error upserting teacher additional record:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get the teacher additional record
exports.getRecord = async (req, res) => {
  try {
    const { teacherId } = req.params;
    // orgId can be taken from req.user (from auth token) or req.body, but for GET we rely on auth token or query.
    // If the token has orgId, we use it. Otherwise, we might just query by teacherId.
    const orgId = req.user?.orgId;
    
    if (!teacherId) {
      return res.status(400).json({ error: 'teacherId is required in params' });
    }

    const query = { teacherId };
    if (orgId) {
      query.orgId = orgId;
    }

    const record = await TeacherAdditionalRecord.findOne(query);
    if (!record) {
      return res.status(404).json({ message: 'No additional record found' });
    }
    
    res.status(200).json({ data: record });
  } catch (error) {
    console.error('Error fetching teacher additional record:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

