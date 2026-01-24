-- Migration: Drop legacy N1 portal tables (removed in v0.8.3)
-- These tables were part of the technician/employee portal that has been removed
-- All tables are empty (0 rows) as verified before cleanup

-- Drop planning_notifications (planning signature workflow N1)
DROP TABLE IF EXISTS planning_notifications CASCADE;

-- Drop leave_requests (employee leave requests - never fully implemented)
DROP TABLE IF EXISTS leave_requests CASCADE;

-- Drop expense_requests (employee expense reports - never fully implemented)
DROP TABLE IF EXISTS expense_requests CASCADE;

-- Drop rh_notifications (employee HR notifications - never fully implemented)
DROP TABLE IF EXISTS rh_notifications CASCADE;

-- Drop planning_signatures (N1 signature workflow - no longer used)
DROP TABLE IF EXISTS planning_signatures CASCADE;