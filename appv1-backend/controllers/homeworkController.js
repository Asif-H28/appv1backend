const Homework = require('../models/Homework');
const Classroom = require('../models/Classroom');
const Student = require('../models/Student');
const { uploadToAzure, deleteFromAzure, sharp } = require('../config/azureStorage');
const { notifyClass } = require('../utils/sendNotification');
const notificationSocket = require('../sockets/notificationSocket');

const generateHomeworkId = () => `HWK_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

// CREATE HOMEWORK
exports.createHomework = async (req, res) => {
  try {
    const { title, description, subject, subjectId, createdBy, createdByName, deadline, orgId, classId, className } = req.body;

    if (!title || !subject || !subjectId || !createdBy || !deadline || !orgId || !classId || !className) {
      return res.status(400).json({
        error: 'title, subject, subjectId, createdBy, deadline, orgId, classId, className are required'
      });
    }

    const classroom = await Classroom.findOne({ classId, isActive: true });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found or inactive' });

    if (classroom.orgId !== orgId) {
      return res.status(403).json({ error: 'Classroom does not belong to this organization' });
    }

    // Handle file attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
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
            console.error('Sharp optimization failed, uploading raw image:', sharpError);
          }
        }

        const uploadResult = await uploadToAzure(buffer, name, mimeType, `homeworks/${folder}`);
        attachments.push({
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          type: isPdf ? 'pdf' : (isImage ? 'image' : 'pdf'), // fallback non-images to pdf category for UI
          filename: file.originalname
        });
      }
    }

    let homeworkId = generateHomeworkId();
    while (await Homework.findOne({ homeworkId })) {
      homeworkId = generateHomeworkId();
    }

    const homework = await Homework.create({
      homeworkId,
      title,
      description: description || '',
      subject,
      subjectId,
      createdBy,
      createdByName: createdByName || '',
      deadline: new Date(deadline),
      orgId,
      classId,
      className,
      attachments
    });

    const notifBody = description 
      ? (description.length > 100 ? description.substring(0, 97) + '...' : description)
      : `Subject: ${subject} | Deadline: ${new Date(deadline).toLocaleDateString()}`;

    // Send FCM Push Notification to all students in the class
    try {
      await notifyClass({
        classId,
        orgId,
        title: `📝 New Homework: ${title}`,
        body: notifBody,
        type: 'general',
        sentBy: createdBy,
        sentByName: createdByName || 'Teacher',
        data: { route: '/homework', homeworkId: homework.homeworkId }
      });
    } catch (notifyError) {
      console.error('FCM Notification failed (non-critical):', notifyError.message);
    }

    // Send in-app notification via Socket.IO
    try {
      const approvedStudents = await Student.find({ classId, joinStatus: 'approved' }, 'studentId');
      for (const std of approvedStudents) {
        await notificationSocket.sendNotification(
          std.studentId,
          `📝 New Homework: ${title}`,
          notifBody,
          { route: '/homework', homeworkId: homework.homeworkId }
        );
      }
    } catch (socketError) {
      console.error('Socket.IO Notification failed (non-critical):', socketError.message);
    }

    res.status(201).json({ success: true, homework });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET HOMEWORKS BY CLASSROOM (with optional pagination)
exports.getHomeworkByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const classroom = await Classroom.findOne({ classId, isActive: true });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found or inactive' });

    const total = await Homework.countDocuments({ classId });
    const homeworks = await Homework.find({ classId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      count: homeworks.length,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      homeworks
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET HOMEWORKS BY CLASSROOM AND SUBJECT (with optional pagination)
exports.getHomeworkByClassAndSubject = async (req, res) => {
  try {
    const { classId, subjectId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const classroom = await Classroom.findOne({ classId, isActive: true });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found or inactive' });

    const query = { classId, subjectId };
    const total = await Homework.countDocuments(query);
    const homeworks = await Homework.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      count: homeworks.length,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      homeworks
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// GET HOMEWORKS BY ORG
exports.getHomeworkByOrg = async (req, res) => {
  try {
    const { orgId } = req.params;
    const homeworks = await Homework.find({ orgId }).sort({ createdAt: -1 });
    res.json({ success: true, count: homeworks.length, homeworks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET SINGLE HOMEWORK DETAILS
exports.getHomework = async (req, res) => {
  try {
    const { homeworkId } = req.params;
    const homework = await Homework.findOne({ homeworkId });
    if (!homework) return res.status(404).json({ error: 'Homework not found' });
    res.json({ success: true, homework });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE HOMEWORK (updates title, description, subject, subjectId, deadline, and appends new attachments)
exports.updateHomework = async (req, res) => {
  try {
    const { homeworkId } = req.params;
    const { title, description, subject, subjectId, deadline } = req.body;

    const homework = await Homework.findOne({ homeworkId });
    if (!homework) return res.status(404).json({ error: 'Homework not found' });

    if (title) homework.title = title;
    if (description !== undefined) homework.description = description;
    if (subject) homework.subject = subject;
    if (subjectId) homework.subjectId = subjectId;
    if (deadline) homework.deadline = new Date(deadline);

    // Handle new attachments
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
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
            console.error('Sharp optimization failed, uploading raw image:', sharpError);
          }
        }

        const uploadResult = await uploadToAzure(buffer, name, mimeType, `homeworks/${folder}`);
        homework.attachments.push({
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          type: isPdf ? 'pdf' : (isImage ? 'image' : 'pdf'),
          filename: file.originalname
        });
      }
    }

    await homework.save();
    res.json({ success: true, homework });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE SINGLE ATTACHMENT
exports.deleteAttachment = async (req, res) => {
  try {
    const { homeworkId } = req.params;
    const { publicId } = req.body;

    if (!publicId) return res.status(400).json({ error: 'publicId is required' });

    const homework = await Homework.findOne({ homeworkId });
    if (!homework) return res.status(404).json({ error: 'Homework not found' });

    try {
      await deleteFromAzure(publicId);
    } catch (azureErr) {
      console.error('Azure deletion error (non-critical, might be Cloudinary asset):', azureErr.message);
    }

    homework.attachments = homework.attachments.filter(a => a.publicId !== publicId);
    await homework.save();

    res.json({ success: true, message: 'Attachment deleted', attachments: homework.attachments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE HOMEWORK
exports.deleteHomework = async (req, res) => {
  try {
    const { homeworkId } = req.params;
    const homework = await Homework.findOne({ homeworkId });
    if (!homework) return res.status(404).json({ error: 'Homework not found' });

    // Clean up all attachments from Azure
    for (const att of homework.attachments) {
      try {
        await deleteFromAzure(att.publicId);
      } catch (azureErr) {
        console.error('Azure deletion error (non-critical):', azureErr.message);
      }
    }

    await Homework.findOneAndDelete({ homeworkId });
    res.json({ success: true, message: `Homework "${homework.title}" deleted` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE ALL HOMEWORKS BY CLASSROOM
exports.deleteHomeworkByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const classroom = await Classroom.findOne({ classId, isActive: true });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found or inactive' });

    const homeworks = await Homework.find({ classId });
    if (homeworks.length === 0) {
      return res.json({ success: true, message: 'No homeworks found for this class', deleted: 0 });
    }

    // Delete all attachments for all class homeworks from Azure
    for (const hw of homeworks) {
      for (const att of hw.attachments) {
        try {
          await deleteFromAzure(att.publicId);
        } catch (azureErr) {
          console.error('Azure deletion error (non-critical):', azureErr.message);
        }
      }
    }

    const result = await Homework.deleteMany({ classId });
    res.json({
      success: true,
      message: `${result.deletedCount} homework(s) deleted`,
      deleted: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
