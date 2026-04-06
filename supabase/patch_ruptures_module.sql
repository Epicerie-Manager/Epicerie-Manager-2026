ALTER TABLE employees
ADD COLUMN IF NOT EXISTS matricule_metier text;

COMMENT ON COLUMN employees.matricule_metier IS
  'Matricule Auchan issu de l''appli métier OOS (ex: N000362027, DDF0422004)';

UPDATE employees SET matricule_metier = 'DDF0422004' WHERE name ILIKE 'SFEDJ%';
UPDATE employees SET matricule_metier = 'FRA0545037' WHERE name ILIKE 'BLANC%';
UPDATE employees SET matricule_metier = 'N000017859' WHERE name ILIKE 'BOUTAKOURTE%';
UPDATE employees SET matricule_metier = 'N000069636' WHERE name ILIKE 'ARGANT%';
UPDATE employees SET matricule_metier = 'N000388084' WHERE name ILIKE 'ZOURIH%';
UPDATE employees SET matricule_metier = 'N000409787' WHERE name ILIKE 'ZADRAN%';
UPDATE employees SET matricule_metier = 'N000439748' WHERE name ILIKE 'DRISOUALI%';
UPDATE employees SET matricule_metier = 'N000440025' WHERE name ILIKE 'RIFF%';
UPDATE employees SET matricule_metier = 'N000447856' WHERE name ILIKE 'DUVAL%';
UPDATE employees SET matricule_metier = 'N000362027' WHERE name ILIKE 'HOARAU%';

ALTER TABLE ruptures_detail ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS collab_read_own_ruptures ON ruptures_detail;

CREATE POLICY collab_read_own_ruptures ON ruptures_detail
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.employee_id = ruptures_detail.employee_id
    )
  );
