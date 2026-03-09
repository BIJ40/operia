/**
 * Planning V2 — Normalisation des données Apogée
 * Point d'entrée unique : transforme les 5 jeux bruts en modèle interne
 * Réutilise unwrapArray, isActiveUser de shared/planning/normalize
 */

import { unwrapArray, isActiveUser } from "@/shared/planning/normalize";
import { DEFAULT_TECH_COLOR, DURATION_FALLBACK, BLOCK_LABELS } from "../constants";
import type {
  PlanningTechnician,
  PlanningAppointment,
  PlanningBlock,
  PlanningUnscheduled,
  NormalizedPlanningData,
  BlockType,
  AppointmentPriority,
} from "../types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function norm(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

function extractColor(u: Record<string, unknown>): string {
  const data = u.data as Record<string, unknown> | undefined;
  const bgcolor = data?.bgcolor as Record<string, string> | undefined;
  return (
    bgcolor?.hex ||
    (u.bgcolor as Record<string, string> | undefined)?.hex ||
    (data?.color as Record<string, string> | undefined)?.hex ||
    (u.color as Record<string, string> | undefined)?.hex ||
    DEFAULT_TECH_COLOR
  );
}

function buildInitials(firstname: string, name: string): string {
  const f = firstname.charAt(0).toUpperCase();
  const n = name.charAt(0).toUpperCase();
  return `${f}${n}` || "??";
}

function isTechnicienUser(u: Record<string, unknown>): boolean {
  const type = norm(u.type);
  const data = u.data as Record<string, unknown> | undefined;
  const universes = data?.universes;
  const hasUniverses = Array.isArray(universes) && universes.length > 0;
  return (
    u.isTechnicien === true ||
    type === "technicien" ||
    (type === "utilisateur" && hasUniverses)
  );
}

function safeDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

function resolveInterventionType(raw: string | undefined): string {
  if (!raw) return "default";
  const n = norm(raw);
  if (n.includes("depan") || n.includes("dépan")) return "depannage";
  if (n.includes("travaux") || n === "tvx") return "travaux";
  if (n.includes("sav")) return "sav";
  if (n.includes("diagnostic") || n.includes("diag")) return "diagnostic";
  if (n === "rt" || n.includes("rdvtech") || n.includes("releve")) return "rt";
  if (n === "th") return "th";
  return raw;
}

function resolveBlockType(refType: string): BlockType {
  const n = norm(refType);
  if (n === "conge") return "conge";
  if (n === "absence") return "absence";
  if (n === "repos") return "repos";
  if (n === "rappel") return "rappel";
  if (n === "tache") return "tache";
  if (n === "formation") return "formation";
  if (n === "atelier") return "atelier";
  return "tache";
}

// ─── Raw types pour le mapping ──────────────────────────────────────────────

interface RawIntervention {
  id: number;
  projectId?: number;
  type?: string;
  type2?: string;
  state?: string;
  label?: string;
  data?: {
    visites?: Array<{
      pEventId?: number;
      date?: string;
      usersIds?: number[];
      type?: string;
      type2?: string;
      state?: string;
    }>;
    dureeEstimee?: number;
    priorite?: string;
    competences?: string[];
    motifAttente?: string;
  };
}

interface RawProject {
  id: number;
  ref?: string;
  clientId?: number;
  state?: string;
  label?: string;
  data?: {
    commanditaireId?: number;
    universes?: string[];
    pictosInterv?: string[];
    description?: string;
  };
}

interface RawClient {
  id: number;
  nom?: string;
  prenom?: string;
  ville?: string;
  city?: string;
  address?: string;
  adresse?: string;
  cp?: string;
  codePostal?: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
}

interface RawPlanningCreneau {
  id: number;
  refType?: string;
  date?: string;
  duree?: number;
  usersIds?: number[];
  label?: string;
  title?: string;
  objet?: string;
}

// ─── Normalisation principale ───────────────────────────────────────────────

