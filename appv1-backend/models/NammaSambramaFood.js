const mongoose = require('mongoose');
const nammasambramaConn = require('../config/nammasambrama_db');

// Mirrors the `Dish` type on the frontend
const DishSchema = new mongoose.Schema({
  id: { type: String, required: true },
  dishName: { type: String, default: '', trim: true },
  isVeg: { type: Boolean, default: true },
  // Azure Blob URL
  dishImage: { type: String, default: '' },
  dishImageId: { type: String, default: '' },
  dishDescription: { type: String, default: '' }
}, { _id: false });

const NammaSambramaFoodSchema = new mongoose.Schema({
  foodType: { type: String, required: true, trim: true },
  // Azure Blob URL — key name kept as-is to match the frontend field
  foodtypeimage: { type: String, default: '' },
  foodtypeimageId: { type: String, default: '' },
  dishlist: { type: [DishSchema], default: [] },
  createdBy: { type: String, default: '' }
}, { timestamps: true });

module.exports = nammasambramaConn.model('NammaSambramaFood', NammaSambramaFoodSchema, 'nammasambramafoods');
