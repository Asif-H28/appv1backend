const mongoose = require('mongoose');
const LibraryIssue = require('../models/LibraryIssue');

const generateIssueId = () => `LIB_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

// Helper to get user info from token payload for tracking who issued the book
const getUserIdentity = (req) => {
  const userId = req.user?.adminEmail || req.user?.staffId || req.user?.userId || 'system';
  const userName = req.user?.name || req.user?.adminEmail || 'Admin/Staff';
  return { userId, userName };
};

// 1. Issue a book
exports.issueBook = async (req, res) => {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(400).json({ error: 'orgId is required' });

    const { bookName, author, classId, className, studentId, studentName, issuedDate, expectedReturnDate } = req.body;

    // Validation
    if (!bookName || !author) {
      return res.status(400).json({ error: 'Book name and author are required' });
    }
    if (!classId || !className) {
      return res.status(400).json({ error: 'Class ID and Class Name are required' });
    }
    if (!studentId || !studentName) {
      return res.status(400).json({ error: 'Student ID and Student Name are required' });
    }
    if (!issuedDate || !expectedReturnDate) {
      return res.status(400).json({ error: 'Issued date and expected return date are required' });
    }

    let issueId = generateIssueId();
    while (await LibraryIssue.findOne({ issueId })) {
      issueId = generateIssueId();
    }

    const { userId, userName } = getUserIdentity(req);

    const newIssue = await LibraryIssue.create({
      issueId,
      orgId,
      bookName,
      author,
      classId,
      className,
      studentId,
      studentName,
      issuedDate: new Date(issuedDate),
      expectedReturnDate: new Date(expectedReturnDate),
      status: 'Issued',
      issuedBy: userId,
      issuedByName: userName
    });

    res.status(201).json({ success: true, message: 'Book issued successfully', issue: newIssue });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Get Issued Books (with filters)
exports.getIssuedBooks = async (req, res) => {
  try {
    const orgId = req.user?.orgId;
    const { status, classId, studentId, search } = req.query;

    let filter = { orgId };

    if (status) {
      filter.status = status;
    }
    if (classId) {
      filter.classId = classId;
    }
    if (studentId) {
      filter.studentId = studentId;
    }
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { bookName: searchRegex },
        { author: searchRegex },
        { studentName: searchRegex },
        { className: searchRegex },
        { issueId: searchRegex }
      ];
    }

    const issuedBooks = await LibraryIssue.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: issuedBooks.length, issuedBooks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Mark as Returned
exports.markAsReturned = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user?.orgId;

    let query = { orgId };
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.$or = [{ _id: id }, { issueId: id }];
    } else {
      query.issueId = id;
    }

    const issueRecord = await LibraryIssue.findOne(query);
    if (!issueRecord) {
      return res.status(404).json({ error: 'Issue record not found' });
    }

    if (issueRecord.status === 'Returned') {
      return res.status(400).json({ error: 'Book is already marked as returned' });
    }

    issueRecord.status = 'Returned';
    issueRecord.actualReturnedDate = new Date();
    await issueRecord.save();

    res.json({ success: true, message: 'Book marked as returned successfully', issue: issueRecord });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. Delete Issue Record
exports.deleteIssueRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user?.orgId;

    let query = { orgId };
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.$or = [{ _id: id }, { issueId: id }];
    } else {
      query.issueId = id;
    }

    const result = await LibraryIssue.deleteOne(query);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Issue record not found' });
    }

    res.json({ success: true, message: 'Issue record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
