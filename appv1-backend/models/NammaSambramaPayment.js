const mongoose = require('mongoose');
const nammasambramaConn = require('../config/nammasambrama_db');

const NammaSambramaPaymentSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NammaSambramaAdmin',
    required: true,
    unique: true
  },
  upiId: {
    type: String,
    trim: true,
    default: ''
  },
  payeeName: {
    type: String,
    trim: true,
    default: ''
  },
  qrImageUrl: {
    type: String,
    default: ''
  },
  qrImageId: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = nammasambramaConn.model(
  'NammaSambramaPayment',
  NammaSambramaPaymentSchema,
  'nammasambramapayments'
);
