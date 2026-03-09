

# Fusion des doublons collaborateurs et prévention

## Situation actuelle

Un seul doublon détecté :
- **Doublon** (manuel) : `ac237dac` — JÉRÔME DUCOURNEAU, `user_id = NULL`, `apogee_user_id = 7`
- **Principal** (plateforme) : `1abd5c2c` — Jérôme Ducourneau, `user_id = 9b80c88a`, `apogee_user_id = NULL`

Aucun des deux n'a de données enfant (contrats, documents, etc.). La fusion est simple : récupérer `apogee_user_id` du doublon vers le principal, puis supprimer le doublon.

## Plan d'action

### 1. Fusionner le doublon existant (data operation)

Exécuter via l'outil d'insertion :
- `UPDATE` le principal (`1abd5c2c`) pour récupérer `apogee_user_id = 7` du doublon
- `DELETE` le doublon (`ac237dac`)

### 2. Modifier le trigger `auto_create_collaborator` (migration)

Avant de faire l'INSERT, chercher un collaborateur existant **sans `user_id`** dans la même agence par email (insensible à la casse). Si trouvé → UPDATE pour lier le `user_id` au lieu de créer un doublon.

```sql
-- Ajout dans le trigger avant le INSERT
SELECT id INTO v_existing FROM collaborators
WHERE agency_id = NEW.agency_id
  AND user_id IS NULL
  AND LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))
LIMIT 1;

IF v_existing IS NOT NULL THEN
  UPDATE collaborators SET user_id = NEW.id, is_registered_user = true,
    first_name = COALESCE(NEW.first_name, first_name),
    last_name = COALESCE(NEW.last_name, last_name)
  WHERE id = v_existing;
  RETURN NEW; -- skip INSERT
END IF;
```

### 3. Ajouter une vérification frontend avant création manuelle

Dans `useCollaborators.ts` → `createMutation`, vérifier s'il existe déjà un collaborateur avec le même nom dans la même agence. Si oui, afficher un toast d'avertissement et bloquer la création.

### Fichiers impactés
- Migration SQL : trigger `auto_create_collaborator` modifié
- `src/hooks/useCollaborators.ts` : vérification pré-création par nom

