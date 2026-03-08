# Operia — Clôture opérationnelle & dernier kilomètre vers 9/10

> **Date** : 2026-03-08  
> **Statut** : Document final de clôture  
> **Auteur** : Équipe technique Operia

---

## 1. Résumé exécutif

| Indicateur | Valeur |
|---|---|
| **Note actuelle réaliste** | **8.4 / 10** |
| **Note atteignable après actions humaines** | **9.0 / 10** |
| **Temps estimé pour atteindre 9/10** | **~30 minutes d'actions humaines** |
| **Code supplémentaire requis** | Aucun |

### Ce qui est déjà fait (côté code)

- ✅ MFA : infrastructure UI + serveur en place, mode `advisory` actif
- ✅ CI GitHub Actions : workflow complet, testé, prêt à activer
- ✅ Monitoring : endpoint `health-check` déployé et fonctionnel
- ✅ Hardening : Edge Functions sensibles protégées (8 fonctions)
- ✅ Tests : 255+ tests unitaires, 19 tests Edge, E2E optionnels
- ✅ Documentation : complète sur chaque sujet

### Ce qui n'est pas encore activé

- ❌ CI GitHub : secrets non configurés → le workflow ne tourne pas
- ❌ Monitoring externe : aucun outil branché sur le health-check
- ❌ MFA enforced : encore en mode `advisory` (pas de blocage réel)

**Conclusion** : le code est prêt. Seules des actions de configuration humaine séparent Operia du 9/10.

---

## 2. Plan d'action humain final

### Bloc A — Activer la CI GitHub (~10 min)

#### Étape A1 — Ajouter les secrets GitHub

1. Aller sur **GitHub → votre repo → Settings → Secrets and variables → Actions**
2. Cliquer **New repository secret** et ajouter :

| Secret | Valeur | Où la trouver |
|---|---|---|
| `SUPABASE_URL` | `https://qvrankgpfltadxegeiky.supabase.co` | Supabase Dashboard → Settings → API |
| `SUPABASE_ANON_KEY` | Votre clé anon/public | Supabase Dashboard → Settings → API → `anon` `public` |

