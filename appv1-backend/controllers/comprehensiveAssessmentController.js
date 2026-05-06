const ComprehensiveAssessment = require('../models/ComprehensiveAssessment');
const Classroom = require('../models/Classroom');
const Student = require('../models/Student');
const ExcelJS = require('exceljs');
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

// Get a minimized list of assessments for a specific class (title, createdAt, teacherName)
exports.getAssessmentsListByClass = async (req, res) => {
  try {
    const { classId } = req.params;

    const assessments = await ComprehensiveAssessment.find({ classId })
      .select('assessmentId title createdAt teacherName -_id')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: assessments.length,
      assessments
    });
  } catch (error) {
    console.error('Error fetching assessments list:', error);
    res.status(500).json({ error: 'Server error fetching assessments list' });
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

// Export CA template to Excel
exports.exportTemplate = async (req, res) => {
  try {
    const { assessmentId } = req.params;

    // 1. Fetch CA Details
    const assessment = await ComprehensiveAssessment.findOne({ assessmentId });
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // 2. Fetch Classroom to get student IDs
    const classroom = await Classroom.findOne({ classId: assessment.classId });
    if (!classroom) {
      return res.status(404).json({ error: 'Classroom not found' });
    }

    // 3. Fetch Student Details (Name and ID)
    const students = await Student.find({ studentId: { $in: classroom.studentIds } })
      .select('studentId name')
      .sort({ name: 1 });

    // 4. Create Workbook & Sheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Assessment Template');

    // 5. Define Columns
    let columns = [
      { header: 'Student ID', key: 'studentId', width: 15 },
      { header: 'Student Name', key: 'name', width: 25 },
    ];

    // Add Scholastic Subjects
    assessment.scholasticSubjects.forEach(subject => {
      if (subject.internalMaximumScore > 0) {
        columns.push({
          header: `${subject.subjectName} (Internal - Max ${subject.internalMaximumScore})`,
          key: `${subject.subjectName}_internal`,
          width: 25
        });
      }
      if (subject.externalMaximumScore > 0) {
        columns.push({
          header: `${subject.subjectName} (External - Max ${subject.externalMaximumScore})`,
          key: `${subject.subjectName}_external`,
          width: 25
        });
      }
    });

    // Add Co-Scholastic Activities
    assessment.coScholasticActivities.forEach(activity => {
      columns.push({
        header: `${activity.activityName} (Max ${activity.maximumScore || 'N/A'})`,
        key: activity.activityName,
        width: 20
      });
    });

    worksheet.columns = columns;

    // 6. Style Header Row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF008080' } // Teal color to match app theme
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // 7. Add Student Rows
    students.forEach(student => {
      worksheet.addRow({
        studentId: student.studentId,
        name: student.name
      });
    });

    // 8. Add Borders and Freeze Panes
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    worksheet.views = [
      { state: 'frozen', xSplit: 2, ySplit: 1 } // Freeze first 2 columns and header row
    ];

    // 9. Send Response
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${assessment.title.replace(/\s+/g, '_')}_Template.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting CA template:', error);
    res.status(500).json({ error: 'Server error exporting template' });
  }
};
