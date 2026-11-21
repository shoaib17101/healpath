const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createServer } = require('http');
const nodemailer = require('nodemailer');
const Appointment = require('../models/Appointment');

test('admin can email both appointment participants once on the appointment date', async () => {
  const authPath = require.resolve('../middleware/auth');
  const adminPath = require.resolve('../middleware/admin');
  const adminRoutePath = require.resolve('../routes/admin');
  const originalAuthModule = require.cache[authPath];
  const originalAdminModule = require.cache[adminPath];
  const originalAdminRoute = require.cache[adminRoutePath];
  const originalFindById = Appointment.findById;
  const originalCreateTransport = nodemailer.createTransport;
  const originalEmailEnv = {
    EMAIL_HOST: process.env.EMAIL_HOST,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS,
  };

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const appointments = {
    today: {
      _id: 'today',
      status: 'scheduled',
      date: now,
      time: '10:00 AM',
      type: 'General Consultation',
      patient: { name: 'Patient One', email: 'patient@example.com' },
      doctor: { name: 'Doctor One', email: 'doctor@example.com' },
      appointmentDateReminderSentAt: null,
      populate() { return this; },
      async save() {},
    },
    tomorrow: {
      _id: 'tomorrow',
      status: 'scheduled',
      date: tomorrow,
      time: '11:00 AM',
      type: 'General Consultation',
      patient: { name: 'Patient Two', email: 'patient2@example.com' },
      doctor: { name: 'Doctor Two', email: 'doctor2@example.com' },
      appointmentDateReminderSentAt: null,
      populate() { return this; },
      async save() {},
    },
  };
  const sentMessages = [];

  require.cache[authPath] = { id: authPath, filename: authPath, loaded: true, exports: (req, res, next) => next() };
  require.cache[adminPath] = { id: adminPath, filename: adminPath, loaded: true, exports: (req, res, next) => next() };
  delete require.cache[adminRoutePath];
  Appointment.findById = (id) => appointments[id] || null;
  nodemailer.createTransport = () => ({ sendMail: async (mail) => sentMessages.push(mail) });
  process.env.EMAIL_HOST = 'smtp.example.com';
  process.env.EMAIL_USER = 'mailer@example.com';
  process.env.EMAIL_PASS = 'test-password';

  const app = express();
  app.use('/api/admin', require('../routes/admin'));
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}/api/admin/appointments`;
    const sentResponse = await fetch(`${baseUrl}/today/send-reminder`, { method: 'POST' });
    assert.equal(sentResponse.status, 200);
    assert.deepEqual(sentMessages[0].to, ['patient@example.com', 'doctor@example.com']);
    assert.ok(appointments.today.appointmentDateReminderSentAt instanceof Date);

    const duplicateResponse = await fetch(`${baseUrl}/today/send-reminder`, { method: 'POST' });
    assert.equal(duplicateResponse.status, 409);
    assert.equal(sentMessages.length, 1);

    const earlyResponse = await fetch(`${baseUrl}/tomorrow/send-reminder`, { method: 'POST' });
    assert.equal(earlyResponse.status, 400);
    assert.equal(sentMessages.length, 1);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    Appointment.findById = originalFindById;
    nodemailer.createTransport = originalCreateTransport;
    for (const [key, value] of Object.entries(originalEmailEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    if (originalAuthModule) require.cache[authPath] = originalAuthModule;
    else delete require.cache[authPath];
    if (originalAdminModule) require.cache[adminPath] = originalAdminModule;
    else delete require.cache[adminPath];
    if (originalAdminRoute) require.cache[adminRoutePath] = originalAdminRoute;
    else delete require.cache[adminRoutePath];
  }
});