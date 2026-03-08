/**
 * Tests for validation schemas and repository layer
 */
import { describe, it, expect } from 'vitest';
import {
  userProfileUpdateSchema,
  collaboratorFormSchema,
  ticketCreateSchema,
  documentRequestSchema,
  interventionRequestSchema,
} from '@/lib/validation/schemas';

// ============================================================================
// Zod Validation Schema Tests
// ============================================================================

describe('userProfileUpdateSchema', () => {
  it('accepts valid profile data', () => {
    const result = userProfileUpdateSchema.safeParse({
      first_name: 'Jean',
      last_name: 'Dupont',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty first_name', () => {
    const result = userProfileUpdateSchema.safeParse({
      first_name: '',
      last_name: 'Dupont',
    });
    expect(result.success).toBe(false);
  });

  it('trims whitespace from names', () => {
    const result = userProfileUpdateSchema.safeParse({
      first_name: '  Jean  ',
      last_name: '  Dupont  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.first_name).toBe('Jean');
      expect(result.data.last_name).toBe('Dupont');
    }
  });

  it('validates global_role enum', () => {
    const valid = userProfileUpdateSchema.safeParse({
      first_name: 'Jean',
      last_name: 'Dupont',
      global_role: 'platform_admin',
    });
    expect(valid.success).toBe(true);

    const invalid = userProfileUpdateSchema.safeParse({
      first_name: 'Jean',
      last_name: 'Dupont',
      global_role: 'god_mode',
    });
    expect(invalid.success).toBe(false);
  });

  it('rejects names exceeding 100 chars', () => {
    const result = userProfileUpdateSchema.safeParse({
      first_name: 'A'.repeat(101),
      last_name: 'Dupont',
    });
    expect(result.success).toBe(false);
  });
});

describe('collaboratorFormSchema', () => {
  it('accepts valid collaborator', () => {
    const result = collaboratorFormSchema.safeParse({
      first_name: 'Marie',
      last_name: 'Martin',
      type: 'TECHNICIEN',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid type', () => {
    const result = collaboratorFormSchema.safeParse({
      first_name: 'Marie',
      last_name: 'Martin',
      type: 'HACKER',
    });
    expect(result.success).toBe(false);
  });

  it('validates email format', () => {
    const valid = collaboratorFormSchema.safeParse({
      first_name: 'Marie',
      last_name: 'Martin',
      type: 'ASSISTANTE',
      email: 'marie@test.com',
    });
    expect(valid.success).toBe(true);

    const invalid = collaboratorFormSchema.safeParse({
      first_name: 'Marie',
      last_name: 'Martin',
      type: 'ASSISTANTE',
      email: 'not-an-email',
    });
    expect(invalid.success).toBe(false);
  });
});

describe('ticketCreateSchema', () => {
  it('accepts valid ticket', () => {
    const result = ticketCreateSchema.safeParse({
      element_concerne: 'Bug login page',
      heat_priority: 5,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = ticketCreateSchema.safeParse({
      element_concerne: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects heat_priority out of range', () => {
    const result = ticketCreateSchema.safeParse({
      element_concerne: 'Bug',
      heat_priority: 15,
    });
    expect(result.success).toBe(false);
  });

  it('limits description length', () => {
    const result = ticketCreateSchema.safeParse({
      element_concerne: 'Bug',
      description: 'A'.repeat(10001),
    });
    expect(result.success).toBe(false);
  });
});

describe('documentRequestSchema', () => {
  it('accepts valid request', () => {
    const result = documentRequestSchema.safeParse({
      request_type: 'Attestation',
      urgency: 'normal',
    });
    expect(result.success).toBe(true);
  });

  it('defaults urgency to normal', () => {
    const result = documentRequestSchema.safeParse({
      request_type: 'Attestation',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.urgency).toBe('normal');
    }
  });

  it('rejects invalid urgency', () => {
    const result = documentRequestSchema.safeParse({
      request_type: 'Attestation',
      urgency: 'super_urgent',
    });
    expect(result.success).toBe(false);
  });
});

describe('interventionRequestSchema', () => {
  it('accepts valid intervention request', () => {
    const result = interventionRequestSchema.safeParse({
      tenant_name: 'Jean Locataire',
      address: '12 rue de la Paix',
      description: 'Fuite robinet cuisine',
      request_type: 'plomberie',
      urgency: 'urgente',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = interventionRequestSchema.safeParse({
      tenant_name: 'Jean',
    });
    expect(result.success).toBe(false);
  });

  it('validates tenant_email format', () => {
    const result = interventionRequestSchema.safeParse({
      tenant_name: 'Jean',
      address: '12 rue',
      description: 'Fuite',
      request_type: 'plomberie',
      tenant_email: 'bad-email',
    });
    expect(result.success).toBe(false);
  });
});
