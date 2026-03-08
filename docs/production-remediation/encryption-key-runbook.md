# 🔐 SENSITIVE_DATA_ENCRYPTION_KEY — Runbook opérationnel

> **Classification** : CRITIQUE — Perte = données RGPD irrécupérables  
> **Dernière mise à jour** : 2026-03-08

---

## 1. Rôle de la clé

La `SENSITIVE_DATA_ENCRYPTION_KEY` est utilisée par la Edge Function `sensitive-data` pour chiffrer et déchiffrer les données personnelles sensibles des collaborateurs via **AES-256-GCM** (Web Crypto API).

### Données protégées
| Champ | Table | Colonne chiffrée |
|---|---|---|
| Date de naissance | `collaborator_sensitive_data` | `birth_date_encrypted` |
| Numéro de sécurité sociale (NIR) | `collaborator_sensitive_data` | `social_security_number_encrypted` |
| Contact d'urgence | `collaborator_sensitive_data` | `emergency_contact_encrypted` |
| Téléphone d'urgence | `collaborator_sensitive_data` | `emergency_phone_encrypted` |

### Mécanisme cryptographique
1. La clé brute (string) est hashée via **SHA-256** pour produire une clé AES de 256 bits
2. Chaque valeur est chiffrée avec un **IV aléatoire de 96 bits** (unique par opération)
3. Le résultat stocké = `base64(IV || ciphertext)` — le tag GCM est inclus dans le ciphertext

### Points d'utilisation dans le code
| Fichier | Fonction | Usage |
|---|---|---|
| `supabase/functions/sensitive-data/index.ts` | `getEncryptionKey()` | Lecture de la clé depuis `Deno.env` |
| `supabase/functions/sensitive-data/index.ts` | `encrypt()` | Chiffrement avant écriture DB |
| `supabase/functions/sensitive-data/index.ts` | `decrypt()` | Déchiffrement après lecture DB |

**Aucun autre fichier** n'accède directement à cette clé. Le frontend (`src/hooks/useSensitiveData.ts`) appelle la Edge Function via `supabase.functions.invoke()` — il ne voit jamais la clé.

---

## 2. Conséquences d'une perte

| Scénario | Impact |
|---|---|
| **Clé supprimée de Supabase Secrets** | Edge Function crash → `SENSITIVE_DATA_ENCRYPTION_KEY not configured` |
| **Clé modifiée/remplacée** | Toutes les données existantes deviennent **indéchiffrables** — le décryptage retourne `""` silencieusement |
| **Clé perdue sans backup** | Données RGPD **irrécupérables** — aucun mécanisme de récupération n'existe |
| **Clé compromise** | Toute personne ayant la clé + accès DB peut déchiffrer les données sensibles |

> ⚠️ **Il n'existe aucun mécanisme de récupération.** La clé est la seule source de déchiffrement.

---

## 3. Où stocker la clé

### Stockage principal
- **Supabase Dashboard** → Edge Function Secrets → `SENSITIVE_DATA_ENCRYPTION_KEY`
- C'est le stockage opérationnel utilisé par la Edge Function en production

### Backup obligatoire (hors Supabase)
La clé **DOIT** être sauvegardée dans un vault externe indépendant de Supabase :

