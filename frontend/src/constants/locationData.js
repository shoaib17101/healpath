export const locationData = {
  Punjab: [
    'Lahore', 'Faisalabad', 'Rawalpindi', 'Multan', 'Gujranwala', 
    'Sargodha', 'Bahawalpur', 'Sialkot', 'Sheikhupura', 'Rahim Yar Khan'
  ],
  Sindh: [
    'Karachi', 'Hyderabad', 'Sukkur', 'Larkana', 'Nawabshah'
  ],
  KPK: [
    'Peshawar', 'Mardan', 'Mingora', 'Kohat', 'Abbottabad'
  ],
  Balochistan: [
    'Quetta', 'Gwadar', 'Turbat', 'Khuzdar'
  ],
  'Gilgit Baltistan': [
    'Gilgit', 'Skardu', 'Hunza'
  ],
  'Azad Kashmir': [
    'Muzaffarabad', 'Mirpur', 'Rawalakot'
  ]
};

export const doctorCategories = [
  "General Physician",
  "Specialist",
  "Surgeon",
  "Therapist",
  "Cardiologist",
  "Dermatologist",
  "Neurologist",
  "Orthopedic",
  "Pediatrician",
  "Psychiatrist",
  "Gynecologist",
  "Dentist",
  "Ophthalmologist",
  "Urologist",
  "Nutritionist",
  "Physiotherapist"
];

export const doctorCategoryTranslations = {
  "General Physician": "عمومی معالج",
  "Specialist": "ماہر ڈاکٹر",
  "Surgeon": "سرجن",
  "Therapist": "تھراپسٹ",
  "Cardiologist": "ماہر امراض قلب",
  "Dermatologist": "ماہر امراض جلد",
  "Neurologist": "ماہر امراض اعصاب",
  "Orthopedic": "ماہر امراض ہڈی و جوڑ",
  "Pediatrician": "ماہر اطفال",
  "Psychiatrist": "ماہر نفسیات",
  "Gynecologist": "ماہر امراض نسواں",
  "Dentist": "دندان ساز",
  "Ophthalmologist": "ماہر امراض چشم",
  "Urologist": "ماہر امراض گردہ و پیشاب",
  "Nutritionist": "ماہر غذائیت",
  "Physiotherapist": "فزیوتھراپسٹ"
};

export const symptomToCategory = {
  // General
  "fever": "General Physician",
  "flu": "General Physician",
  "cough": "General Physician",
  "cold": "General Physician",
  "headache": "General Physician",
  "body ache": "General Physician",
  
  // Heart
  "chest pain": "Cardiologist",
  "heart beat": "Cardiologist",
  "blood pressure": "Cardiologist",
  
  // Skin
  "acne": "Dermatologist",
  "rash": "Dermatologist",
  "skin": "Dermatologist",
  "hair loss": "Dermatologist",
  
  // Brain/Nerves
  "seizure": "Neurologist",
  "numbness": "Neurologist",
  "migraine": "Neurologist",
  
  // Bones/Joints
  "back pain": "Orthopedic",
  "fracture": "Orthopedic",
  "joint pain": "Orthopedic",
  "bone": "Orthopedic",
  
  // Kids
  "child": "Pediatrician",
  "baby": "Pediatrician",
  "vaccination": "Pediatrician",
  
  // Mental Health
  "anxiety": "Psychiatrist",
  "depression": "Psychiatrist",
  "stress": "Psychiatrist",
  "sleep": "Psychiatrist",
  
  // Women Health
  "pregnancy": "Gynecologist",
  "period": "Gynecologist",
  "women health": "Gynecologist",
  
  // Teeth
  "toothache": "Dentist",
  "gum": "Dentist",
  "cavity": "Dentist",
  
  // Eyes
  "vision": "Ophthalmologist",
  "eye": "Ophthalmologist",
  "red eye": "Ophthalmologist",
  
  // Urinary
  "kidney": "Urologist",
  "urinary": "Urologist",
  "bladder": "Urologist",
  
  // Nutrition
  "diet": "Nutritionist",
  "weight loss": "Nutritionist",
  "nutrition": "Nutritionist",
  
  // Physio
  "rehab": "Physiotherapist",
  "muscle": "Physiotherapist",
  "injury": "Physiotherapist",
  "physical therapy": "Physiotherapist"
};

export const symptomTranslations = {
  "fever": "بخار",
  "flu": "فلو",
  "cough": "کھانسی",
  "cold": "نزلہ",
  "headache": "سر درد",
  "body ache": "جسم میں درد",
  "chest pain": "سینے میں درد",
  "heart beat": "دل کی دھڑکن",
  "blood pressure": "بلڈ پریشر",
  "acne": "مہاسے",
  "rash": "جلد پر دانے",
  "skin": "جلد",
  "hair loss": "بالوں کا جھڑنا",
  "seizure": "دورہ",
  "numbness": "سن پن",
  "migraine": "آدھے سر کا درد",
  "back pain": "کمر درد",
  "fracture": "ہڈی کا فریکچر",
  "joint pain": "جوڑوں کا درد",
  "bone": "ہڈی",
  "child": "بچہ",
  "baby": "شیر خوار بچہ",
  "vaccination": "ویکسینیشن",
  "anxiety": "بے چینی",
  "depression": "ڈپریشن",
  "stress": "ذہنی دباؤ",
  "sleep": "نیند",
  "pregnancy": "حمل",
  "period": "ماہواری",
  "women health": "خواتین کی صحت",
  "toothache": "دانت کا درد",
  "gum": "مسوڑھے",
  "cavity": "دانت میں کیڑا",
  "vision": "نظر",
  "eye": "آنکھ",
  "red eye": "آنکھوں کی سرخی",
  "kidney": "گردہ",
  "urinary": "پیشاب کی تکلیف",
  "bladder": "مثانہ",
  "diet": "غذا",
  "weight loss": "وزن میں کمی",
  "nutrition": "غذائیت",
  "rehab": "بحالیِ صحت",
  "muscle": "پٹھے",
  "injury": "چوٹ",
  "physical therapy": "طبی ورزش"
};
