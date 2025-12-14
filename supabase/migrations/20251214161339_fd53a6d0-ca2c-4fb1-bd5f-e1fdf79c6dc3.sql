-- Drop old constraint and add new one with all notification types
ALTER TABLE rh_notifications DROP CONSTRAINT IF EXISTS rh_notifications_notification_type_check;

ALTER TABLE rh_notifications ADD CONSTRAINT rh_notifications_notification_type_check 
CHECK (notification_type = ANY (ARRAY[
  'DOCUMENT_REQUEST_RESPONSE'::text, 
  'NEW_DOCUMENT'::text, 
  'CONTRACT_UPDATE'::text,
  'REQUEST_CREATED'::text,
  'REQUEST_COMPLETED'::text,
  'REQUEST_REJECTED'::text,
  'REQUEST_IN_PROGRESS'::text
]));