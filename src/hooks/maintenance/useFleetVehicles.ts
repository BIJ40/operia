/**
 * Hook pour la gestion des véhicules du parc
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { safeQuery, safeMutation } from '@/lib/safeQuery';
import { logError } from '@/lib/logger';
import type { FleetVehicle, FleetVehiclesFilters, FleetVehicleFormData } from '@/types/maintenance';
import { addDays, isBefore, isAfter, parseISO } from 'date-fns';

const QUERY_KEY = 'fleet-vehicles';

export function useFleetVehicles(agencyIdParam?: string, filters?: FleetVehiclesFilters) {
  const { agencyId } = useAuth();
  const effectiveAgencyId = agencyIdParam || agencyId;

  return useQuery({
    queryKey: [QUERY_KEY, effectiveAgencyId, filters],
    queryFn: async (): Promise<FleetVehicle[]> => {
      let query = supabase
        .from('fleet_vehicles')
        .select(`
          *,
          collaborator:collaborators!assigned_collaborator_id(id, first_name, last_name)
        `)
        .order('name', { ascending: true });

      // Filtre agence si spécifié (sinon RLS filtre automatiquement)
      if (effectiveAgencyId) {
        query = query.eq('agency_id', effectiveAgencyId);
      }

      // Filtres optionnels
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.collaboratorId) {
        query = query.eq('assigned_collaborator_id', filters.collaboratorId);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,registration.ilike.%${filters.search}%`);
      }

      const result = await safeQuery<FleetVehicle[]>(query, 'FLEET_VEHICLES_FETCH');
      if (!result.success) {
        logError('[useFleetVehicles] Erreur fetch', result.error);
        return [];
      }

      let vehicles = result.data || [];

      // Filtres post-query (dates)
      const today = new Date();
      const in30Days = addDays(today, 30);

      if (filters?.ctOverdue) {
        vehicles = vehicles.filter(v => v.ct_due_at && isBefore(parseISO(v.ct_due_at), today));
      }
      if (filters?.ctDueSoon) {
        vehicles = vehicles.filter(v => 
          v.ct_due_at && 
          isAfter(parseISO(v.ct_due_at), today) && 
          isBefore(parseISO(v.ct_due_at), in30Days)
        );
      }

      return vehicles;
    },
    enabled: !!effectiveAgencyId,
  });
}

export function useFleetVehicle(vehicleId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', vehicleId],
    queryFn: async (): Promise<FleetVehicle | null> => {
      if (!vehicleId) return null;

      const result = await safeQuery<FleetVehicle[]>(
        supabase
          .from('fleet_vehicles')
          .select(`
            *,
            collaborator:collaborators!assigned_collaborator_id(id, first_name, last_name)
          `)
          .eq('id', vehicleId)
          .limit(1),
        'FLEET_VEHICLE_DETAIL'
      );

      if (!result.success || !result.data?.length) {
        return null;
      }
      return result.data[0];
    },
    enabled: !!vehicleId,
  });
}

export function useCreateFleetVehicle() {
  const queryClient = useQueryClient();
  const { agencyId } = useAuth();

  return useMutation({
    mutationFn: async (data: FleetVehicleFormData) => {
      if (!agencyId) throw new Error('Agence non définie');

      const result = await safeMutation<FleetVehicle[]>(
        supabase
          .from('fleet_vehicles')
          .insert({
            agency_id: agencyId,
            ...data,
            qr_token: crypto.randomUUID(), // Génère un token QR unique
          })
          .select(),
        'FLEET_VEHICLE_CREATE'
      );

      if (!result.success) {
        throw new Error(result.error?.message || 'Erreur création véhicule');
      }

      const createdVehicle = result.data?.[0];

      // Sync rh_assets if vehicle is assigned to a collaborator
      if (createdVehicle && data.assigned_collaborator_id) {
        const vehicleInfo = {
          vehicle_id: createdVehicle.id,
          name: createdVehicle.name,
          registration: createdVehicle.registration,
          brand: createdVehicle.brand,
          model: createdVehicle.model,
        };
        await supabase
          .from('rh_assets')
          .upsert({
            collaborator_id: data.assigned_collaborator_id,
            vehicule_attribue: JSON.stringify(vehicleInfo),
          }, { onConflict: 'collaborator_id' });
      }

      return createdVehicle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['rh-suivi'] });
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
    },
  });
}

export function useUpdateFleetVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ vehicleId, data }: { vehicleId: string; data: Partial<FleetVehicleFormData> }) => {
      // Get previous vehicle data to check if collaborator changed
      const { data: prevVehicle } = await supabase
        .from('fleet_vehicles')
        .select('assigned_collaborator_id, name, registration, brand, model')
        .eq('id', vehicleId)
        .single();

      const result = await safeMutation<FleetVehicle[]>(
        supabase
          .from('fleet_vehicles')
          .update(data)
          .eq('id', vehicleId)
          .select(),
        'FLEET_VEHICLE_UPDATE'
      );

      if (!result.success) {
        throw new Error(result.error?.message || 'Erreur mise à jour véhicule');
      }

      const updatedVehicle = result.data?.[0];

      // Sync rh_assets if assigned_collaborator_id changed
      if (data.assigned_collaborator_id !== undefined) {
        const prevCollabId = prevVehicle?.assigned_collaborator_id;
        const newCollabId = data.assigned_collaborator_id;

        // Clear previous assignment in rh_assets if different
        if (prevCollabId && prevCollabId !== newCollabId) {
          await supabase
            .from('rh_assets')
            .upsert({
              collaborator_id: prevCollabId,
              vehicule_attribue: null,
            }, { onConflict: 'collaborator_id' });
        }

        // Set new assignment in rh_assets
        if (newCollabId) {
          const vehicleInfo = {
            vehicle_id: vehicleId,
            name: data.name || updatedVehicle?.name || prevVehicle?.name,
            registration: data.registration ?? updatedVehicle?.registration ?? prevVehicle?.registration,
            brand: data.brand ?? updatedVehicle?.brand ?? prevVehicle?.brand,
            model: data.model ?? updatedVehicle?.model ?? prevVehicle?.model,
          };
          await supabase
            .from('rh_assets')
            .upsert({
              collaborator_id: newCollabId,
              vehicule_attribue: JSON.stringify(vehicleInfo),
            }, { onConflict: 'collaborator_id' });
        }
      }

      return updatedVehicle;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', variables.vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['rh-suivi'] });
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
    },
  });
}

export function useUpdateVehicleMileage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ vehicleId, mileage }: { vehicleId: string; mileage: number }) => {
      const result = await safeMutation<FleetVehicle[]>(
        supabase
          .from('fleet_vehicles')
          .update({ mileage_km: mileage })
          .eq('id', vehicleId)
          .select(),
        'FLEET_VEHICLE_MILEAGE_UPDATE'
      );

      if (!result.success) {
        throw new Error(result.error?.message || 'Erreur mise à jour kilométrage');
      }
      return result.data?.[0];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', variables.vehicleId] });
    },
  });
}

export function useDeleteFleetVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vehicleId: string) => {
      const result = await safeMutation(
        supabase
          .from('fleet_vehicles')
          .delete()
          .eq('id', vehicleId),
        'FLEET_VEHICLE_DELETE'
      );

      if (!result.success) {
        throw new Error(result.error?.message || 'Erreur suppression véhicule');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
