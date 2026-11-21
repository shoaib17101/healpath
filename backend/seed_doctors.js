const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

require('dotenv').config();

const rawDoctorsData = [
  // General Physicians
  {
    name: "Dr. Muhammad Ali Khan",
    email: "dr.ali.khan@healpath.com",
    role: "doctor",
    category: "General Physician",
    province: "Punjab",
    city: "Lahore",
    experience: 12,
    fees: 1000,
    bio: "Experienced general physician with 12 years of practice. Specialized in internal medicine and preventive care.",
    workNumber: "03001234567",
    clinicAddress: "123 Mall Road, Lahore",
    certifications: "MBBS, FCPS (Internal Medicine)",
    availability: {
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      startTime: "09:00",
      startPeriod: "AM",
      endTime: "05:00",
      endPeriod: "PM"
    }
  },
  {
    name: "Dr. Fatima Ahmed",
    email: "dr.fatima.ahmed@healpath.com",
    role: "doctor",
    category: "General Physician",
    province: "Sindh",
    city: "Karachi",
    experience: 8,
    fees: 800,
    bio: "General physician with expertise in family medicine and health counseling.",
    workNumber: "03012345678",
    clinicAddress: "456 Clifton Avenue, Karachi",
    certifications: "MBBS, Diploma in Family Medicine",
    availability: {
      days: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      startTime: "10:00",
      startPeriod: "AM",
      endTime: "06:00",
      endPeriod: "PM"
    }
  },

  // Cardiologists
  {
    name: "Dr. Hassan Malik",
    email: "dr.hassan.malik@healpath.com",
    role: "doctor",
    category: "Cardiologist",
    province: "Punjab",
    city: "Faisalabad",
    experience: 15,
    fees: 1500,
    bio: "Renowned cardiologist with expertise in interventional cardiology and heart disease management.",
    workNumber: "03021234567",
    clinicAddress: "789 Ghazni Street, Faisalabad",
    certifications: "MBBS, FCPS (Cardiology), American Board Certification",
    availability: {
      days: ["Monday", "Wednesday", "Friday"],
      startTime: "02:00",
      startPeriod: "PM",
      endTime: "07:00",
      endPeriod: "PM"
    }
  },
  {
    name: "Dr. Sana Hussain",
    email: "dr.sana.hussain@healpath.com",
    role: "doctor",
    category: "Cardiologist",
    province: "KPK",
    city: "Peshawar",
    experience: 10,
    fees: 1300,
    bio: "Cardiologist specializing in heart failure and arrhythmia management.",
    workNumber: "03031234567",
    clinicAddress: "321 Hashtnagri, Peshawar",
    certifications: "MBBS, FCPS (Cardiology)",
    availability: {
      days: ["Monday", "Tuesday", "Thursday", "Friday"],
      startTime: "09:00",
      startPeriod: "AM",
      endTime: "04:00",
      endPeriod: "PM"
    }
  },

  // Dermatologists
  {
    name: "Dr. Aisha Patel",
    email: "dr.aisha.patel@healpath.com",
    role: "doctor",
    category: "Dermatologist",
    province: "Sindh",
    city: "Hyderabad",
    experience: 11,
    fees: 1200,
    bio: "Expert dermatologist with focus on cosmetic and clinical dermatology.",
    workNumber: "03041234567",
    clinicAddress: "654 Liaquat Street, Hyderabad",
    certifications: "MBBS, FCPS (Dermatology)",
    availability: {
      days: ["Tuesday", "Wednesday", "Friday", "Saturday"],
      startTime: "11:00",
      startPeriod: "AM",
      endTime: "06:00",
      endPeriod: "PM"
    }
  },
  {
    name: "Dr. Bilal Ahmed",
    email: "dr.bilal.ahmed@healpath.com",
    role: "doctor",
    category: "Dermatologist",
    province: "Punjab",
    city: "Multan",
    experience: 7,
    fees: 900,
    bio: "Dermatologist with expertise in skin infections and treatment procedures.",
    workNumber: "03051234567",
    clinicAddress: "987 Cantonment Road, Multan",
    certifications: "MBBS, FCPS (Dermatology)",
    availability: {
      days: ["Monday", "Wednesday", "Friday", "Saturday"],
      startTime: "10:00",
      startPeriod: "AM",
      endTime: "05:00",
      endPeriod: "PM"
    }
  },

  // Neurologists
  {
    name: "Dr. Usman Farooq",
    email: "dr.usman.farooq@healpath.com",
    role: "doctor",
    category: "Neurologist",
    province: "Punjab",
    city: "Rawalpindi",
    experience: 13,
    fees: 1400,
    bio: "Experienced neurologist specializing in epilepsy and movement disorders.",
    workNumber: "03061234567",
    clinicAddress: "234 Jinnah Avenue, Rawalpindi",
    certifications: "MBBS, FCPS (Neurology), Neuroimaging Specialist",
    availability: {
      days: ["Monday", "Tuesday", "Thursday", "Friday"],
      startTime: "01:00",
      startPeriod: "PM",
      endTime: "06:00",
      endPeriod: "PM"
    }
  },
  {
    name: "Dr. Nida Khan",
    email: "dr.nida.khan@healpath.com",
    role: "doctor",
    category: "Neurologist",
    province: "Balochistan",
    city: "Quetta",
    experience: 9,
    fees: 1100,
    bio: "Neurologist with expertise in headache management and neurological disorders.",
    workNumber: "03071234567",
    clinicAddress: "456 Zarghoon Road, Quetta",
    certifications: "MBBS, FCPS (Neurology)",
    availability: {
      days: ["Tuesday", "Thursday", "Saturday"],
      startTime: "10:00",
      startPeriod: "AM",
      endTime: "04:00",
      endPeriod: "PM"
    }
  },

  // Orthopedic
  {
    name: "Dr. Kamran Sheikh",
    email: "dr.kamran.sheikh@healpath.com",
    role: "doctor",
    category: "Orthopedic",
    province: "Punjab",
    city: "Gujranwala",
    experience: 14,
    fees: 1350,
    bio: "Orthopedic surgeon with expertise in joint replacement and sports medicine.",
    workNumber: "03081234567",
    clinicAddress: "789 Satellite Town, Gujranwala",
    certifications: "MBBS, FCPS (Orthopedic Surgery), Sports Medicine",
    availability: {
      days: ["Monday", "Wednesday", "Friday", "Saturday"],
      startTime: "09:00",
      startPeriod: "AM",
      endTime: "03:00",
      endPeriod: "PM"
    }
  },
  {
    name: "Dr. Rabia Malik",
    email: "dr.rabia.malik@healpath.com",
    role: "doctor",
    category: "Orthopedic",
    province: "KPK",
    city: "Mingora",
    experience: 10,
    fees: 1000,
    bio: "Orthopedic specialist focused on fracture management and rehabilitation.",
    workNumber: "03091234567",
    clinicAddress: "321 Mingora Plaza, Mingora",
    certifications: "MBBS, FCPS (Orthopedic Surgery)",
    availability: {
      days: ["Tuesday", "Thursday", "Friday", "Saturday"],
      startTime: "02:00",
      startPeriod: "PM",
      endTime: "07:00",
      endPeriod: "PM"
    }
  },

  // Pediatrician
  {
    name: "Dr. Iqra Bashir",
    email: "dr.iqra.bashir@healpath.com",
    role: "doctor",
    category: "Pediatrician",
    province: "Sindh",
    city: "Sukkur",
    experience: 11,
    fees: 900,
    bio: "Pediatrician specializing in child health, immunization, and development.",
    workNumber: "03101234567",
    clinicAddress: "654 Sukkur City, Sukkur",
    certifications: "MBBS, FCPS (Pediatrics), Child Development",
    availability: {
      days: ["Monday", "Tuesday", "Wednesday", "Friday", "Saturday"],
      startTime: "10:00",
      startPeriod: "AM",
      endTime: "05:00",
      endPeriod: "PM"
    }
  },
  {
    name: "Dr. Adnan Raza",
    email: "dr.adnan.raza@healpath.com",
    role: "doctor",
    category: "Pediatrician",
    province: "Punjab",
    city: "Sargodha",
    experience: 8,
    fees: 800,
    bio: "Pediatrician with expertise in infectious diseases and vaccination programs.",
    workNumber: "03111234567",
    clinicAddress: "987 Sargodha Medical Plaza, Sargodha",
    certifications: "MBBS, FCPS (Pediatrics)",
    availability: {
      days: ["Monday", "Wednesday", "Thursday", "Saturday"],
      startTime: "09:00",
      startPeriod: "AM",
      endTime: "02:00",
      endPeriod: "PM"
    }
  },

  // Psychiatrist
  {
    name: "Dr. Omar Farrokh",
    email: "dr.omar.farrokh@healpath.com",
    role: "doctor",
    category: "Psychiatrist",
    province: "Punjab",
    city: "Lahore",
    experience: 12,
    fees: 1200,
    bio: "Psychiatrist specializing in depression, anxiety, and mental health treatment.",
    workNumber: "03121234567",
    clinicAddress: "234 Defence Road, Lahore",
    certifications: "MBBS, FCPS (Psychiatry), Psychotherapy Diploma",
    availability: {
      days: ["Monday", "Tuesday", "Thursday", "Friday"],
      startTime: "03:00",
      startPeriod: "PM",
      endTime: "08:00",
      endPeriod: "PM"
    }
  },
  {
    name: "Dr. Mehrene Hassan",
    email: "dr.mehrene.hassan@healpath.com",
    role: "doctor",
    category: "Psychiatrist",
    province: "Sindh",
    city: "Karachi",
    experience: 9,
    fees: 1000,
    bio: "Psychiatrist offering counseling and medication management for mental disorders.",
    workNumber: "03131234567",
    clinicAddress: "456 Bahadurabad, Karachi",
    certifications: "MBBS, FCPS (Psychiatry)",
    availability: {
      days: ["Tuesday", "Wednesday", "Thursday", "Saturday"],
      startTime: "10:00",
      startPeriod: "AM",
      endTime: "04:00",
      endPeriod: "PM"
    }
  },

  // Gynecologist
  {
    name: "Dr. Hana Malik",
    email: "dr.hana.malik@healpath.com",
    role: "doctor",
    category: "Gynecologist",
    province: "Punjab",
    city: "Bahawalpur",
    experience: 13,
    fees: 1300,
    bio: "Gynecologist specializing in women's health, pregnancy, and reproductive medicine.",
    workNumber: "03141234567",
    clinicAddress: "789 Bahawalpur Central, Bahawalpur",
    certifications: "MBBS, FCPS (Gynecology & Obstetrics)",
    availability: {
      days: ["Monday", "Tuesday", "Wednesday", "Friday"],
      startTime: "09:00",
      startPeriod: "AM",
      endTime: "04:00",
      endPeriod: "PM"
    }
  },
  {
    name: "Dr. Zainab Ali",
    email: "dr.zainab.ali@healpath.com",
    role: "doctor",
    category: "Gynecologist",
    province: "KPK",
    city: "Abbottabad",
    experience: 10,
    fees: 1100,
    bio: "Experienced gynecologist providing comprehensive women's healthcare services.",
    workNumber: "03151234567",
    clinicAddress: "321 Abbottabad Medical Center, Abbottabad",
    certifications: "MBBS, FCPS (Gynecology & Obstetrics)",
    availability: {
      days: ["Tuesday", "Thursday", "Friday", "Saturday"],
      startTime: "10:00",
      startPeriod: "AM",
      endTime: "05:00",
      endPeriod: "PM"
    }
  },

  // Dentist
  {
    name: "Dr. Fahad Khan",
    email: "dr.fahad.khan@healpath.com",
    role: "doctor",
    category: "Dentist",
    province: "Punjab",
    city: "Sialkot",
    experience: 10,
    fees: 700,
    bio: "Dentist offering general dentistry and cosmetic dental procedures.",
    workNumber: "03161234567",
    clinicAddress: "654 Sialkot Dental Clinic, Sialkot",
    certifications: "BDS, Advanced Cosmetic Dentistry",
    availability: {
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      startTime: "10:00",
      startPeriod: "AM",
      endTime: "06:00",
      endPeriod: "PM"
    }
  },
  {
    name: "Dr. Sara Jamil",
    email: "dr.sara.jamil@healpath.com",
    role: "doctor",
    category: "Dentist",
    province: "Sindh",
    city: "Larkana",
    experience: 7,
    fees: 600,
    bio: "Dentist specializing in orthodontics and teeth alignment treatments.",
    workNumber: "03171234567",
    clinicAddress: "987 Larkana Medical Complex, Larkana",
    certifications: "BDS, Orthodontics Diploma",
    availability: {
      days: ["Monday", "Wednesday", "Friday", "Saturday"],
      startTime: "09:00",
      startPeriod: "AM",
      endTime: "05:00",
      endPeriod: "PM"
    }
  },

  // Ophthalmologist
  {
    name: "Dr. Tariq Hussain",
    email: "dr.tariq.hussain@healpath.com",
    role: "doctor",
    category: "Ophthalmologist",
    province: "Punjab",
    city: "Sheikhupura",
    experience: 12,
    fees: 1000,
    bio: "Ophthalmologist specializing in cataract surgery and vision correction.",
    workNumber: "03181234567",
    clinicAddress: "234 Sheikhupura Eye Center, Sheikhupura",
    certifications: "MBBS, FCPS (Ophthalmology), Laser Surgery",
    availability: {
      days: ["Tuesday", "Wednesday", "Thursday", "Saturday"],
      startTime: "10:00",
      startPeriod: "AM",
      endTime: "04:00",
      endPeriod: "PM"
    }
  },
  {
    name: "Dr. Amina Habib",
    email: "dr.amina.habib@healpath.com",
    role: "doctor",
    category: "Ophthalmologist",
    province: "Balochistan",
    city: "Gwadar",
    experience: 8,
    fees: 850,
    bio: "Ophthalmologist focusing on refractive surgery and retinal disorders.",
    workNumber: "03191234567",
    clinicAddress: "456 Gwadar Vision Clinic, Gwadar",
    certifications: "MBBS, FCPS (Ophthalmology)",
    availability: {
      days: ["Monday", "Thursday", "Friday", "Saturday"],
      startTime: "09:00",
      startPeriod: "AM",
      endTime: "03:00",
      endPeriod: "PM"
    }
  },

  // Urologist
  {
    name: "Dr. Nasir Malik",
    email: "dr.nasir.malik@healpath.com",
    role: "doctor",
    category: "Urologist",
    province: "Punjab",
    city: "Rahim Yar Khan",
    experience: 11,
    fees: 1100,
    bio: "Urologist with expertise in urinary system disorders and kidney treatment.",
    workNumber: "03201234567",
    clinicAddress: "789 RYK Medical Center, Rahim Yar Khan",
    certifications: "MBBS, FCPS (Urology), Endourology",
    availability: {
      days: ["Monday", "Tuesday", "Thursday", "Friday"],
      startTime: "09:00",
      startPeriod: "AM",
      endTime: "04:00",
      endPeriod: "PM"
    }
  },
  {
    name: "Dr. Khalid Saeed",
    email: "dr.khalid.saeed@healpath.com",
    role: "doctor",
    category: "Urologist",
    province: "Azad Kashmir",
    city: "Muzaffarabad",
    experience: 9,
    fees: 950,
    bio: "Urologist specializing in prostate health and bladder disorders.",
    workNumber: "03211234567",
    clinicAddress: "321 Muzaffarabad Clinic, Muzaffarabad",
    certifications: "MBBS, FCPS (Urology)",
    availability: {
      days: ["Wednesday", "Thursday", "Friday", "Saturday"],
      startTime: "10:00",
      startPeriod: "AM",
      endTime: "05:00",
      endPeriod: "PM"
    }
  },

  // Nutritionist
  {
    name: "Dr. Yasmin Ahmed",
    email: "dr.yasmin.ahmed@healpath.com",
    role: "doctor",
    category: "Nutritionist",
    province: "KPK",
    city: "Kohat",
    experience: 7,
    fees: 600,
    bio: "Nutritionist providing diet plans and nutritional counseling for health management.",
    workNumber: "03221234567",
    clinicAddress: "654 Kohat Nutrition Center, Kohat",
    certifications: "MSc Nutrition, Dietetics Diploma",
    availability: {
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      startTime: "10:00",
      startPeriod: "AM",
      endTime: "05:00",
      endPeriod: "PM"
    }
  },
  {
    name: "Dr. Hira Khan",
    email: "dr.hira.khan@healpath.com",
    role: "doctor",
    category: "Nutritionist",
    province: "Gilgit Baltistan",
    city: "Skardu",
    experience: 6,
    fees: 500,
    bio: "Nutritionist specialized in weight management and wellness programs.",
    workNumber: "03231234567",
    clinicAddress: "987 Skardu Health Center, Skardu",
    certifications: "MSc Clinical Nutrition",
    availability: {
      days: ["Tuesday", "Thursday", "Friday", "Saturday"],
      startTime: "09:00",
      startPeriod: "AM",
      endTime: "04:00",
      endPeriod: "PM"
    }
  },

  // Physiotherapist
  {
    name: "Dr. Raza Ahmed",
    email: "dr.raza.ahmed@healpath.com",
    role: "doctor",
    category: "Physiotherapist",
    province: "Punjab",
    city: "Lahore",
    experience: 9,
    fees: 700,
    bio: "Physiotherapist specializing in sports injuries and rehabilitation therapy.",
    workNumber: "03241234567",
    clinicAddress: "234 Physiotherapy Center, Lahore",
    certifications: "DPT, Sports Physiotherapy",
    availability: {
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      startTime: "08:00",
      startPeriod: "AM",
      endTime: "05:00",
      endPeriod: "PM"
    }
  },
  {
    name: "Dr. Saira Hassan",
    email: "dr.saira.hassan@healpath.com",
    role: "doctor",
    category: "Physiotherapist",
    province: "Sindh",
    city: "Nawabshah",
    experience: 8,
    fees: 650,
    bio: "Physiotherapist offering pain management and post-operative rehabilitation.",
    workNumber: "03251234567",
    clinicAddress: "456 Nawabshah Rehab Clinic, Nawabshah",
    certifications: "DPT, Manual Therapy",
    availability: {
      days: ["Wednesday", "Thursday", "Friday", "Saturday"],
      startTime: "09:00",
      startPeriod: "AM",
      endTime: "04:00",
      endPeriod: "PM"
    }
  },

  // Surgeon (General Surgery)
  {
    name: "Dr. Ahmad Raza",
    email: "dr.ahmad.raza@healpath.com",
    role: "doctor",
    category: "Surgeon",
    province: "Punjab",
    city: "Lahore",
    experience: 16,
    fees: 1600,
    bio: "General surgeon with expertise in abdominal and laparoscopic surgery.",
    workNumber: "03261234567",
    clinicAddress: "789 Surgical Center, Lahore",
    certifications: "MBBS, FCPS (Surgery), Advanced Laparoscopy",
    availability: {
      days: ["Monday", "Wednesday", "Friday"],
      startTime: "02:00",
      startPeriod: "PM",
      endTime: "06:00",
      endPeriod: "PM"
    }
  },
  {
    name: "Dr. Farida Nasir",
    email: "dr.farida.nasir@healpath.com",
    role: "doctor",
    category: "Surgeon",
    province: "KPK",
    city: "Mardan",
    experience: 12,
    fees: 1400,
    bio: "Surgeon specializing in emergency surgery and trauma management.",
    workNumber: "03271234567",
    clinicAddress: "321 Mardan Hospital, Mardan",
    certifications: "MBBS, FCPS (Surgery), Trauma Specialist",
    availability: {
      days: ["Tuesday", "Thursday", "Friday", "Saturday"],
      startTime: "09:00",
      startPeriod: "AM",
      endTime: "05:00",
      endPeriod: "PM"
    }
  },

  // Specialist (Multiple specializations)
  {
    name: "Dr. Imran Ahmed",
    email: "dr.imran.ahmed@healpath.com",
    role: "doctor",
    category: "Specialist",
    province: "Sindh",
    city: "Karachi",
    experience: 14,
    fees: 1450,
    bio: "Multi-specialty physician offering comprehensive medical consultations.",
    workNumber: "03281234567",
    clinicAddress: "654 Specialist Clinic, Karachi",
    certifications: "MBBS, Multiple Fellowships",
    availability: {
      days: ["Monday", "Tuesday", "Wednesday", "Thursday"],
      startTime: "10:00",
      startPeriod: "AM",
      endTime: "06:00",
      endPeriod: "PM"
    }
  },
  {
    name: "Dr. Sulaman Farah",
    email: "dr.sulaman.farah@healpath.com",
    role: "doctor",
    category: "Specialist",
    province: "Balochistan",
    city: "Turbat",
    experience: 10,
    fees: 1200,
    bio: "Specialist doctor with diverse clinical experience and research background.",
    workNumber: "03291234567",
    clinicAddress: "987 Medical Specialist Center, Turbat",
    certifications: "MBBS, FCPS",
    availability: {
      days: ["Monday", "Wednesday", "Friday", "Saturday"],
      startTime: "09:00",
      startPeriod: "AM",
      endTime: "04:00",
      endPeriod: "PM"
    }
  },

  // Therapist
  {
    name: "Dr. Leah Malik",
    email: "dr.leah.malik@healpath.com",
    role: "doctor",
    category: "Therapist",
    province: "Gilgit Baltistan",
    city: "Gilgit",
    experience: 8,
    fees: 800,
    bio: "Therapist specializing in behavioral and cognitive therapy sessions.",
    workNumber: "03301234567",
    clinicAddress: "234 Therapy Center, Gilgit",
    certifications: "MA Psychology, Certified Therapist",
    availability: {
      days: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      startTime: "10:00",
      startPeriod: "AM",
      endTime: "05:00",
      endPeriod: "PM"
    }
  },
  {
    name: "Dr. Safiya Bashir",
    email: "dr.safiya.bashir@healpath.com",
    role: "doctor",
    category: "Therapist",
    province: "Azad Kashmir",
    city: "Mirpur",
    experience: 7,
    fees: 700,
    bio: "Therapist offering counseling services and personal development programs.",
    workNumber: "03311234567",
    clinicAddress: "456 Counseling Clinic, Mirpur",
    certifications: "MSc Counseling Psychology",
    availability: {
      days: ["Monday", "Thursday", "Friday", "Saturday"],
      startTime: "02:00",
      startPeriod: "PM",
      endTime: "07:00",
      endPeriod: "PM"
    }
  }
];

