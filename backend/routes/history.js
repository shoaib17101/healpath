const express = require('express');
const MedicalRecord = require('../models/MedicalRecord');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const auth = require('../middleware/auth');

const router = express.Router();

// Get history for a specific patient
router.get('/:patientId', auth, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.patientId);
    if (!patient) return res.status(404).json({ msg: 'Patient not found' });

    const isAdmin = req.user.role === 'admin';
    const isAssignedDoctor = req.user.role === 'doctor' && (
      (patient.doctor && String(patient.doctor) === String(req.user.id))
      || await Appointment.exists({ patient: patient._id, doctor: req.user.id })
    );
    let isPatient = false;
    if (req.user.role === 'patient') {
      isPatient = patient.email === req.user.email;
    }

    if (!isAdmin && !isAssignedDoctor && !isPatient) {
      return res.status(403).json({ msg: 'Not authorized to view this patient history' });
    }

    const records = await MedicalRecord.find({ patient: patient._id })
      .populate('doctor', 'name')
      .sort({ date: -1 });
    res.json(records);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Add a record to patient history
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ msg: 'Only doctors can add records' });
  }

  const { patientId, type, title, description, medication, dosage, frequency, duration, exerciseName, sets, reps, symptoms, diagnosis, vitals } = req.body;
  try {
    if (!patientId || !type || !title || !description) {
      return res.status(400).json({ msg: 'patientId, type, title, and description are required' });
    }
    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ msg: 'Patient not found' });
    const isAssignedDoctor = patient.doctor && String(patient.doctor) === String(req.user.id)
      || await Appointment.exists({ patient: patient._id, doctor: req.user.id });
    if (!isAssignedDoctor) {
      return res.status(403).json({ msg: 'You can only add records for your assigned patients' });
    }
    const record = new MedicalRecord({
      patient: patientId,
      doctor: req.user.id,
      type,
      title,
      description,
      medication,
      dosage,
      frequency,
      duration,
      exerciseName,
      sets,
      reps,
      symptoms,
      diagnosis,
      vitals,
    });
    await record.save();
    res.json(record);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update an existing medical record (doctor who created it or admin)
router.put('/:id', auth, async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id)
    if (!record) return res.status(404).json({ msg: 'Record not found' })

    // Only the doctor who created the record or admin can update
    if (req.user.role !== 'admin' && String(record.doctor) !== String(req.user.id)) {
      return res.status(403).json({ msg: 'Not authorized to update this record' })
    }

    // Allowed fields to update
    const allowed = ['title','description','medication','dosage','frequency','duration','exerciseName','sets','reps','symptoms','diagnosis','vitals','type']
    allowed.forEach(field => {
      if (req.body[field] !== undefined) record[field] = req.body[field]
    })

    await record.save()
    res.json(record)
  } catch (err) {
    console.error(err.message)
    res.status(500).send('Server error')
  }
})

