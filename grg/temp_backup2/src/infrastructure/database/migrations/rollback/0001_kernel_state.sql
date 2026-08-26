-- Destructive rollback. Export and verify a backup before running this file.
BEGIN;
DROP TABLE IF EXISTS fenix.kernel_state;
DELETE FROM fenix.schema_migrations WHERE version = 1;
COMMIT;
