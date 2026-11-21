const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Safe promisified jwt.sign so errors propagate to the catch block
const signToken = (payload, secret, options) =>
  new Promise((resolve, reject) =>
    jwt.sign(payload, secret, options, (err, token) =>
      err ? reject(err) : resolve(token)
    )
  );

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

// Register
router.post('/register', async (req, res) => {
  const { name, email, password, role, category, availability, experience, fees, bio, province, city, workNumber, clinicAddress, certifications, proofOfCertification, paymentDetails } = req.body;
  try {
    const normalizedCategory = typeof category === 'string' ? category.trim().replace(/\s+/g, ' ') : '';
    if (role === 'doctor' && (!normalizedCategory || normalizedCategory.length > 60)) {
      return res.status(400).json({ msg: 'Enter a specialty of 60 characters or fewer.' });
    }

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    const newUserData = { name, email, password, role, province, city };
    if (role === 'doctor') {
      newUserData.category = normalizedCategory;
      if (experience) newUserData.experience = experience;
      if (fees) newUserData.fees = fees;
      if (bio) newUserData.bio = bio;
      if (workNumber) newUserData.workNumber = workNumber;
      if (clinicAddress) newUserData.clinicAddress = clinicAddress;
      if (certifications) newUserData.certifications = certifications;
      if (proofOfCertification) newUserData.proofOfCertification = proofOfCertification;
      if (paymentDetails) newUserData.paymentDetails = {
        jazzcashNumber: paymentDetails.jazzcashNumber || '',
        easypaisaNumber: paymentDetails.easypaisaNumber || '',
      };
      if (availability) {
        if (typeof availability === 'string') {
          const parts = availability.split('|').map(s => s.trim());
          const days = parts[0] || '';
          const timing = parts[1] || '';
          const times = timing.split('-').map(t => t.trim());
          newUserData.availability = {
            days: days.split(',').map(d => d.trim()).filter(Boolean),
            startTime: times[0] || '',
            endTime: times[1] || ''
          };
        } else {
          newUserData.availability = availability;
        }
      }
      newUserData.status = 'pending';
    } else if (role === 'patient') {
      newUserData.status = 'approved';
    } else if (role === 'admin') {
      newUserData.status = 'approved';
    }

    user = new User(newUserData);
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    if (user.role === 'doctor') {
      return res.status(201).json({
        msg: 'Doctor account created successfully and is pending approval.',
        role: user.role,
        status: user.status,
      });
    }

    const payload = { user: { id: user.id, role: user.role, name: user.name } };
    const token = await signToken(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, role: user.role, name: user.name, id: user.id });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    if (user.status === 'suspended') {
      return res.status(403).json({ msg: 'Your account has been suspended. Please contact an administrator.' });
    }

    if (user.status !== 'approved') {
      if (user.status === 'pending') {
        return res.status(403).json({ msg: 'Your account is pending approval. Please wait for an administrator to approve your account.' });
      }
      return res.status(403).json({ msg: 'Your account is not approved.' });
    }

    const payload = { user: { id: user.id, role: user.role, name: user.name } };
    const token = await signToken(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, role: user.role, name: user.name, id: user.id });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Update profile
router.put('/me', auth, async (req, res) => {
  const { name, email, category, availability, experience, fees, bio, profilePic, province, city, workNumber, clinicAddress, certifications, paymentDetails } = req.body;
  try {
    const updateData = { name, email, province, city };

    const existingUser = await User.findById(req.user.id);
    if (!existingUser) return res.status(404).json({ msg: 'User not found' });

    // Guard against stealing another user's email
    if (email && email !== existingUser.email) {
      const emailTaken = await User.findOne({ email, _id: { $ne: req.user.id } });
      if (emailTaken) return res.status(400).json({ msg: 'Email is already in use by another account' });
    }

    if (existingUser.role === 'doctor') {
      if (category !== undefined) {
        const normalizedCategory = typeof category === 'string' ? category.trim().replace(/\s+/g, ' ') : '';
        if (!normalizedCategory || normalizedCategory.length > 60) {
          return res.status(400).json({ msg: 'Enter a specialty of 60 characters or fewer.' });
        }
        updateData.category = normalizedCategory;
      }
      if (experience !== undefined) updateData.experience = experience === '' ? null : Number(experience);
      if (fees !== undefined) updateData.fees = fees === '' ? null : Number(fees);
      if (bio !== undefined) updateData.bio = bio;
      if (workNumber !== undefined) updateData.workNumber = workNumber;
      if (clinicAddress !== undefined) updateData.clinicAddress = clinicAddress;
      if (certifications !== undefined) updateData.certifications = certifications;
      if (paymentDetails !== undefined) updateData.paymentDetails = {
        jazzcashNumber: paymentDetails?.jazzcashNumber || '',
        easypaisaNumber: paymentDetails?.easypaisaNumber || '',
      };
      // availability is now a structured object { days, startTime, endTime }
      if (availability !== undefined) {
        updateData.availability = {
          days: Array.isArray(availability.days) ? availability.days : [],
          startTime: availability.startTime || '',
          endTime: availability.endTime || ''
        };
      }
    }
    
    if (profilePic !== undefined) {
      updateData.profilePic = profilePic;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { returnDocument: 'after' }
    ).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Delete account
router.delete('/me', auth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ msg: 'Account deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.json({ msg: 'If an account exists, a password reset email has been sent.' });

    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const transporter = nodemailer.createTransport(getEmailTransportConfig());

    const frontendUrl = (process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/reset-password/${token}`;
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: user.email,
      subject: 'HealPath Password Reset',
      text: `You are receiving this email because you (or someone else) requested a password reset for your account.\n\n` +
            `Please click the following link, or paste it into your browser to complete the process within one hour:\n\n` +
            `${resetUrl}\n\n` +
            `If you did not request this, please ignore this email and your password will remain unchanged.`,
    };

    await transporter.sendMail(mailOptions);

    res.json({ msg: 'Password reset email sent' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Reset Password
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;
  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ msg: 'Invalid or expired token' });

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ msg: 'New password must be at least 8 characters' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ msg: 'Password reset successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Change Password
router.put('/change-password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ msg: 'currentPassword and newPassword are required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Incorrect current password' });

    if (newPassword.length < 8) {
      return res.status(400).json({ msg: 'Password must be at least 8 characters' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ msg: 'Password updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
