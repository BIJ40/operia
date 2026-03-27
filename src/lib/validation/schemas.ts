/**
 * Zod validation schemas for critical forms and API inputs.
 * Centralizes input validation to prevent injection and data corruption.
 */

import { z } from 'zod';

// ============================================================================
// User Management
// ============================================================================

export const userProfileUpdateSchema = z.object({
  first_name: z.string().trim().min(1, 'Le prénom est requis').max(100),
  last_name: z.string().trim().min(1, 'Le nom est requis').max(100),
  agence: z.string().nullable().optional(),
  role_agence: z.string().max(100).nullable().optional(),
  global_role: z.enum([
    'base_user', 'franchisee_user', 'franchisee_admin',
    'franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin',
  ]).optional(),
  apogee_user_id: z.number().int().positive().nullable().optional(),
});

export type UserProfileUpdateInput = z.infer<typeof userProfileUpdateSchema>;

// ============================================================================
// Collaborator
// ============================================================================

export const collaboratorFormSchema = z.object({
  first_name: z.string().trim().min(1, 'Le prénom est requis').max(100),
  last_name: z.string().trim().min(1, 'Le nom est requis').max(100),
  email: z.string().email('Email invalide').max(255).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  type: z.enum(['TECHNICIEN', 'ADMINISTRATIF', 'DIRIGEANT', 'COMMERCIAL', 'AUTRE']),
  role: z.string().max(100).optional(),
  notes: z.string().max(2000).nullable().optional(),
  hiring_date: z.string().nullable().optional(),
  leaving_date: z.string().nullable().optional(),
  street: z.string().max(255).nullable().optional(),
  postal_code: z.string().max(10).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
});

export type CollaboratorFormInput = z.infer<typeof collaboratorFormSchema>;

// ============================================================================
// Ticket
// ============================================================================

export const ticketCreateSchema = z.object({
  element_concerne: z.string().trim().min(1, 'Le titre est requis').max(500),
  description: z.string().max(10000).nullable().optional(),
  module: z.string().max(50).nullable().optional(),
  heat_priority: z.number().int().min(0).max(12).optional(),
  owner_side: z.string().max(50).nullable().optional(),
  severity: z.string().max(50).nullable().optional(),
  ticket_type: z.string().max(50).nullable().optional(),
});

export type TicketCreateInput = z.infer<typeof ticketCreateSchema>;

// ============================================================================
// Document Request
// ============================================================================

export const documentRequestSchema = z.object({
  request_type: z.string().trim().min(1, 'Le type est requis').max(100),
  description: z.string().max(2000).nullable().optional(),
  urgency: z.enum(['normal', 'urgent']).default('normal'),
});

export type DocumentRequestInput = z.infer<typeof documentRequestSchema>;

// ============================================================================
// Apporteur Intervention Request
// ============================================================================

export const interventionRequestSchema = z.object({
  tenant_name: z.string().trim().min(1, 'Le nom du locataire est requis').max(200),
  tenant_email: z.string().email('Email invalide').max(255).nullable().optional(),
  tenant_phone: z.string().max(20).nullable().optional(),
  address: z.string().trim().min(1, 'L\'adresse est requise').max(500),
  city: z.string().max(100).nullable().optional(),
  postal_code: z.string().max(10).nullable().optional(),
  description: z.string().trim().min(1, 'La description est requise').max(5000),
  request_type: z.string().min(1).max(50),
  urgency: z.enum(['normale', 'urgente', 'tres_urgente']).default('normale'),
  availability: z.string().max(500).nullable().optional(),
  comments: z.string().max(2000).nullable().optional(),
  owner_name: z.string().max(200).nullable().optional(),
});

export type InterventionRequestInput = z.infer<typeof interventionRequestSchema>;
