/**
 * Validation helpers pour edge functions
 * Validation manuelle simple et robuste sans dépendances externes
 */

// Validation helpers
export function validateString(value: any, fieldName: string, options?: { minLength?: number; maxLength?: number; email?: boolean }): string {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  if (options?.minLength && value.length < options.minLength) {
    throw new Error(`${fieldName} must be at least ${options.minLength} characters`);
  }
  if (options?.maxLength && value.length > options.maxLength) {
    throw new Error(`${fieldName} must be at most ${options.maxLength} characters`);
  }
  if (options?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error(`${fieldName} must be a valid email`);
  }
  return value;
}

export function validateArray(value: any, fieldName: string, options?: { minLength?: number; maxLength?: number }): any[] {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array`);
  }
  if (options?.minLength && value.length < options.minLength) {
    throw new Error(`${fieldName} must have at least ${options.minLength} items`);
  }
  if (options?.maxLength && value.length > options.maxLength) {
    throw new Error(`${fieldName} must have at most ${options.maxLength} items`);
  }
  return value;
}

export function validateUUID(value: any, fieldName: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof value !== 'string' || !uuidRegex.test(value)) {
    throw new Error(`${fieldName} must be a valid UUID`);
  }
  return value;
}

export function validateOptionalString(value: any, fieldName: string, maxLength?: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  return validateString(value, fieldName, { maxLength });
}

export function validateOptionalBoolean(value: any): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'boolean') {
    throw new Error('Value must be a boolean');
  }
  return value;
}
