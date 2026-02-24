-- CORRECCIÓN DE POLÍTICAS PARA ADMINS
-- Ejecutar esto en el SQL Editor de Supabase

-- 1. Política para PERFILES (Lectura/Escritura total para admins)
CREATE POLICY "Admins full access profiles" ON perfiles
    FOR ALL USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- 2. Política para MATRICULACIONES
CREATE POLICY "Admins full access matriculaciones" ON matriculaciones
    FOR ALL USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- 3. Política para NOTAS
CREATE POLICY "Admins full access notas" ON notas
    FOR ALL USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- 4. Política para CURSADAS ACTIVAS
CREATE POLICY "Admins full access cursadas" ON cursadas_activas
    FOR ALL USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- 5. Política para INSTRUMENTOS (Habilitar RLS si no estaba)
ALTER TABLE instrumentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access instrumentos" ON instrumentos
    FOR ALL USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');
CREATE POLICY "Public select instrumentos" ON instrumentos
    FOR SELECT USING (true);

-- 6. Política para MATERIAS (Habilitar RLS si no estaba)
ALTER TABLE materias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access materias" ON materias
    FOR ALL USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');
CREATE POLICY "Public select materias" ON materias
    FOR SELECT USING (true);
