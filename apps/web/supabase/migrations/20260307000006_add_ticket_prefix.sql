-- LP-050: Add ticket_prefix column to projects
-- Stores 2-5 uppercase letter prefix for auto-numbering tickets (e.g., "LP", "SB", "WM")

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS ticket_prefix TEXT DEFAULT NULL;

-- Validate: 2-5 uppercase letters only
ALTER TABLE projects
ADD CONSTRAINT ticket_prefix_format
CHECK (ticket_prefix IS NULL OR ticket_prefix ~ '^[A-Z]{2,5}$');

COMMENT ON COLUMN projects.ticket_prefix IS 'Ticket prefix for auto-numbering (e.g., LP, SB). 2-5 uppercase letters.';
