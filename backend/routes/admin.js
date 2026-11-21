const express = require('express');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

const userProfileFields = [
  'name',
  'email',
  'role',
  'status',
  'date',
  'category',
  'province',
  'city',
  'availability',
  'experience',
  'fees',
  'bio',
  'profilePic',
  'paymentDetails',
  'rating',
  'ratingCount',
  'workNumber',
  'clinicAddress',
  'certifications',
  'proofOfCertification',
];

router.use(auth);
router.use(admin);

router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: { $in: ['doctor', 'patient'] } }).select(userProfileFields.join(' '));
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.get('/users/pending-doctors', async (req, res) => {
  try {
    const users = await User.find({ role: 'doctor', status: 'pending' }).select(userProfileFields.join(' '));
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.patch('/users/:id/approve', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'doctor') {
      return res.status(404).json({ msg: 'Doctor not found' });
    }
    user.status = 'approved';
    await user.save();
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.patch('/users/:id/reject', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'doctor') {
      return res.status(404).json({ msg: 'Doctor not found' });
    }
    user.status = 'rejected';
    await user.save();
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.patch('/users/:id/suspend', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !['doctor', 'patient'].includes(user.role)) {
      return res.status(404).json({ msg: 'Account not found' });
    }
    user.status = 'suspended';
    await user.save();
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.patch('/users/:id/reactivate', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !['doctor', 'patient'].includes(user.role)) {
      return res.status(404).json({ msg: 'Account not found' });
    }
    user.status = 'approved';
    await user.save();
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !['doctor', 'patient'].includes(user.role)) {
      return res.status(404).json({ msg: 'Account not found' });
    }
    await user.deleteOne();
    res.json({ msg: 'User deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.get('/appointments', async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate('patient', 'name')
      .populate('doctor', 'name')
      .sort({ date: -1 });
    res.json(appointments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.post('/appointments/:id/send-reminder', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patient', 'name email')
      .populate('doctor', 'name email');

    if (!appointment) return res.status(404).json({ msg: 'Appointment not found' });
    if (appointment.status !== 'scheduled') {
      return res.status(400).json({ msg: 'Reminders can only be sent for scheduled appointments' });
    }
    if (new Date(appointment.date).toISOString().slice(0, 10) !== new Date().toISOString().slice(0, 10)) {
      return res.status(400).json({ msg: 'Reminder can only be sent on the appointment date' });
    }
    if (appointment.appointmentDateReminderSentAt) {
      return res.status(409).json({ msg: 'Appointment reminder has already been sent' });
    }

    const { EMAIL_HOST, EMAIL_USER, EMAIL_PASS } = process.env;
    if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
      return res.status(503).json({ msg: 'Email service is not configured' });
    }
    if (!appointment.patient?.email || !appointment.doctor?.email) {
      return res.status(400).json({ msg: 'Patient and doctor email addresses are required' });
    }

    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT || 587),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });
    const date = new Date(appointment.date).toLocaleDateString('en-US', {
      timeZone: 'UTC',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || EMAIL_USER,
      to: [appointment.patient.email, appointment.doctor.email],
      subject: 'HealPath appointment reminder for today',
      text: `Hello ${appointment.patient.name} and Dr. ${appointment.doctor.name},\n\nThis is a reminder of your HealPath appointment today.\n\nDate: ${date}\nTime: ${appointment.time}\nType: ${appointment.type}`,
    });

    appointment.appointmentDateReminderSentAt = new Date();
    await appointment.save();
    res.json({ msg: 'Appointment reminder sent to the patient and doctor', appointmentDateReminderSentAt: appointment.appointmentDateReminderSentAt });
  } catch (err) {
    console.error('Failed to send appointment reminder:', err.message);
    res.status(500).json({ msg: 'Failed to send appointment reminder' });
  }
});

router.get('/payments', async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email')
      .populate('appointmentId', 'status paymentProof transactionId')
      .sort({ date: -1 });
    res.json(payments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.patch('/payments/:id/mark-paid', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ msg: 'Payment not found' });
    }

    payment.payoutStatus = 'paid';
    payment.paidAt = new Date();
    if (req.body && req.body.payoutReference) {
      payment.payoutReference = req.body.payoutReference;
    }
    await payment.save();

    res.json(payment);
  } catch (err) {
    console.error('Error in mark-paid:', err);
    // Handle invalid MongoDB ObjectId (CastError) explicitly
    if (err && err.name === 'CastError') {
      return res.status(400).json({ msg: 'Invalid payment ID' });
    }
    res.status(500).send('Server error');
  }
});

router.patch('/appointments/:id/verify-payment', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ msg: 'Appointment not found' });
    if (!['pending_verification', 'pending'].includes(appointment.status) || !appointment.transactionId || !appointment.paymentProof) {
      return res.status(400).json({ msg: 'This appointment has no payment proof awaiting verification' });
    }

    appointment.status = 'scheduled';
    appointment.paymentRequired = false;
    appointment.paymentConfirmedAt = new Date();
    await appointment.save();

    const payment = await Payment.findOne({ appointmentId: appointment._id });
    if (payment) {
      payment.status = 'completed';
      await payment.save();
    }
    res.json(appointment);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.get('/stats', async (req, res) => {
  try {
    const [totalDoctors, totalPatients, totalAppointments, pendingDoctors, totalRevenue] = await Promise.all([
      User.countDocuments({ role: 'doctor' }),
      User.countDocuments({ role: 'patient' }),
      Appointment.countDocuments(),
      User.countDocuments({ role: 'doctor', status: 'pending' }),
      Payment.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    res.json({
      totalDoctors,
      totalPatients,
      totalAppointments,
      pendingDoctors,
      totalRevenue: (totalRevenue[0] && totalRevenue[0].total) || 0,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
