const mongoose = require('mongoose');

const featureDefinitionSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true },
  description: { type: String },
  defaultEnabled: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('FeatureDefinition', featureDefinitionSchema);
