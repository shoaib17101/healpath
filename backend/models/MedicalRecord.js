const mongoose = require('mongoose');

const MedicalRecordSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['PRESCRIPTION', 'EXERCISE', 'NOTE'],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  // Additional fields for PRESCRIPTION
  medication: String,
  dosage: String,
  frequency: String,
  duration: String,
  // Additional fields for EXERCISE
  exerciseName: String,
  sets: String,
  reps: String,
  // Additional fields for NOTE (e.g., Clinical Findings)
  symptoms: String,
  diagnosis: String,
  vitals: {
    bp: String,
    temp: String,
    weight: String,
    heartRate: String
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('MedicalRecord', MedicalRecordSchema);
