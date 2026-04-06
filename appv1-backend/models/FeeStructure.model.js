const mongoose = require('mongoose');

const BreakdownSchema = new mongoose.Schema({
  component: { type: String, default: '' },
  amount:    { type: Number, default: 0  },
}, { _id: false });

const FeeStructureSchema = new mongoose.Schema({
  orgId:         { type: String, required: true, index: true },
  structureName: { type: String, default: '' },
  gradeFrom:     { type: Number, default: 1  },
  gradeTo:       { type: Number, default: 1  },
  feeAmount:     { type: Number, default: 0  },
  hasBreakdown:  { type: Boolean, default: false },
  breakdown:     { type: [BreakdownSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('FeeStructure', FeeStructureSchema);