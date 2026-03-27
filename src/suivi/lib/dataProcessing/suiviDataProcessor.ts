/**
 * Processeur de données pour le suivi client
 * Croise toutes les données API pour reconstituer la chronologie complète
 */

import { getUniverseLabel, getUniverseLabels } from '@/lib/constants/universes';

export interface SuiviEvent {
  id: string;
  type: 'creation' | 'contact' | 'appointment' | 'rt' | 'quote' | 'supplies' | 'work' | 'invoice' | 'other';
  date: Date;
  label: string;
  description?: string;
  userFirstName?: string;
  technicianNames?: string[];
  details?: Record<string, any>;
  plannedBy?: string;
  dateOnly?: boolean;
}

export interface SuiviSummary {
  refDossier: string;
  projectId: string;
  dateCreation: Date;
  libelle: string;
  refApporteur?: string;
  financier?: {
    franchise?: number;
    acompte?: number;
    aPercevoir?: number;
    isSommesPercues?: string;
    // New hash-based system: amount already paid on franchise
    sumFranchisePaid?: number;
  };
  clientInfo: {
    civilite?: string;
    prenom?: string;
    nom?: string;
    raisonSociale?: string;
    adresse: string;
    codePostal: string;
    ville: string;
    telephone?: string;
    tel2?: string;
    tel3?: string;
    email?: string;
  };
  mode: 'direct' | 'apporteur';
  apporteurInfo?: {
    nom: string;
  };
  universes?: string[];
}

export interface NextAppointmentInfo {
  date: Date;
  timeSlot?: string;
  type: string;
  technicianNames: string[];
  address: string;
  city: string;
}

const parseFrenchDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  try {
    const [datePart, timePart] = dateStr.split(' ');
    if (!datePart) return null;
    const [day, month, year] = datePart.split('/').map(Number);
    if (!timePart) return new Date(year, month - 1, day);
    const [hours, minutes] = timePart.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes);
  } catch (e) {
    return null;
  }
};

/**
 * Nettoie un numéro de téléphone en supprimant tous les caractères non numériques
 * sauf le + en début (pour les formats internationaux)
 */
function cleanPhoneNumber(phone: string | undefined | null): string | undefined {
  if (!phone) return undefined;
  const str = phone.toString().trim();
  if (!str) return undefined;
  // Keep only digits and leading +
  const cleaned = str.replace(/[^0-9+]/g, '').replace(/(?!^)\+/g, '');
  return cleaned || undefined;
}

export class SuiviDataProcessor {
  private project: any;
  private interventions: any[];
  private creneaux: any[];
  private devis: any[];
  private factures: any[];
  private client: any;
  private users: any[];
  private clients: any[];
  private knownFirstNames: Set<string>;
  private knownLastNames: Set<string>;
  private historyFirstNameByUserId: Map<string, string>;

  constructor(
    project: any,
    interventions: any[],
    creneaux: any[],
    devis: any[],
    factures: any[],
    client: any,
    users: any[],
    clients: any[]
  ) {
    this.project = project;
    this.interventions = interventions || [];
    this.creneaux = creneaux || [];
    this.devis = devis || [];
    this.factures = factures || [];
    this.client = client;
    this.users = users || [];
    this.clients = clients || [];

    // Precompute known first/last names to disambiguate mixed formats ("PRENOM NOM" vs "NOM PRENOM")
    this.knownFirstNames = new Set();
    this.knownLastNames = new Set();

    for (const u of this.users) {
      const first = (u?.prenom || u?.firstname || u?.firstName || "").toString().trim();
      const last = (u?.nom || u?.lastname || u?.name || "").toString().trim();
      if (first) this.knownFirstNames.add(this.normalizeNameForCompare(first));
      if (last) this.knownLastNames.add(this.normalizeNameForCompare(last));
    }

    // Infer first names for users that are NOT present in this.users (common in sanitized payloads)
    // using only history entries. This avoids ever guessing a last name.
    this.historyFirstNameByUserId = new Map();
    this.buildHistoryFirstNameIndex();
  }

