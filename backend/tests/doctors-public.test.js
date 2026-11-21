const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createServer } = require('http');
const router = require('../routes/doctors');
const User = require('../models/User');

test('doctor search matches prefixes at the start of any name or category word', async (t) => {
  const originalFind = User.find;
  let receivedFilter;
  User.find = (filter) => {
    receivedFilter = filter;
    return {
      select: () => ({
        limit: async () => [],
      }),
    };
  };

  t.after(() => {
    User.find = originalFind;
  });

  const app = express();
  app.use('/api/doctors', router);
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    const port = server.address().port;
    const res = await fetch(`http://127.0.0.1:${port}/api/doctors?search=la`);

    assert.equal(res.status, 200);
    assert.equal(receivedFilter.$or[0].name.$regex, '(?:^|\\s)la');
    assert.equal(receivedFilter.$or[1].category.$regex, '(?:^|\\s)la');
    assert.equal(receivedFilter.$or[0].name.$options, 'i');
    assert.match('Dr. la Doctor', new RegExp(receivedFilter.$or[0].name.$regex, 'i'));
    assert.match('Dr. Fatima Ahmed', new RegExp(receivedFilter.$or[0].name.$regex.replace('la', 'fat'), 'i'));
    assert.match('Dr. Hassan Malik', new RegExp(receivedFilter.$or[0].name.$regex.replace('la', 'has'), 'i'));
  } finally {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});

test('public doctor detail endpoint does not require auth', async (t) => {
  const originalFindById = User.findById;
  User.findById = () => ({
    select: () => ({
      _id: '507f1f77bcf86cd799439011',
      name: 'Dr. Public',
      role: 'doctor',
      status: 'approved',
      category: 'Cardiology',
      city: 'Lahore',
      province: 'Punjab',
      profilePic: '',
      availability: { days: ['Monday'], startTime: '09:00', endTime: '17:00' },
    }),
  });

  t.after(() => {
    User.findById = originalFindById;
  });

  const app = express();
  app.use('/api/doctors', router);

  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    const port = server.address().port;
    const res = await fetch(`http://127.0.0.1:${port}/api/doctors/507f1f77bcf86cd799439011`);

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.name, 'Dr. Public');
    assert.equal(data.role, 'doctor');
  } finally {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});
