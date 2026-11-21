const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all conversations (unique contacts) for logged-in user
router.get('/conversations', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ sender: req.user.id }, { receiver: req.user.id }],
    })
      .populate('sender', 'name role')
      .populate('receiver', 'name role')
      .sort({ date: -1 });

    // Get unique contacts
    const contactMap = {};
    messages.forEach((msg) => {
      if (!msg.sender || !msg.receiver) return;
      const contact = msg.sender._id.toString() === req.user.id ? msg.receiver : msg.sender;
      if (!contactMap[contact._id]) {
        contactMap[contact._id] = {
          contact,
          lastMessage: msg.content,
          lastTime: msg.date,
        };
      }
    });

    res.json(Object.values(contactMap));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Mark all received messages as read
router.patch('/read-all', auth, async (req, res) => {
  try {
    await Message.updateMany(
      { receiver: req.user.id, read: false },
      { $set: { read: true } }
    );
    res.json({ msg: 'Messages marked as read' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get unread message count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Message.countDocuments({ receiver: req.user.id, read: false });
    res.json({ count });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get all doctors (for patients to message) — must be BEFORE /:userId
router.get('/users/doctors', auth, async (req, res) => {
  try {
    // If requester is a doctor or admin, return all doctors
    if (req.user.role === 'doctor' || req.user.role === 'admin') {
      const doctors = await User.find({ role: 'doctor' }).select('name email role fees');
      return res.json(doctors);
    }

    // If requester is a patient, only return their assigned doctor (if any)
    const Patient = require('../models/Patient');
    const patient = await Patient.findOne({ email: req.user.email }).populate('doctor', 'name email role fees');
    if (!patient || !patient.doctor) return res.json([]);
    return res.json([patient.doctor]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get all assigned patients (for doctors to message) — must be BEFORE /:userId
router.get('/users/patients', auth, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ msg: 'Only doctors can view their patients' });
    }
    const Patient = require('../models/Patient');
    const assignedPatients = await Patient.find({ doctor: req.user.id }).select('name email');
    
    // Find User accounts for these patients to get their User IDs for messaging
    const patientEmails = assignedPatients.map(p => p.email);
    const users = await User.find({ email: { $in: patientEmails }, role: 'patient' }).select('name email role');
    
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Send a message
router.post('/', auth, async (req, res) => {
  const { receiver, content, fileData, fileName } = req.body;
  try {
    if (!receiver) {
      return res.status(400).json({ msg: 'receiver is required' });
    }
    if (!content && !fileData) {
      return res.status(400).json({ msg: 'Message must have content or an attached file' });
    }

    let receiverUser = await User.findById(receiver).select('email');
    if (!receiverUser && req.user.role === 'doctor') {
      const Patient = require('../models/Patient');
      const patientRecord = await Patient.findById(receiver).select('email');
      if (patientRecord) {
        receiverUser = await User.findOne({ email: patientRecord.email }).select('email');
      }
    }
    if (!receiverUser) {
      return res.status(404).json({ msg: 'Receiver not found' });
    }

    const receiverId = receiverUser._id;

    // Enforce messaging constraints:
    // - If sender is a patient, they can only message their assigned doctor.
    // - If sender is a doctor, they can only message patients assigned to them.
    if (req.user.role === 'patient') {
      const Patient = require('../models/Patient');
      const patient = await Patient.findOne({ email: req.user.email });
      if (!patient || !patient.doctor || String(patient.doctor) !== String(receiverId)) {
        return res.status(403).json({ msg: 'Patients can only message their assigned doctor' });
      }
    }

    if (req.user.role === 'doctor') {
      // Verify receiver is one of the doctor's assigned patients
      const Patient = require('../models/Patient');
      const assigned = await Patient.findOne({ email: receiverUser.email, doctor: req.user.id });
      const patientRecord = assigned || await Patient.findOne({ email: receiverUser.email }).select('_id');
      const assignedByAppointment = patientRecord
        ? Boolean(await Appointment.exists({ doctor: req.user.id, patient: patientRecord._id }))
        : false;
      if (!assignedByAppointment) {
        return res.status(403).json({ msg: 'Doctors can only message their assigned patients' });
      }
    }

    // Only doctors are allowed to initiate video calls via the invite message
    if (typeof content === 'string' && content.startsWith('VIDEO_CALL_INVITE:') && req.user.role !== 'doctor') {
      return res.status(403).json({ msg: 'Only doctors can start video calls' });
    }

    const message = new Message({
      sender: req.user.id,
      receiver: receiverId,
      content,
      fileData,
      fileName,
    });
    await message.save();
    const populated = await message.populate([
      { path: 'sender', select: 'name role' },
      { path: 'receiver', select: 'name role' },
    ]);
    res.json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Delete all messages between the logged-in user and a contact (conversations list delete)
router.delete('/conversations/:userId', auth, async (req, res) => {
  try {
    const contactId = req.params.userId
    if (!contactId) return res.status(400).json({ msg: 'userId is required' })

    await Message.deleteMany({
      $or: [
        { sender: req.user.id, receiver: contactId },
        { sender: contactId, receiver: req.user.id },
      ],
    })

    res.json({ msg: 'Conversation deleted' })
  } catch (err) {
    console.error(err.message)
    res.status(500).send('Server error')
  }
})

// Mark a single message as read
router.patch('/:messageId/read', auth, async (req, res) => {
  try {
    const { messageId } = req.params
    const message = await Message.findById(messageId)
    if (!message) {
      return res.status(404).json({ msg: 'Message not found' })
    }
    if (String(message.receiver) !== String(req.user.id)) {
      return res.status(403).json({ msg: 'Only the intended recipient can mark this message as read' })
    }
    message.read = true
    await message.save()
    res.json({ msg: 'Message marked as read' })
  } catch (err) {
    console.error(err.message)
    res.status(500).send('Server error')
  }
})

// Get messages between two users — dynamic route LAST
router.get('/:userId', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user.id },
      ],
    })
      .populate('sender', 'name role')
      .populate('receiver', 'name role')
      .sort({ date: 1 });
    res.json(messages);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
