/**
 * File validation utilities for HR document uploads
 * RH-P1-02: Strict file validation
 */

export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  // Cartes photos iPhone / Carte Vitale (HEIC)
  'image/heic': ['.heic'],
  'image/heif': ['.heif'],
};

export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate file extension matches expected extensions for MIME type
 */
function validateExtension(file: File): FileValidationResult {
  const fileName = file.name.toLowerCase();
  const mimeType = file.type;
  
  const allowedExtensions = ALLOWED_MIME_TYPES[mimeType];
  if (!allowedExtensions) {
    return {
      valid: false,
      error: `Type de fichier non autorisé: ${mimeType || 'inconnu'}`,
    };
  }
  
  const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
  if (!hasValidExtension) {
    return {
      valid: false,
      error: `Extension de fichier invalide pour le type ${mimeType}`,
    };
  }
  
  return { valid: true };
}

/**
 * Validate file size
 */
function validateSize(file: File): FileValidationResult {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `Fichier trop volumineux (${sizeMB} Mo). Maximum: ${MAX_FILE_SIZE_MB} Mo`,
    };
  }
  
  if (file.size === 0) {
    return {
      valid: false,
      error: 'Le fichier est vide',
    };
  }
  
  return { valid: true };
}

/**
 * Validate MIME type is in allowed list
 */
function validateMimeType(file: File): FileValidationResult {
  const mimeType = file.type;
  
  if (!mimeType) {
    return {
      valid: false,
      error: 'Type de fichier non détecté',
    };
  }
  
  if (!ALLOWED_MIME_TYPES[mimeType]) {
    return {
      valid: false,
      error: `Type de fichier non autorisé: ${mimeType}`,
    };
  }
  
  return { valid: true };
}

/**
 * Validate file name for dangerous characters
 */
function validateFileName(file: File): FileValidationResult {
  const fileName = file.name;
  
  // Check for path traversal attempts
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return {
      valid: false,
      error: 'Nom de fichier invalide',
    };
  }
  
  // Check for null bytes
  if (fileName.includes('\0')) {
    return {
      valid: false,
      error: 'Nom de fichier contient des caractères invalides',
    };
  }
  
  // Max filename length
  if (fileName.length > 255) {
    return {
      valid: false,
      error: 'Nom de fichier trop long (max 255 caractères)',
    };
  }
  
  return { valid: true };
}

/**
 * Complete file validation
 */
export function validateFile(file: File): FileValidationResult {
  // Validate file name first
  const fileNameResult = validateFileName(file);
  if (!fileNameResult.valid) return fileNameResult;
  
  // Validate size
  const sizeResult = validateSize(file);
  if (!sizeResult.valid) return sizeResult;
  
  // Validate MIME type
  const mimeResult = validateMimeType(file);
  if (!mimeResult.valid) return mimeResult;
  
  // Validate extension matches MIME type
  const extResult = validateExtension(file);
  if (!extResult.valid) return extResult;
  
  return { valid: true };
}

/**
 * Validate multiple files
 */
export function validateFiles(files: File[]): FileValidationResult {
  for (const file of files) {
    const result = validateFile(file);
    if (!result.valid) {
      return {
        valid: false,
        error: `${file.name}: ${result.error}`,
      };
    }
  }
  return { valid: true };
}

/**
 * Get accepted file types string for input accept attribute
 */
export function getAcceptedFileTypes(): string {
  return Object.keys(ALLOWED_MIME_TYPES).join(',');
}
