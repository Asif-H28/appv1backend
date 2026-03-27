const Timetable = require('../models/Timetable');
const Classroom = require('../models/Classroom');

const generateTimetableId = () => `TTB_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

const VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─────────────────────────────────────────────
// HELPER: Get today's day name
// ─────────────────────────────────────────────
const getTodayName = () => {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
};

// ─────────────────────────────────────────────
// HELPER: Validate slots
// ─────────────────────────────────────────────
const validateSlots = (slots) => {
  for (const slot of slots) {
    if (!slot.day || !slot.periodNumber || !slot.startTime || !slot.endTime) {
      return 'Each slot needs day, periodNumber, startTime, endTime';
    }
    if (!VALID_DAYS.includes(slot.day)) {
      return `Invalid day "${slot.day}". Must be Monday to Saturday`;
    }
    // If type is class, subjectName and teacherName required
    if ((!slot.type || slot.type === 'class') && (!slot.subjectName || !slot.teacherName || !slot.teacherId)) {
      return `Slot on ${slot.day} period ${slot.periodNumber} needs subjectName, teacherName, teacherId for type "class"`;
    }
  }

  // Check duplicate day + periodNumber
  const seen = new Set();
  for (const slot of slots) {
    const key = `${slot.day}-${slot.periodNumber}`;
    if (seen.has(key)) {
      return `Duplicate slot found: ${slot.day} Period ${slot.periodNumber}`;
    }
    seen.add(key);
  }

  return null;
};

// ─────────────────────────────────────────────
// CREATE TIMETABLE
// ─────────────────────────────────────────────
exports.createTimetable = async (req, res) => {
  try {
    const { classId, orgId, createdBy, createdByName, academicYear, slots } = req.body;

    if (!classId || !orgId || !createdBy || !createdByName || !academicYear) {
      return res.status(400).json({ error: 'classId, orgId, createdBy, createdByName, academicYear required' });
    }

    if (!slots || slots.length === 0) {
      return res.status(400).json({ error: 'slots[] required' });
    }

    // Validate classroom
    const classroom = await Classroom.findOne({ classId });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    // Check duplicate timetable for same class + academicYear
    const existing = await Timetable.findOne({ classId, academicYear });
    if (existing) {
      return res.status(400).json({
        error: `Timetable already exists for this class in ${academicYear}`,
        timetableId: existing.timetableId
      });
    }

    // Validate slots
    const slotError = validateSlots(slots);
    if (slotError) return res.status(400).json({ error: slotError });

    let timetableId = generateTimetableId();
    while (await Timetable.findOne({ timetableId })) {
      timetableId = generateTimetableId();
    }

    const timetable = await Timetable.create({
      timetableId,
      classId,
      orgId,
      className: classroom.className,
      createdBy,
      createdByName,
      academicYear,
      slots
    });

    res.status(201).json({ success: true, timetable });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET FULL TIMETABLE BY CLASSID (full week)
// ─────────────────────────────────────────────
exports.getTimetableByClass = async (req, res) => {
  try {
    const { classId } = req.params;

    const timetable = await Timetable.findOne({ classId });
    if (!timetable) return res.status(404).json({ error: 'Timetable not found for this class' });

    // Group slots by day
    const grouped = {};
    for (const day of VALID_DAYS) {
      grouped[day] = timetable.slots
        .filter(s => s.day === day)
        .sort((a, b) => a.periodNumber - b.periodNumber);
    }

    res.json({
      success: true,
      timetableId: timetable.timetableId,
      classId: timetable.classId,
      className: timetable.className,
      academicYear: timetable.academicYear,
      createdByName: timetable.createdByName,
      timetable: grouped
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET TODAY'S TIMETABLE BY CLASSID
// ─────────────────────────────────────────────
exports.getTodayTimetable = async (req, res) => {
  try {
    const { classId } = req.params;
    const today = getTodayName();

    const timetable = await Timetable.findOne({ classId });
    if (!timetable) return res.status(404).json({ error: 'Timetable not found for this class' });

    const todaySlots = timetable.slots
      .filter(s => s.day === today)
      .sort((a, b) => a.periodNumber - b.periodNumber);

    res.json({
      success: true,
      classId,
      className: timetable.className,
      today,
      totalPeriods: todaySlots.length,
      slots: todaySlots
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET TIMETABLE BY DAY
// ─────────────────────────────────────────────
exports.getTimetableByDay = async (req, res) => {
  try {
    const { classId, day } = req.params;

    if (!VALID_DAYS.includes(day)) {
      return res.status(400).json({ error: 'Invalid day. Must be Monday to Saturday' });
    }

    const timetable = await Timetable.findOne({ classId });
    if (!timetable) return res.status(404).json({ error: 'Timetable not found for this class' });

    const daySlots = timetable.slots
      .filter(s => s.day === day)
      .sort((a, b) => a.periodNumber - b.periodNumber);

    res.json({
      success: true,
      classId,
      className: timetable.className,
      day,
      totalPeriods: daySlots.length,
      slots: daySlots
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET TEACHER SCHEDULE (across all classes)
// ─────────────────────────────────────────────
exports.getTeacherSchedule = async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Find all timetables that have this teacher in any slot
    const timetables = await Timetable.find({
      'slots.teacherId': teacherId
    });

    if (timetables.length === 0) {
      return res.status(404).json({ error: 'No schedule found for this teacher' });
    }

    // Group by day
    const grouped = {};
    for (const day of VALID_DAYS) {
      grouped[day] = [];
    }

    for (const tt of timetables) {
      const teacherSlots = tt.slots.filter(s => s.teacherId === teacherId);
      for (const slot of teacherSlots) {
        grouped[slot.day].push({
          classId: tt.classId,
          className: tt.className,
          periodNumber: slot.periodNumber,
          startTime: slot.startTime,
          endTime: slot.endTime,
          subjectName: slot.subjectName,
          type: slot.type
        });
      }
    }

    // Sort each day by periodNumber
    for (const day of VALID_DAYS) {
      grouped[day].sort((a, b) => a.periodNumber - b.periodNumber);
    }

    res.json({
      success: true,
      teacherId,
      schedule: grouped
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// UPDATE SINGLE SLOT
// ─────────────────────────────────────────────
exports.updateSlot = async (req, res) => {
  try {
    const { timetableId } = req.params;
    const { day, periodNumber, startTime, endTime, subjectName, teacherName, teacherId, type } = req.body;

    if (!day || !periodNumber) {
      return res.status(400).json({ error: 'day and periodNumber required to identify slot' });
    }

    if (!VALID_DAYS.includes(day)) {
      return res.status(400).json({ error: 'Invalid day. Must be Monday to Saturday' });
    }

    const timetable = await Timetable.findOne({ timetableId });
    if (!timetable) return res.status(404).json({ error: 'Timetable not found' });

    const slot = timetable.slots.find(
      s => s.day === day && s.periodNumber === periodNumber
    );
    if (!slot) return res.status(404).json({ error: `Slot not found for ${day} Period ${periodNumber}` });

    // Update only provided fields
    if (startTime) slot.startTime = startTime;
    if (endTime) slot.endTime = endTime;
    if (subjectName) slot.subjectName = subjectName;
    if (teacherName) slot.teacherName = teacherName;
    if (teacherId) slot.teacherId = teacherId;
    if (type) slot.type = type;

    await timetable.save();

    res.json({
      success: true,
      message: `Slot updated for ${day} Period ${periodNumber}`,
      slot
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// ADD NEW SLOT TO TIMETABLE
// ─────────────────────────────────────────────
exports.addSlot = async (req, res) => {
  try {
    const { timetableId } = req.params;
    const { day, periodNumber, startTime, endTime, subjectName, teacherName, teacherId, type } = req.body;

    if (!day || !periodNumber || !startTime || !endTime) {
      return res.status(400).json({ error: 'day, periodNumber, startTime, endTime required' });
    }

    const timetable = await Timetable.findOne({ timetableId });
    if (!timetable) return res.status(404).json({ error: 'Timetable not found' });

    // Check duplicate
    const exists = timetable.slots.find(s => s.day === day && s.periodNumber === periodNumber);
    if (exists) {
      return res.status(400).json({ error: `Slot already exists for ${day} Period ${periodNumber}` });
    }

    timetable.slots.push({
      day, periodNumber, startTime, endTime,
      subjectName: subjectName || null,
      teacherName: teacherName || null,
      teacherId: teacherId || null,
      type: type || 'class'
    });

    await timetable.save();

    res.json({
      success: true,
      message: `Slot added for ${day} Period ${periodNumber}`,
      slots: timetable.slots
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// REMOVE SLOT FROM TIMETABLE
// ─────────────────────────────────────────────
exports.removeSlot = async (req, res) => {
  try {
    const { timetableId } = req.params;
    const { day, periodNumber } = req.body;

    if (!day || !periodNumber) {
      return res.status(400).json({ error: 'day and periodNumber required' });
    }

    const timetable = await Timetable.findOne({ timetableId });
    if (!timetable) return res.status(404).json({ error: 'Timetable not found' });

    const exists = timetable.slots.find(s => s.day === day && s.periodNumber === periodNumber);
    if (!exists) {
      return res.status(404).json({ error: `Slot not found for ${day} Period ${periodNumber}` });
    }

    timetable.slots = timetable.slots.filter(
      s => !(s.day === day && s.periodNumber === periodNumber)
    );

    await timetable.save();

    res.json({
      success: true,
      message: `Slot removed for ${day} Period ${periodNumber}`,
      slots: timetable.slots
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// DELETE TIMETABLE
// ─────────────────────────────────────────────
exports.deleteTimetable = async (req, res) => {
  try {
    const { timetableId } = req.params;

    const timetable = await Timetable.findOneAndDelete({ timetableId });
    if (!timetable) return res.status(404).json({ error: 'Timetable not found' });

    res.json({
      success: true,
      message: `Timetable for ${timetable.className} deleted`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};