const mongoose = require('mongoose');
const AdmissionEnquiry = require('../models/AdmissionEnquiry');

const generateEnquiryId = () => `ENQ_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

// Helper to get user info from token payload for history/notes
const getUserIdentity = (req) => {
  const userId = req.user?.adminEmail || req.user?.staffId || req.user?.userId || 'system';
  const userName = req.user?.name || req.user?.adminEmail || 'Admin/Staff';
  return { userId, userName };
};

// 1. Create Enquiry
exports.createEnquiry = async (req, res) => {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(400).json({ error: 'orgId is required' });

    const { student, guardian, academic, metadata } = req.body;

    // Basic Validation
    if (!student?.fullName || !student?.dateOfBirth || !student?.gender) {
      return res.status(400).json({ error: 'Student full name, date of birth, and gender are required' });
    }
    if (!guardian?.name || !guardian?.phoneNumber || !guardian?.relationship) {
      return res.status(400).json({ error: 'Guardian name, phone number, and relationship are required' });
    }
    if (!academic?.classAppliedFor || !academic?.academicYear) {
      return res.status(400).json({ error: 'Class applied for and academic year are required' });
    }

    let enquiryId = generateEnquiryId();
    while (await AdmissionEnquiry.findOne({ enquiryId })) {
      enquiryId = generateEnquiryId();
    }

    const { userId, userName } = getUserIdentity(req);

    const enquiry = await AdmissionEnquiry.create({
      enquiryId,
      orgId,
      student,
      guardian,
      academic,
      metadata,
      status: 'pending',
      statusHistory: [{
        previousStatus: null,
        newStatus: 'pending',
        changedBy: userId,
        changedByName: userName,
        note: 'Initial enquiry created',
        timestamp: new Date()
      }]
    });

    res.status(201).json({ success: true, message: 'Admission enquiry created', enquiry });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Get All Enquiries (with filters)
exports.getEnquiries = async (req, res) => {
  try {
    const orgId = req.user?.orgId;
    const { status, classAppliedFor, search, startDate, endDate } = req.query;

    let filter = { orgId };

    if (status) {
      filter.status = status;
    }
    if (classAppliedFor) {
      filter['academic.classAppliedFor'] = classAppliedFor;
    }
    if (startDate || endDate) {
      filter['metadata.dateOfEnquiry'] = {};
      if (startDate) filter['metadata.dateOfEnquiry'].$gte = new Date(startDate);
      if (endDate) filter['metadata.dateOfEnquiry'].$lte = new Date(endDate);
    }
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { 'student.fullName': searchRegex },
        { 'guardian.name': searchRegex },
        { 'guardian.phoneNumber': searchRegex },
        { 'guardian.email': searchRegex },
        { enquiryId: searchRegex }
      ];
    }

    const enquiries = await AdmissionEnquiry.find(filter).sort({ 'metadata.dateOfEnquiry': -1 });

    res.json({ success: true, count: enquiries.length, enquiries });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Get Single Enquiry
exports.getEnquiryById = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user?.orgId;

    let query = { orgId };
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.$or = [{ _id: id }, { enquiryId: id }];
    } else {
      query.enquiryId = id;
    }

    const enquiry = await AdmissionEnquiry.findOne(query);
    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }

    res.json({ success: true, enquiry });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. Update Status
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    const orgId = req.user?.orgId;

    if (!['pending', 'follow_up', 'documents_submitted', 'enrolled', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    let query = { orgId };
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.$or = [{ _id: id }, { enquiryId: id }];
    } else {
      query.enquiryId = id;
    }

    const enquiry = await AdmissionEnquiry.findOne(query);
    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }

    if (enquiry.status !== status) {
      const { userId, userName } = getUserIdentity(req);
      
      enquiry.statusHistory.push({
        previousStatus: enquiry.status,
        newStatus: status,
        changedBy: userId,
        changedByName: userName,
        note: note || '',
        timestamp: new Date()
      });
      enquiry.status = status;
      await enquiry.save();
    }

    res.json({ success: true, message: 'Status updated successfully', enquiry });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 5. Add Note
exports.addNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const orgId = req.user?.orgId;

    if (!note || note.trim() === '') {
      return res.status(400).json({ error: 'Note content is required' });
    }

    let query = { orgId };
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.$or = [{ _id: id }, { enquiryId: id }];
    } else {
      query.enquiryId = id;
    }

    const enquiry = await AdmissionEnquiry.findOne(query);
    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }

    const { userId, userName } = getUserIdentity(req);

    enquiry.followUpNotes.push({
      note,
      addedBy: userId,
      addedByName: userName,
      timestamp: new Date()
    });

    await enquiry.save();

    res.json({ success: true, message: 'Note added successfully', enquiry });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 6. Delete Enquiry (Hard delete)
exports.deleteEnquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user?.orgId;

    let query = { orgId };
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.$or = [{ _id: id }, { enquiryId: id }];
    } else {
      query.enquiryId = id;
    }

    const result = await AdmissionEnquiry.deleteOne(query);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }

    res.json({ success: true, message: 'Enquiry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 7. Get Dashboard Stats
exports.getStats = async (req, res) => {
  try {
    const orgId = req.user?.orgId;

    // Base match for the org
    const matchOrg = { orgId };

    // Total counts by status
    const statusCountsPipeline = await AdmissionEnquiry.aggregate([
      { $match: matchOrg },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    let totalEnquiries = 0;
    let enrolledCount = 0;
    const statusCounts = {
      pending: 0,
      follow_up: 0,
      documents_submitted: 0,
      enrolled: 0,
      rejected: 0
    };

    statusCountsPipeline.forEach(item => {
      statusCounts[item._id] = item.count;
      totalEnquiries += item.count;
      if (item._id === 'enrolled') {
        enrolledCount = item.count;
      }
    });

    const conversionRate = totalEnquiries > 0 ? ((enrolledCount / totalEnquiries) * 100).toFixed(2) : 0;

    // Trend calculation (this month vs last month)
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const trendPipeline = await AdmissionEnquiry.aggregate([
      { $match: matchOrg },
      {
        $group: {
          _id: null,
          thisMonthCount: {
            $sum: {
              $cond: [{ $gte: ["$metadata.dateOfEnquiry", startOfThisMonth] }, 1, 0]
            }
          },
          lastMonthCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$metadata.dateOfEnquiry", startOfLastMonth] },
                    { $lt: ["$metadata.dateOfEnquiry", startOfThisMonth] }
                  ]
                }, 1, 0]
            }
          }
        }
      }
    ]);

    const trends = trendPipeline[0] || { thisMonthCount: 0, lastMonthCount: 0 };

    res.json({
      success: true,
      stats: {
        totalEnquiries,
        statusCounts,
        conversionRate: parseFloat(conversionRate),
        trends: {
          thisMonth: trends.thisMonthCount,
          lastMonth: trends.lastMonthCount
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
