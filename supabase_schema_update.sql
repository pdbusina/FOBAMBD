-- 1. Extender la tabla perfiles con roles y seguridad
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS rol text DEFAULT 'estudiante';
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS autorizado boolean DEFAULT false;
