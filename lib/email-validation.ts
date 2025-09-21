/**
 * simple email validation utility
 * focuses on basic format checks only
 */

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * validates basic email format
 * @param email - the email address to validate
 * @returns validation result with error message if invalid
 */
export function validateEmail(email: string): EmailValidationResult {
  // trim whitespace
  email = email.trim();
  
  // basic format check
  if (!email) {
    return { isValid: false, error: "l'email è obbligatoria" };
  }
  
  // check for basic email structure: something@something.something
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "formato email non valido" };
  }
  
  // if all checks pass
  return { isValid: true };
}

/**
 * helper function to get user-friendly validation message
 * @param validationResult - result from validateEmail function
 * @returns formatted error message for display
 */
export function getEmailValidationMessage(validationResult: EmailValidationResult): string {
  if (validationResult.isValid) {
    return '';
  }
  
  return validationResult.error || 'email non valida';
}
