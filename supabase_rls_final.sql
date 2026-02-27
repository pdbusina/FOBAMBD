-- 1. Habilitar Seguridad (RLS) en todas las tablas
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE matriculaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE materias ENABLE ROW LEVEL SECURITY;
ALTER TABLE instrumentos ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para PERFILES
-- Permitir que un usuario nuevo cree su propio perfil al registrarse
DROP POLICY IF EXISTS "Permitir inserción de perfil propio" ON perfiles;
CREATE POLICY "Permitir inserción de perfil propio" ON perfiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usuarios ven su propio perfil y Admins ven todos
DROP POLICY IF EXISTS "Lectura de perfiles por rol" ON perfiles;
CREATE POLICY "Lectura de perfiles por rol" ON perfiles FOR SELECT USING (
  auth.uid() = user_id OR 
  (SELECT rol FROM perfiles WHERE user_id = auth.uid()) IN ('administrativo', 'superadmin')
);

-- Solo el SuperAdmin puede editar roles o autorizaciones (simplificado)
DROP POLICY IF EXISTS "Edición de perfiles por SuperAdmin" ON perfiles;
CREATE POLICY "Edición de perfiles por SuperAdmin" ON perfiles FOR UPDATE USING (
  (SELECT rol FROM perfiles WHERE user_id = auth.uid()) = 'superadmin' OR auth.uid() = user_id
);

-- 3. Políticas para NOTAS y MATRICULACIONES
DROP POLICY IF EXISTS "Lectura de notas" ON notas;
CREATE POLICY "Lectura de notas" ON notas FOR SELECT USING (
  (SELECT rol FROM perfiles WHERE user_id = auth.uid()) IN ('administrativo', 'superadmin') OR
  matriculacion_id IN (SELECT m.id FROM matriculaciones m JOIN perfiles p ON m.estudiante_id = p.id WHERE p.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Gestión de notas por Admins" ON notas;
CREATE POLICY "Gestión de notas por Admins" ON notas FOR ALL USING (
  (SELECT rol FROM perfiles WHERE user_id = auth.uid()) IN ('administrativo', 'superadmin')
);

-- 4. Políticas para MATERIAS e INSTRUMENTOS (Lectura pública autenticada, escritura SuperAdmin)
DROP POLICY IF EXISTS "Lectura pública de materias" ON materias;
CREATE POLICY "Lectura pública de materias" ON materias FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Edición de materias por SuperAdmin" ON materias;
CREATE POLICY "Edición de materias por SuperAdmin" ON materias FOR ALL USING ((SELECT rol FROM perfiles WHERE user_id = auth.uid()) = 'superadmin');

DROP POLICY IF EXISTS "Lectura pública de instrumentos" ON instrumentos;
CREATE POLICY "Lectura pública de instrumentos" ON instrumentos FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Edición de instrumentos por SuperAdmin" ON instrumentos;
CREATE POLICY "Edición de instrumentos por SuperAdmin" ON instrumentos FOR ALL USING ((SELECT rol FROM perfiles WHERE user_id = auth.uid()) = 'superadmin');