  private buildHistoryFirstNameIndex() {
    const history = this.project?.data?.history;
    if (!Array.isArray(history)) return;

    type Bucket = { first: Map<string, number>; last: Map<string, number>; originalByNorm: Map<string, string> };
    const byUser = new Map<string, Bucket>();

    const bump = (m: Map<string, number>, key: string) => {
      m.set(key, (m.get(key) ?? 0) + 1);
    };

    // 1) Highest confidence: use the "Création" entry per userId.
    // Apogée format here is consistently "NOM PRENOM" (observed), so the last token is the first name.
    for (const h of history) {
      const uidRaw = h?.userId;
      const userStr = (h?.userStr || "").toString().trim();
      if (uidRaw === null || uidRaw === undefined) continue;
      if (!userStr) continue;

      const labelKind = (h?.labelKind || "").toString().toLowerCase();
      const isCreation = labelKind.includes("création") || labelKind.includes("creation") || h?.kind === 8;
      if (!isCreation) continue;

      const parts = userStr.split(/\s+/).filter(Boolean);
      if (parts.length < 2) continue;

      const uid = String(uidRaw);
      // Never store a single-word value; never store generic placeholders.
      const candidate = parts[parts.length - 1];
      const candidateNorm = this.normalizeNameForCompare(candidate);
      if (!candidateNorm || candidateNorm === "UTILISATEUR") continue;

      // If multiple creation entries exist, keep the first (stable).
      if (!this.historyFirstNameByUserId.has(uid)) {
        this.historyFirstNameByUserId.set(uid, candidate);
      }
    }

    // 2) Secondary: accumulate stats for other users not resolved by "Création".
    for (const h of history) {
      const uidRaw = h?.userId;
      const userStr = (h?.userStr || "").toString().trim();
      if (uidRaw === null || uidRaw === undefined) continue;
      if (!userStr) continue;

      const parts = userStr.split(/\s+/).filter(Boolean);
      if (parts.length < 2) continue;

      const uid = String(uidRaw);
      if (this.historyFirstNameByUserId.has(uid)) continue;
      const bucket = byUser.get(uid) ?? {
        first: new Map<string, number>(),
        last: new Map<string, number>(),
        originalByNorm: new Map<string, string>(),
      };

      const firstRaw = parts[0];
      const lastRaw = parts[parts.length - 1];
      const firstNorm = this.normalizeNameForCompare(firstRaw);
      const lastNorm = this.normalizeNameForCompare(lastRaw);

      if (!bucket.originalByNorm.has(firstNorm)) bucket.originalByNorm.set(firstNorm, firstRaw);
      if (!bucket.originalByNorm.has(lastNorm)) bucket.originalByNorm.set(lastNorm, lastRaw);

      bump(bucket.first, firstNorm);
      bump(bucket.last, lastNorm);

      byUser.set(uid, bucket);
    }

    const top = (m: Map<string, number>) => {
      let bestKey: string | null = null;
      let bestCount = 0;
      for (const [k, c] of m.entries()) {
        if (c > bestCount) {
          bestKey = k;
          bestCount = c;
        }
      }
      return bestKey ? { key: bestKey, count: bestCount } : null;
    };

    // Decision rule:
    // - Compare the dominant token in position 0 vs last position across the history for the same userId.
    // - Only accept when the dominance is strong (diff >= 2) to avoid ever displaying a last name by mistake.
    for (const [uid, bucket] of byUser.entries()) {
      if (this.historyFirstNameByUserId.has(uid)) continue;
      const tFirst = top(bucket.first);
      const tLast = top(bucket.last);
      if (!tFirst || !tLast) continue;
      if (tFirst.key === tLast.key) continue;

      const diff = Math.abs(tFirst.count - tLast.count);
      if (diff < 2) continue;

      const chosenNorm = tFirst.count > tLast.count ? tFirst.key : tLast.key;
      if (chosenNorm === "UTILISATEUR") continue;

      const chosen = bucket.originalByNorm.get(chosenNorm) ?? chosenNorm;
      this.historyFirstNameByUserId.set(uid, chosen);
    }
  }

  private normalizeNameForCompare(str: string): string {
    return (str || "")
      .toString()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
  }

  private hasAccent(str: string): boolean {
    return /[àâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆ]/i.test(str);
  }

  /**
   * Extrait un prénom d'un libellé nom/prénom provenant d'Apogée.
   * - Gère les deux formats observés: "PRENOM NOM" et "NOM PRENOM"
   * - N'affiche JAMAIS un nom seul: si ambigu (1 mot / indéterminable) => ""
   */
  private extractFirstNameFromNameString(name: string): string {
    const raw = (name || "").toString().trim();
    if (!raw) return "";

    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length < 2) return ""; // never show a single word (likely last name)

    const first = parts[0];
    const rest = parts.slice(1).join(" ");

    const firstNorm = this.normalizeNameForCompare(first);
    const restNorm = this.normalizeNameForCompare(rest);

    const firstIsKnownFirst = this.knownFirstNames.has(firstNorm);
    const restIsKnownFirst = this.knownFirstNames.has(restNorm);
    const firstIsKnownLast = this.knownLastNames.has(firstNorm);
    const restIsKnownLast = this.knownLastNames.has(restNorm);

    // Strong disambiguation using known first/last names
    if (firstIsKnownFirst && restIsKnownLast) return first;
    if (restIsKnownFirst && firstIsKnownLast) return rest;

    // If only one side matches a known first name, use it
    if (firstIsKnownFirst && !restIsKnownFirst) return first;
    if (restIsKnownFirst && !firstIsKnownFirst) return rest;

    // Accent heuristic (secondary)
    if (this.hasAccent(first) && !this.hasAccent(rest)) return first;
    if (this.hasAccent(rest) && !this.hasAccent(first)) return rest;

