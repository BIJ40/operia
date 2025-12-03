import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function SecurityDocumentation() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <Button 
        variant="ghost" 
        onClick={() => navigate('/changelog')}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Retour au Changelog
      </Button>

      <article className="prose prose-slate dark:prose-invert max-w-none">
        <h1>🔐 SÉCURITÉ - HelpConfort Services</h1>

        <h2>Table des matières</h2>
        <ol>
          <li>Architecture Sécurité</li>
          <li>Proxy API Apogée</li>
          <li>Gestion des Secrets</li>
          <li>Permissions et Rôles</li>
          <li>Conformité RGPD</li>
          <li>Politiques RLS</li>
          <li>Protection contre les Attaques</li>
          <li>Checklist Pré-Production</li>
        </ol>

        <hr />

        <h2>Architecture Sécurité</h2>

        <pre><code>{`┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Navigateur)                       │
│  ⚠️ AUCUNE clé API exposée                                       │
│  ⚠️ AUCUN appel direct aux APIs externes                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS + JWT
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE EDGE FUNCTIONS                       │
│  ✅ Authentification JWT obligatoire                             │
│  ✅ Rate limiting par utilisateur                                │
│  ✅ Validation des inputs (Zod)                                  │
│  ✅ CORS hardened                                                │
│  ✅ Isolation par agence                                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │ Secrets backend only
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API APOGÉE                                │
│  🔑 Clé API stockée uniquement côté serveur                     │
│  🔒 Jamais exposée au client                                    │
└─────────────────────────────────────────────────────────────────┘`}</code></pre>

        <h3>Principes Fondamentaux</h3>
        <ol>
          <li><strong>Zero Trust Client</strong> : Le client ne possède AUCUN secret</li>
          <li><strong>Backend-First</strong> : Toutes les opérations sensibles passent par le backend</li>
          <li><strong>Least Privilege</strong> : Chaque utilisateur n'accède qu'à ses données</li>
          <li><strong>Defense in Depth</strong> : Multiples couches de sécurité</li>
        </ol>

        <hr />

        <h2>Proxy API Apogée</h2>

        <h3>Pourquoi un Proxy ?</h3>
        <p>L'API Apogée utilise une clé API unique partagée entre toutes les agences. Cette clé :</p>
        <ul>
          <li><strong>NE DOIT JAMAIS</strong> être exposée dans le code frontend</li>
          <li><strong>NE DOIT JAMAIS</strong> apparaître dans les logs client</li>
          <li><strong>NE DOIT JAMAIS</strong> être transmise via le réseau depuis le client</li>
        </ul>

        <h3>Architecture du Proxy</h3>
        <pre><code>{`// ✅ CORRECT : Utiliser le proxy
import { apogeeProxy } from '@/services/apogeeProxy';

const factures = await apogeeProxy.getFactures();
const projects = await apogeeProxy.getProjects({ agencySlug: 'dax' });

// ❌ INTERDIT : Appels directs (obsolète)
// fetch(\`https://xxx.hc-apogee.fr/api/...\`, { body: { API_KEY: '...' } })`}</code></pre>

        <h3>Endpoints Autorisés (Whitelist)</h3>
        <table>
          <thead><tr><th>Endpoint</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>apiGetUsers</code></td><td>Utilisateurs de l'agence</td></tr>
            <tr><td><code>apiGetClients</code></td><td>Clients</td></tr>
            <tr><td><code>apiGetProjects</code></td><td>Projets/Dossiers</td></tr>
            <tr><td><code>apiGetInterventions</code></td><td>Interventions</td></tr>
            <tr><td><code>apiGetFactures</code></td><td>Factures</td></tr>
            <tr><td><code>apiGetDevis</code></td><td>Devis</td></tr>
            <tr><td><code>apiGetInterventionsCreneaux</code></td><td>Créneaux d'interventions</td></tr>
          </tbody>
        </table>

        <h3>Sécurités Implémentées</h3>
        <ol>
          <li><strong>Authentification JWT</strong> : Obligatoire pour tous les appels</li>
          <li><strong>Rate Limiting</strong> : 30 requêtes/minute par utilisateur</li>
          <li><strong>Validation Whitelist</strong> : Seuls les endpoints autorisés sont accessibles</li>
          <li><strong>Isolation Agence</strong> : Vérification que l'utilisateur appartient à l'agence demandée</li>
          <li><strong>Logs Structurés</strong> : Aucune donnée sensible dans les logs</li>
        </ol>

        <hr />

        <h2>Gestion des Secrets</h2>

        <h3>Secrets Stockés dans Supabase</h3>
        <table>
          <thead><tr><th>Secret</th><th>Usage</th><th>Rotation</th></tr></thead>
          <tbody>
            <tr><td><code>APOGEE_API_KEY</code></td><td>Authentification API Apogée</td><td>Annuelle</td></tr>
            <tr><td><code>OPENAI_API_KEY</code></td><td>Services IA (qualification tickets)</td><td>Annuelle</td></tr>
            <tr><td><code>RESEND_API_KEY</code></td><td>Envoi d'emails</td><td>Annuelle</td></tr>
            <tr><td><code>ALLMYSMS_API_KEY</code></td><td>Envoi de SMS</td><td>Annuelle</td></tr>
          </tbody>
        </table>

        <h3>Variables Interdites Côté Client</h3>
        <p>⚠️ <strong>JAMAIS</strong> de variable <code>VITE_APOGEE_API_KEY</code> ou équivalent !</p>

        <hr />

        <h2>Permissions et Rôles</h2>

        <h3>Hiérarchie des Rôles (N0 → N6)</h3>
        <table>
          <thead><tr><th>Niveau</th><th>Rôle</th><th>Accès</th></tr></thead>
          <tbody>
            <tr><td>N0</td><td><code>base_user</code></td><td>Accès minimal</td></tr>
            <tr><td>N1</td><td><code>franchisee_user</code></td><td>Salarié agence</td></tr>
            <tr><td>N2</td><td><code>franchisee_admin</code></td><td>Dirigeant agence</td></tr>
            <tr><td>N3</td><td><code>franchisor_user</code></td><td>Animateur réseau</td></tr>
            <tr><td>N4</td><td><code>franchisor_admin</code></td><td>Directeur réseau</td></tr>
            <tr><td>N5</td><td><code>platform_admin</code></td><td>Admin plateforme</td></tr>
            <tr><td>N6</td><td><code>superadmin</code></td><td>Accès total</td></tr>
          </tbody>
        </table>

        <hr />

        <h2>Conformité RGPD</h2>

        <h3>Principes Appliqués</h3>
        <ol>
          <li><strong>Minimisation</strong> : Seules les données nécessaires sont collectées</li>
          <li><strong>Finalité</strong> : Chaque donnée a un usage défini</li>
          <li><strong>Limitation de Conservation</strong> : Politique de rétention définie</li>
          <li><strong>Sécurité</strong> : Chiffrement et contrôle d'accès</li>
        </ol>

        <h3>Droits des Utilisateurs</h3>
        <ul>
          <li><strong>Accès</strong> : Via <code>/mon-profil</code> et <code>/mon-coffre-rh</code></li>
          <li><strong>Rectification</strong> : Via formulaires de modification</li>
          <li><strong>Suppression</strong> : Via demande admin</li>
          <li><strong>Portabilité</strong> : Export possible (à implémenter)</li>
        </ul>

        <hr />

        <h2>Protection contre les Attaques</h2>

        <h3>Rate Limiting</h3>
        <table>
          <thead><tr><th>Fonction</th><th>Limite</th><th>Fenêtre</th></tr></thead>
          <tbody>
            <tr><td><code>proxy-apogee</code></td><td>30 req</td><td>1 min</td></tr>
            <tr><td><code>chat-guide</code></td><td>30 req</td><td>1 min</td></tr>
            <tr><td><code>get-kpis</code></td><td>20 req</td><td>1 min</td></tr>
            <tr><td><code>regenerate-*-rag</code></td><td>5 req</td><td>10 min</td></tr>
          </tbody>
        </table>

        <hr />

        <h2>Checklist Pré-Production</h2>

        <h3>Sécurité API</h3>
        <ul>
          <li>✅ Proxy Apogée implémenté</li>
          <li>✅ Clé API non exposée côté client</li>
          <li>✅ JWT obligatoire sur toutes les edge functions</li>
          <li>✅ Rate limiting activé</li>
          <li>✅ CORS hardened</li>
          <li>✅ Whitelist d'endpoints</li>
        </ul>

        <h3>Authentification</h3>
        <ul>
          <li>✅ Mots de passe forts (8+ chars, majuscules, minuscules, chiffres, symboles)</li>
          <li>✅ Sessions JWT sécurisées</li>
          <li>✅ Refresh token rotation</li>
        </ul>

        <h3>Données</h3>
        <ul>
          <li>✅ RLS activé sur toutes les tables</li>
          <li>✅ Isolation par agence</li>
          <li>✅ Chiffrement au repos (Supabase)</li>
          <li>✅ Logs sans données sensibles</li>
        </ul>

        <h3>À Faire Avant Production</h3>
        <ul>
          <li>☐ Activer confirmation email</li>
          <li>☐ Configurer CSP headers</li>
          <li>☐ Audit de pénétration</li>
          <li>☐ Test de charge</li>
        </ul>

        <hr />
        <p><em>Document généré le 2025-12-03 - Version 1.0</em></p>
      </article>
    </div>
  );
}
