import React from 'react';

const SecurityReportPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-black p-8 max-w-4xl mx-auto print:p-4">
      {/* Header */}
      <div className="text-center border-b-2 border-gray-800 pb-6 mb-8">
        <h1 className="text-3xl font-bold mb-2">🔐 RAPPORT D'AUDIT DE SÉCURITÉ</h1>
        <h2 className="text-xl text-gray-600">Application Suivi Client - Help! Confort</h2>
        <p className="text-sm text-gray-500 mt-2"><strong>Date :</strong> 11 décembre 2025</p>
      </div>

      {/* Section 1 */}
      <section className="mb-8">
        <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4">1. CONTEXTE</h2>
        <p className="text-sm leading-relaxed">
          Suite à une alerte du développeur Apogée concernant des failles de sécurité potentielles, 
          un audit complet a été réalisé sur l'application de suivi client. L'objectif était d'identifier 
          et corriger toute vulnérabilité permettant :
        </p>
        <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
          <li>L'accès non autorisé aux données client</li>
          <li>La manipulation frauduleuse des paiements</li>
          <li>L'énumération des numéros de dossier</li>
        </ul>
      </section>

      {/* Section 2 */}
      <section className="mb-8">
        <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4">2. FAILLES IDENTIFIÉES ET CORRIGÉES</h2>
        
        {/* Faille critique 1 */}
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500">
          <h3 className="font-bold text-red-700">🔴 CRITIQUE - Fraude sur les montants de paiement</h3>
          <p className="text-sm mt-2"><strong>Vulnérabilité :</strong> Le montant du paiement Stripe était transmis par le client via les paramètres URL. Un attaquant pouvait modifier ce montant (ex: 0.01€ au lieu de 500€) et prétendre avoir "payé" son dossier.</p>
          <p className="text-sm mt-1"><strong>Impact :</strong> Perte financière directe, fausses déclarations de paiement à Apogée.</p>
          <p className="text-sm mt-1"><strong>Correction appliquée :</strong></p>
          <ul className="list-disc ml-6 text-sm">
            <li>Le montant n'est plus jamais transmis par le client</li>
            <li>Le serveur calcule le montant à partir des données financières Apogée (aPercevoir)</li>
            <li>Le montant calculé est tracé dans les métadonnées Stripe pour audit</li>
          </ul>
        </div>

        {/* Faille critique 2 */}
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500">
          <h3 className="font-bold text-red-700">🔴 CRITIQUE - Edge functions sans vérification serveur</h3>
          <p className="text-sm mt-2"><strong>Vulnérabilité :</strong> Les fonctions send-client-photos, signaler-empechement, update-client-contact, update-client-email acceptaient les requêtes sans vérifier l'identité du demandeur.</p>
          <p className="text-sm mt-1"><strong>Impact :</strong> N'importe qui pouvait envoyer des emails, modifier des contacts, signaler des empêchements sur n'importe quel dossier.</p>
          <p className="text-sm mt-1"><strong>Correction appliquée :</strong></p>
          <ul className="list-disc ml-6 text-sm">
            <li>Toutes les edge functions exigent maintenant refDossier + codePostal</li>
            <li>Vérification serveur via Apogée avant toute action</li>
            <li>Validation des URLs de photos (domaine Supabase uniquement)</li>
            <li>Sanitisation XSS des commentaires</li>
          </ul>
        </div>

        {/* Faille moyenne 1 */}
        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500">
          <h3 className="font-bold text-yellow-700">🟡 MOYEN - Énumération des numéros de dossier</h3>
          <p className="text-sm mt-2"><strong>Vulnérabilité :</strong> Un message d'erreur différent était retourné selon que le dossier existait ou non, permettant de deviner les numéros valides.</p>
          <p className="text-sm mt-1"><strong>Impact :</strong> Collecte de numéros de dossier valides pour attaques ciblées.</p>
          <p className="text-sm mt-1"><strong>Correction appliquée :</strong></p>
          <ul className="list-disc ml-6 text-sm">
            <li>Message d'erreur générique identique ("Accès refusé") que le dossier existe ou non</li>
            <li>Aucune fuite d'information sur l'existence des dossiers</li>
          </ul>
        </div>

        {/* Faille moyenne 2 */}
        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500">
          <h3 className="font-bold text-yellow-700">🟡 MOYEN - Exposition du numéro de dossier côté client</h3>
          <p className="text-sm mt-2"><strong>Vulnérabilité :</strong> Le numéro de dossier était visible dans l'interface utilisateur et accessible via les outils développeur.</p>
          <p className="text-sm mt-1"><strong>Impact :</strong> Information pouvant faciliter des attaques d'ingénierie sociale.</p>
          <p className="text-sm mt-1"><strong>Correction appliquée :</strong></p>
          <ul className="list-disc ml-6 text-sm">
            <li>Numéro de dossier masqué dans l'interface</li>
            <li>Descriptions génériques dans Stripe ("Paiement dossier" sans ref)</li>
          </ul>
        </div>
      </section>

      {/* Section 3 */}
      <section className="mb-8">
        <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4">3. ARCHITECTURE DE SÉCURITÉ ACTUELLE</h2>
        
        <div className="bg-gray-100 p-4 rounded font-mono text-xs mb-4">
          <pre>{`┌─────────────────┐     ┌──────────────────────┐     ┌─────────────┐
│   NAVIGATEUR    │────▶│   EDGE FUNCTIONS     │────▶│   APOGÉE    │
│     CLIENT      │     │   (Supabase)         │     │     API     │
└─────────────────┘     └──────────────────────┘     └─────────────┘
        │                         │
        │  refDossier             │  API_KEY (secret)
        │  codePostal             │  Vérification serveur
        │  (pas de montant)       │  Filtrage données
        │                         │
        ▼                         ▼
   ✓ Données filtrées       ✓ Calcul montant serveur
   ✓ Erreurs génériques     ✓ Validation identité`}</pre>
        </div>

        <h3 className="font-bold mb-2">Flux de vérification sécurisé :</h3>
        <table className="w-full text-sm border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-300 p-2 text-left">Étape</th>
              <th className="border border-gray-300 p-2 text-left">Action</th>
              <th className="border border-gray-300 p-2 text-left">Sécurité</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="border border-gray-300 p-2">1</td><td className="border border-gray-300 p-2">Client entre code postal</td><td className="border border-gray-300 p-2">Côté client</td></tr>
            <tr><td className="border border-gray-300 p-2">2</td><td className="border border-gray-300 p-2">Requête api-proxy avec ref + CP</td><td className="border border-gray-300 p-2">HTTPS</td></tr>
            <tr><td className="border border-gray-300 p-2">3</td><td className="border border-gray-300 p-2">Serveur vérifie ref existe dans Apogée</td><td className="border border-gray-300 p-2">Serveur</td></tr>
            <tr><td className="border border-gray-300 p-2">4</td><td className="border border-gray-300 p-2">Serveur vérifie CP correspond au client</td><td className="border border-gray-300 p-2">Serveur</td></tr>
            <tr><td className="border border-gray-300 p-2">5</td><td className="border border-gray-300 p-2">Erreur générique si échec</td><td className="border border-gray-300 p-2">Anti-énumération</td></tr>
            <tr><td className="border border-gray-300 p-2">6</td><td className="border border-gray-300 p-2">Données filtrées retournées</td><td className="border border-gray-300 p-2">Isolation client</td></tr>
          </tbody>
        </table>
      </section>

      {/* Section 4 */}
      <section className="mb-8">
        <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4">4. MATRICE DE RISQUES RÉSIDUELS</h2>
        <table className="w-full text-sm border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-300 p-2 text-left">Risque</th>
              <th className="border border-gray-300 p-2 text-left">Probabilité</th>
              <th className="border border-gray-300 p-2 text-left">Impact</th>
              <th className="border border-gray-300 p-2 text-left">Statut</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="border border-gray-300 p-2">Fraude paiement</td><td className="border border-gray-300 p-2"><s>Élevée</s></td><td className="border border-gray-300 p-2"><s>Critique</s></td><td className="border border-gray-300 p-2 text-green-600 font-bold">✅ Corrigé</td></tr>
            <tr><td className="border border-gray-300 p-2">Actions non autorisées</td><td className="border border-gray-300 p-2"><s>Élevée</s></td><td className="border border-gray-300 p-2"><s>Élevé</s></td><td className="border border-gray-300 p-2 text-green-600 font-bold">✅ Corrigé</td></tr>
            <tr><td className="border border-gray-300 p-2">Énumération dossiers</td><td className="border border-gray-300 p-2"><s>Moyenne</s></td><td className="border border-gray-300 p-2"><s>Moyen</s></td><td className="border border-gray-300 p-2 text-green-600 font-bold">✅ Corrigé</td></tr>
            <tr><td className="border border-gray-300 p-2">Brute force code postal</td><td className="border border-gray-300 p-2">Moyenne</td><td className="border border-gray-300 p-2">Moyen</td><td className="border border-gray-300 p-2 text-orange-600 font-bold">⚠️ À traiter</td></tr>
            <tr><td className="border border-gray-300 p-2">Données autres clients via bug</td><td className="border border-gray-300 p-2">Faible</td><td className="border border-gray-300 p-2">Élevé</td><td className="border border-gray-300 p-2 text-orange-600 font-bold">⚠️ À optimiser</td></tr>
          </tbody>
        </table>
      </section>

      {/* Section 5 */}
      <section className="mb-8">
        <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4">5. RECOMMANDATIONS</h2>
        
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500">
          <h3 className="font-bold text-red-700">🔴 Priorité haute - Rate Limiting</h3>
          <p className="text-sm mt-2"><strong>Problème :</strong> Un attaquant peut tenter toutes les combinaisons de codes postaux (100 000 possibilités) par brute force.</p>
          <p className="text-sm mt-2"><strong>Solution recommandée :</strong></p>
          <ul className="list-disc ml-6 text-sm">
            <li>Implémenter une limite de 5 tentatives par IP par minute</li>
            <li>Blocage temporaire après 10 échecs consécutifs</li>
            <li>Alertes sur activité suspecte</li>
          </ul>
          <p className="text-sm mt-2"><strong>Effort estimé :</strong> 2-4 heures</p>
        </div>

        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500">
          <h3 className="font-bold text-yellow-700">🟡 Priorité moyenne - Endpoints Apogée filtrés</h3>
          <p className="text-sm mt-2"><strong>Problème :</strong> Le serveur charge actuellement TOUS les clients, devis, factures, interventions, puis filtre. Risque si bug dans le filtrage.</p>
          <p className="text-sm mt-2"><strong>Solution recommandée :</strong> Demander à Apogée de créer des endpoints filtrés :</p>
          <ul className="list-disc ml-6 text-sm">
            <li>apiGetClientById(clientId)</li>
            <li>apiGetDevisByProjectId(projectId)</li>
            <li>apiGetFacturesByProjectId(projectId)</li>
            <li>apiGetInterventionsByProjectId(projectId)</li>
          </ul>
          <p className="text-sm mt-2"><strong>Avantages :</strong></p>
          <ul className="list-disc ml-6 text-sm">
            <li>Réduction charge serveur</li>
            <li>Élimination du risque de fuite par bug de filtrage</li>
            <li>Conformité RGPD (minimisation des données)</li>
          </ul>
        </div>

        <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500">
          <h3 className="font-bold text-green-700">🟢 Priorité basse - Logging et monitoring</h3>
          <p className="text-sm mt-2"><strong>Recommandations :</strong></p>
          <ul className="list-disc ml-6 text-sm">
            <li>Centraliser les logs de sécurité (tentatives échouées, accès)</li>
            <li>Alertes automatiques sur comportements anormaux</li>
            <li>Audit trail des paiements avec hash de vérification</li>
          </ul>
        </div>
      </section>

      {/* Section 6 */}
      <section className="mb-8">
        <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4">6. CONCLUSION</h2>
        <p className="text-sm leading-relaxed mb-4">
          L'application a été significativement sécurisée suite à cet audit. Les failles critiques 
          (fraude paiement, actions non autorisées) ont été corrigées. Le niveau de sécurité actuel 
          est <strong>acceptable pour un usage production</strong>, sous réserve d'implémenter le rate 
          limiting dans les meilleurs délais.
        </p>
        <div className="bg-gray-100 p-4 rounded text-center">
          <p className="text-lg font-bold">Score de sécurité estimé : 7/10 → Après corrections : <span className="text-green-600">8.5/10</span></p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-300 pt-4 mt-8 text-sm text-gray-500">
        <p><em>Rapport généré le 11/12/2025</em></p>
        <p><em>Prochaine revue recommandée : Après implémentation du rate limiting</em></p>
      </footer>

      {/* Print button - hidden when printing */}
      <div className="fixed bottom-4 right-4 print:hidden">
        <button 
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-blue-700 font-semibold"
        >
          📄 Imprimer / Exporter PDF
        </button>
      </div>
    </div>
  );
};

export default SecurityReportPage;
