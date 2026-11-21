const express = require('express');
const Payment = require('../models/Payment');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ msg: 'Only doctors can view revenue.' });
  }

  try {
    const payments = await Payment.find({
      doctorId: req.user._id,
      status: 'completed',
    })
      .populate('patientId', 'name')
      .sort({ date: -1 });

    const totals = payments.reduce((summary, payment) => ({
      grossRevenue: summary.grossRevenue + Number(payment.amount || 0),
      commission: summary.commission + Number(payment.commissionAmount || 0),
      doctorEarnings: summary.doctorEarnings + Number(payment.doctorPayoutAmount || 0),
      paidOut: summary.paidOut + (payment.payoutStatus === 'paid' ? Number(payment.doctorPayoutAmount || 0) : 0),
      pendingPayout: summary.pendingPayout + (payment.payoutStatus !== 'paid' ? Number(payment.doctorPayoutAmount || 0) : 0),
    }), {
      grossRevenue: 0,
      commission: 0,
      doctorEarnings: 0,
      paidOut: 0,
      pendingPayout: 0,
    });

    res.json({
      totals,
      payments: payments.map((payment) => ({
        _id: payment._id,
        patientName: payment.patientId?.name || 'Patient',
        amount: payment.amount,
        commissionAmount: payment.commissionAmount,
        doctorPayoutAmount: payment.doctorPayoutAmount,
        payoutStatus: payment.payoutStatus,
        date: payment.date,
        method: payment.method,
      })),
    });
  } catch (err) {
    console.error('Error loading doctor revenue:', err.message);
    res.status(500).json({ msg: 'Unable to load revenue data.' });
  }
});

module.exports = router;
