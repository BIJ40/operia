-- Seed flow_blocks with dimensions_hxl block
INSERT INTO flow_blocks (id, name, category, icon, schema, is_active)
VALUES (
  'dimensions_hxl',
  'Dimensions H×L',
  'Mesures',
  'Ruler',
  '{
    "fields": [
      {
        "key": "hauteur",
        "label": "Hauteur",
        "type": "number",
        "required": true,
        "unit": "cm",
        "min": 0
      },
      {
        "key": "largeur",
        "label": "Largeur",
        "type": "number",
        "required": true,
        "unit": "cm",
        "min": 0
      }
    ],
    "computed": [
      {
        "key": "surface",
        "label": "Surface",
        "formula": "hauteur * largeur / 10000",
        "unit": "m²"
      }
    ],
    "outputs": ["hauteur", "largeur", "surface"]
  }'::jsonb,
  true
)
ON CONFLICT (id) DO NOTHING;