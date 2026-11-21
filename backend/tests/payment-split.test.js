const test = require('node:test');
const assert = require('node:assert/strict');
const { calculatePaymentSplit } = require('../utils/paymentSplit');

test('splits a payment between the platform and doctor based on commission percent', () => {
  const distribution = calculatePaymentSplit({ amount: 1000, commissionPercent: 15 });

  assert.equal(distribution.grossAmount, 1000);
  assert.equal(distribution.commissionPercent, 15);
  assert.equal(distribution.commissionAmount, 150);
  assert.equal(distribution.doctorPayoutAmount, 850);
});

test('caps commission percent to the supported range', () => {
  const distribution = calculatePaymentSplit({ amount: 500, commissionPercent: 150 });

  assert.equal(distribution.commissionPercent, 100);
  assert.equal(distribution.commissionAmount, 500);
  assert.equal(distribution.doctorPayoutAmount, 0);
});
