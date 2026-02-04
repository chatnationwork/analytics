-- Clear ALL inbox sessions (assigned, unassigned, and resolved).
-- Resolutions are deleted first (FK NO ACTION); messages cascade when sessions are deleted.
-- 1. Delete all resolutions (they reference inbox_sessions)
DELETE FROM resolutions;
-- 2. Delete all inbox sessions (messages cascade automatically)
DELETE FROM inbox_sessions;