const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const TuitionSession = require('../models/TuitionSession');
const { uploadToAzure, sharp } = require('../config/azureStorage');

const generateSessionId = () => `SESS_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

exports.generateQR = async (req, res) => {
  try {
    const { assignmentId, studentId, studentName, teacherId, teacherName, orgId } = req.body;

    if (!assignmentId || !studentId || !teacherId || !orgId) {
      return res.status(400).json({ error: 'assignmentId, studentId, teacherId, and orgId are required' });
    }

    // Ensure it's authorized (student must match req.user.studentId if it's a student generating it, though admin could too)
    if (req.user && req.user.role === 'student' && req.user.studentId !== studentId) {
      return res.status(403).json({ error: 'You can only generate QR codes for your own sessions' });
    }

    // Normalize date
    const now = new Date();
    const dateStart = new Date(now);
    dateStart.setHours(0, 0, 0, 0);

    // Check if session already exists for today
    let session = await TuitionSession.findOne({
      assignmentId,
      studentId,
      date: dateStart
    });

    if (session) {
      if (session.status !== 'pending') {
        return res.status(400).json({ error: `Session for today is already ${session.status}` });
      }
    } else {
      // Create new pending session
      session = new TuitionSession({
        sessionId: generateSessionId(),
        orgId,
        assignmentId,
        studentId,
        studentName,
        teacherId,
        teacherName,
        date: dateStart,
        status: 'pending'
      });
    }

    // Generate short-lived JWT (15 mins)
    const jti = crypto.randomBytes(16).toString('hex');
    const expiresIn = 15 * 60; // 15 mins in seconds
    
    const qrToken = jwt.sign(
      { jti, studentId, assignmentId, date: dateStart.getTime() },
      process.env.JWT_SECRET,
      { expiresIn }
    );

    session.qrTokenId = jti;
    session.qrGeneratedAt = now;
    session.qrExpiresAt = new Date(now.getTime() + expiresIn * 1000);
    
    await session.save();

    res.json({ success: true, qrToken, expiresIn, session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.checkIn = async (req, res) => {
  try {
    const { qrToken, teacherLat, teacherLng } = req.body;

    if (!qrToken) return res.status(400).json({ error: 'qrToken is required' });

    let decoded;
    try {
      decoded = jwt.verify(qrToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ error: 'QR Token is invalid or expired' });
    }

    // Verify Teacher Identity from Auth Token
    const authTeacherId = req.user?.teacherId || req.user?.userId;
    if (!authTeacherId && req.user?.role !== 'admin' && req.user?.role !== 'support') {
      return res.status(403).json({ error: 'You are not authorized as a teacher' });
    }

    const session = await TuitionSession.findOne({
      qrTokenId: decoded.jti,
      assignmentId: decoded.assignmentId,
      studentId: decoded.studentId
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found or QR is invalid' });
    }

    if (session.status !== 'pending') {
      return res.status(400).json({ error: `Session is already ${session.status}. QR token has been consumed.` });
    }

    // Optional: Strict check if the teacher assigned matches the one scanning it
    if (session.teacherId && session.teacherId !== authTeacherId && req.user?.role === 'teacher') {
      return res.status(403).json({ error: 'You are not the assigned teacher for this session' });
    }

    session.status = 'ongoing';
    session.qrConsumedAt = new Date();
    session.startedByTeacherId = authTeacherId;
    session.checkInTime = new Date();
    if (teacherLat && teacherLng) {
      session.checkInLocation = { lat: parseFloat(teacherLat), lng: parseFloat(teacherLng) };
    }

    await session.save();

    res.json({ success: true, message: 'Session started successfully', session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.forceCheckIn = async (req, res) => {
  try {
    const { assignmentId, studentId, studentName, orgId, reason, teacherLat, teacherLng } = req.body;

    if (!assignmentId || !studentId || !orgId || !reason) {
      return res.status(400).json({ error: 'assignmentId, studentId, orgId, and reason are required' });
    }

    const authTeacherId = req.user?.teacherId || req.user?.userId;
    const authTeacherName = req.user?.name || req.user?.teacherName || '';
    
    if (!authTeacherId && req.user?.role !== 'admin' && req.user?.role !== 'support') {
      return res.status(403).json({ error: 'You are not authorized to start a session' });
    }

    const now = new Date();
    const dateStart = new Date(now);
    dateStart.setHours(0, 0, 0, 0);

    let session = await TuitionSession.findOne({
      assignmentId,
      studentId,
      date: dateStart
    });

    if (session) {
      if (session.status !== 'pending') {
        return res.status(400).json({ error: `Session is already ${session.status}. Cannot force check-in.` });
      }
      // Update existing pending session
      session.status = 'ongoing';
      session.forcedCheckIn = true;
      session.forcedCheckInReason = reason;
      session.startedByTeacherId = authTeacherId;
      session.checkInTime = now;
      if (teacherLat && teacherLng) {
        session.checkInLocation = { lat: parseFloat(teacherLat), lng: parseFloat(teacherLng) };
      }
    } else {
      // Create new ongoing session directly
      session = new TuitionSession({
        sessionId: generateSessionId(),
        orgId,
        assignmentId,
        studentId,
        studentName,
        teacherId: authTeacherId,
        teacherName: authTeacherName,
        date: dateStart,
        status: 'ongoing',
        forcedCheckIn: true,
        forcedCheckInReason: reason,
        startedByTeacherId: authTeacherId,
        checkInTime: now
      });
      if (teacherLat && teacherLng) {
        session.checkInLocation = { lat: parseFloat(teacherLat), lng: parseFloat(teacherLng) };
      }
    }

    await session.save();

    res.json({ success: true, message: 'Session forcefully started', session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, homeworkProvided, studentCompletedHomework, testGiven } = req.body;

    const session = await TuitionSession.findById(id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (session.status !== 'ongoing') {
      return res.status(400).json({ error: 'Can only update activity for ongoing sessions' });
    }

    // Ensure only the teacher who started it (or admin) can update it
    const authTeacherId = req.user?.teacherId || req.user?.userId;
    if (req.user?.role === 'teacher' && session.startedByTeacherId !== authTeacherId) {
      return res.status(403).json({ error: 'Only the teacher who started the session can update it' });
    }

    if (description !== undefined) session.activity.description = description;
    if (homeworkProvided !== undefined) session.activity.homeworkProvided = homeworkProvided === 'true' || homeworkProvided === true;
    if (studentCompletedHomework !== undefined) session.activity.studentCompletedHomework = studentCompletedHomework === 'true' || studentCompletedHomework === true;
    if (testGiven !== undefined) session.activity.testGiven = testGiven === 'true' || testGiven === true;

    session.activity.lastUpdatedAt = new Date();

    // Handle File Uploads for different sections
    const uploadFiles = async (filesArray, sectionName) => {
      if (!filesArray || filesArray.length === 0) return;
      for (const file of filesArray) {
        let buffer = file.buffer;
        let mimeType = file.mimetype;
        let name = file.originalname;

        const isPdf = file.mimetype === 'application/pdf';
        const isImage = file.mimetype.startsWith('image/');
        const folder = isImage ? 'images' : (isPdf ? 'pdfs' : 'docs');

        if (isImage) {
          try {
            buffer = await sharp(file.buffer)
              .resize({ width: 1000, withoutEnlargement: true })
              .webp({ quality: 80 })
              .toBuffer();
            mimeType = 'image/webp';
            name = name.replace(/\.[^/.]+$/, "") + ".webp";
          } catch (sharpError) {
            console.error('Sharp optimization failed:', sharpError);
          }
        }

        const uploadResult = await uploadToAzure(buffer, name, mimeType, `sessions/${folder}`);
        session.activity.attachments.push({
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          type: isPdf ? 'pdf' : 'image',
          filename: file.originalname,
          section: sectionName
        });
      }
    };

    if (req.files) {
      await uploadFiles(req.files.homeworkProvidedFiles, 'homeworkProvided');
      await uploadFiles(req.files.studentCompletedHomeworkFiles, 'studentCompletedHomework');
      await uploadFiles(req.files.testGivenFiles, 'testGiven');
      await uploadFiles(req.files.additionalFiles, 'additional');
    }

    await session.save();

    res.json({ success: true, message: 'Activity updated', session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherLat, teacherLng } = req.body;

    const session = await TuitionSession.findById(id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (session.status !== 'ongoing') {
      return res.status(400).json({ error: 'Session is not ongoing' });
    }

    const authTeacherId = req.user?.teacherId || req.user?.userId;
    if (req.user?.role === 'teacher' && session.startedByTeacherId !== authTeacherId) {
      return res.status(403).json({ error: 'Only the teacher who started the session can end it' });
    }

    session.checkOutTime = new Date();
    if (teacherLat && teacherLng) {
      session.checkOutLocation = { lat: parseFloat(teacherLat), lng: parseFloat(teacherLng) };
    }

    const diffMs = session.checkOutTime - session.checkInTime;
    session.durationMinutes = Math.round(diffMs / 60000);
    session.status = 'completed';

    await session.save();

    res.json({ success: true, message: 'Session completed', session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSessions = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { status, date, teacherId, studentId } = req.query;

    let filter = { orgId };
    if (status) filter.status = status;
    if (teacherId) filter.teacherId = teacherId;
    if (studentId) filter.studentId = studentId;

    if (date) {
      const queryDate = new Date(date);
      queryDate.setHours(0, 0, 0, 0);
      filter.date = queryDate;
    }

    const sessions = await TuitionSession.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: sessions.length, sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await TuitionSession.findById(id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
