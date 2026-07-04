const TutorSessionActivity = require('../models/TutorSessionActivity');
const TutorAttendance = require('../models/TutorAttendance');
const NodeGeocoder = require('node-geocoder');

const geocoder = NodeGeocoder({ provider: 'openstreetmap' });

// POST /api/tutor-session/start
exports.startSession = async (req, res) => {
  try {
    const orgId = req.user.orgId; // from auth middleware
    const teacherId = req.user.teacherId; // from auth middleware
    const { studentPhotos, duration, studentIds, lat, lng, date, sessionStartedTime } = req.body;

    let address = 'Location not found';
    if (lat && lng) {
      try {
        const geoRes = await geocoder.reverse({ lat, lon: lng });
        if (geoRes && geoRes.length > 0) {
          address = geoRes[0].formattedAddress || 'Location found but no address string';
        }
      } catch (err) {
        console.error('Geocoding error:', err);
      }
    }

    const sessionDate = new Date(date);
    sessionDate.setHours(0, 0, 0, 0);

    const newSession = new TutorSessionActivity({
      orgId,
      teacherId,
      date: sessionDate,
      studentPhotos: studentPhotos || [],
      duration,
      studentIds: studentIds || [],
      location: { lat, lng, address },
      sessionStartedTime: sessionStartedTime || new Date(),
      status: 'Session ongoing/started'
    });

    await newSession.save();

    // Mark attendance as present and increment session count
    await TutorAttendance.findOneAndUpdate(
      { orgId, teacherId, date: sessionDate },
      { 
        $set: { status: 'Present' },
        $inc: { totalSessionsCount: 1 }
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, data: newSession });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/tutor-session/:id
exports.updateSessionActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      sessionDescription,
      isHomeworkProvided,
      homeworkFiles,
      isTestProvided,
      testFiles,
      sessionEndedTime
    } = req.body;

    const session = await TutorSessionActivity.findById(id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    session.sessionDescription = sessionDescription || '';
    session.isHomeworkProvided = isHomeworkProvided || false;
    session.homeworkFiles = homeworkFiles || [];
    session.isTestProvided = isTestProvided || false;
    session.testFiles = testFiles || [];
    if (sessionEndedTime) {
      session.sessionEndedTime = sessionEndedTime;
    }
    session.status = 'Completed';

    await session.save();

    res.status(200).json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/tutor-session
exports.getTutorSessions = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const teacherId = req.user.teacherId;
    const { date } = req.query;

    const query = { orgId, teacherId };
    if (date) {
      const queryDate = new Date(date);
      queryDate.setHours(0, 0, 0, 0);
      query.date = queryDate;
    }

    const sessions = await TutorSessionActivity.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/tutor-sessions/admin/teacher/:teacherId
exports.getAdminTutorSessions = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { teacherId } = req.params;
    const { date } = req.query;

    const query = { orgId, teacherId };
    if (date) {
      const queryDate = new Date(date);
      queryDate.setHours(0, 0, 0, 0);
      query.date = queryDate;
    }

    const sessions = await TutorSessionActivity.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
