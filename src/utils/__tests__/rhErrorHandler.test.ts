import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createRHError, 
  handleRHError,
  showRHSuccess,
  showRHWarning,
  showRHInfo,
  type RHErrorCode
} from '../rhErrorHandler';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
}));

import { toast } from 'sonner';
import { logError } from '@/lib/logger';

describe('rhErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRHError', () => {
    it('should create error with code and default message', () => {
      const error = createRHError('UPLOAD_FAILED');
      
      expect(error.code).toBe('UPLOAD_FAILED');
      expect(error.userMessage).toBe("Échec de l'upload du fichier");
    });

    it('should use original error message if provided', () => {
      const originalError = new Error('Network timeout');
      const error = createRHError('UPLOAD_FAILED', originalError);
      
      expect(error.message).toBe('Network timeout');
      expect(error.userMessage).toBe("Échec de l'upload du fichier");
    });

    it('should include context when provided', () => {
      const error = createRHError('DELETE_FAILED', undefined, { fileId: '123' });
      
      expect(error.context).toEqual({ fileId: '123' });
    });
  });

  describe('handleRHError', () => {
    it('should detect permission errors from Supabase', () => {
      const permissionError = new Error('new row violates row-level security policy');
      const result = handleRHError(permissionError);
      
      expect(result.code).toBe('PERMISSION_DENIED');
    });

    it('should detect not found errors', () => {
      const notFoundError = new Error('no rows returned');
      const result = handleRHError(notFoundError);
      
      expect(result.code).toBe('NOT_FOUND');
    });

    it('should detect lock errors', () => {
      const lockError = new Error('Resource is locked by another user');
      const result = handleRHError(lockError);
      
      expect(result.code).toBe('LOCK_FAILED');
    });

    it('should use fallback code for unknown errors', () => {
      const unknownError = new Error('Something unexpected');
      const result = handleRHError(unknownError, 'DELETE_FAILED');
      
      expect(result.code).toBe('DELETE_FAILED');
    });

    it('should call logError', () => {
      const error = new Error('Test error');
      handleRHError(error, 'FETCH_FAILED');
      
      expect(logError).toHaveBeenCalled();
    });

    it('should show toast by default', () => {
      const error = new Error('Test error');
      handleRHError(error, 'UPLOAD_FAILED');
      
      expect(toast.error).toHaveBeenCalled();
    });

    it('should not show toast when disabled', () => {
      const error = new Error('Test error');
      handleRHError(error, 'UPLOAD_FAILED', undefined, { showToast: false });
      
      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  describe('toast helpers', () => {
    it('showRHSuccess should call toast.success', () => {
      showRHSuccess('Document uploadé');
      expect(toast.success).toHaveBeenCalledWith('Document uploadé', { description: undefined });
    });

    it('showRHWarning should call toast.warning', () => {
      showRHWarning('Attention', 'Description');
      expect(toast.warning).toHaveBeenCalledWith('Attention', { description: 'Description' });
    });

    it('showRHInfo should call toast.info', () => {
      showRHInfo('Information');
      expect(toast.info).toHaveBeenCalledWith('Information', { description: undefined });
    });
  });
});
