-- Recreate agency_financial_summary with security_invoker=on to fix Security Definer View linter error
DROP VIEW IF EXISTS public.agency_financial_summary;

CREATE VIEW public.agency_financial_summary
WITH (security_invoker = on)
AS
SELECT m.id,
    m.agency_id,
    m.year,
    m.month,
    make_date(m.year, m.month, 1)::text AS month_date,
    m.locked_at,
    m.synced_at,
    m.sync_version,
    m.nb_interventions,
    m.nb_factures,
    m.nb_salaries,
    m.heures_facturees,
    m.nb_heures_payees_productifs,
    m.nb_heures_payees_improductifs,
    m.ca_total,
    m.achats,
    m.sous_traitance,
    m.salaires_brut_intervenants,
    m.charges_patronales_intervenants,
    m.frais_personnel_intervenants,
    m.aides_emploi,
    m.salaires_brut_intervenants + m.charges_patronales_intervenants + m.frais_personnel_intervenants - m.aides_emploi + m.sous_traitance AS masse_salariale_productifs,
    m.ca_total - m.achats AS marge_sur_achats,
    CASE WHEN m.ca_total > 0::numeric THEN (m.ca_total - m.achats) / m.ca_total * 100::numeric ELSE 0::numeric END AS taux_marge_achats,
    m.ca_total - m.achats - (m.salaires_brut_intervenants + m.charges_patronales_intervenants + m.frais_personnel_intervenants - m.aides_emploi + m.sous_traitance) AS marge_brute,
    CASE WHEN m.ca_total > 0::numeric THEN (m.ca_total - m.achats - (m.salaires_brut_intervenants + m.charges_patronales_intervenants + m.frais_personnel_intervenants - m.aides_emploi + m.sous_traitance)) / m.ca_total * 100::numeric ELSE 0::numeric END AS taux_marge_brute,
    m.salaires_brut_improductifs,
    m.charges_patronales_improductifs,
    m.frais_personnel_improductifs,
    m.salaires_brut_franchise,
    m.charges_patronales_franchise,
    m.frais_franchise,
    m.salaires_brut_improductifs + m.charges_patronales_improductifs + m.frais_personnel_improductifs + m.salaires_brut_franchise + m.charges_patronales_franchise + m.frais_franchise AS total_improductifs,
    COALESCE(c_agence.total, 0::numeric) AS charges_agence,
    COALESCE(c_location.total, 0::numeric) AS charges_location,
    COALESCE(c_externes.total, 0::numeric) AS charges_externes,
    COALESCE(c_autres.total, 0::numeric) AS charges_autres,
    m.salaires_brut_improductifs + m.charges_patronales_improductifs + m.frais_personnel_improductifs + m.salaires_brut_franchise + m.charges_patronales_franchise + m.frais_franchise + COALESCE(c_agence.total, 0::numeric) + COALESCE(c_location.total, 0::numeric) + COALESCE(c_externes.total, 0::numeric) + COALESCE(c_autres.total, 0::numeric) AS total_charges_hors_ms_productifs,
    m.salaires_brut_intervenants + m.charges_patronales_intervenants + m.frais_personnel_intervenants - m.aides_emploi + m.sous_traitance + (m.salaires_brut_improductifs + m.charges_patronales_improductifs + m.frais_personnel_improductifs + m.salaires_brut_franchise + m.charges_patronales_franchise + m.frais_franchise) + COALESCE(c_agence.total, 0::numeric) + COALESCE(c_location.total, 0::numeric) + COALESCE(c_externes.total, 0::numeric) + COALESCE(c_autres.total, 0::numeric) + m.achats AS total_charges,
    m.ca_total - m.achats - (m.salaires_brut_intervenants + m.charges_patronales_intervenants + m.frais_personnel_intervenants - m.aides_emploi + m.sous_traitance) - (m.salaires_brut_improductifs + m.charges_patronales_improductifs + m.frais_personnel_improductifs + m.salaires_brut_franchise + m.charges_patronales_franchise + m.frais_franchise) - COALESCE(c_agence.total, 0::numeric) - COALESCE(c_location.total, 0::numeric) - COALESCE(c_externes.total, 0::numeric) - COALESCE(c_autres.total, 0::numeric) AS resultat_avant_is,
    m.ca_total - m.sous_traitance AS ca_net,
    COALESCE(c_agence.total, 0::numeric) + COALESCE(c_location.total, 0::numeric) AS charges_fixes,
    COALESCE(c_externes.total, 0::numeric) + COALESCE(c_autres.total, 0::numeric) AS charges_variables,
    m.ca_total - m.sous_traitance - m.achats - COALESCE(c_externes.total, 0::numeric) - COALESCE(c_autres.total, 0::numeric) AS marge_contributive,
    m.ca_total - m.sous_traitance - m.achats - COALESCE(c_agence.total, 0::numeric) - COALESCE(c_location.total, 0::numeric) - COALESCE(c_externes.total, 0::numeric) - COALESCE(c_autres.total, 0::numeric) AS resultat_exploitation
FROM agency_financial_months m
    LEFT JOIN LATERAL (SELECT sum(c.amount) AS total FROM agency_financial_charges c WHERE c.agency_id = m.agency_id AND c.charge_type ~~ 'agence_%'::text AND c.start_month <= make_date(m.year, m.month, 1) AND (c.end_month IS NULL OR c.end_month >= make_date(m.year, m.month, 1))) c_agence ON true
    LEFT JOIN LATERAL (SELECT sum(c.amount) AS total FROM agency_financial_charges c WHERE c.agency_id = m.agency_id AND c.charge_type ~~ 'location_%'::text AND c.start_month <= make_date(m.year, m.month, 1) AND (c.end_month IS NULL OR c.end_month >= make_date(m.year, m.month, 1))) c_location ON true
    LEFT JOIN LATERAL (SELECT sum(c.amount) AS total FROM agency_financial_charges c WHERE c.agency_id = m.agency_id AND c.charge_type ~~ 'externe_%'::text AND c.start_month <= make_date(m.year, m.month, 1) AND (c.end_month IS NULL OR c.end_month >= make_date(m.year, m.month, 1))) c_externes ON true
    LEFT JOIN LATERAL (SELECT sum(c.amount) AS total FROM agency_financial_charges c WHERE c.agency_id = m.agency_id AND c.charge_type ~~ 'autre_%'::text AND c.start_month <= make_date(m.year, m.month, 1) AND (c.end_month IS NULL OR c.end_month >= make_date(m.year, m.month, 1))) c_autres ON true;