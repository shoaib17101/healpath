const categoryBackgrounds = {
  'general physician': '/category-images/general.png',
  specialist: '/category-images/general.png',
  surgeon: '/category-images/bones.png',
  therapist: '/category-images/brain.png',
  cardiologist: '/category-images/heart.png',
  dermatologist: '/category-images/general.png',
  neurologist: '/category-images/brain.png',
  orthopedic: '/category-images/bones.png',
  pediatrician: '/category-images/general.png',
  psychiatrist: '/category-images/brain.png',
  gynecologist: '/category-images/general.png',
  dentist: '/category-images/general.png',
  ophthalmologist: '/category-images/eye.png',
  urologist: '/category-images/general.png',
  nutritionist: '/category-images/general.png',
  physiotherapist: '/category-images/bones.png',
};

export default function getDoctorCategoryBackground(category) {
  const key = typeof category === 'string' ? category.trim().toLowerCase() : 'general physician';
  return categoryBackgrounds[key] || categoryBackgrounds['general physician'];
}