// Bulk create template records for patients (admin or doctor)
router.post('/bulk-create-templates', auth, async (req, res) => {
  try {
    // Admins: operate on all patients. Doctors: operate only on their assigned patients.
    let patients = []
    if (req.user.role === 'doctor') {
      patients = await Patient.find({ doctor: req.user.id }).populate('doctor', 'name category')
    } else if (req.user.role === 'admin') {
      patients = await Patient.find().populate('doctor', 'name category')
    } else {
      return res.status(403).json({ msg: 'Only admins and doctors can run bulk template creation' })
    }

    if (!patients.length) return res.status(200).json({ msg: 'No patients found to process', created: 0 })

    const recordsToCreate = []
    let skipped = 0
    // iterate patients sequentially and only add templates that don't already exist for that patient+doctor+title+type
    for (const p of patients) {
      // p.doctor is populated with { _id, name, category } or may be null
      if (!p.doctor || !p.doctor._id) continue // skip patients without an assigned doctor

      const docCategory = (p.doctor.category || '').toString().toLowerCase()

      // Default templates
      let prescriptionTemplate = {
        patient: p._id,
        doctor: p.doctor._id,
        type: 'PRESCRIPTION',
        title: 'General Prescription',
        description: 'Please follow the prescribed medication instructions. Update as required for this patient.',
        medication: 'TBD',
        dosage: 'TBD',
        frequency: 'TBD',
        duration: 'TBD',
      }

      let exerciseTemplate = {
        patient: p._id,
        doctor: p.doctor._id,
        type: 'EXERCISE',
        title: 'General Exercise Plan',
        description: 'A baseline exercise routine assigned by the clinician. Update specifics per patient.',
        exerciseName: 'Baseline Mobility Routine',
        sets: '3',
        reps: '10-15'
      }

      let noteTemplate = {
        patient: p._id,
        doctor: p.doctor._id,
        type: 'NOTE',
        title: 'Initial Clinical Note',
        description: 'Baseline clinical note. Please document symptoms, diagnosis, and vitals as appropriate.',
        symptoms: '',
        diagnosis: '',
        vitals: {}
      }

      // Customize templates by doctor category
      if (docCategory.includes('physio') || docCategory.includes('physiotherapist') || docCategory.includes('physical')) {
        exerciseTemplate.title = 'Physiotherapy Exercise Plan'
        exerciseTemplate.description = 'Mobility and strengthening routine tailored to physiotherapy care. Update per patient findings.'
        exerciseTemplate.exerciseName = 'Physio Mobility & Strength Routine'
        exerciseTemplate.sets = '3'
        exerciseTemplate.reps = '10-15'

        noteTemplate.title = 'Physiotherapy Assessment'
        noteTemplate.description = 'Document functional limitations, range of motion, pain scores, and progress.'

        prescriptionTemplate.title = 'Physio-Related Prescription'
        prescriptionTemplate.description = 'Analgesics or adjunct medications as needed (update per patient).'
      } else if (docCategory.includes('cardio') || docCategory.includes('cardio') || docCategory.includes('cardiologist')) {
        noteTemplate.title = 'Cardiology Clinical Note'
        noteTemplate.description = 'Document chest pain, dyspnea, blood pressure, heart rate, and ECG findings.'
        noteTemplate.vitals = { bp: '', heartRate: '' }

        prescriptionTemplate.title = 'Cardiac Medication'
        prescriptionTemplate.description = 'Medication plan for cardiac care — adjust per patient assessment.'
        prescriptionTemplate.medication = 'TBD'

        exerciseTemplate.title = 'Cardiac Rehab Exercises'
        exerciseTemplate.description = 'Low intensity aerobic and mobility exercises appropriate for cardiac rehab.'
        exerciseTemplate.exerciseName = 'Low Intensity Cardio Routine'
        exerciseTemplate.sets = '2'
        exerciseTemplate.reps = '10-20'
      } else if (docCategory.includes('psych') || docCategory.includes('psychiat') || docCategory.includes('mental')) {
        noteTemplate.title = 'Mental Health Note'
        noteTemplate.description = 'Document mood, affect, risk assessment, and therapeutic plan.'

        prescriptionTemplate.title = 'Psychiatric Prescription'
        prescriptionTemplate.description = 'Medication plan for psychiatric care; update per evaluation.'

        exerciseTemplate.title = 'Mindfulness / Coping Exercises'
        exerciseTemplate.description = 'Suggested mindfulness, breathing, or CBT-based exercises.'
        exerciseTemplate.exerciseName = 'Mindfulness Practice'
        exerciseTemplate.sets = 'Daily'
        exerciseTemplate.reps = ''
      } else {
        // other specialties: keep defaults or lightly customize based on category string
        if (docCategory) {
          noteTemplate.title = `${p.doctor.category} Clinical Note`
          noteTemplate.description = `Clinical note for ${p.doctor.category} — please document findings and plan.`
        }
      }

      // Personalize templates per patient so titles/descriptions are unique and clearer
      const patientName = (p.name || '').trim()
      if (patientName) {
        prescriptionTemplate.title = `${patientName} — ${prescriptionTemplate.title}`
        prescriptionTemplate.description = `${prescriptionTemplate.description} (For ${patientName})`
        exerciseTemplate.title = `${patientName} — ${exerciseTemplate.title}`
        exerciseTemplate.description = `${exerciseTemplate.description} (Assigned to ${patientName})`
        noteTemplate.title = `${patientName} — ${noteTemplate.title}`
        noteTemplate.description = `${noteTemplate.description} (Patient: ${patientName})`
      }

      // For each template, check existence and only add if not present
      try {
        const existsPrescription = await MedicalRecord.findOne({ patient: p._id, doctor: p.doctor._id, type: prescriptionTemplate.type, title: prescriptionTemplate.title })
        if (!existsPrescription) recordsToCreate.push(prescriptionTemplate)
        else skipped++

        const existsExercise = await MedicalRecord.findOne({ patient: p._id, doctor: p.doctor._id, type: exerciseTemplate.type, title: exerciseTemplate.title })
        if (!existsExercise) recordsToCreate.push(exerciseTemplate)
        else skipped++

        const existsNote = await MedicalRecord.findOne({ patient: p._id, doctor: p.doctor._id, type: noteTemplate.type, title: noteTemplate.title })
        if (!existsNote) recordsToCreate.push(noteTemplate)
        else skipped++
      } catch (e) {
        console.error('Error checking existing records for patient', p._id, e.message || e)
      }
    }

    if (!recordsToCreate.length) return res.status(200).json({ msg: 'No new templates to create (all templates already exist)', created: 0, skipped })

    const created = await MedicalRecord.insertMany(recordsToCreate)
    return res.json({ msg: 'Templates created', created: created.length, skipped })
  } catch (err) {
    console.error(err.message)
    res.status(500).send('Server error')
  }
})

module.exports = router;
