-- ============================================
-- Reset Data Script
-- Supprime toutes les donnees mais conserve :
--   - les admins dans profiles
--   - la structure des tables (schema)
-- ============================================

BEGIN;

-- Desactiver les contraintes FK le temps du nettoyage
SET session_replication_role = 'replica';

-- Vider les tables de donnees (ordre inverse des FK)
DELETE FROM disbursement_items;
DELETE FROM disbursements;
DELETE FROM attendances;
DELETE FROM meetings;
DELETE FROM special_payments;
DELETE FROM special_contributions;
DELETE FROM annual_payments;
DELETE FROM annual_contributions;
DELETE FROM members;
DELETE FROM import_logs;
DELETE FROM settings;

-- Supprimer les profils non-admin (gestionnaires)
DELETE FROM profiles WHERE role != 'admin';

-- Reactiver les contraintes FK
SET session_replication_role = 'origin';

COMMIT;
