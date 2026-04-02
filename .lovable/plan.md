

# Plan: Generer le Helper complet OPERIA (Markdown)

## Objectif
Produire un fichier `/mnt/documents/OPERIA_HELPER_COMPLET.md` contenant:
1. **Tous les endpoints Apogee** avec description et champs cles
2. **Toutes les Edge Functions** (~100+) avec leur role
3. **Toutes les metriques StatIA** (~130+) avec id, categorie, source, unite

## Contenu du document

### Section 1 - Endpoints API Apogee (8 endpoints)
Liste complete avec les champs de donnees importants et ou trouver chaque information.

### Section 2 - Edge Functions Supabase (~100 fonctions)
Classees par domaine (sync, auth, documents, KPIs, ticketing, suivi, social, planning, etc.)

### Section 3 - Metriques StatIA (inventaire exhaustif)
Toutes les metriques extraites des 20+ fichiers de definitions, organisees par famille:
- CA (6), Univers (11), Apporteurs (15), Techniciens (7), SAV (10), Devis (10), Recouvrement (6)
- Dossiers (7), Qualite (6), Productivite (6), Complexite (2), Reseau (11)
- Advanced (15), Advanced2 (25), Franchiseur (15), Clients (4), Agences (12), Operations (15)
- Devis Advanced (4), Veille Apporteurs (3)

## Etapes
1. Ecrire un script Python qui genere le Markdown complet
2. Executer et deposer dans `/mnt/documents/`
3. QA du fichier

