-- Corriger le widget "Mon équipe" pour exiger N2 minimum
UPDATE widget_templates 
SET min_global_role = 2
WHERE module_source = 'RH.collaborators' OR module_source = 'RH.collaborateurs';

-- Supprimer le doublon si nécessaire (garder seulement le Shortcut)
DELETE FROM widget_templates 
WHERE module_source = 'RH.collaborators' 
  AND id != '20742c2c-d78d-4cd1-b864-57479fd5bc7a';