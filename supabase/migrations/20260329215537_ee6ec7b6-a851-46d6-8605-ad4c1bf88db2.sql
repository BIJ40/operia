-- Fix pilotage.resultat: was is_deployed=false, node_type=section → should be deployed screen
UPDATE module_catalog SET is_deployed = true, node_type = 'screen' WHERE key = 'pilotage.resultat';

-- Fix pilotage.incoherences: was is_deployed=false, node_type=section → should be deployed screen
UPDATE module_catalog SET is_deployed = true, node_type = 'screen' WHERE key = 'pilotage.incoherences';