export function normalizeApogeeData(
  rawCreneaux: unknown,
  rawInterventions: unknown,
  rawProjects: unknown,
  rawClients: unknown,
  rawUsers: unknown
): NormalizedPlanningData {
  const creneaux = unwrapArray(rawCreneaux) as RawPlanningCreneau[];
  const interventions = unwrapArray(rawInterventions) as RawIntervention[];
  const projects = unwrapArray(rawProjects) as RawProject[];
  const clients = unwrapArray(rawClients) as RawClient[];
  const users = unwrapArray(rawUsers);

  // ── Maps de jointure ──
  const projectMap = new Map<number, RawProject>();
  projects.forEach((p) => projectMap.set(p.id, p));

  const clientMap = new Map<number, RawClient>();
  clients.forEach((c) => clientMap.set(c.id, c));

  // pEventId → intervention + visite
  const pEventToInterv = new Map<number, RawIntervention>();
  const pEventToVisite = new Map<number, { type?: string; type2?: string }>();
  for (const interv of interventions) {
    for (const v of interv.data?.visites ?? []) {
      if (v.pEventId) {
        pEventToInterv.set(v.pEventId, interv);
        pEventToVisite.set(v.pEventId, { type: v.type, type2: v.type2 });
      }
    }
  }

  // ── Techniciens ──
  const technicians = normalizeTechnicians(users);

  // ── Appointments + Blocks ──
  const appointments: PlanningAppointment[] = [];
  const blocks: PlanningBlock[] = [];

  for (const c of creneaux) {
    if (!c.date || !c.duree || !c.usersIds?.length) continue;
    const start = safeDate(c.date);
    if (!start) continue;
    const end = new Date(start.getTime() + c.duree * 60_000);

    if (c.refType === "visite-interv") {
      const interv = pEventToInterv.get(c.id);
      const visite = pEventToVisite.get(c.id);
      const project = interv?.projectId ? projectMap.get(interv.projectId) : undefined;
      const client = project?.clientId ? clientMap.get(project.clientId) : undefined;

      const rawType = visite?.type2 || visite?.type || interv?.type2 || interv?.type;
      const type = resolveInterventionType(rawType);
      const duration = c.duree || DURATION_FALLBACK[type] || DURATION_FALLBACK.default;

      let clientName = "Inconnu";
      if (client) {
        const p = (client.prenom || "").trim();
        const n = (client.nom || "").trim();
        clientName = `${p} ${n}`.trim() || "Inconnu";
      }

      // Resolve apporteur name from commanditaireId
      let apporteurName: string | null = null;
      const commanditaireId = project?.data?.commanditaireId;
      if (commanditaireId) {
        const apporteurClient = clientMap.get(commanditaireId);
        if (apporteurClient) {
          apporteurName = [apporteurClient.prenom, apporteurClient.nom].filter(Boolean).join(" ").trim() || null;
        }
      }

      appointments.push({
        id: `appt-${c.id}`,
        apogeeId: c.id,
        dossierId: interv?.projectId ?? null,
        clientId: project?.clientId ?? null,
        client: clientName,
        address: client?.address || client?.adresse || null,
        postalCode: client?.cp || client?.codePostal || null,
        city: client?.ville || client?.city || null,
        latitude: client?.latitude ?? client?.lat ?? null,
        longitude: client?.longitude ?? client?.lng ?? null,
        start,
        end,
        durationMinutes: duration,
        universe: project?.data?.universes?.[0] ?? null,
        type,
        priority: "normal" as AppointmentPriority,
        technicianIds: c.usersIds.map(Number),
        status: "planned",
        confirmed: true,
        isBinome: c.usersIds.length > 1,
        apporteur: apporteurName,
        requiredSkills: [],
        notes: null,
        projectRef: project?.ref ?? null,
        updatedAt: null,
        pictosInterv: (project?.data?.pictosInterv ?? []).map((p: any) => String(p)),
        description: project?.data?.description || project?.label || null,
        projectState: project?.state ?? null,
        interventionLabel: interv?.label ?? null,
      });
    } else {
      // Block (congé, tâche, absence, rappel…)
      const blockType = resolveBlockType(c.refType || "tache");
      for (const uid of c.usersIds) {
        blocks.push({
          id: `block-${c.id}-${uid}`,
          techId: uid,
          type: blockType,
          start,
          end,
          label: c.label || c.title || c.objet || BLOCK_LABELS[blockType] || c.refType || "Bloc",
          color: null,
          source: "apogee",
        });
      }
    }
  }

  // ── Unscheduled: interventions sans créneau planifié ──
  const scheduledIntervIds = new Set<number>();
  for (const c of creneaux) {
    if (c.refType === "visite-interv") {
      const interv = pEventToInterv.get(c.id);
      if (interv) scheduledIntervIds.add(interv.id);
    }
  }

  const unscheduled: PlanningUnscheduled[] = [];
  // Only show interventions that actually need planning (new or to_planify_tvx)
  const PLANIFIABLE_STATES = new Set(["new", "to_planify_tvx"]);

  for (const interv of interventions) {
    if (scheduledIntervIds.has(interv.id)) continue;
    const stateN = norm(interv.state);
    if (!PLANIFIABLE_STATES.has(stateN)) continue;

    const project = interv.projectId ? projectMap.get(interv.projectId) : undefined;
    const client = project?.clientId ? clientMap.get(project.clientId) : undefined;

    let clientName = "Inconnu";
    if (client) {
      const p = (client.prenom || "").trim();
      const n = (client.nom || "").trim();
      clientName = `${p} ${n}`.trim() || "Inconnu";
    }

    // Determine reason
    let reason: PlanningUnscheduled["reason"] = "a_planifier";
    const motif = norm(interv.data?.motifAttente);
    const prioriteN = norm(interv.data?.priorite);
    if (prioriteN === "urgent" || prioriteN === "urgente") reason = "urgent";
    else if (motif.includes("client")) reason = "en_attente_client";
    else if (motif.includes("piece") || motif.includes("pièce")) reason = "en_attente_piece";
    else if (motif.includes("devis")) reason = "en_attente_devis";

    // Priority mapping
    let priority: AppointmentPriority = "normal";
    if (prioriteN === "urgent" || prioriteN === "urgente") priority = "urgent";
    else if (prioriteN === "haute" || prioriteN === "high") priority = "high";
    else if (prioriteN === "basse" || prioriteN === "low") priority = "low";

    const rawType = interv.type2 || interv.type;
    const type = resolveInterventionType(rawType);

    unscheduled.push({
      id: `unsched-${interv.id}`,
      apogeeId: interv.id,
      dossierId: interv.projectId ?? 0,
      client: clientName,
      city: client?.ville || client?.city || null,
      universe: project?.data?.universes?.[0] ?? null,
      priority,
      estimatedDuration: interv.data?.dureeEstimee || DURATION_FALLBACK[type] || DURATION_FALLBACK.default,
      requiredSkills: interv.data?.competences ?? [],
      reason,
      dueDate: null,
      status: interv.state || "unknown",
      apporteur: null,
    });
  }

  return { technicians, appointments, blocks, unscheduled };
}

// ─── Normalisation techniciens ──────────────────────────────────────────────

function normalizeTechnicians(rawUsers: unknown[]): PlanningTechnician[] {
  return rawUsers
    .filter((u) => {
      const obj = u as Record<string, unknown>;
      return isTechnicienUser(obj) && isActiveUser(obj);
    })
    .map((u, index) => {
      const obj = u as Record<string, unknown>;
      const firstname = String(obj.firstname ?? "").trim();
      const name = String(obj.name ?? "").trim();
      const data = obj.data as Record<string, unknown> | undefined;
      const universes = (data?.universes as string[]) ?? [];

      return {
        id: Number(obj.id),
        apogeeId: Number(obj.id),
        name: `${firstname} ${name}`.trim() || `Tech #${obj.id}`,
        initials: buildInitials(firstname, name),
        color: extractColor(obj),
        skills: [],
        univers: universes,
        workStart: "07:00",
        workEnd: "18:00",
        lunchStart: "12:00",
        lunchEnd: "13:00",
        active: true,
        homeSector: null,
        latitude: null,
        longitude: null,
        maxDailyMinutes: 420,
        maxRouteMinutes: 120,
        order: index,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}
