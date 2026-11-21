const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://localhost:27017/healpath');
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({}).toArray();
  const patients = await db.collection('patients').find({}).toArray();
  const appointments = await db.collection('appointments').find({}).toArray();
  
  console.log('USERS:', JSON.stringify(users, null, 2));
  console.log('PATIENTS:', JSON.stringify(patients, null, 2));
  console.log('APPOINTMENTS:', JSON.stringify(appointments, null, 2));
  mongoose.disconnect();
}
check();
