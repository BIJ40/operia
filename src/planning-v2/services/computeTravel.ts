/**
 * Planning V2 — Estimation de trajet (Haversine)
 */

import type { PlanningAppointment } from "../types";

const EARTH_RADIUS_KM = 6371;
const AVG_SPEED_KMH = 40; // vitesse moyenne urbaine/périurbaine

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Distance Haversine en km
 */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Estimation temps de trajet en minutes entre deux points
 * Retourne null si coordonnées absentes
 */
export function estimateTravelMinutes(
  lat1: number | null, lng1: number | null,
  lat2: number | null, lng2: number | null
): number | null {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  const km = haversineKm(lat1, lng1, lat2, lng2);
  return Math.round((km / AVG_SPEED_KMH) * 60);
}

/**
 * Calcul du temps de trajet total pour une séquence de RDV d'un technicien
 * Retourne la somme des trajets inter-RDV en minutes
 */
export function computeTechDayTravel(
  appointments: PlanningAppointment[]
): number {
  if (appointments.length < 2) return 0;

  const sorted = [...appointments].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );

  let totalMinutes = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const travel = estimateTravelMinutes(
      sorted[i].latitude, sorted[i].longitude,
      sorted[i + 1].latitude, sorted[i + 1].longitude
    );
    if (travel != null) {
      totalMinutes += travel;
    }
  }

  return totalMinutes;
}
