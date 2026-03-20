ALTER TABLE public.social_content_suggestions DROP CONSTRAINT IF EXISTS social_content_suggestions_topic_type_check;
ALTER TABLE public.social_content_suggestions ADD CONSTRAINT social_content_suggestions_topic_type_check CHECK (
  topic_type = ANY (
    ARRAY[
      'awareness_day'::text,
      'seasonal_tip'::text,
      'realisation'::text,
      'local_branding'::text,
      'educational'::text,
      'urgence'::text,
      'prevention'::text,
      'amelioration'::text,
      'conseil'::text,
      'preuve'::text,
      'saisonnier'::text,
      'contre_exemple'::text,
      'pedagogique'::text
    ]
  )
);