const doctorsData = rawDoctorsData.map((doctor, index) => {
  const paymentSet = [
    { jazzcashNumber: '03001234567', easypaisaNumber: '03111234567' },
    { jazzcashNumber: '03021234567', easypaisaNumber: '03131234567' },
    { jazzcashNumber: '03041234567', easypaisaNumber: '03151234567' },
    { jazzcashNumber: '03061234567', easypaisaNumber: '03171234567' },
  ][index % 4];

  return {
    ...doctor,
    workNumber: paymentSet.jazzcashNumber,
    paymentDetails: {
      jazzcashNumber: paymentSet.jazzcashNumber,
      easypaisaNumber: paymentSet.easypaisaNumber,
    },
  };
});

async function seedDoctors() {
  try {
    const seedPassword = process.env.SEED_DOCTOR_PASSWORD;
    if (!seedPassword) {
      throw new Error('SEED_DOCTOR_PASSWORD must be set');
    }

    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/healpath');
    console.log('Connected to MongoDB');

    // Hash passwords and create doctors
    const hashedDoctors = await Promise.all(
      doctorsData.map(async (doctor) => {
        const salt = await bcrypt.genSalt(10);
        return {
          ...doctor,
          password: await bcrypt.hash(seedPassword, salt)
        };
      })
    );

    // Insert doctors
    const result = await User.insertMany(hashedDoctors, { ordered: false });
    console.log(`Successfully added ${result.length} doctors to the database`);

    // Display added doctors info
    console.log('\n✅ Doctors added with the following credentials:');
    doctorsData.forEach((doctor) => {
      console.log(`- ${doctor.name} (${doctor.category}) - ${doctor.email}`);
    });

  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key error - some doctors already exist
      const insertedCount = err.insertedDocs ? err.insertedDocs.length : 0;
      console.log(`⚠️  Partially completed. ${insertedCount} new doctors added.`);
      console.log('Some doctor emails already exist in the database.');
    } else {
      console.error('Error seeding doctors:', err.message);
    }
  } finally {
    await mongoose.disconnect();
  }
}

seedDoctors();