| Option | Recommandation |
|---|---|
| **1Password / Bitwarden** (vault d'équipe) | ✅ Recommandé — simple, auditable |
| **AWS Secrets Manager / KMS** | ✅ Recommandé pour infra AWS existante |
| **Coffre-fort physique** (impression papier) | ✅ Backup de dernier recours |
| **Google Drive / fichier texte** | ❌ Interdit — pas de chiffrement au repos garanti |
| **Email** | ❌ Interdit — transit non sécurisé |
| **Code source / .env** | ❌ Interdit — exposition publique |

### Convention de nommage dans le vault
```
Nom     : OPERIA_PROD_SENSITIVE_DATA_ENCRYPTION_KEY
Projet  : Operia / HelpConfort Services
Env     : Production
Usage   : AES-256-GCM pour données RGPD collaborateurs
Créée   : [date de création originale]
```

---

## 4. Qui doit y avoir accès

| Rôle | Accès clé | Justification |
|---|---|---|
| **CTO / Responsable technique** | ✅ Oui | Responsable infrastructure |
| **DevOps / Admin Supabase** | ✅ Oui | Gestion des déploiements |
| **Développeur principal** | ⚠️ Restreint | Uniquement si nécessaire pour debug |
| **Autres développeurs** | ❌ Non | Principe du moindre privilège |
| **Utilisateurs finaux** | ❌ Non | Jamais |

> **Règle** : Maximum 2 à 3 personnes doivent connaître la clé. L'accès au vault doit être auditable.

---

## 5. Vérification de la présence de la clé

### Test rapide (sans exposer la clé)
```bash
# Via Supabase CLI (si configuré)
supabase secrets list
# Vérifier que SENSITIVE_DATA_ENCRYPTION_KEY apparaît dans la liste
```

### Test fonctionnel (via l'application)
1. Se connecter à Operia en tant qu'utilisateur avec accès RH
2. Ouvrir la fiche d'un collaborateur existant ayant des données sensibles
3. Vérifier que les champs (date de naissance, NIR, etc.) s'affichent correctement
4. Si les champs sont vides alors qu'ils ne devraient pas l'être → la clé est absente ou incorrecte

### Test via Edge Function logs
```
# Dans Supabase Dashboard → Edge Functions → sensitive-data → Logs
# Chercher :
# ✅ "[SENSITIVE-DATA] READ by=..." → clé fonctionnelle
# ❌ "SENSITIVE_DATA_ENCRYPTION_KEY not configured" → clé absente
# ❌ "Decryption failed:" → clé modifiée/incorrecte
```

---

## 6. Procédure de rotation de clé (future)

> ⚠️ **Ne jamais effectuer une rotation sans migration des données existantes.**  
> Changer la clé sans re-chiffrer = perte de données.

### Étapes théoriques pour une rotation sûre

1. **Préparer la nouvelle clé**
   - Générer une nouvelle clé aléatoire (min. 32 caractères, haute entropie)
   - La stocker dans le vault externe

2. **Créer un script de migration**
   - Lire toutes les lignes de `collaborator_sensitive_data`
   - Déchiffrer avec l'ancienne clé
   - Re-chiffrer avec la nouvelle clé
   - Écrire les nouvelles valeurs

3. **Exécuter en maintenance**
   - Fenêtre de maintenance planifiée
   - Désactiver temporairement l'accès à la Edge Function
   - Exécuter la migration
   - Vérifier un échantillon de données
   - Mettre à jour le secret Supabase avec la nouvelle clé
   - Tester le déchiffrement

4. **Archiver l'ancienne clé**
   - Conserver l'ancienne clé dans le vault pendant 90 jours minimum
   - Marquer comme "ancienne - rotation [date]"

> **Important** : Ce script de migration n'existe pas encore. Il devra être développé avant toute rotation.

---

## 7. Checklist de vérification périodique

| Vérification | Fréquence | Responsable |
|---|---|---|
| La clé est présente dans Supabase Secrets | Mensuel | Admin Supabase |
| Le backup vault est accessible | Trimestriel | CTO |
| Le déchiffrement fonctionne (test fonctionnel) | Mensuel | Équipe technique |
| Les personnes ayant accès sont à jour | Trimestriel | CTO |
| La documentation est à jour | Semestriel | Équipe technique |

---

## 8. En cas d'incident

### Clé absente (Edge Function en erreur)
1. Vérifier les logs Edge Function pour le message exact
2. Restaurer depuis le vault externe
3. Ajouter via `supabase secrets set SENSITIVE_DATA_ENCRYPTION_KEY=<valeur>`
4. Vérifier le fonctionnement

### Suspicion de compromission
1. **Ne pas changer la clé immédiatement** (risque de perte de données)
2. Auditer les logs d'accès (`[SENSITIVE-DATA] READ/WRITE`)
3. Planifier une rotation selon la procédure §6
4. Notifier le DPO si données personnelles potentiellement exposées (RGPD Art. 33 — 72h)
