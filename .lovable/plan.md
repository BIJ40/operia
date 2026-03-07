

## Plan : Bouton "Pas encore inscrit ?" avec pré-inscription

### Concept

Ajouter un bouton sous le formulaire de connexion qui ouvre un Dialog de pré-inscription. Le formulaire collecte les infos minimales, puis insère une ligne dans une nouvelle table `pending_registrations`. L'admin voit ces demandes dans l'espace admin et peut les valider (ce qui crée le compte via l'edge function existante `create-user`).

### 1. Nouvelle table Supabase : `pending_registrations`

```sql
CREATE TABLE public.pending_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  company_name text,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;

-- Tout le monde (anon) peut insérer une demande
CREATE POLICY "Anyone can submit registration"
  ON public.pending_registrations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Seuls les admins N3+ peuvent lire/modifier
CREATE POLICY "Admins can manage registrations"
  ON public.pending_registrations FOR ALL
  TO authenticated
  USING (has_min_global_role(auth.uid(), 3));
```

### 2. Composant `RegistrationRequestDialog`

- Dialog avec formulaire : Prénom, Nom, Email, Téléphone (optionnel), Nom de société (optionnel), Message libre (optionnel)
- Validation Zod
- Insert directement dans `pending_registrations` via Supabase anon client (pas besoin d'auth)
- Message de confirmation après soumission

### 3. Modification de `LoginFormCard`

- Ajout d'un bouton "Pas encore inscrit ?" sous le bouton "Se connecter"
- Ce bouton ouvre le `RegistrationRequestDialog`

### 4. Section admin : liste des pré-inscriptions

- Nouvel onglet ou section dans l'admin existant pour voir les demandes en attente
- Actions : Approuver (ouvre le dialog de création utilisateur pré-rempli) ou Rejeter (avec motif)
- Quand l'admin approuve, il choisit le rôle et l'agence, puis le compte est créé via `create-user`

### Fichiers à créer/modifier

| Fichier | Action |
|---------|--------|
| Migration SQL | Créer table `pending_registrations` |
| `src/components/registration/RegistrationRequestDialog.tsx` | Nouveau - formulaire de pré-inscription |
| `src/components/LoginFormCard.tsx` | Modifier - ajouter bouton + dialog |
| `src/components/admin/registrations/PendingRegistrationsList.tsx` | Nouveau - liste admin des demandes |
| Onglet admin existant | Modifier - intégrer la liste des pré-inscriptions |

### Section technique

- La table utilise RLS avec accès `anon` en INSERT uniquement pour permettre la soumission sans authentification
- Contrainte UNIQUE sur email pour éviter les doublons
- Le status `pending` → `approved`/`rejected` est géré par les admins authentifiés N3+
- Aucun compte auth n'est créé à la soumission : c'est un simple enregistrement de demande

