const express = require('express');
const nodemailer = require('nodemailer');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const User = require('../models/User');
const Payment = require('../models/Payment');
const auth = require('../middleware/auth');
const { calculatePaymentSplit } = require('../utils/paymentSplit');

const router = express.Router();

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const getEmailTransportConfig = () => {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP is not configured. Set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in backend/.env');
  }

  return {
    host,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: { user, pass },
  };
};

const toMinutes = (t, defaultPeriod = 'AM') => {
  if (!t) return 0;
  let [timePart, ampm] = t.split(' ');
  if (!ampm) ampm = defaultPeriod;
  let [h, m] = timePart.split(':').map(Number);
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 60 + (m || 0);
};

const sendPaymentNotification = async (appointment, doctor, patient) => {
  try {
    const transportConfig = getEmailTransportConfig();
    const transporter = nodemailer.createTransport(transportConfig);

    const adminUser = await User.findOne({ role: 'admin' }).select('email');
    const recipients = [doctor.email];
    if (adminUser?.email) recipients.push(adminUser.email);
    const uniqueRecipients = [...new Set(recipients)];

    const mailOptions = {
      from: process.env.EMAIL_FROM || transportConfig.auth.user,
      to: uniqueRecipients,
      subject: `New booking payment proof received for ${patient.name}`,
      text: `A patient has submitted payment proof for their appointment with ${doctor.name}.

Patient: ${patient.name}
Email: ${patient.email}
Appointment Date: ${appointment.date ? new Date(appointment.date).toDateString() : 'Not set'}
Time: ${appointment.time}
Transaction ID: ${appointment.transactionId || 'Not provided'}
Payment Method: ${appointment.paymentMethod || 'Not provided'}

Please review the payment proof and confirm the booking.`,
    };

    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('Failed to send payment notification:', err.message);
  }
};

const validateDoctorAvailability = async (doctorId, appointmentDate, time) => {
  if (!doctorId || !appointmentDate || !time) return null;
  const doctorUser = await User.findById(doctorId).select('availability');
  if (!doctorUser || !doctorUser.availability) return null;

  const avail = doctorUser.availability;
  const chosenDay = DAY_NAMES[new Date(appointmentDate).getDay()];

  if (Array.isArray(avail.days) && avail.days.length > 0 && !avail.days.includes(chosenDay)) {
    return `Doctor is not available on ${chosenDay}s. Available days: ${avail.days.join(', ')}`;
  }

  if (avail.startTime && avail.endTime) {
    const chosenMin = toMinutes(time);
    const startMin = toMinutes(avail.startTime, avail.startPeriod || 'AM');
    const endMin = toMinutes(avail.endTime, avail.endPeriod || 'PM');
    if (chosenMin < startMin || chosenMin + 30 > endMin) {
      const startDisplay = `${avail.startTime}${avail.startPeriod ? ` ${avail.startPeriod}` : ''}`.trim();
      const endDisplay = `${avail.endTime}${avail.endPeriod ? ` ${avail.endPeriod}` : ''}`.trim();
      return `Doctor is only available from ${startDisplay} to ${endDisplay}`;
    }
  }

  return null;
};

const hasBookingConflict = async ({ doctor, date, time, excludeId }) => {
  const filter = {
    doctor,
    date: new Date(date),
    time,
    status: { $in: ['pending', 'pending_verification', 'scheduled', 'suggested', 'paid'] },
  };
  if (excludeId) filter._id = { $ne: excludeId };
  return Appointment.exists(filter);
};

// Get appointments for logged-in user
router.get('/', auth, async (req, res) => {
  try {
    let filter;
    if (req.user.role === 'doctor') {
      filter = { doctor: req.user.id };
    } else {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }
      const patientRecord = await Patient.findOne({ email: user.email });
      if (!patientRecord) {
        return res.json([]);
      }
      filter = { patient: patientRecord._id };
    }
    const appointments = await Appointment.find(filter)
      .populate('patient', 'name email')
      .populate('doctor', 'name fees workNumber paymentDetails')
      .sort({ date: -1 });
    res.json(appointments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get unread appointment count for doctor
router.get('/unread-count', auth, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.json({ count: 0 });
    }
    const count = await Appointment.countDocuments({ doctor: req.user.id, read: false });
    res.json({ count });
  } catch (err) {
    console.error(err.message);
    if (err.code === 11000) return res.status(409).json({ msg: 'This appointment slot is no longer available.' });
    res.status(500).send('Server error');
  }
});

