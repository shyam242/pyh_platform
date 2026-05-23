// Validation utilities
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone) => {
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

export const validateOTP = (otp) => {
  return /^[0-9]{6}$/.test(otp);
};

export const validateURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validateLinkedInURL = (url) => {
  return url.includes('linkedin.com');
};

export const validateForm = (formData, requiredFields) => {
  const errors = {};
  
  requiredFields.forEach(field => {
    if (!formData[field] || formData[field].trim() === '') {
      errors[field] = `${field} is required`;
    }
  });

  return errors;
};

export const validateReferralForm = (form) => {
  const errors = {};

  if (!form.name || form.name.trim() === '') errors.name = 'Name is required';
  if (!form.email || !validateEmail(form.email)) errors.email = 'Valid email is required';
  if (!form.phone || !validatePhone(form.phone)) errors.phone = 'Valid 10-digit phone is required';
  if (!form.skills || form.skills.trim() === '') errors.skills = 'Skills are required';
  if (!form.experience) errors.experience = 'Experience level is required';
  if (!form.company || form.company.trim() === '') errors.company = 'Company is required';
  // LinkedIn is now optional

  return errors;
};
