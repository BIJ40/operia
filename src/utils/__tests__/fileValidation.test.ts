import { describe, it, expect } from 'vitest';
import { 
  validateFile, 
  validateFiles, 
  ALLOWED_MIME_TYPES, 
  MAX_FILE_SIZE_MB 
} from '../fileValidation';

describe('fileValidation', () => {
  describe('validateFile', () => {
    it('should accept valid PDF file', () => {
      const file = new File(['content'], 'document.pdf', { type: 'application/pdf' });
      const result = validateFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept valid image files', () => {
      const jpegFile = new File(['content'], 'image.jpg', { type: 'image/jpeg' });
      const pngFile = new File(['content'], 'image.png', { type: 'image/png' });
      
      expect(validateFile(jpegFile).valid).toBe(true);
      expect(validateFile(pngFile).valid).toBe(true);
    });

    it('should accept valid document files', () => {
      const docxFile = new File(['content'], 'doc.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      const xlsxFile = new File(['content'], 'sheet.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      expect(validateFile(docxFile).valid).toBe(true);
      expect(validateFile(xlsxFile).valid).toBe(true);
    });

    it('should reject empty files', () => {
      const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' });
      const result = validateFile(emptyFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('vide');
    });

    it('should reject files with invalid MIME type', () => {
      const exeFile = new File(['content'], 'malware.exe', { type: 'application/x-msdownload' });
      const result = validateFile(exeFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('non autorisé');
    });

    it('should reject files with path traversal attempts', () => {
      const dangerousName = new File(['content'], '../../../etc/passwd.pdf', { type: 'application/pdf' });
      const result = validateFile(dangerousName);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalide');
    });

    it('should reject files with null bytes in name', () => {
      const nullByteName = new File(['content'], 'doc\0.pdf', { type: 'application/pdf' });
      const result = validateFile(nullByteName);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateFiles', () => {
    it('should validate multiple valid files', () => {
      const file1 = new File(['content'], 'doc1.pdf', { type: 'application/pdf' });
      const file2 = new File(['content'], 'doc2.pdf', { type: 'application/pdf' });
      
      const result = validateFiles([file1, file2]);
      expect(result.valid).toBe(true);
    });

    it('should fail on first invalid file', () => {
      const validFile = new File(['content'], 'doc.pdf', { type: 'application/pdf' });
      const invalidFile = new File(['content'], 'malware.exe', { type: 'application/x-msdownload' });
      
      const result = validateFiles([validFile, invalidFile]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('malware.exe');
    });

    it('should return valid for empty array', () => {
      const result = validateFiles([]);
      expect(result.valid).toBe(true);
    });
  });

  describe('constants', () => {
    it('should have valid ALLOWED_MIME_TYPES', () => {
      expect(ALLOWED_MIME_TYPES['application/pdf']).toBeDefined();
      expect(ALLOWED_MIME_TYPES['image/jpeg']).toBeDefined();
      expect(ALLOWED_MIME_TYPES['image/png']).toBeDefined();
    });

    it('should have reasonable MAX_FILE_SIZE_MB', () => {
      expect(MAX_FILE_SIZE_MB).toBeGreaterThan(0);
      expect(MAX_FILE_SIZE_MB).toBeLessThanOrEqual(50);
    });
  });
});