// Mark all appointments as read for doctor
router.patch('/read-all', auth, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ msg: 'Only doctors can mark appointments as read' });
    }
    await Appointment.updateMany(
      { doctor: req.user.id, read: false },
      { $set: { read: true } }
    );
    res.json({ msg: 'Appointments marked as read' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Book an appointment
router.post('/', auth, async (req, res) => {
  const { doctor, patient, time, description, type, appointmentDate } = req.body;
  try {
    const appointmentData = {
      time,
      description,
      type,
      date: appointmentDate ? new Date(appointmentDate) : Date.now(),
    };

    // ── Availability validation (patient-initiated bookings only) ──
    if (req.user.role === 'patient' && doctor && appointmentDate && time) {
      const availabilityError = await validateDoctorAvailability(doctor, appointmentDate, time);
      if (availabilityError) {
        return res.status(400).json({ msg: availabilityError });
      }
      if (await hasBookingConflict({ doctor, date: appointmentDate, time })) {
        return res.status(409).json({ msg: 'This appointment slot is no longer available.' });
      }
    }

    let patientRecord;
    if (req.user.role === 'doctor') {
      if (!patient) {
        return res.status(400).json({ msg: 'Patient is required for doctor scheduling' });
      }
      appointmentData.doctor = req.user.id;
      appointmentData.patient = patient;
      patientRecord = await Patient.findById(patient);
      if (!patientRecord) {
        return res.status(404).json({ msg: 'Patient not found' });
      }
      if (!patientRecord.doctor || patientRecord.doctor.toString() !== req.user.id) {
        patientRecord.doctor = req.user.id;
        await patientRecord.save();
      }
    } else {
      if (!doctor) {
        return res.status(400).json({ msg: 'Doctor is required for appointment booking' });
      }
      appointmentData.doctor = doctor;
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }
      patientRecord = await Patient.findOne({ email: user.email });
      if (!patientRecord) {
        patientRecord = new Patient({
          name: user.name,
          email: user.email,
          plan: 'Assigned by appointment',
          doctor,
          progress: 0,
          status: 'Active',
        });
      }
      if (!patientRecord.doctor || patientRecord.doctor.toString() !== doctor) {
        patientRecord.doctor = doctor;
      }
      await patientRecord.save();
      appointmentData.patient = patientRecord._id;
    }

    if (req.user.role === 'doctor') {
      appointmentData.status = 'suggested';
    } else {
      appointmentData.status = 'pending';
      // Reserve the slot first. Payment is requested only after the doctor confirms.
      appointmentData.paymentRequired = false;
    }

    const appointment = new Appointment(appointmentData);
    await appointment.save();
    const populated = await appointment.populate([
      { path: 'patient', select: 'name email' },
      { path: 'doctor', select: 'name fees workNumber paymentDetails' },
    ]);
    res.json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Legacy patient booking endpoint with payment proof.
// The main UI uses POST / first so the doctor can confirm availability before payment.
router.post('/book-with-payment', auth, async (req, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ msg: 'Only patients can use this endpoint' });
  }

  const { doctor, time, description, type, appointmentDate, paymentMethod, transactionId, paymentProof } = req.body;

  if (!doctor) return res.status(400).json({ msg: 'Doctor is required' });
  if (!transactionId || !transactionId.trim()) return res.status(400).json({ msg: 'Transaction ID is required' });

  try {
    // ── Availability validation ──────────────────────────────────────────────
    if (doctor && appointmentDate && time) {
      const availabilityError = await validateDoctorAvailability(doctor, appointmentDate, time);
      if (availabilityError) {
        return res.status(400).json({ msg: availabilityError });
      }
      if (await hasBookingConflict({ doctor, date: appointmentDate, time })) {
        return res.status(409).json({ msg: 'This appointment slot is no longer available.' });
      }
    }

    // ── Resolve / create patient record ─────────────────────────────────────
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    let patientRecord = await Patient.findOne({ email: user.email });
    if (!patientRecord) {
      patientRecord = new Patient({
        name: user.name,
        email: user.email,
        plan: 'Assigned by appointment',
        doctor,
        progress: 0,
        status: 'Active',
      });
    }
    if (!patientRecord.doctor || patientRecord.doctor.toString() !== doctor) {
      patientRecord.doctor = doctor;
    }
    await patientRecord.save();

    // ── Create appointment (already scheduled) ──────────────────────────────
    const appointment = new Appointment({
      doctor,
      patient: patientRecord._id,
      time,
      description,
      type,
      date: appointmentDate ? new Date(appointmentDate) : Date.now(),
      status: 'pending_verification',
      paymentRequired: true,
      paymentMethod: paymentMethod || '',
      transactionId: transactionId.trim(),
      paymentProof: paymentProof || '',
      paymentConfirmedAt: null,
    });
    await appointment.save();

    // ── Record payment ───────────────────────────────────────────────────────
    const doctorUser = await User.findById(doctor).select('name email fees');
    const existingPayment = await Payment.findOne({ transactionId: transactionId.trim() });
    if (!existingPayment) {
      const grossAmount = Number(doctorUser?.fees || 0);
      const commissionPercent = Number(process.env.PLATFORM_COMMISSION_PERCENT || 15);
      const split = calculatePaymentSplit({ amount: grossAmount, commissionPercent });

      await Payment.create({
        patientId: user._id,
        doctorId: doctor,
        appointmentId: appointment._id,
        amount: split.grossAmount,
        commissionPercent: split.commissionPercent,
        commissionAmount: split.commissionAmount,
        doctorPayoutAmount: split.doctorPayoutAmount,
        method: paymentMethod || 'Unknown',
        transactionId: transactionId.trim(),
        status: 'pending',
      });
    }

    // ── Send notification ────────────────────────────────────────────────────
    if (doctorUser && patientRecord) {
      await sendPaymentNotification(appointment, doctorUser, patientRecord);
    }

    const populated = await appointment.populate([
      { path: 'patient', select: 'name email' },
      { path: 'doctor', select: 'name fees workNumber paymentDetails' },
    ]);
    res.json(populated);
  } catch (err) {
    console.error(err.message);
    // Handle duplicate transaction ID
    if (err.code === 11000) {
      return res.status(409).json({ msg: 'This appointment slot or transaction ID is already in use.' });
    }
    res.status(500).send('Server error');
  }
});

// Reschedule appointment
router.patch('/:id/reschedule', auth, async (req, res) => {
  const { appointmentDate, time } = req.body;
  if (!appointmentDate || !time) {
    return res.status(400).json({ msg: 'Both appointmentDate and time are required for rescheduling' });
  }

  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ msg: 'Appointment not found' });
    }

    if (['completed', 'missed', 'rejected', 'cancelled', 'no-show'].includes(appointment.status)) {
      return res.status(400).json({ msg: 'Only upcoming appointments can be rescheduled' });
    }

    if (req.user.role === 'doctor') {
      if (appointment.doctor.toString() !== req.user.id) {
        return res.status(403).json({ msg: 'Unauthorized' });
      }
    } else {
      const user = await User.findById(req.user.id);
      const patientRecord = await Patient.findOne({ email: user.email });
      if (!patientRecord || appointment.patient.toString() !== patientRecord._id.toString()) {
        return res.status(403).json({ msg: 'Unauthorized' });
      }
    }

    const availabilityError = await validateDoctorAvailability(appointment.doctor, appointmentDate, time);
    if (availabilityError) {
      return res.status(400).json({ msg: availabilityError });
    }

    if (await hasBookingConflict({ doctor: appointment.doctor, date: appointmentDate, time, excludeId: appointment._id })) {
      return res.status(409).json({ msg: 'This appointment slot is no longer available.' });
    }

    appointment.date = new Date(appointmentDate);
    appointment.time = time;
    await appointment.save();

    const populated = await appointment.populate([
      { path: 'patient', select: 'name email' },
      { path: 'doctor', select: 'name' },
    ]);
    res.json(populated);
  } catch (err) {
    console.error(err.message);
    if (err.code === 11000) return res.status(409).json({ msg: 'This appointment slot is no longer available.' });
    res.status(500).send('Server error');
  }
});

