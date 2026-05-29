const TeacherAttendance = require('../models/TeacherAttendance');
const Teacher = require('../models/Teacher');

const generateAttendanceId = () => `TATT_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

// CHECK-IN
exports.checkIn = async (req, res) => {
  try {
    // Assuming auth middleware populates req.user
    const teacherId = req.user?.teacherId || req.body.teacherId;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!teacherId || !orgId) {
      return res.status(400).json({ error: 'teacherId and orgId are required' });
    }

    const teacher = await Teacher.findOne({ teacherId, orgId });
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Normalize date to start of today (local server time or UTC, assuming server time)
    const now = new Date();
    const dateStart = new Date(now);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(now);
    dateEnd.setHours(23, 59, 59, 999);

    const existing = await TeacherAttendance.findOne({
      teacherId,
      date: { $gte: dateStart, $lte: dateEnd }
    });

    if (existing) {
      return res.status(400).json({
        error: `Already checked in today at ${existing.checkIn.toLocaleTimeString()}`,
        attendanceId: existing.attendanceId
      });
    }

    let attendanceId = generateAttendanceId();
    while (await TeacherAttendance.findOne({ attendanceId })) {
      attendanceId = generateAttendanceId();
    }

    const attendance = await TeacherAttendance.create({
      attendanceId,
      orgId,
      teacherId,
      teacherName: teacher.name,
      date: dateStart,
      checkIn: now
    });

    res.status(201).json({ success: true, message: 'Checked in successfully', attendance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// CHECK-OUT
exports.checkOut = async (req, res) => {
  try {
    const teacherId = req.user?.teacherId || req.body.teacherId;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!teacherId || !orgId) {
      return res.status(400).json({ error: 'teacherId and orgId are required' });
    }

    const now = new Date();
    const dateStart = new Date(now);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(now);
    dateEnd.setHours(23, 59, 59, 999);

    const attendance = await TeacherAttendance.findOne({
      teacherId,
      date: { $gte: dateStart, $lte: dateEnd }
    });

    if (!attendance) {
      return res.status(404).json({ error: 'No check-in record found for today' });
    }

    if (attendance.checkOut) {
      return res.status(400).json({ error: `Already checked out today at ${attendance.checkOut.toLocaleTimeString()}` });
    }

    attendance.checkOut = now;
    await attendance.save();

    res.json({ success: true, message: 'Checked out successfully', attendance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET PRESENT TEACHERS FOR A DATE
exports.getPresentTeachers = async (req, res) => {
  try {
    const orgId = req.params.orgId || req.user?.orgId;
    const { date } = req.query; // format: YYYY-MM-DD

    if (!orgId) {
      return res.status(400).json({ error: 'orgId is required' });
    }
    
    let queryDateStart, queryDateEnd;
    
    if (date) {
      queryDateStart = new Date(date);
      queryDateStart.setHours(0, 0, 0, 0);
      queryDateEnd = new Date(date);
      queryDateEnd.setHours(23, 59, 59, 999);
    } else {
      const now = new Date();
      queryDateStart = new Date(now);
      queryDateStart.setHours(0, 0, 0, 0);
      queryDateEnd = new Date(now);
      queryDateEnd.setHours(23, 59, 59, 999);
    }

    const attendances = await TeacherAttendance.find({
      orgId,
      date: { $gte: queryDateStart, $lte: queryDateEnd }
    }).sort({ checkIn: 1 });

    res.json({ success: true, count: attendances.length, attendances });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// EXPORT ATTENDANCE
exports.exportTeacherAttendance = async (req, res) => {
  try {
    const orgId = req.params.orgId || req.user?.orgId;
    const { month, year, date } = req.query; // month is 1-12

    if (!orgId) {
      return res.status(400).json({ error: 'orgId is required' });
    }

    let filter = { orgId };

    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const endD = new Date(date);
      endD.setHours(23, 59, 59, 999);
      filter.date = { $gte: d, $lte: endD };
    } else if (month && year) {
      const m = parseInt(month) - 1; // 0-indexed
      const y = parseInt(year);
      const startD = new Date(y, m, 1, 0, 0, 0, 0);
      const endD = new Date(y, m + 1, 0, 23, 59, 59, 999);
      filter.date = { $gte: startD, $lte: endD };
    } else if (year) {
      const y = parseInt(year);
      const startD = new Date(y, 0, 1, 0, 0, 0, 0);
      const endD = new Date(y, 11, 31, 23, 59, 59, 999);
      filter.date = { $gte: startD, $lte: endD };
    }

    const attendances = await TeacherAttendance.find(filter).sort({ date: 1, teacherName: 1 });

    res.json({ success: true, count: attendances.length, attendances });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
