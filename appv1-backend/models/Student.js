const studentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], default: null },  // ← ADD
  address: { type: String, default: null, trim: true },                         // ← ADD
  tempOrgId: { type: String, default: null },
  orgId: { type: String, default: null },
  classId: { type: String, default: null },
  joinStatus: {
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected'],
    default: 'none'
  }
}, { timestamps: true });