const express = require('express');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const auth = require('../middleware/auth');

const router = express.Router();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Get all doctors (with optional search query)
router.get('/', async (req, res) => {
  try {
    const { search, province, city, limit } = req.query;
    const filter = { role: 'doctor' };
    
    if (search) {
      const searchPrefix = `(?:^|\\s)${escapeRegex(search)}`;
      filter.$or = [
        { name: { $regex: searchPrefix, $options: 'i' } },
        { category: { $regex: searchPrefix, $options: 'i' } }
      ];
    }

    if (province) {
      filter.province = province;
    }

    if (city) {
      filter.city = city;
    }

    // Only show doctors who have been approved by an admin.
    filter.status = 'approved';

    const parsedLimit = limit ? parseInt(limit, 10) : 0; // 0 = no limit in Mongoose
    const doctors = await User.find(filter).select('-password').limit(parsedLimit);
    res.json(doctors);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get a single doctor by ID (public for guest users)
router.get('/:id', async (req, res) => {
  try {
    const doctor = await User.findById(req.params.id).select('-password');
    if (!doctor || doctor.role !== 'doctor' || doctor.status !== 'approved') {
      return res.status(404).json({ msg: 'Doctor not found' });
    }
    res.json(doctor);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Doctor not found' });
    }
    res.status(500).send('Server error');
  }
});

// Get a doctor's availability (public – used by booking form)
router.get('/:id/availability', async (req, res) => {
  try {
    const doctor = await User.findById(req.params.id).select('availability name role status');
    if (!doctor || doctor.role !== 'doctor' || doctor.status !== 'approved') {
      return res.status(404).json({ msg: 'Doctor not found' });
    }
    res.json(doctor.availability || { days: [], startTime: '', endTime: '' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Rate a doctor
router.post('/:id/rate', auth, async (req, res) => {
  try {
    const rating = Number(req.body.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ msg: 'Rating must be a number between 1 and 5' });
    }

    if (req.user.role !== 'patient') {
      return res.status(403).json({ msg: 'Only patients can rate doctors' });
    }

    const patient = await Patient.findOne({ email: req.user.email });
    const appointment = patient && await Appointment.findOne({
      doctor: req.params.id,
      patient: patient._id,
      status: 'completed',
      rating: null,
    }).sort({ date: -1 });
    if (!appointment) {
      return res.status(400).json({ msg: 'You can rate a doctor after completing an appointment.' });
    }

    const doctor = await User.findById(req.params.id);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ msg: 'Doctor not found' });
    }

    const totalRating = doctor.rating * doctor.ratingCount;
    const newRatingCount = doctor.ratingCount + 1;
    const newRating = (totalRating + rating) / newRatingCount;

    doctor.rating = newRating;
    doctor.ratingCount = newRatingCount;
    appointment.rating = rating;
    appointment.ratedAt = new Date();
    await appointment.save();
    await doctor.save();

    res.json(doctor);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
