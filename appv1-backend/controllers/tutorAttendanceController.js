const TutorAttendance = require('../models/TutorAttendance');
const Teacher = require('../models/Teacher');
const exceljs = require('exceljs');

// GET /api/tutor-attendance/present?date=YYYY-MM-DD
exports.getPresentTutors = async (req, res) => {
  try {
    const { orgId } = req;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }

    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);

    const attendances = await TutorAttendance.find({
      orgId,
      date: queryDate,
      status: 'Present'
    });

    const teacherIds = attendances.map(a => a.teacherId);
    const teachers = await Teacher.find({ _id: { $in: teacherIds }, orgId }, 'name email teacherId');

    res.status(200).json({ success: true, data: teachers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/tutor-attendance/report?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
exports.getAttendanceReport = async (req, res) => {
  try {
    const { orgId } = req;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get all attendances in date range
    const attendances = await TutorAttendance.find({
      orgId,
      date: { $gte: start, $lte: end }
    });

    // Get all teachers for the org
    const teachers = await Teacher.find({ orgId }, 'name email teacherId');

    const report = teachers.map(teacher => {
      const teacherAttendances = attendances.filter(a => a.teacherId === teacher._id.toString());
      
      const dayWise = {};
      let totalPresent = 0;
      let totalAbsent = 0;

      // Initialize all days in range
      let curr = new Date(start);
      while(curr <= end) {
        const dateString = curr.toISOString().split('T')[0];
        dayWise[dateString] = 'Absent'; // Default to absent
        curr.setDate(curr.getDate() + 1);
      }

      teacherAttendances.forEach(att => {
        const dStr = att.date.toISOString().split('T')[0];
        if (dayWise[dStr] !== undefined) {
          dayWise[dStr] = att.status;
          if (att.status === 'Present') totalPresent++;
        }
      });

      // Total days is the number of days in the range
      const totalDays = Object.keys(dayWise).length;
      totalAbsent = totalDays - totalPresent;

      return {
        teacherId: teacher._id,
        name: teacher.name,
        email: teacher.email,
        dayWise,
        totalDays,
        totalPresent,
        totalAbsent
      };
    });

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/tutor-attendance/export?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
exports.exportAttendanceReport = async (req, res) => {
  try {
    const { orgId } = req;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const attendances = await TutorAttendance.find({
      orgId,
      date: { $gte: start, $lte: end }
    });
    const teachers = await Teacher.find({ orgId }, 'name');

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    // Generate date columns
    const dateColumns = [];
    let curr = new Date(start);
    while(curr <= end) {
      const day = curr.getDate();
      const month = curr.getMonth() + 1;
      const year = curr.getFullYear();
      const dateString = `${day}/${month}/${year}`;
      const isoString = curr.toISOString().split('T')[0];
      dateColumns.push({ header: dateString, key: isoString, width: 12 });
      curr.setDate(curr.getDate() + 1);
    }

    worksheet.columns = [
      { header: 'Tutor Name', key: 'name', width: 25 },
      ...dateColumns,
      { header: 'Total Days', key: 'totalDays', width: 12 },
      { header: 'Present Count', key: 'totalPresent', width: 15 },
      { header: 'Absent Count', key: 'totalAbsent', width: 15 }
    ];

    // Add rows
    teachers.forEach(teacher => {
      const teacherAttendances = attendances.filter(a => a.teacherId === teacher._id.toString());
      
      const row = {
        name: teacher.name,
      };

      let totalPresent = 0;

      // Fill dates
      dateColumns.forEach(col => {
        const iso = col.key;
        const att = teacherAttendances.find(a => a.date.toISOString().split('T')[0] === iso);
        const status = att ? att.status : 'Absent';
        row[iso] = status;
        if (status === 'Present') totalPresent++;
      });

      const totalDays = dateColumns.length;
      const totalAbsent = totalDays - totalPresent;

      row.totalDays = totalDays;
      row.totalPresent = totalPresent;
      row.totalAbsent = totalAbsent;

      worksheet.addRow(row);
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + `tutor_attendance_${startDate}_to_${endDate}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