    // Casing heuristic (secondary): last names are often ALL CAPS, first names often Title Case
    const firstAllCaps = first === first.toUpperCase();
    const restAllCaps = rest === rest.toUpperCase();
    if (!firstAllCaps && restAllCaps) return first;
    if (firstAllCaps && !restAllCaps) return rest;

    // Ambiguous => better to show nothing than a last name
    return "";
  }

   /**
    * Trouve le prénom d'un utilisateur par son ID, avec fallback sur userStr.
    * IMPORTANT: Ne renvoie jamais un nom seul.
    */
   private getUserFirstName(userId: string, userStr?: string): string {
     if (!userId && !userStr) return "";

      const uid = userId ? String(userId) : "";

      const user = this.users.find(u => u.id === userId);
     if (user) {
       const prenom = (user?.prenom || user?.firstname || user?.firstName || "").toString().trim();
       const nom = (user?.nom || user?.lastname || user?.name || "").toString().trim();

       // If both fields exist, try to pick the most "first-name-like" one
       if (prenom && nom) {
         const picked = this.extractFirstNameFromNameString(`${prenom} ${nom}`);
         if (picked) return picked;
         // If still ambiguous, default to prenom (should be correct in normal cases)
         return prenom;
       }

       // Only one field: never show a single word (likely last name)
       if (prenom) return prenom;
       return "";
     }

      // If user is not in users list, try to infer safely from history frequency (per userId)
      if (uid && this.historyFirstNameByUserId.has(uid)) {
        return this.historyFirstNameByUserId.get(uid) || "";
      }

     if (userStr) {
       return this.extractFirstNameFromNameString(userStr);
     }

     return "";
   }

  /**
   * Trouve les prénoms de plusieurs techniciens
   */
  private getTechnicianNames(userIds: string | string[]): string[] {
    if (!userIds) return [];
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    return ids.map(id => this.getUserFirstName(id)).filter(Boolean);
  }

  /**
   * Génère le résumé du dossier pour affichage en haut de page
   */
  getSummary(): SuiviSummary {
    // Récupérer l'ID de l'apporteur (priorité: project.apporteurId, sinon commanditaireId)
    let apporteurId = this.project.apporteurId || this.project.data?.apporteurId;
    
    // Fallback: chercher dans les interventions
    if (!apporteurId && this.interventions.length > 0) {
      for (const intervention of this.interventions) {
        if (intervention.data?.commanditaireId) {
          apporteurId = intervention.data.commanditaireId;
          break;
        }
      }
    }
    
    // Si on a un commanditaireId dans project.data, l'utiliser aussi
    if (!apporteurId && this.project.data?.commanditaireId) {
      apporteurId = this.project.data.commanditaireId;
    }
    
    const hasApporteur = Boolean(apporteurId);
    
    // Résoudre le nom de l'apporteur: priorité commanditaireLabel, puis data.commanditaire, puis lookup dans clients
    let apporteurName = "Apporteur";
    if (this.project.commanditaireLabel) {
      apporteurName = this.project.commanditaireLabel;
    } else if (this.project.data?.commanditaire) {
      apporteurName = this.project.data.commanditaire;
    } else if (apporteurId && this.clients) {
      const apporteur = this.clients.find((c: any) => c.id === apporteurId);
      if (apporteur) {
        apporteurName = apporteur.raisonSociale || apporteur.name || apporteur.nom || "Apporteur";
      }
    }
    
    return {
      refDossier: this.project.ref,
      projectId: this.project.id,
      dateCreation: this.project.date_creation ? new Date(this.project.date_creation) : new Date(),
      libelle: (() => {
        if (Array.isArray(this.project.data?.universes)) {
          return getUniverseLabels(this.project.data.universes).join(', ');
        } else if (this.project.data?.universes) {
          return getUniverseLabel(this.project.data.universes);
        }
        return this.project.label || this.project.libelle || "Intervention";
      })(),
      refApporteur: this.project.data?.vosrefs,
      clientInfo: {
        civilite: this.client?.civilite,
        prenom: this.client?.firstname || this.client?.prenom,
        nom: this.client?.name || this.client?.nom,
        raisonSociale: this.client?.raisonSociale,
        adresse: this.client?.adresse || this.project.data?.adresse || "",
        codePostal: this.client?.codePostal || this.project.data?.codePostal || "",
        ville: this.client?.ville || this.project.data?.ville || "",
        telephone: cleanPhoneNumber(this.client?.phone || this.client?.tel),
        tel2: cleanPhoneNumber(this.client?.tel2 || this.client?.data?.tel2),
        tel3: cleanPhoneNumber(this.client?.data?.tel3),
        email: this.client?.email,
      },
      financier: this.project.data?.financier ? {
        franchise: parseFloat(this.project.data.financier.franchise) || 0,
        acompte: parseFloat(this.project.data.financier.acompte) || 0,
        aPercevoir: parseFloat(this.project.data.financier.aPercevoir) || 0,
        isSommesPercues: this.project.data.financier.isSommesPercues,
        // New hash-based system: sumFranchisePaid is at project level, not in financier
        sumFranchisePaid: this.project.sumFranchisePaid !== undefined ? parseFloat(this.project.sumFranchisePaid) || 0 : undefined,
      } : undefined,
      mode: hasApporteur ? 'apporteur' : 'direct',
      apporteurInfo: hasApporteur ? {
        nom: apporteurName
      } : undefined,
      universes: Array.isArray(this.project.data?.universes) 
        ? this.project.data.universes 
        : this.project.data?.universes 
          ? [this.project.data.universes] 
          : undefined,
    };
  }

  /**
   * Récupère le prochain rendez-vous planifié
   * En cherchant dans data.visites[] de l'intervention
   */
  getNextAppointment(): NextAppointmentInfo | null {
    const now = new Date();
    
    // Filtrer les interventions futures et planifiées
    // Une intervention est considérée "future" si :
    // - sa date est dans le futur, OU
    // - elle a au moins une visite encore à venir (même si intervention.date est passée)
    const futureInterventions = this.interventions.filter(intervention => {
      if (!intervention.date) return false;
      const states = ['planned', 'planified', 'to_planify', 'in_progress'];
      if (!states.includes(intervention.state?.toLowerCase())) return false;
      
      const interventionDate = new Date(intervention.date);
      if (interventionDate >= now) return true;
      
      // Vérifier si une visite est encore à venir
      if (intervention.data?.visites && Array.isArray(intervention.data.visites)) {
        return intervention.data.visites.some((v: any) => v.date && new Date(v.date) >= now);
      }
      return false;
    });

    if (futureInterventions.length === 0) return null;

    // Trier par date croissante
    futureInterventions.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    const nextIntervention = futureInterventions[0];
    
    // Chercher la prochaine visite dans data.visites[]
    let technicianNames: string[] = [];
    let timeSlot = "";
    
    if (nextIntervention.data?.visites && Array.isArray(nextIntervention.data.visites)) {
      // Trouver la prochaine visite planifiée
      const nextVisit = nextIntervention.data.visites
        .filter((v: any) => {
          if (!v.date) return false;
          const visitDate = new Date(v.date);
          return visitDate >= now;
        })
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
      
      if (nextVisit) {
        // Récupérer les techniciens de cette visite
        if (nextVisit.usersIds && Array.isArray(nextVisit.usersIds)) {
          technicianNames = this.getTechnicianNames(nextVisit.usersIds);
        }
        
        // Créer le timeSlot à partir de la date de la visite
        if (nextVisit.date) {
          const visitDate = new Date(nextVisit.date);
          const hours = visitDate.getHours();
          const minutes = visitDate.getMinutes();
          const startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          
          if (nextVisit.duree) {
            const endDate = new Date(visitDate.getTime() + nextVisit.duree * 60000);
            const endHours = endDate.getHours();
            const endMinutes = endDate.getMinutes();
            const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
            timeSlot = `${startTime} - ${endTime}`;
          } else {
            timeSlot = startTime;
          }
        }
      }
    }
    
    // Fallback : si pas de visites, essayer les anciennes méthodes
    if (technicianNames.length === 0) {
      const userIds = nextIntervention.usersIds || nextIntervention.userId;
      technicianNames = this.getTechnicianNames(userIds);
    }
    
    if (!timeSlot) {
      const creneau = this.creneaux.find(c => c.interventionId === nextIntervention.id);
      if (creneau?.heureDebut && creneau?.heureFin) {
        timeSlot = `${creneau.heureDebut} - ${creneau.heureFin}`;
      } else if (nextIntervention.heureDebut && nextIntervention.heureFin) {
        timeSlot = `${nextIntervention.heureDebut} - ${nextIntervention.heureFin}`;
      } else if (nextIntervention.duree) {
        timeSlot = `Durée: ${nextIntervention.duree}`;
      }
    }

    return {
      date: new Date(nextIntervention.date),
      timeSlot,
      type: this.getInterventionTypeLabel(nextIntervention.type),
      technicianNames,
      address: this.client?.adresse || this.project.data?.adresse || "",
      city: this.client?.ville || this.project.data?.ville || "",
    };
  }

  /**
   * Récupère la durée du prochain rendez-vous en minutes
   */
  getNextAppointmentDuration(): number | undefined {
    const now = new Date();
    const futureInterventions = this.interventions.filter((intervention: any) => {
      if (!intervention.date) return false;
      const interventionDate = new Date(intervention.date);
      const states = ['planned', 'planified', 'to_planify', 'in_progress'];
      return interventionDate >= now && states.includes(intervention.state?.toLowerCase());
    });

    if (futureInterventions.length === 0) return undefined;

    // Trier par date croissante
    futureInterventions.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    const nextIntervention = futureInterventions[0];
    
    // Chercher la durée dans data.visites[] en priorité
    if (nextIntervention.data?.visites && Array.isArray(nextIntervention.data.visites)) {
      const nextVisit = nextIntervention.data.visites
        .filter((v: any) => {
          if (!v.date) return false;
          const visitDate = new Date(v.date);
          return visitDate >= now;
        })
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
      
      if (nextVisit?.duree) {
        return nextVisit.duree;
      }
    }
    
    // Fallback : essayer depuis l'intervention directement
    if (nextIntervention.duree) {
      return nextIntervention.duree;
    }
    
    // Ou depuis le créneau
    const creneau = this.creneaux.find(c => c.interventionId === nextIntervention.id);
    if (creneau?.duree) {
      return creneau.duree;
    }

    return undefined;
  }

  private getInterventionTypeLabel(type: string): string {
    const typeMap: Record<string, string> = {
      'rt': 'Relevé technique',
      'dep': 'Dépannage',
      'tvx': 'Travaux',
      'installation': 'Installation',
      'pose': 'Pose',
    };
    return typeMap[type?.toLowerCase()] || type || "Intervention";
  }

  /**
   * Construit la chronologie complète des événements
   */
  getEvents(): SuiviEvent[] {
    const events: SuiviEvent[] = [];

    // 1. Création du dossier
    this.addCreationEvent(events);

    // 2. Événements d'historique (appels, contacts)
    this.addHistoryEvents(events);

    // 3. Interventions (RT, dépannages, travaux)
    this.addInterventionEvents(events);

    // 4. Devis
    this.addQuoteEvents(events);

    // 5. Fournitures
    this.addSuppliesEvents(events);

    // 6. Factures
    this.addInvoiceEvents(events);

    // Trier par date
    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Règle métier : si un dossier est marqué "prêt à facturer" mais qu'un RDV
    // (appointment ou work) est planifié après, on ne garde pas cet événement
    const filteredEvents = events.filter(event => {
      if (event.type !== 'invoice' || !event.label.toLowerCase().includes('prêt à facturer')) {
        return true;
      }

      return !events.some(other => {
        if (!other.date || !event.date) return false;
        const isRdv = other.type === 'appointment' || other.type === 'work';
        return isRdv && other.date.getTime() > event.date.getTime();
      });
    });

    return filteredEvents;
  }

  private addCreationEvent(events: SuiviEvent[]) {
    if (!this.project.data?.history) return;
    
    const creationEntry = this.project.data.history.find(
      (h: any) => h.labelKind === "Création"
    );

    if (creationEntry) {
      const date = parseFrenchDate(creationEntry.dateModif);
      if (date) {
        const creator = this.getUserFirstName(creationEntry.userId, creationEntry.userStr);
        events.push({
          id: 'creation',
          type: 'creation',
          date,
          label: 'Dossier créé',
          userFirstName: creator || undefined,
          description: creator ? `Dossier créé par ${creator}` : undefined,
        });
      }
    }
  }

  private addHistoryEvents(events: SuiviEvent[]) {
    if (!this.project.data?.history) return;

    this.project.data.history.forEach((entry: any, index: number) => {
      const date = parseFrenchDate(entry.dateModif);
      if (!date) return;

      const labelKind = entry.labelKind?.toLowerCase() || "";
      const userName = this.getUserFirstName(entry.userId, entry.userStr);
      
      // Appels et contacts
      if (labelKind.includes("appel") || labelKind.includes("call")) {
        if (labelKind.includes("nrp") || labelKind.includes("sans réponse")) {
          events.push({
            id: `nrp_${index}`,
            type: 'contact',
            date,
            label: 'Tentative de contact (sans réponse)',
            userFirstName: userName,
            description: entry.message
          });
        } else if (labelKind.includes("rappel")) {
          events.push({
            id: `callback_${index}`,
            type: 'contact',
            date,
            label: 'Rappel effectué',
            userFirstName: userName,
            description: entry.message
          });
        } else if (labelKind.includes("planifier")) {
          events.push({
            id: `call_planning_${index}`,
            type: 'contact',
            date,
            label: 'Appel pour planifier un rendez-vous',
            userFirstName: userName,
            description: entry.message
          });
        } else if (labelKind.includes("premier contact")) {
          events.push({
            id: `first_contact_${index}`,
            type: 'contact',
            date,
            label: 'Premier contact client',
            userFirstName: userName,
          });
        } else {
          events.push({
            id: `contact_${index}`,
            type: 'contact',
            date,
            label: 'Contact téléphonique',
            userFirstName: userName,
            description: entry.message
          });
        }
      }

      // Devis - événements dans l'historique
      // Si on a des objets devis avec un state avancé (sent, validated, invoice),
      // on garde les événements historique antérieurs à l'envoi (ex: "rédaction")
      // mais on supprime ceux postérieurs (qui sont des artefacts Apogée).
      if (labelKind.includes("devis")) {
        const projectDevis = this.devis.filter(d => d.projectId === this.project.id);
        const advancedDevis = projectDevis.filter(d => d.state && !['draft', 'writing'].includes(d.state.toLowerCase()));
        
        if (advancedDevis.length > 0) {
          // On a des devis envoyés/validés/facturés — filtrer intelligemment
          // Trouver la date la plus ancienne de "dateReelle" parmi les devis avancés
          const earliestSentDate = advancedDevis.reduce((earliest, d) => {
            if (!d.dateReelle) return earliest;
            const dDate = new Date(d.dateReelle);
            return (!earliest || dDate < earliest) ? dDate : earliest;
          }, null as Date | null);

          if (labelKind.includes("à faire") || labelKind.includes("rédaction")) {
            // Garder "rédaction" seulement si AVANT la date d'envoi
            if (!earliestSentDate || date < earliestSentDate) {
              events.push({
                id: `quote_start_${index}`,
                type: 'quote',
                date,
                label: 'Devis en cours de rédaction',
                userFirstName: userName,
              });
            }
            // Sinon on l'ignore (artefact post-envoi)
          } else if (labelKind.includes("envoyé") || labelKind.includes("sent")) {
            // Laisser addQuoteEvents gérer via state, sauf si pas de date fallback
            if (!earliestSentDate) {
              events.push({
                id: `quote_sent_history_${index}`,
                type: 'quote',
                date,
                label: 'Devis envoyé au client',
                userFirstName: userName,
              });
            }
          } else if (labelKind.includes("validé") || labelKind.includes("accepté") || labelKind.includes("à commander")) {
            if (!earliestSentDate) {
              events.push({
                id: `quote_validated_history_${index}`,
                type: 'quote',
                date,
                label: 'Devis accepté par le client',
                userFirstName: userName,
              });
            }
          }
        } else {
          // Pas de devis avancés, fallback complet sur l'historique
          if (labelKind.includes("à faire") || labelKind.includes("rédaction")) {
            events.push({
              id: `quote_start_${index}`,
              type: 'quote',
              date,
              label: 'Devis en cours de rédaction',
              userFirstName: userName,
            });
          } else if (labelKind.includes("envoyé") || labelKind.includes("sent")) {
            events.push({
              id: `quote_sent_history_${index}`,
              type: 'quote',
              date,
              label: 'Devis envoyé au client',
              userFirstName: userName,
            });
          } else if (labelKind.includes("validé") || labelKind.includes("accepté") || labelKind.includes("à commander")) {
            events.push({
              id: `quote_validated_history_${index}`,
              type: 'quote',
              date,
              label: 'Devis accepté par le client',
              userFirstName: userName,
            });
          }
        }
      }

      // Rendez-vous planifiés
      if (labelKind.includes("planifié") && !labelKind.includes("devis")) {
        // Extraire le nom depuis le message si présent
        let plannedBy = userName;
        if (entry.message) {
          // Format: "PRENOM NOM Changement..." ou "PRENOM Changement..."
          const nameMatch = entry.message.match(/^([A-ZÀ-Ü]+(?:\s+[A-ZÀ-Ü]+)?)\s+Changement/i);
          if (nameMatch) {
            const fullName = nameMatch[1].trim();
            plannedBy = this.extractFirstNameFromNameString(fullName) || plannedBy;
          }
        }
        // Ne pas afficher si vide ou "Utilisateur"
        if (!plannedBy || plannedBy.toLowerCase() === 'utilisateur') {
          plannedBy = undefined;
        }
        
        if (labelKind.includes("rt")) {
          events.push({
            id: `rt_scheduled_${index}`,
            type: 'appointment',
            date,
            label: 'Intervention relevé technique planifiée',
            plannedBy,
          });
        } else if (labelKind.includes("tvx")) {
          events.push({
            id: `work_scheduled_${index}`,
            type: 'appointment',
            date,
            label: 'Intervention travaux planifiée',
            plannedBy,
          });
        } else {
          events.push({
            id: `appointment_scheduled_${index}`,
            type: 'appointment',
            date,
            label: 'Intervention planifiée',
            plannedBy,
          });
        }
      }

      // Fournitures
      if (labelKind.includes("wait fourn") || labelKind.includes("attente fourniture") || labelKind.includes("commande")) {
        events.push({
          id: `supplies_ordered_${index}`,
          type: 'supplies',
          date,
          label: 'Fournitures commandées',
          userFirstName: userName,
        });
      }

      if (labelKind.includes("fourniture") && (labelKind.includes("reçu") || labelKind.includes("received"))) {
        events.push({
          id: `supplies_received_${index}`,
          type: 'supplies',
          date,
          label: 'Fournitures réceptionnées',
          userFirstName: userName,
        });
      }

      // Changements d'état génériques
      if (labelKind.includes("stand by") || labelKind.includes("pause")) {
        events.push({
          id: `standby_${index}`,
          type: 'other',
          date,
          label: 'Dossier mis en pause',
          userFirstName: userName,
          description: entry.message
        });
      }

      if (labelKind.includes("annulé") || labelKind.includes("canceled")) {
        events.push({
          id: `cancelled_${index}`,
          type: 'other',
          date,
          label: 'Dossier annulé',
          userFirstName: userName,
          description: entry.message
        });
      }

      if (labelKind.includes("réactivé") || labelKind.includes("reprise")) {
        events.push({
          id: `reactivated_${index}`,
          type: 'other',
          date,
          label: 'Dossier réactivé',
          userFirstName: userName,
          description: entry.message
        });
      }

      // Facturation
      if (labelKind.includes("à facturer") || labelKind.includes("to be invoiced")) {
        events.push({
          id: `ready_invoice_${index}`,
          type: 'invoice',
          date,
          label: 'Dossier prêt à facturer',
          userFirstName: userName,
        });
      }

      if (labelKind.includes("facturé") || labelKind.includes("invoiced")) {
        events.push({
          id: `invoiced_${index}`,
          type: 'invoice',
          date,
          label: 'Facture émise',
          userFirstName: userName,
        });
      }

      // Paiement
      if (labelKind.includes("payé") || labelKind.includes("paid") || labelKind.includes("paiement")) {
        events.push({
          id: `payment_${index}`,
          type: 'invoice',
          date,
          label: 'Paiement reçu',
          userFirstName: userName,
        });
      }

      // Clôture
      if (labelKind.includes("clôturé") || labelKind.includes("done") || labelKind.includes("terminé")) {
        events.push({
          id: `closed_${index}`,
          type: 'other',
          date,
          label: 'Dossier clôturé',
          userFirstName: userName,
        });
      }
    });
  }

  private addInterventionEvents(events: SuiviEvent[]) {
    const projectInterventions = this.interventions.filter(
      i => i.projectId === this.project.id
    );

    projectInterventions.forEach((intervention: any) => {
      if (!intervention.date) return;
      
      const date = new Date(intervention.date);
      const type = intervention.type?.toLowerCase() || intervention.data?.type2?.toLowerCase() || "";
      const state = intervention.state?.toLowerCase() || "";
      
      // Récupérer les techniciens depuis les visites si disponibles
      let technicianNames: string[] = [];
      if (intervention.data?.visites && Array.isArray(intervention.data.visites)) {
        const allUserIds: number[] = [];
        intervention.data.visites.forEach((v: any) => {
          if (v.usersIds && Array.isArray(v.usersIds)) {
            v.usersIds.forEach((id: number) => {
              if (!allUserIds.includes(id)) allUserIds.push(id);
            });
          }
        });
        if (allUserIds.length > 0) {
          technicianNames = this.getTechnicianNames(allUserIds as any);
        }
      }
      if (technicianNames.length === 0) {
        technicianNames = this.getTechnicianNames(intervention.usersIds || intervention.userId);
      }

      // Intervention réalisée (RT, travaux, dépannage, ou générique)
      if (state === 'realized' || state === 'done') {
        let label = 'Intervention réalisée';
        if (type.includes('relev') || type === 'rt') {
          label = 'Relevé technique effectué';
        } else if (type.includes('travaux') || type === 'tvx' || type === 'installation' || type === 'pose') {
          label = 'Travaux réalisés';
        } else if (type.includes('pannage') || type === 'dep') {
          label = 'Dépannage effectué';
        }

        events.push({
          id: `work_${intervention.id}`,
          type: type.includes('relev') || type === 'rt' ? 'rt' : 'work',
          date,
          label,
          technicianNames,
          description: technicianNames.length > 0
            ? `Réalisé par ${technicianNames.join(', ')}`
            : undefined
        });
      }

      // PAS d'événement "planifiée" dans l'historique :
      // la date de planification est déjà couverte par les événements history d'Apogée
      // ("À planifier TVX => Planifié TVX", etc.)
    });
  }

  private addQuoteEvents(events: SuiviEvent[]) {
    const projectDevis = this.devis.filter(d => d.projectId === this.project.id);

    projectDevis.forEach((devis: any) => {
      let hasCreatedEvent = false;
      let hasSentEvent = false;
      let hasValidatedEvent = false;

      // Devis créé
      if (devis.date_creation || devis.dateCreation) {
        const date = new Date(devis.date_creation || devis.dateCreation);
        events.push({
          id: `quote_created_${devis.id}`,
          type: 'quote',
          date,
          label: 'Devis créé',
          userFirstName: this.getUserFirstName(devis.userId || devis.createdBy),
        });
        hasCreatedEvent = true;
      }

      // Devis envoyé
      if (devis.dateSent || devis.date_sent) {
        const date = new Date(devis.dateSent || devis.date_sent);
        const hasApporteur = Boolean(this.project.data?.commanditaireId);
        events.push({
          id: `quote_sent_${devis.id}`,
          type: 'quote',
          date,
          label: hasApporteur 
            ? `Devis transmis à ${this.project.data?.commanditaire || 'votre gestionnaire'}`
            : 'Devis envoyé',
          userFirstName: this.getUserFirstName(devis.sentBy || devis.userId),
        });
        hasSentEvent = true;
      }

      // Devis validé
      if (devis.dateValidation || devis.date_validation) {
        const date = new Date(devis.dateValidation || devis.date_validation);
        const hasApporteur = Boolean(this.project.data?.commanditaireId);
        events.push({
          id: `quote_validated_${devis.id}`,
          type: 'quote',
          date,
          label: hasApporteur
            ? `Devis validé par ${this.project.data?.commanditaire || 'votre gestionnaire'}`
            : 'Devis accepté',
          userFirstName: this.getUserFirstName(devis.validatedBy),
        });
        hasValidatedEvent = true;
      }

      // ====== FALLBACK basé sur devis.state ======
      // Si aucun événement spécifique n'a été généré via les dates, utiliser le state
      const state = (devis.state || '').toLowerCase();
      const fallbackDate = devis.dateReelle ? new Date(devis.dateReelle) : null;
      const isFallbackDateOnly = devis.dateReelle ? !devis.dateReelle.includes('T') : false;
      const hasApporteur = Boolean(this.project.data?.commanditaireId);

      if (!hasSentEvent && (state === 'sent' || state === 'invoice' || state === 'validated' || state === 'accepted')) {
        if (fallbackDate) {
          events.push({
            id: `quote_sent_state_${devis.id}`,
            type: 'quote',
            date: fallbackDate,
            label: hasApporteur
              ? `Devis transmis à ${this.project.data?.commanditaire || 'votre gestionnaire'}`
              : 'Devis transmis',
            userFirstName: this.getUserFirstName(devis.userId),
            dateOnly: isFallbackDateOnly,
          });
        }
      }

      if (!hasValidatedEvent && (state === 'validated' || state === 'accepted' || state === 'invoice')) {
        if (fallbackDate) {
          events.push({
            id: `quote_validated_state_${devis.id}`,
            type: 'quote',
            date: fallbackDate,
            label: hasApporteur
              ? `Devis validé par ${this.project.data?.commanditaire || 'votre gestionnaire'}`
              : 'Devis accepté',
            userFirstName: this.getUserFirstName(devis.userId),
            dateOnly: isFallbackDateOnly,
          });
        }
      }

      if (state === 'invoice' && fallbackDate) {
        events.push({
          id: `quote_invoiced_state_${devis.id}`,
          type: 'invoice',
          date: fallbackDate,
          label: 'Devis facturé',
          userFirstName: this.getUserFirstName(devis.userId),
          dateOnly: isFallbackDateOnly,
        });
      }

      if (!hasCreatedEvent && !hasSentEvent && !hasValidatedEvent && (state === 'draft' || state === 'writing') && fallbackDate) {
        events.push({
          id: `quote_draft_state_${devis.id}`,
          type: 'quote',
          date: fallbackDate,
          label: 'Devis en cours de rédaction',
          userFirstName: this.getUserFirstName(devis.userId),
          dateOnly: isFallbackDateOnly,
        });
      }
    });
  }

  private addSuppliesEvents(events: SuiviEvent[]) {
    if (!this.project.data?.history) return;

    // Rechercher dans l'historique les événements liés aux fournitures
    this.project.data.history.forEach((entry: any, index: number) => {
      const labelKind = entry.labelKind?.toLowerCase() || "";
      const date = parseFrenchDate(entry.dateModif);
      if (!date) return;

      if (labelKind.includes("wait fourn") || labelKind.includes("attente fourniture")) {
        events.push({
          id: `supplies_ordered_${index}`,
          type: 'supplies',
          date,
          label: 'Fournitures commandées',
          userFirstName: this.getUserFirstName(entry.userId),
        });
      }

      if (labelKind.includes("fourniture") && labelKind.includes("reçu")) {
        events.push({
          id: `supplies_received_${index}`,
          type: 'supplies',
          date,
          label: 'Fournitures reçues',
          userFirstName: this.getUserFirstName(entry.userId),
        });
      }
    });
  }

  private addInvoiceEvents(events: SuiviEvent[]) {
    const projectFactures = this.factures.filter(f => f.projectId === this.project.id);

    projectFactures.forEach((facture: any) => {
      if (facture.date || facture.dateFacture) {
        const date = new Date(facture.date || facture.dateFacture);
        events.push({
          id: `invoice_${facture.id}`,
          type: 'invoice',
          date,
          label: 'Facture émise',
          description: `Montant: ${facture.amount || facture.montant || 0}€ TTC`,
          details: {
            amount: facture.amount || facture.montant,
            reference: facture.reference || facture.ref
          }
        });
      }

      if (facture.date_payment || facture.datePayment) {
        const date = new Date(facture.date_payment || facture.datePayment);
        events.push({
          id: `payment_${facture.id}`,
          type: 'invoice',
          date,
          label: 'Paiement reçu',
          details: {
            amount: facture.amount || facture.montant
          }
        });
      }
    });
  }
}
