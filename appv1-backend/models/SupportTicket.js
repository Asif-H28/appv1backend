const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  orgId: { type: String, required: true, index: true },
  email: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  description: { type: String, required: true },
  images: [{ type: String }], // Array of Azure Blob URLs
  status: { type: String, enum: ['Open', 'In Progress', 'Resolved'], default: 'Open' },
  resolvedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
