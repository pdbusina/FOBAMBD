-- SQL para Sincronizar Roles y Restaurar Acceso a Tablas
-- Pegar esto en el SQL Editor de Supabase (Dashboard -> SQL Editor -> New Query)

-- 1. Asegurar que los usuarios administrativos tengan el metadato 'role': 'admin'
-- Reemplaza con las IDs si las conoces, o busca por email:
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email IN ('businatrabajo@gmail.com', 'preceptores@fobam.esmn');

-- 2. Verificar que las polÃ­ticas RLS permitan el acceso basado en ese rol
-- (Asumiendo que las tablas usan auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')

-- Si los datos siguen sin aparecer, podrÃ­as necesitar forzar el RLS para que sea mÃ¡s permisivo temporalmente:
-- ALTER TABLE perfiles DISABLE ROW LEVEL SECURITY; -- (Solo si nada mÃ¡s funciona)
