/**
 * Category utility functions for Title Case display and validation
 */

/**
 * Convert a category name to Title Case for display
 * Examples: "fruits" -> "Fruits", "nuts & seeds" -> "Nuts & Seeds"
 */
export function toTitleCase(str: string | null | undefined): string {
  if (!str) return '';
  
  return str
    .toLowerCase()
    .split(' ')
    .map(word => {
      // Handle special cases - keep these lowercase
      if (['and', 'or'].includes(word)) return word;
      if (word === '&') return '&';
      // Capitalize first letter of each word
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Normalize category name for backend storage (lowercase, trimmed, single spaces)
 * Examples: "Nuts & Seeds" -> "nuts & seeds", "  Fruits  " -> "fruits"
 */
export function normalizeCategoryForStorage(category: string): string {
  // Trim whitespace, collapse multiple spaces to single space, and convert to lowercase
  return category.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Validate category name according to business rules
 * Returns { valid: true } or { valid: false, error: string }
 */
export function validateCategoryName(name: string): { valid: boolean; error?: string } {
  // Check for null/undefined/empty
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Category name is required' };
  }
  
  const trimmed = name.trim();
  
  // Check if empty after trimming
  if (trimmed === '') {
    return { valid: false, error: 'Category name cannot be empty or only whitespace' };
  }
  
  // Check length constraints (min 2, max 50)
  if (trimmed.length < 2) {
    return { valid: false, error: 'Category name must be at least 2 characters' };
  }
  
  if (trimmed.length > 50) {
    return { valid: false, error: 'Category name must be 50 characters or less' };
  }
  
  // Only allow letters, spaces, hyphens, ampersands, apostrophes
  // This blocks numbers, special chars, unicode, emojis, etc.
  const validPattern = /^[a-zA-Z\s\-&']+$/;
  if (!validPattern.test(trimmed)) {
    return { 
      valid: false, 
      error: 'Category can only contain letters, spaces, hyphens (-), ampersands (&), and apostrophes (\')' 
    };
  }
  
  // Check for multiple consecutive spaces
  if (/\s{2,}/.test(trimmed)) {
    return { valid: false, error: 'Category name cannot contain multiple consecutive spaces' };
  }
  
  // Must start and end with a letter (not space or special char)
  if (!/^[a-zA-Z]/.test(trimmed)) {
    return { valid: false, error: 'Category name must start with a letter' };
  }
  
  if (!/[a-zA-Z]$/.test(trimmed)) {
    return { valid: false, error: 'Category name must end with a letter' };
  }
  
  return { valid: true };
}

