const ComprehensiveAssessment = require('../models/ComprehensiveAssessment');
const crypto = require('crypto');

// Create a new comprehensive assessment
exports.createAssessment = async (req, res) => {
  try {
    const { orgId, classId, teacherName, teacherId, className, title, scholasticSubjects, coScholasticActivities } = req.body;

    if (!orgId || !classId || !teacherName || !teacherId || !className || !title) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const assessmentId = `CA-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const newAssessment = new ComprehensiveAssessment({
      assessmentId,
      orgId,
      classId,
      teacherName,
      teacherId,
      className,
      title,
      scholasticSubjects: scholasticSubjects || [],
      coScholasticActivities: coScholasticActivities || []
    });

    await newAssessment.save();
    res.status(201).json({ message: 'Comprehensive Assessment created successfully', assessment: newAssessment });
  } catch (error) {
    console.error('Error creating assessment:', error);
    res.status(500).json({ error: 'Server error creating assessment' });
  }
};

// Get all assessments for a class in an org
exports.getAssessments = async (req, res) => {
  try {
    const { orgId, classId } = req.query;

    if (!orgId || !classId) {
      return res.status(400).json({ error: 'orgId and classId are required' });
    }

    const assessments = await ComprehensiveAssessment.find({ orgId, classId }).sort({ createdAt: -1 });
    res.status(200).json(assessments);
  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({ error: 'Server error fetching assessments' });
  }
};

// Get a single assessment by assessmentId
exports.getAssessmentById = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const assessment = await ComprehensiveAssessment.findOne({ assessmentId });

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    res.status(200).json(assessment);
  } catch (error) {
    console.error('Error fetching assessment:', error);
    res.status(500).json({ error: 'Server error fetching assessment' });
  }
};

// Update an assessment
exports.updateAssessment = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const updateData = req.body;

    const updatedAssessment = await ComprehensiveAssessment.findOneAndUpdate(
      { assessmentId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedAssessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    res.status(200).json({ message: 'Assessment updated successfully', assessment: updatedAssessment });
  } catch (error) {
    console.error('Error updating assessment:', error);
    res.status(500).json({ error: 'Server error updating assessment' });
  }
};

// Delete an assessment
exports.deleteAssessment = async (req, res) => {
  try {
    const { assessmentId } = req.params;

    const deletedAssessment = await ComprehensiveAssessment.findOneAndDelete({ assessmentId });

    if (!deletedAssessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    res.status(200).json({ message: 'Assessment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assessment:', error);
    res.status(500).json({ error: 'Server error deleting assessment' });
  }
};