// Delete appointment
router.delete('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ msg: 'Appointment not found' });

    // Ownership check: only the assigned doctor or the patient may delete
    if (req.user.role === 'doctor') {
      if (appointment.doctor.toString() !== req.user.id) {
        return res.status(403).json({ msg: 'Unauthorized' });
      }
    } else {
      const user = await User.findById(req.user.id);
      const patientRecord = await Patient.findOne({ email: user.email });
      if (!patientRecord || appointment.patient.toString() !== patientRecord._id.toString()) {
        return res.status(403).json({ msg: 'Unauthorized' });
      }
    }

    await Appointment.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Appointment removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.patch('/:id/payment-proof', auth, async (req, res) => {
  const { paymentMethod, transactionId, paymentProof } = req.body;

  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ msg: 'Appointment not found' });

    const user = await User.findById(req.user.id);
    const patientRecord = await Patient.findOne({ email: user.email });
    if (!patientRecord || appointment.patient.toString() !== patientRecord._id.toString()) {
      return res.status(403).json({ msg: 'Unauthorized' });
    }

    appointment.paymentMethod = paymentMethod || '';
    appointment.transactionId = transactionId || '';
    appointment.paymentProof = paymentProof || '';
    appointment.paymentRequired = true;
    appointment.status = 'pending_verification';
    await appointment.save();

    const doctor = await User.findById(appointment.doctor).select('name email fees');
    const patient = await Patient.findById(appointment.patient).select('name email');
    if (doctor && patient) {
      await sendPaymentNotification(appointment, doctor, patient);
    }

    const paymentDoc = await Payment.findOne({ appointmentId: appointment._id });
    if (!paymentDoc) {
      const grossAmount = Number(doctor?.fees || 0);
      const commissionPercent = Number(process.env.PLATFORM_COMMISSION_PERCENT || 15);
      const split = calculatePaymentSplit({ amount: grossAmount, commissionPercent });

      await Payment.create({
        patientId: user._id,
        doctorId: appointment.doctor,
        appointmentId: appointment._id,
        amount: split.grossAmount,
        commissionPercent: split.commissionPercent,
        commissionAmount: split.commissionAmount,
        doctorPayoutAmount: split.doctorPayoutAmount,
        method: paymentMethod || 'Unknown',
        transactionId: transactionId || appointment._id.toString(),
        status: 'pending',
      });
    }

    const populated = await appointment.populate([
      { path: 'patient', select: 'name email' },
      { path: 'doctor', select: 'name fees workNumber paymentDetails' },
    ]);
    res.json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update appointment status (doctor or patient)
router.patch('/:id/status', auth, async (req, res) => {
  const { status } = req.body;
  const DOCTOR_STATUSES = ['scheduled', 'rejected', 'completed', 'cancelled', 'no-show', 'missed'];
  const PATIENT_STATUSES = ['scheduled', 'rejected'];

  const allowed = req.user.role === 'doctor' ? DOCTOR_STATUSES : PATIENT_STATUSES;
  if (!allowed.includes(status)) {
    return res.status(400).json({ msg: `Invalid status. Allowed: ${allowed.join(', ')}` });
  }

  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ msg: 'Appointment not found' });

    if (req.user.role === 'doctor') {
      // Verify the appointment belongs to this doctor
      if (appointment.doctor.toString() !== req.user.id) {
        return res.status(403).json({ msg: 'Unauthorized' });
      }
      if (status === 'scheduled' && appointment.paymentRequired) {
        return res.status(403).json({ msg: 'Payment must be verified by an admin before scheduling this appointment' });
      }
      if (status === 'scheduled' && appointment.status === 'pending') {
        appointment.paymentRequired = true;
      }
    } else {
      // Verify the appointment belongs to this patient
      const user = await User.findById(req.user.id);
      const patientRecord = await Patient.findOne({ email: user.email });
      if (!patientRecord || appointment.patient.toString() !== patientRecord._id.toString()) {
        return res.status(403).json({ msg: 'Unauthorized' });
      }
      if (status === 'scheduled' && appointment.paymentRequired) {
        return res.status(400).json({ msg: 'Submit payment proof and wait for admin verification before scheduling' });
      }
    }

    appointment.status = status;
    await appointment.save();
    const populated = await appointment.populate([
      { path: 'patient', select: 'name email' },
      { path: 'doctor', select: 'name fees workNumber paymentDetails' },
    ]);
    res.json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
