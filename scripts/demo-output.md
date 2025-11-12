# 🎯 Démonstration de la migration des liens HTML → TipTap

## 📋 Résumé de l'analyse

**Fichier analysé:** `user-uploads://manuelV9_copie_2.txt`
**Blocs dans la base:** 13 catégories trouvées dans `apogee-data.json`

---

## ✨ Exemples de conversions

### 1️⃣ Liens simples dans le texte

**AVANT (HTML):**
```html
Avant de penser <a href="#theme-dossier">dossier (#dossier)</a>, 
<a href="#theme-devis-commandes">devis (#devis)</a> ou
<a href="#theme-facturation">facture (#facture)</a>
```

**APRÈS (Mention TipTap):**
```html
Avant de penser <span data-mention="" data-id="cat-3" data-label="Dossier / Projet" data-prefix="@" data-slug="dossier-projet" data-type="category" class="mention cursor-pointer text-primary font-medium hover:underline">@Dossier / Projet</span>, 
<span data-mention="" data-id="cat-6" data-label="Devis & Commandes" data-prefix="@" data-slug="devis-commandes" data-type="category" class="mention cursor-pointer text-primary font-medium hover:underline">@Devis & Commandes</span> ou
<span data-mention="" data-id="cat-7" data-label="Facturation & Paiements" data-prefix="@" data-slug="facturation-paiements" data-type="category" class="mention cursor-pointer text-primary font-medium hover:underline">@Facturation & Paiements</span>
```

**Résultat visuel:**
> Avant de penser @Dossier / Projet, @Devis & Commandes ou @Facturation & Paiements

✅ **Cliquable** → Amène directement à la bonne catégorie

---

### 2️⃣ Liens vers des sections spécifiques

**AVANT (HTML):**
```html
Consultez le PDF de RT dans la <a href="#theme-docs-medias">médiathèque</a>
```

**APRÈS (Mention TipTap):**
```html
Consultez le PDF de RT dans la <span data-mention="" data-id="cat-9" data-label="Documents & Médiathèque" data-prefix="@" data-slug="documents-mediatheque" data-type="category" class="mention cursor-pointer text-primary font-medium hover:underline">@Documents & Médiathèque</span>
```

**Résultat visuel:**
> Consultez le PDF de RT dans la @Documents & Médiathèque

---

### 3️⃣ Tags raccourcis (#xxx)

**AVANT (HTML):**
```html
<a href="#theme-client" class="tag">#client</a>
<a href="#theme-rdv" class="tag">#rdv</a>
<a href="#theme-workflow" class="tag">#workflow</a>
```

**APRÈS (Mention TipTap):**
```html
<span data-mention="" data-id="cat-2" data-label="Client & Apporteur" data-prefix="@" data-slug="client-apporteur" data-type="category" class="mention">@Client & Apporteur</span>
<span data-mention="" data-id="cat-4" data-label="Rendez-vous & Planning" data-prefix="@" data-slug="rendez-vous-planning" data-type="category" class="mention">@Rendez-vous & Planning</span>
<span data-mention="" data-id="cat-10" data-label="Workflow & Statuts" data-prefix="@" data-slug="workflow-statuts" data-type="category" class="mention">@Workflow & Statuts</span>
```

**Résultat visuel:**
> @Client & Apporteur • @Rendez-vous & Planning • @Workflow & Statuts

---

### 4️⃣ Rôles utilisateurs (@Xxx)

**AVANT (HTML):**
```html
<a href="#theme-client" class="ref">@BackOffice</a>
<a href="#theme-app-tech" class="ref">@Technicien</a>
<a href="#theme-devis-commandes" class="ref">@ChargeAffaires</a>
```

**APRÈS (Mention TipTap):**
```html
<span data-mention="" data-id="cat-2" data-label="Client & Apporteur" data-prefix="@" data-slug="client-apporteur" data-type="category" class="mention">@Client & Apporteur</span>
<span data-mention="" data-id="cat-5" data-label="Application Technicien" data-prefix="@" data-slug="application-technicien" data-type="category" class="mention">@Application Technicien</span>
<span data-mention="" data-id="cat-6" data-label="Devis & Commandes" data-prefix="@" data-slug="devis-commandes" data-type="category" class="mention">@Devis & Commandes</span>
```

---

## 📊 Statistiques de la migration

| Type de lien | Occurrences trouvées | État |
|--------------|---------------------|------|
| `<a href="#theme-xxx">` | ~59 | ✅ Prêt |
| Tags `#xxx` | ~15 | ✅ Prêt |
| Rôles `@Xxx` | ~4 | ✅ Prêt |

---

## 🎯 Mapping des IDs HTML → Slugs actuels

| ID HTML | Slug actuel | Catégorie |
|---------|-------------|-----------|
| `#intro` | `introduction-principes` | Introduction & principes |
| `#theme-client` | `client-apporteur` | Client & Apporteur |
| `#theme-dossier` | `dossier-projet` | Dossier / Projet |
| `#theme-rdv` | `rendez-vous-planning` | Rendez-vous & Planning |
| `#theme-app-tech` | `application-technicien` | Application Technicien |
| `#theme-devis-commandes` | `devis-commandes` | Devis & Commandes |
| `#theme-facturation` | `facturation-paiements` | Facturation & Paiements |
| `#theme-articles` | `comptabilite-articles` | Comptabilité & Articles |
| `#theme-docs-medias` | `documents-mediatheque` | Documents & Médiathèque |
| `#theme-workflow` | `workflow-statuts` | Workflow & Statuts |
| `#theme-gestion-listes` | `gestion-listes-pictos` | Gestion des listes & pictos |
| `#theme-reporting` | `reporting-suivi` | Reporting / Suivi |
| `#faq-global` | `faq-globale-structuree` | FAQ globale structurée |

---

## 🚀 Prochaines étapes

Pour effectuer la migration réelle:

1. ✅ Le mapping est correct
2. ✅ Les blocs existent dans `apogee-data.json`
3. 📝 Ouvrir `scripts/migrate-html-links.ts`
4. 📝 Décommenter les lignes 125-141
5. ▶️ Exécuter: `npx tsx scripts/migrate-html-links.ts`
6. ✅ Un backup sera créé automatiquement

---

## ⚠️ Notes importantes

- **Backup automatique**: Le script créera `apogee-data.backup.json`
- **Réversible**: Vous pouvez toujours revenir en arrière
- **Testable**: Mode démo disponible (aucune modification)
- **Sécurisé**: Vérification de tous les mappings avant conversion

---

## 💡 Exemple dans l'éditeur

Une fois migré, quand vous éditez un bloc, vous verrez:

```
Le technicien consulte le @Dossier / Projet et crée un @Devis & Commandes
                          ↑ cliquable              ↑ cliquable
                          amène à cat-3            amène à cat-6
```

Et vous pourrez continuer à créer de nouveaux liens en tapant `@` !
