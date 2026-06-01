-- Supprime la contrainte UNIQUE et NOT NULL sur telephone
-- pour permettre l'import de membres sans numero

ALTER TABLE members DROP CONSTRAINT IF EXISTS members_telephone_key;
ALTER TABLE members ALTER COLUMN telephone DROP NOT NULL;
DROP INDEX IF EXISTS idx_members_telephone;
CREATE INDEX idx_members_telephone ON members(telephone);
