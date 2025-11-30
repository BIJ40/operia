/**
 * Service d'enrichissement des données
 * Crée des référentiels (maps) pour convertir les IDs en labels lisibles
 * Conforme à la section 0.3 du guide de calcul
 */

import { logDebug } from '@/lib/logger';

export interface TechnicianRef {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  colorHex: string;
  universes: string[];
  type: string;
}

export interface ClientRef {
  id: string;
  displayName: string;
  typeClient: string;
  codeCompta?: string;
  ville?: string;
  codePostal?: string;
}

export interface UniverseRef {
  slug: string;
  label: string;
  colorHex: string;
  icon?: string;
}

export class EnrichmentService {
  private static mapTechniciens: Record<string, TechnicianRef> = {};
  private static mapClients: Record<string, ClientRef> = {};
  private static mapUnivers: Record<string, UniverseRef> = {};

  /**
   * Initialiser les référentiels à partir des données API
   */
  static initialize(rawData: {
    users?: any[];
    clients?: any[];
    projects?: any[];
  }) {
    this.buildTechniciansMap(rawData.users || []);
    this.buildClientsMap(rawData.clients || []);
    this.buildUniversesMap(rawData.projects || []);
  }

  /**
   * A. RÉFÉRENTIEL TECHNICIENS
   * Source : apiGetUsers
   */
  private static buildTechniciansMap(users: any[]) {
    users.forEach(user => {
      const firstName = user.firstname || user.firstName || '';
      const lastName = user.lastname || user.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim() || `Technicien ${user.id}`;
      
      this.mapTechniciens[user.id] = {
        id: user.id,
        fullName,
        firstName,
        lastName,
        colorHex: user.data?.color?.hex || user.color?.hex || this.getDefaultTechColor(user.id),
        universes: user.data?.universes || [],
        type: user.type || 'technicien',
      };
    });

    if (import.meta.env.DEV) {
      logDebug('ENRICHMENT', `Référentiel techniciens créé: ${Object.keys(this.mapTechniciens).length} entrées`);
    }
  }

  /**
   * B. RÉFÉRENTIEL CLIENTS & APPORTEURS
   * Source : apiGetClients
   */
  private static buildClientsMap(clients: any[]) {
    clients.forEach(client => {
      const displayName = 
        client.raisonSociale || 
        client.nom || 
        client.raisonSociale2 || 
        `Client ${client.id}`;

      this.mapClients[client.id] = {
        id: client.id,
        displayName,
        typeClient: client.typeClient || 'particulier',
        codeCompta: client.codeCompta,
        ville: client.ville,
        codePostal: client.codePostal,
      };
    });

    if (import.meta.env.DEV) {
      logDebug('ENRICHMENT', `Référentiel clients créé: ${Object.keys(this.mapClients).length} entrées`);
    }
  }

  /**
   * C. RÉFÉRENTIEL UNIVERS MÉTIERS
   * Palette de couleurs FIXE par univers (OBLIGATOIRE)
   */
  private static buildUniversesMap(projects: any[]) {
    const universeSlugs = new Set<string>();
    
    // Collecter tous les univers uniques ET LES NORMALISER immédiatement
    projects.forEach(project => {
      const universes = project.universes || project.data?.universes || [];
      universes.forEach((u: string) => {
        const normalized = this.normalizeUniverseSlug(u);
        universeSlugs.add(normalized);
      });
    });

    // Palette de couleurs FIXE (couleurs de la capture d'écran user)
    const colorPalette: Record<string, string> = {
      'pmr': '#2B15E0',            // bleu violet (PMR)
      'volet_roulant': '#9817F0',  // violet/magenta - Volet roulant
      'renovation': '#A38D77',     // beige/brun - Rénovation
      'electricite': '#FD9A2C',    // orange
      'plomberie': '#3BA6FF',      // bleu clair
      'serrurerie': '#FF12BD',     // rose
      'vitrerie': '#7FFE2E',       // vert
      'menuiserie': '#FF7018',     // rouge orangé
      'chauffage': '#EF4444',      // rouge
      'climatisation': '#06B6D4',  // cyan/blue
      'autre': '#6B7280',          // gris moyen
      'non_renseigne': '#9CA3AF',  // gris clair
    };

    // Mapping des icônes Lucide pour chaque univers
    const iconMapping: Record<string, string> = {
      'pmr': 'Accessibility',
      'volet_roulant': 'Blinds',
      'renovation': 'PaintRoller',
      'electricite': 'Zap',
      'plomberie': 'Droplets',
      'serrurerie': 'KeyRound',
      'vitrerie': 'Frame',
      'menuiserie': 'DoorOpen',
      'chauffage': 'Flame',
      'climatisation': 'Snowflake',
      'autre': 'HelpCircle',
      'non_renseigne': 'HelpCircle',
    };

    universeSlugs.forEach(normalizedSlug => {
      const label = this.formatUniverseLabel(normalizedSlug);
      const colorHex = colorPalette[normalizedSlug] || this.getDefaultUniverseColor(normalizedSlug);
      const icon = iconMapping[normalizedSlug] || 'HelpCircle';

      this.mapUnivers[normalizedSlug] = {
        slug: normalizedSlug,
        label,
        colorHex,
        icon,
      } as any;
    });

    if (import.meta.env.DEV) {
      logDebug('ENRICHMENT', `Référentiel univers créé: ${Object.keys(this.mapUnivers).length} entrées`);
    }
  }

