const mongoose = require('mongoose');

const libraryIssueSchema = new mongoose.Schema({
  issueId: {
    type: String,
    required: true,
    unique: true
  },
  orgId: {
    type: String,
    required: true,
    index: true
  },
  bookName: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: String,
    required: true,
    trim: true
  },
  classId: {
    type: String,
    required: true
  },
  className: {
    type: String,
    required: true
  },
  studentId: {
    type: String,
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  issuedDate: {
    type: Date,
    required: true
  },
  expectedReturnDate: {
    type: Date,
    required: true
  },
  actualReturnedDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['Issued', 'Returned', 'Overdue'],
    default: 'Issued'
  },
  issuedBy: {
    type: String,
    required: true // Can be adminEmail or staffId
  },
  issuedByName: {
    type: String,
    required: true // Name of the person who issued the book
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('LibraryIssue', libraryIssueSchema);