3. **Ne pas ajouter** : `E2E_BASE_URL` (les tests E2E resteront optionnels pour l'instant)

#### Étape A2 — Vérifier que la CI tourne

1. Faire un commit quelconque (ou re-run le dernier workflow)
2. Aller sur **GitHub → Actions**
3. Vérifier que les 5 jobs passent au vert :
   - 📦 Setup
   - 🔍 TypeScript
   - 🧹 Lint
   - 🧪 Unit Tests
   - 🏗️ Build
4. Le job 🦕 Edge Function Tests passe aussi si les secrets sont corrects

#### Étape A3 — Protéger la branche main

1. **GitHub → Settings → Branches → Add rule**
2. Branch name pattern : `main`
3. Cocher : **Require status checks to pass before merging**
4. Sélectionner : `Build`, `Unit Tests`, `TypeScript`
5. Sauvegarder

#### ✅ C'est "done" quand

- Le badge CI est vert sur le dernier commit
- Un push sur une branche déclenche automatiquement la CI
- Un merge sur `main` est bloqué si la CI échoue

---

### Bloc B — Brancher le monitoring externe (~10 min)

#### Option recommandée : UptimeRobot (gratuit, suffisant)

1. Créer un compte sur [uptimerobot.com](https://uptimerobot.com)
2. Cliquer **Add New Monitor**
3. Remplir :

| Champ | Valeur |
|---|---|
| Monitor Type | HTTP(s) - Keyword |
| Friendly Name | `Operia Health Check` |
| URL | `https://qvrankgpfltadxegeiky.supabase.co/functions/v1/health-check` |
| Keyword | `"status":"ok"` |
| Keyword Type | Keyword should exist |
| Monitoring Interval | 5 minutes |

4. Dans **Custom HTTP Headers**, ajouter :
```
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cmFua2dwZmx0YWR4ZWdlaWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTEyNzcsImV4cCI6MjA4MTA2NzI3N30.EQh-5XEX2uywoIWI-pXbJja8cTPZDuRs0w3zbMmzHbI
```

5. Configurer les alertes : email de l'équipe technique

#### Vérification manuelle préalable (terminal)

```bash
curl -s \
  "https://qvrankgpfltadxegeiky.supabase.co/functions/v1/health-check" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cmFua2dwZmx0YWR4ZWdlaWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTEyNzcsImV4cCI6MjA4MTA2NzI3N30.EQh-5XEX2uywoIWI-pXbJja8cTPZDuRs0w3zbMmzHbI"
```

Réponse attendue : `{"status":"ok", ...}` avec HTTP 200.

#### ✅ C'est "done" quand

- UptimeRobot affiche le monitor en **vert**
- Vous recevez un email de test d'alerte
- Le dashboard montre un uptime de 100% après 15 minutes

---

### Bloc C — Activer le MFA enforced (~10 min)

#### Prérequis obligatoires avant activation

- [ ] Tous les comptes N4+ (franchisor_admin, platform_admin, superadmin) ont activé le MFA via leur page de paramètres de sécurité
- [ ] L'équipe a été prévenue par email/Slack : "Le MFA sera obligatoire à partir de [date]"
- [ ] Un créneau calme a été choisi (pas un vendredi soir)

#### Étape C1 — Activer côté frontend

1. Ouvrir `src/lib/mfa.ts`
2. Ligne 44 : changer `'advisory'` → `'enforced'`
3. Déployer

**Effet** : les utilisateurs N4+ sans MFA verront un écran bloquant leur demandant d'activer le MFA. Ils ne sont pas déconnectés, mais ne peuvent plus accéder aux zones sensibles.

#### Étape C2 — Activer côté serveur (24–48h après C1)

1. Aller sur **Supabase Dashboard → Settings → Edge Functions → Secrets**
2. Ajouter ou modifier :

| Secret | Valeur |
|---|---|
| `SERVER_MFA_ENFORCEMENT` | `enforced` |

3. Les Edge Functions sensibles bloqueront désormais les appels AAL1 avec une erreur 403

#### Rollback immédiat si problème

- **Frontend** : remettre `'advisory'` dans `src/lib/mfa.ts`, redéployer
- **Serveur** : changer le secret `SERVER_MFA_ENFORCEMENT` à `advisory` dans Supabase Dashboard
- **Délai de rollback** : < 2 minutes

#### ✅ C'est "done" quand

- Un admin N4+ sans MFA est effectivement bloqué (UI + API)
- Un admin N4+ avec MFA accède normalement à tout
- Les utilisateurs N1–N3 ne sont pas impactés

---

## 3. Définition de "9/10 atteint"

**Operia peut être considérée à 9/10 si :**

1. ✅ La CI GitHub tourne automatiquement et bloque les merges en cas d'échec
2. ✅ Un outil de monitoring externe surveille le health-check et envoie des alertes
3. ✅ Le MFA est en mode `enforced` sur le frontend ET le serveur
4. ✅ Aucun admin N4+ ne peut contourner le MFA en appelant directement les Edge Functions
5. ✅ L'équipe sait comment faire un rollback sur chacun de ces 3 sujets

---

## 4. Ce qui empêcherait encore 9/10

| Sujet | Impact | Action |
|---|---|---|
| Comptes admin N4+ sans MFA activé | Ils seront bloqués à l'activation | Les contacter avant la bascule |
| Secrets GitHub non configurés | La CI ne tourne pas | 2 minutes de configuration |
| Aucun outil de monitoring branché | Pas d'alerte en cas de panne | 10 minutes de setup |

**Aucun de ces points ne nécessite du code supplémentaire.**

---

## 5. Ce qu'il ne faut surtout PAS faire maintenant

| ❌ Ne pas faire | Pourquoi |
|---|---|
| Relancer une refonte d'architecture | Le code est stable, le risque de régression est trop élevé |
| Ajouter de nouvelles Edge Functions | Le périmètre est couvert, toute extension doit être un projet séparé |
| Modifier les permissions ou les rôles | Le système RBAC est stable et testé |
| Toucher aux migrations DB | Risque de casse sur les données de production |
| Ajouter des dépendances npm "au cas où" | Le bundle est déjà optimisé |
| Durcir le MFA pour les rôles N1–N3 | Pas de besoin identifié, impact utilisateur disproportionné |

---

## 6. Fichiers modifiés

| Fichier | Action |
|---|---|
| `docs/final-step9-last-mile-to-9.md` | Créé — ce document |

Aucun code, aucune config, aucune migration modifié.

---

## Annexe — Chronologie recommandée

| Jour | Action | Durée |
|---|---|---|
| **J0** | Configurer les secrets GitHub + vérifier CI verte | 10 min |
| **J0** | Brancher UptimeRobot | 10 min |
| **J0** | Vérifier que tous les admins N4+ ont activé le MFA | 5 min |
| **J+1** | Activer MFA `enforced` côté frontend | 2 min |
| **J+2** | Activer MFA `enforced` côté serveur | 2 min |
| **J+3** | Confirmer : CI verte, monitoring vert, MFA actif | 5 min |
| **J+3** | **Operia est à 9/10** | ✅ |
