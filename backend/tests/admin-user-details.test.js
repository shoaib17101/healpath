const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createServer } = require('http');

const User = require('../models/User');

const originalFind = User.find;

test('admin user endpoint includes full doctor and patient profile details', async () => {
  const authPath = require.resolve('../middleware/auth');
  const adminPath = require.resolve('../middleware/admin');
  const adminRoutePath = require.resolve('../routes/admin');

  const originalAuthModule = require.cache[authPath];
  const originalAdminModule = require.cache[adminPath];
  const originalAdminRoute = require.cache[adminRoutePath];

  require.cache[authPath] = { id: authPath, filename: authPath, loaded: true, exports: (req, res, next) => next() };
  require.cache[adminPath] = { id: adminPath, filename: adminPath, loaded: true, exports: (req, res, next) => next() };
  delete require.cache[adminRoutePath];

  User.find = (query) => ({
    select: (fields) => {
      assert.match(fields, /availability/);
      assert.match(fields, /bio/);
      assert.match(fields, /experience/);
      assert.match(fields, /fees/);
      assert.match(fields, /workNumber/);
      assert.match(fields, /clinicAddress/);
      assert.match(fields, /certifications/);
      assert.match(fields, /proofOfCertification/);
      assert.match(fields, /profilePic/);
      assert.match(fields, /paymentDetails/);
      return [{
        _id: 'doctor-1',
        name: 'Dr. Ali',
        email: 'ali@example.com',
        role: 'doctor',
        status: 'pending',
        category: 'Cardiology',
        province: 'Punjab',
        city: 'Lahore',
        availability: { days: ['Monday'], startTime: '09:00', endTime: '17:00' },
        experience: 8,
        fees: 2500,
        bio: 'Cardiology consultant',
        workNumber: '03001234567',
        clinicAddress: 'Main Hospital',
        certifications: 'MD',
        proofOfCertification: 'data:image/png;base64,proof',
        profilePic: 'pic.jpg',
        paymentDetails: { jazzcashNumber: '03001234567' },
      }];
    },
  });

  const app = express();
  const router = require('../routes/admin');
  app.use('/api/admin', router);

  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    const port = server.address().port;
    const res = await fetch(`http://127.0.0.1:${port}/api/admin/users`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data[0].name, 'Dr. Ali');
    assert.equal(data[0].availability.days[0], 'Monday');
  } finally {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    User.find = originalFind;
    if (originalAuthModule) require.cache[authPath] = originalAuthModule;
    else delete require.cache[authPath];
    if (originalAdminModule) require.cache[adminPath] = originalAdminModule;
    else delete require.cache[adminPath];
    if (originalAdminRoute) require.cache[adminRoutePath] = originalAdminRoute;
    else delete require.cache[adminRoutePath];
  }
});
