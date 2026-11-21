const mongoose = require('mongoose');
const User = require('./models/User');
const Patient = require('./models/Patient');
const Appointment = require('./models/Appointment');

async function sim() {
  await mongoose.connect('mongodb://localhost:27017/healpath');
  
  // Simulate user john booking appointment with doctor zakria
  const user = await User.findOne({ email: 'john@gmail.com' });
  const doctor = await User.findOne({ email: 'zakria@gmail.com' });
  
  console.log('USER:', user._id);
  console.log('DOCTOR:', doctor._id);
  
  let patientRecord = await Patient.findOne({ email: user.email });
  console.log('FOUND PATIENT?', patientRecord ? patientRecord._id : 'NO');
  
  if (!patientRecord) {
    console.log('CREATING NEW PATIENT');
    patientRecord = new Patient({
      name: user.name,
      email: user.email,
      plan: 'Assigned by appointment',
      doctor: doctor._id,
      progress: 0,
      status: 'Active',
    });
    try {
      await patientRecord.save();
      console.log('SAVED PATIENT:', patientRecord._id);
    } catch(err) {
      console.error('SAVE ERROR:', err.message);
    }
  }
  mongoose.disconnect();
}
sim();
