const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('../models/User');

test('allows a suspended status for user accounts', () => {
  const user = new User({
    name: 'Test User',
    email: 'test-user@example.com',
    password: 'hashed-password',
    role: 'patient',
    status: 'suspended',
  });

  assert.equal(user.status, 'suspended');
});

test('keeps doctor accounts pending by default', () => {
  const doctor = new User({
    name: 'Test Doctor',
    email: 'test-doctor@example.com',
    password: 'hashed-password',
    role: 'doctor',
  });

  assert.equal(doctor.status, 'pending');
});

test('stores payment details for doctors', () => {
  const doctor = new User({
    name: 'Test Doctor',
    email: 'test-doctor-payment@example.com',
    password: 'hashed-password',
    role: 'doctor',
    paymentDetails: {
      jazzcashNumber: '03001234567',
      easypaisaNumber: '03111234567',
    },
  });

  assert.equal(doctor.paymentDetails.jazzcashNumber, '03001234567');
  assert.equal(doctor.paymentDetails.easypaisaNumber, '03111234567');
});
