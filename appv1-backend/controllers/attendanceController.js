const Attendance = require('../models/Attendance');
const Classroom = require('../models/Classroom');
const Student = require('../models/Student');
const { notifyClass } = require('../utils/sendNotification');  // ← ADDED

const generateAttendanceId = () => `ATT_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

const calculateTotals = (students) => {
  const totalPresent = students.filter(s => s.attendance === 'Present').length;
  const totalAbsent = students.filter(s => s.attendance === 'Absent').length;
  return { totalPresent, totalAbsent };
};

// CREATE ATTENDANCE
exports.createAttendance = async (req, res) => {
  try {
    const { attendanceDate, classId, orgId, teacherId, teacherName, students } = req.body;

    if (!attendanceDate || !classId || !orgId || !teacherId || !teacherName) {
      return res.status(400).json({ error: 'attendanceDate, classId, orgId, teacherId, teacherName required' });
    }

    if (!students || students.length === 0) {
      return res.status(400).json({ error: 'students list required' });
    }

    for (const s of students) {
      if (!s.studentId || !s.name || !s.attendance) {
        return res.status(400).json({ error: 'Each student needs studentId, name, attendance' });
      }
      if (!['Present', 'Absent'].includes(s.attendance)) {
        return res.status(400).json({ error: `attendance must be "Present" or "Absent" for student ${s.studentId}` });
      }
    }

    const classroom = await Classroom.findOne({ classId });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

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
      classId, orgId, teacherId, teacherName,
      className: classroom.className,
      students, totalPresent, totalAbsent
    });

    // ✅ MOVED INSIDE FUNCTION
    try {
      await notifyClass({
        classId,
        orgId,
        title: `✅ Attendance Marked`,
        body: `Attendance for ${new Date(attendanceDate).toDateString()} has been marked`,
        type: 'attendance',
        sentBy: teacherId,
        sentByName: teacherName,
        data: { route: '/attendance', attendanceId: attendance.attendanceId }
      });
    } catch (notifyError) {
      console.log('Notification failed (non-critical):', notifyError.message);
    }

    res.status(201).json({ success: true, attendance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET SINGLE ATTENDANCE
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

// GET ALL ATTENDANCE BY CLASSID
exports.getAttendanceByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const attendances = await Attendance.find({ classId }).sort({ attendanceDate: -1 });
    res.json({ success: true, count: attendances.length, attendances });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET ATTENDANCE BY CLASSID + DATE
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

// GET ALL ATTENDANCE BY ORGID
exports.getAttendanceByOrg = async (req, res) => {
  try {
    const { orgId } = req.params;
    const attendances = await Attendance.find({ orgId }).sort({ attendanceDate: -1 });
    res.json({ success: true, count: attendances.length, attendances });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET ATTENDANCE SUMMARY FOR A STUDENT
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
        records.push({ date: att.attendanceDate, attendance: studentRecord.attendance });
      }
    }

    const attendancePercentage = totalDays > 0
      ? parseFloat(((totalPresent / totalDays) * 100).toFixed(2))
      : 0;

    res.json({
      success: true,
      studentId, classId, totalDays,
      totalPresent, totalAbsent,
      attendancePercentage: `${attendancePercentage}%`,
      records
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE ATTENDANCE
exports.updateAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const { students } = req.body;

    const attendance = await Attendance.findOne({ attendanceId });
    if (!attendance) return res.status(404).json({ error: 'Attendance not found' });

    if (!students || students.length === 0) {
      return res.status(400).json({ error: 'students list required' });
    }

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

// UPDATE SINGLE STUDENT ATTENDANCE
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

// DELETE ATTENDANCE
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

// DELETE ALL ATTENDANCE BY CLASSID
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

// GET ATTENDANCE BY CLASS + YEAR + MONTH + WEEK
exports.getAttendanceByWeek = async (req, res) => {
  try {
    const { classId } = req.params;
    const { year, month, week } = req.query;
    // week = 1 (1st–7th), 2 (8th–14th), 3 (15th–21st), 4 (22nd–28th), 5 (29th–end)

    if (!year || !month || !week) {
      return res.status(400).json({ error: 'year, month, week query params required' });
    }

    const y = parseInt(year);
    const m = parseInt(month) - 1; // JS months 0-indexed
    const w = parseInt(week);

    if (w < 1 || w > 5) {
      return res.status(400).json({ error: 'week must be between 1 and 5' });
    }

    // Calculate week start and end dates
    const weekStart = (w - 1) * 7 + 1;
    const weekEnd   = Math.min(w * 7, new Date(y, m + 1, 0).getDate()); // cap to month end

    const startDate = new Date(y, m, weekStart, 0, 0, 0, 0);
    const endDate   = new Date(y, m, weekEnd, 23, 59, 59, 999);

    const attendances = await Attendance.find({
      classId,
      attendanceDate: { $gte: startDate, $lte: endDate }
    }).sort({ attendanceDate: 1 });

    // Build a day-by-day map for every day in the week range
    const dailyData = [];

    for (let day = weekStart; day <= weekEnd; day++) {
      const dayDate  = new Date(y, m, day);
      const dayLabel = dayDate.toLocaleDateString('en-US', { weekday: 'short' }); // Mon, Tue...
      const dateStr  = dayDate.toISOString().split('T')[0]; // 2026-04-07

      const record = attendances.find(a => {
        const d = new Date(a.attendanceDate);
        return d.getDate() === day && d.getMonth() === m && d.getFullYear() === y;
      });

      dailyData.push({
        date:           dateStr,
        day:            dayLabel,
        dayNumber:      day,
        totalPresent:   record ? record.totalPresent  : null,
        totalAbsent:    record ? record.totalAbsent   : null,
        totalStudents:  record ? record.students.length : null,
        attendanceId:   record ? record.attendanceId  : null,
        marked:         !!record   // true = attendance was taken, false = holiday/not marked
      });
    }

    // Week-level totals
    const markedDays    = dailyData.filter(d => d.marked);
    const totalPresent  = markedDays.reduce((sum, d) => sum + d.totalPresent, 0);
    const totalAbsent   = markedDays.reduce((sum, d) => sum + d.totalAbsent,  0);
    const avgPresent    = markedDays.length > 0
      ? parseFloat((totalPresent / markedDays.length).toFixed(2))
      : 0;

    res.json({
      success: true,
      classId,
      year: y,
      month: parseInt(month),
      week: w,
      weekRange: `${dateStr = `${y}-${String(parseInt(month)).padStart(2,'0')}-${String(weekStart).padStart(2,'0')}`} to ${y}-${String(parseInt(month)).padStart(2,'0')}-${String(weekEnd).padStart(2,'0')}`,
      totalDaysInWeek:  weekEnd - weekStart + 1,
      totalMarkedDays:  markedDays.length,
      weekTotalPresent: totalPresent,
      weekTotalAbsent:  totalAbsent,
      weekAvgPresent:   avgPresent,
      dailyData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};