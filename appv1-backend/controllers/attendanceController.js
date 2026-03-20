const Attendance = require('../models/Attendance');
const Classroom = require('../models/Classroom');
const Student = require('../models/Student');

const generateAttendanceId = () => `ATT_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

// ─────────────────────────────────────────────
// HELPER: Calculate totals
// ─────────────────────────────────────────────
const calculateTotals = (students) => {
  const totalPresent = students.filter(s => s.attendance === 'Present').length;
  const totalAbsent = students.filter(s => s.attendance === 'Absent').length;
  return { totalPresent, totalAbsent };
};

// ─────────────────────────────────────────────
// CREATE ATTENDANCE
// ─────────────────────────────────────────────
exports.createAttendance = async (req, res) => {
  try {
    const { attendanceDate, classId, orgId, teacherId, teacherName, students } = req.body;

    if (!attendanceDate || !classId || !orgId || !teacherId || !teacherName) {
      return res.status(400).json({ error: 'attendanceDate, classId, orgId, teacherId, teacherName required' });
    }

    if (!students || students.length === 0) {
      return res.status(400).json({ error: 'students list required' });
    }

    // Validate each student attendance value
    for (const s of students) {
      if (!s.studentId || !s.name || !s.attendance) {
        return res.status(400).json({ error: 'Each student needs studentId, name, attendance' });
      }
      if (!['Present', 'Absent'].includes(s.attendance)) {
        return res.status(400).json({ error: `attendance must be "Present" or "Absent" for student ${s.studentId}` });
      }
    }

    // Check classroom exists
    const classroom = await Classroom.findOne({ classId });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    // Check duplicate attendance for same class and same date
    const dateStart = new Date(attendanceDate);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(attendanceDate);
    dateEnd.setHours(23, 59, 59, 999);

    const existing = await Attendance.findOne({
      classId,
      attendanceDate: { $gte: dateStart, $lte: dateEnd }
    });
    if (existing) {
      return res.status(400).json({ 
        error: `Attendance already marked for this class on ${new Date(attendanceDate).toDateString()}`,
        attendanceId: existing.attendanceId
      });
    }

    const { totalPresent, totalAbsent } = calculateTotals(students);

    let attendanceId = generateAttendanceId();
    while (await Attendance.findOne({ attendanceId })) {
      attendanceId = generateAttendanceId();
    }

    const attendance = await Attendance.create({
      attendanceId,
      attendanceDate: new Date(attendanceDate),
      classId,
      orgId,
      teacherId,
      teacherName,
      className: classroom.className,
      students,
      totalPresent,
      totalAbsent
    });

    res.status(201).json({ success: true, attendance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET SINGLE ATTENDANCE
// ─────────────────────────────────────────────
exports.getAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params;

    const attendance = await Attendance.findOne({ attendanceId });
    if (!attendance) return res.status(404).json({ error: 'Attendance not found' });

    res.json({ success: true, attendance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET ALL ATTENDANCE BY CLASSID
// ─────────────────────────────────────────────
exports.getAttendanceByClass = async (req, res) => {
  try {
    const { classId } = req.params;

    const attendances = await Attendance.find({ classId }).sort({ attendanceDate: -1 });

    res.json({
      success: true,
      count: attendances.length,
      attendances
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET ATTENDANCE BY CLASSID + DATE
// ─────────────────────────────────────────────
exports.getAttendanceByClassAndDate = async (req, res) => {
  try {
    const { classId, date } = req.params;

    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);

    const attendance = await Attendance.findOne({
      classId,
      attendanceDate: { $gte: dateStart, $lte: dateEnd }
    });

    if (!attendance) {
      return res.status(404).json({ error: 'No attendance found for this class on this date' });
    }

    res.json({ success: true, attendance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET ALL ATTENDANCE BY ORGID
// ─────────────────────────────────────────────
exports.getAttendanceByOrg = async (req, res) => {
  try {
    const { orgId } = req.params;

    const attendances = await Attendance.find({ orgId }).sort({ attendanceDate: -1 });

    res.json({
      success: true,
      count: attendances.length,
      attendances
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET ATTENDANCE SUMMARY FOR A STUDENT
// (how many days present/absent across all dates)
// ─────────────────────────────────────────────
exports.getStudentAttendanceSummary = async (req, res) => {
  try {
    const { classId, studentId } = req.params;

    const attendances = await Attendance.find({ classId });

    if (attendances.length === 0) {
      return res.status(404).json({ error: 'No attendance records found for this class' });
    }

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalDays = 0;
    const records = [];

    for (const att of attendances) {
      const studentRecord = att.students.find(s => s.studentId === studentId);
      if (studentRecord) {
        totalDays++;
        if (studentRecord.attendance === 'Present') totalPresent++;
        else totalAbsent++;

        records.push({
          date: att.attendanceDate,
          attendance: studentRecord.attendance
        });
      }
    }

    const attendancePercentage = totalDays > 0
      ? parseFloat(((totalPresent / totalDays) * 100).toFixed(2))
      : 0;

    res.json({
      success: true,
      studentId,
      classId,
      totalDays,
      totalPresent,
      totalAbsent,
      attendancePercentage: `${attendancePercentage}%`,
      records
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// UPDATE ATTENDANCE (fix wrong entries)
// ─────────────────────────────────────────────
exports.updateAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const { students } = req.body;

    const attendance = await Attendance.findOne({ attendanceId });
    if (!attendance) return res.status(404).json({ error: 'Attendance not found' });

    if (!students || students.length === 0) {
      return res.status(400).json({ error: 'students list required' });
    }

    // Validate each student
    for (const s of students) {
      if (!s.studentId || !s.name || !s.attendance) {
        return res.status(400).json({ error: 'Each student needs studentId, name, attendance' });
      }
      if (!['Present', 'Absent'].includes(s.attendance)) {
        return res.status(400).json({ error: `attendance must be "Present" or "Absent" for ${s.studentId}` });
      }
    }

    const { totalPresent, totalAbsent } = calculateTotals(students);

    attendance.students = students;
    attendance.totalPresent = totalPresent;
    attendance.totalAbsent = totalAbsent;
    await attendance.save();

    res.json({ success: true, attendance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// UPDATE SINGLE STUDENT ATTENDANCE
// ─────────────────────────────────────────────
exports.updateStudentAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const { studentId, attendance: newAttendance } = req.body;

    if (!studentId || !newAttendance) {
      return res.status(400).json({ error: 'studentId and attendance required' });
    }

    if (!['Present', 'Absent'].includes(newAttendance)) {
      return res.status(400).json({ error: 'attendance must be "Present" or "Absent"' });
    }

    const attendance = await Attendance.findOne({ attendanceId });
    if (!attendance) return res.status(404).json({ error: 'Attendance not found' });

    const student = attendance.students.find(s => s.studentId === studentId);
    if (!student) return res.status(404).json({ error: 'Student not found in this attendance' });

    student.attendance = newAttendance;

    const { totalPresent, totalAbsent } = calculateTotals(attendance.students);
    attendance.totalPresent = totalPresent;
    attendance.totalAbsent = totalAbsent;

    await attendance.save();

    res.json({
      success: true,
      message: `${student.name} marked as ${newAttendance}`,
      attendance
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// DELETE ATTENDANCE
// ─────────────────────────────────────────────
exports.deleteAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params;

    const attendance = await Attendance.findOneAndDelete({ attendanceId });
    if (!attendance) return res.status(404).json({ error: 'Attendance not found' });

    res.json({
      success: true,
      message: `Attendance for ${new Date(attendance.attendanceDate).toDateString()} deleted`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// DELETE ALL ATTENDANCE BY CLASSID
// ─────────────────────────────────────────────
exports.deleteAttendanceByClass = async (req, res) => {
  try {
    const { classId } = req.params;

    const result = await Attendance.deleteMany({ classId });

    res.json({
      success: true,
      message: `${result.deletedCount} attendance record(s) deleted for class ${classId}`,
      deleted: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
