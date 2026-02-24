import { createClient } from '@supabase/supabase-js';

// --- CONFIGURACIÓN ---
// Estas son las mismas que usaste en migrate.js
const SUPABASE_URL = 'https://cfkgflwtfsajbzrlftis.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'REEMPLAZAR_CON_SERVICE_ROLE_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function createAdmin() {
    const email = 'businatrabajo@gmail.com'; // <--- CAMBIA ESTO
    const password = 'Domuyo17';      // <--- CAMBIA ESTO

    console.log(`🚀 Creando administrador: ${email}...`);

    const { data: { user }, error } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { role: 'admin' }
    });

    if (error) {
        console.error('❌ Error:', error.message);
    } else {
        console.log('✅ Administrador creado con éxito:', user.id);
        console.log('Ahora ya puedes loguearte en la Web con estos datos.');
    }
}

createAdmin();
