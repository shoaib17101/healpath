const nodemailer = require('nodemailer');
const Appointment = require('../models/Appointment');

const getAppointmentDateTime = (appointment) => {
  const date = new Date(appointment.date);
  const match = String(appointment.time || '').match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return date;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = (match[3] || '').toUpperCase();
  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const sendReminder = async (appointment, hoursUntil) => {
  const { EMAIL_HOST, EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) return;

  const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
  const patient = appointment.patient;
  const doctor = appointment.doctor;
  if (!patient?.email || !doctor?.email) return;

  const when = hoursUntil === 24 ? 'tomorrow' : 'in about one hour';
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || EMAIL_USER,
    to: [patient.email, doctor.email],
    subject: `HealPath appointment reminder: ${when}`,
    text: `Reminder: your HealPath appointment with ${doctor.name} is ${when}.\n\nDate: ${new Date(appointment.date).toDateString()}\nTime: ${appointment.time}\nType: ${appointment.type}`,
  });
};

const processAppointmentReminders = async () => {
  const now = Date.now();
  const appointments = await Appointment.find({
    status: 'scheduled',
    date: { $gte: new Date(now), $lte: new Date(now + 25 * 60 * 60 * 1000) },
  }).populate('patient', 'name email').populate('doctor', 'name email');

  for (const appointment of appointments) {
    const hoursUntil = (getAppointmentDateTime(appointment).getTime() - now) / 3600000;
    if (hoursUntil <= 24 && hoursUntil > 23 && !appointment.reminder24Sent) {
      await sendReminder(appointment, 24);
      appointment.reminder24Sent = true;
      await appointment.save();
    } else if (hoursUntil <= 1 && hoursUntil > 0 && !appointment.reminder1Sent) {
      await sendReminder(appointment, 1);
      appointment.reminder1Sent = true;
      await appointment.save();
    }
  }
};

const startAppointmentReminders = () => {
  const run = () => processAppointmentReminders().catch((err) => {
    console.error('Appointment reminder worker failed:', err.message);
  });
  run();
  return setInterval(run, 5 * 60 * 1000);
};

module.exports = { startAppointmentReminders, processAppointmentReminders };