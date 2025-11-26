export const PASSWORD_MIN_LENGTH = 14;

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export const PASSWORD_REQUIREMENTS = [
  'At least 14 characters long',
  'At least one uppercase letter (A-Z)',
  'At least one lowercase letter (a-z)',
  'At least one number (0-9)',
  'At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)',
  'Cannot start or end with a space',
];

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.startsWith(' ') || password.endsWith(' ')) {
    errors.push('Password cannot start or end with a space');
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function getPasswordStrengthColor(password: string): string {
  if (!password) return 'bg-gray-200';
  
  const { errors } = validatePassword(password);
  const strength = PASSWORD_REQUIREMENTS.length - errors.length;
  
  if (strength <= 2) return 'bg-red-500';
  if (strength <= 4) return 'bg-yellow-500';
  return 'bg-green-500';
}

