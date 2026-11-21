const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');
const Patient = require('./models/Patient');
const User = require('./models/User');

async function migrate() {
  await mongoose.connect('mongodb://localhost:27017/healpath');
  
  const appointments = await Appointment.find();
  for (let appt of appointments) {
    // Check if the patient field references a valid Patient document
    const patientDoc = await Patient.findById(appt.patient);
    
    if (!patientDoc) {
      console.log(`Appointment ${appt._id} has invalid patient ref: ${appt.patient}`);
      
      // It might be a User ID
      const userDoc = await User.findById(appt.patient);
      if (userDoc) {
        console.log(`Found User for ${appt.patient}: ${userDoc.email}`);
        
        // Find or create Patient
        let actualPatient = await Patient.findOne({ email: userDoc.email });
        if (!actualPatient) {
          actualPatient = new Patient({
            name: userDoc.name,
            email: userDoc.email,
            plan: 'Assigned by appointment',
            doctor: appt.doctor,
            progress: 0,
            status: 'Active'
          });
          await actualPatient.save();
          console.log(`Created new Patient ${actualPatient._id} for ${userDoc.email}`);
        } else {
          console.log(`Found existing Patient ${actualPatient._id} for ${userDoc.email}`);
          if (!actualPatient.doctor || actualPatient.doctor.toString() !== appt.doctor.toString()) {
             actualPatient.doctor = appt.doctor;
             await actualPatient.save();
          }
        }
        
        // Update Appointment
        appt.patient = actualPatient._id;
        await appt.save();
        console.log(`Updated appointment ${appt._id} to patient ${actualPatient._id}`);
      } else {
         console.log(`Could not find User for ${appt.patient}. Orphaned appointment.`);
      }
    }
  }
  
  console.log('Migration complete.');
  mongoose.disconnect();
}

migrate();
