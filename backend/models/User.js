const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['doctor', 'patient', 'admin'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: function() {
      if (this.role === 'patient' || this.role === 'admin') return 'approved';
      return 'pending';
    }
  },
  category: { type: String, index: true },
  availability: {
    days: { type: [String], default: [] },   // e.g. ["Monday","Wednesday","Friday"]
    startTime: { type: String, default: '' }, // e.g. "09:00"
    startPeriod: { type: String, enum: ['AM', 'PM'], default: 'AM' },
    endTime:   { type: String, default: '' }, // e.g. "05:00"
    endPeriod: { type: String, enum: ['AM', 'PM'], default: 'PM' },
  },
  experience: { type: Number },
  fees: { type: Number },
  bio: { type: String },
  profilePic: { type: String },
  paymentDetails: {
    jazzcashNumber: { type: String, default: '' },
    easypaisaNumber: { type: String, default: '' },
  },
  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  province: { type: String, index: true },
  city: { type: String, index: true },
  workNumber: { 
    type: String,
    minlength: 11,
    maxlength: 11
  },
  clinicAddress: { type: String },
  certifications: { type: String },
  proofOfCertification: { type: String },
  resetPasswordToken: { type: String, index: true },
  resetPasswordExpires: { type: Date },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', UserSchema);