  /**
   * GETTERS - Accès aux référentiels
   */
  
  static getTechnician(id: string): TechnicianRef {
    return this.mapTechniciens[id] || {
      id,
      fullName: 'Technicien inconnu',
      firstName: '',
      lastName: '',
      colorHex: '#9ca3af',
      universes: [],
      type: 'technicien',
    };
  }

  static getClient(id: string): ClientRef {
    if (!id) {
      return {
        id: 'direct',
        displayName: 'Direct',
        typeClient: 'direct',
      };
    }

    return this.mapClients[id] || {
      id,
      displayName: 'Client inconnu',
      typeClient: 'inconnu',
    };
  }

  static getUniverse(slug: string): UniverseRef {
    const normalizedSlug = this.normalizeUniverseSlug(slug);
    return this.mapUnivers[normalizedSlug] || {
      slug: normalizedSlug,
      label: this.formatUniverseLabel(normalizedSlug),
      colorHex: this.getDefaultUniverseColor(normalizedSlug),
    };
  }

  static getAllTechnicians(): TechnicianRef[] {
    return Object.values(this.mapTechniciens);
  }

  static getAllClients(): ClientRef[] {
    return Object.values(this.mapClients);
  }

  static getAllUniverses(): UniverseRef[] {
    return Object.values(this.mapUnivers);
  }

  /**
   * HELPERS
   */

  /**
   * Normaliser les slugs d'univers de l'API vers nos labels
   * Table de correspondance HARD-CODÉE
   */
  private static normalizeUniverseSlug(slug: string): string {
    const normalizationMap: Record<string, string> = {
      // Ancien slug → Nouveau slug
      'amelioration_logement': 'pmr',
      'amelioration-logement': 'pmr',
      'ame_logement': 'pmr',
      'volets': 'volet_roulant',
      'volet': 'volet_roulant',
    };

    const normalized = normalizationMap[slug.toLowerCase()];
    return normalized || slug.toLowerCase();
  }

  private static formatUniverseLabel(slug: string): string {
    const labels: Record<string, string> = {
      'pmr': 'PMR',
      'volet_roulant': 'Volets roulants',
      'renovation': 'Rénovation',
      'electricite': 'Électricité',
      'plomberie': 'Plomberie',
      'serrurerie': 'Serrurerie',
      'vitrerie': 'Vitrerie',
      'menuiserie': 'Menuiserie',
      'chauffage': 'Chauffage',
      'climatisation': 'Climatisation',
      'autre': 'Autre',
    };

    return labels[slug.toLowerCase()] || 
           slug.charAt(0).toUpperCase() + slug.slice(1).toLowerCase();
  }

  private static getDefaultTechColor(id: string): string {
    const colors = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6'];
    const index = parseInt(id) % colors.length;
    return colors[index];
  }

  private static getDefaultUniverseColor(slug: string): string {
    const hash = slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6'];
    return colors[hash % colors.length];
  }

  /**
   * Enrichir un objet facture avec labels lisibles
   */
  static enrichFacture(facture: any, project?: any): any {
    // Format du numéro de facture : utiliser le champ réel
    const refFacture = facture.numeroFacture || facture.ref || facture.factRef || `ID #${facture.id}`;
    
    return {
      ...facture,
      refFacture,
      clientName: this.getClient(facture.clientId).displayName,
      projectName: project?.name || project?.nomDossierAssureur || `Dossier ${facture.projectId}`,
      apporteurName: project ? this.getClient(project.commanditaireId).displayName : '',
      statusLabel: this.getFactureStatusLabel(facture),
    };
  }

  /**
   * Enrichir un objet devis avec labels lisibles
   */
  static enrichDevis(devis: any, project?: any): any {
    return {
      ...devis,
      clientName: project ? this.getClient(project.clientId).displayName : '',
      apporteurName: project ? this.getClient(project.commanditaireId).displayName : '',
      statusLabel: this.getDevisStatusLabel(devis),
    };
  }

  /**
   * Enrichir un objet dossier avec labels lisibles
   */
  static enrichProject(project: any): any {
    const universes = project.universes || project.data?.universes || [];
    
    return {
      ...project,
      clientName: this.getClient(project.clientId).displayName,
      apporteurName: this.getClient(project.commanditaireId).displayName,
      universesLabels: universes.map((u: string) => this.getUniverse(u).label),
    };
  }

  /**
   * Labels lisibles pour statuts
   */
  private static getFactureStatusLabel(facture: any): string {
    if (facture.state === 'paid' || facture.isPaid) return 'Payée';
    
    const reste = facture.calc?.restePaidTTC || 0;
    if (reste === 0) return 'Payée';
    
    // Vérifier si en retard (simplification)
    const date = new Date(facture.date);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 60) return 'En retard';
    return 'En attente';
  }

  private static getDevisStatusLabel(devis: any): string {
    const labels: Record<string, string> = {
      'draft': 'Brouillon',
      'sent': 'Envoyé',
      'pending': 'En attente',
      'accepted': 'Accepté',
      'order': 'Commandé',
      'refused': 'Refusé',
    };

    return labels[devis.state] || devis.state || 'Inconnu';
  }
}
