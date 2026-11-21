const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  time: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    enum: ['IN PERSON', 'TELE-HEALTH', 'General Consultation'],
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['pending', 'pending_verification', 'scheduled', 'suggested', 'rejected', 'completed', 'missed', 'cancelled', 'no-show', 'paid'],
    default: 'scheduled',
  },
  read: {
    type: Boolean,
    default: false,
  },
  paymentRequired: {
    type: Boolean,
    default: false,
  },
  paymentMethod: {
    type: String,
    default: '',
  },
  transactionId: {
    type: String,
    default: '',
  },
  paymentProof: {
    type: String,
    default: '',
  },
  paymentConfirmedAt: {
    type: Date,
    default: null,
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null,
  },
  ratedAt: {
    type: Date,
    default: null,
  },
  reminder24Sent: {
    type: Boolean,
    default: false,
  },
  reminder1Sent: {
    type: Boolean,
    default: false,
  },
  appointmentDateReminderSentAt: {
    type: Date,
    default: null,
  },
});

AppointmentSchema.index(
  { doctor: 1, date: 1, time: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['pending', 'pending_verification', 'scheduled', 'suggested', 'paid'] },
    },
  }
);

module.exports = mongoose.model('Appointment', AppointmentSchema);