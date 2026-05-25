const Notes = require('../models/Notes');
const Classroom = require('../models/Classroom');
const { uploadToAzure, deleteFromAzure, sharp } = require('../config/azureStorage');
const { notifyClass } = require('../utils/sendNotification');  // ← ADDED

const generateNotesId = () => `NTS_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

// CREATE NOTE
exports.createNote = async (req, res) => {
  try {
    const { title, notesSharedBy, classId, orgId } = req.body;

    if (!title || !notesSharedBy || !classId || !orgId) {
      return res.status(400).json({ error: 'title, notesSharedBy, classId, orgId required' });
    }

    const classroom = await Classroom.findOne({ classId, isActive: true });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    if (classroom.orgId !== orgId) {
      return res.status(403).json({ error: 'Classroom does not belong to this org' });
    }

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

        const uploadResult = await uploadToAzure(buffer, name, mimeType, `notes/${folder}`);
        attachments.push({
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          type: isPdf ? 'pdf' : 'image',
          filename: file.originalname
        });
      }
    }

    let notesId = generateNotesId();
    while (await Notes.findOne({ notesId })) {
      notesId = generateNotesId();
    }

    const note = await Notes.create({
      notesId, title,
      notesSharedBy, classId,
      orgId, attachments
    });

    // ✅ Notify class on create — NEW ADDITION
    try {
      await notifyClass({
        classId,
        orgId,
        title: `📚 New Notes Shared: ${title}`,
        body: `${notesSharedBy} shared new notes for your class`,
        type: 'general',
        sentBy: notesSharedBy,
        sentByName: notesSharedBy,
        data: { route: '/notes', notesId: note.notesId }
      });
    } catch (notifyError) {
      console.log('Notification failed (non-critical):', notifyError.message);
    }

    res.status(201).json({ success: true, note });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET ALL NOTES BY CLASSID
exports.getNotesByClass = async (req, res) => {
  try {
    const { classId } = req.params;

    const classroom = await Classroom.findOne({ classId, isActive: true });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    
    const __clsCheck = await require('../models/Classroom').findOne({ classId, isActive: true });
    if (!__clsCheck) return res.status(403).json({ error: 'Classroom is inactive or not found' });

    const notes = await Notes.find({ classId }).sort({ createdAt: -1 });

    res.json({ success: true, count: notes.length, notes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET ALL NOTES BY ORGID
exports.getNotesByOrg = async (req, res) => {
  try {
    const { orgId } = req.params;
    const notes = await Notes.find({ orgId }).sort({ createdAt: -1 });
    res.json({ success: true, count: notes.length, notes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET SINGLE NOTE
exports.getNote = async (req, res) => {
  try {
    const { notesId } = req.params;
    const note = await Notes.findOne({ notesId });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json({ success: true, note });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE NOTE
exports.updateNote = async (req, res) => {
  try {
    const { notesId } = req.params;
    const { title, notesSharedBy } = req.body;

    const note = await Notes.findOne({ notesId });
    if (!note) return res.status(404).json({ error: 'Note not found' });

    if (title) note.title = title;
    if (notesSharedBy) note.notesSharedBy = notesSharedBy;

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

        const uploadResult = await uploadToAzure(buffer, name, mimeType, `notes/${folder}`);
        note.attachments.push({
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          type: isPdf ? 'pdf' : 'image',
          filename: file.originalname
        });
      }
    }

    await note.save();
    res.json({ success: true, note });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE SINGLE ATTACHMENT FROM NOTE
exports.deleteAttachment = async (req, res) => {
  try {
    const { notesId } = req.params;
    const { publicId, resourceType } = req.body;

    if (!publicId) return res.status(400).json({ error: 'publicId required' });

    const note = await Notes.findOne({ notesId });
    if (!note) return res.status(404).json({ error: 'Note not found' });

    try {
      await deleteFromAzure(publicId);
    } catch (azureErr) {
      console.error('Azure deletion error (non-critical, might be Cloudinary asset):', azureErr.message);
    }

    note.attachments = note.attachments.filter(a => a.publicId !== publicId);
    await note.save();

    res.json({ success: true, message: 'Attachment deleted', attachments: note.attachments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE NOTE
exports.deleteNote = async (req, res) => {
  try {
    const { notesId } = req.params;

    const note = await Notes.findOne({ notesId });
    if (!note) return res.status(404).json({ error: 'Note not found' });

    for (const att of note.attachments) {
      try {
        await deleteFromAzure(att.publicId);
      } catch (azureErr) {
        console.error('Azure deletion error (non-critical):', azureErr.message);
      }
    }

    await Notes.findOneAndDelete({ notesId });
    res.json({ success: true, message: `Note "${note.title}" deleted` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE ALL NOTES BY CLASSID
exports.deleteNotesByClass = async (req, res) => {
  try {
    const { classId } = req.params;

    
    const __clsCheck = await require('../models/Classroom').findOne({ classId, isActive: true });
    if (!__clsCheck) return res.status(403).json({ error: 'Classroom is inactive or not found' });

    const notes = await Notes.find({ classId });

    if (notes.length === 0) {
      return res.json({ success: true, message: 'No notes found for this class', deleted: 0 });
    }

    for (const note of notes) {
      for (const att of note.attachments) {
        try {
          await deleteFromAzure(att.publicId);
        } catch (azureErr) {
          console.error('Azure deletion error (non-critical):', azureErr.message);
        }
      }
    }

    const result = await Notes.deleteMany({ classId });

    res.json({
      success: true,
      message: `${result.deletedCount} note(s) deleted`,
      deleted: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};