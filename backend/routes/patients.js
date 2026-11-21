const express = require('express');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all patients (doctor sees their own patients)
router.get('/', auth, async (req, res) => {
  try {
    let filter;
    if (req.user.role === 'doctor') {
      const assignedPatientIds = await Appointment.distinct('patient', { doctor: req.user.id });
      filter = {
        $or: [
          { doctor: req.user.id },
          { _id: { $in: assignedPatientIds } },
        ],
      };
    } else {
      const user = await require('../models/User').findById(req.user.id);
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }
      filter = { email: user.email };
    }
    const patients = await Patient.find(filter).populate('doctor', 'name');
    res.json(patients);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Add patient
router.post('/', auth, async (req, res) => {
  const { name, email, plan } = req.body;
  try {
    if (!name || !email || !plan) {
      return res.status(400).json({ msg: 'name, email, and plan are required' });
    }
    // Prevent duplicate patient records for the same doctor
    const existing = await Patient.findOne({ email, doctor: req.user.id });
    if (existing) return res.status(400).json({ msg: 'Patient with this email already exists' });

    const patient = new Patient({ name, email, plan, doctor: req.user.id });
    await patient.save();
    res.json(patient);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update patient progress/status/plan
router.put('/:id', auth, async (req, res) => {
  const { progress, status, plan } = req.body;
  try {
    let patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ msg: 'Patient not found' });

    // A patient may be linked directly or through one of the doctor's appointments.
    const assignedByAppointment = await Appointment.exists({
      doctor: req.user.id,
      patient: patient._id,
    });
    if ((!patient.doctor || patient.doctor.toString() !== req.user.id) && !assignedByAppointment) {
      return res.status(403).json({ msg: 'Unauthorized' });
    }

    if (progress !== undefined) patient.progress = progress;
    if (status) patient.status = status;
    if (plan) patient.plan = plan;

    await patient.save();
    res.json(patient);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
