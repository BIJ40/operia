ALTER TABLE metrics_apporteur_daily ALTER COLUMN panier_moyen DROP NOT NULL;
ALTER TABLE metrics_apporteur_daily ALTER COLUMN taux_transfo_devis DROP NOT NULL;
ALTER TABLE metrics_apporteur_univers_daily ALTER COLUMN ca_ht DROP NOT NULL;
ALTER TABLE metrics_apporteur_univers_daily ALTER COLUMN ca_ht SET DEFAULT 0;