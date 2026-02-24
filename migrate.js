import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// --- CONFIGURACIÓN ---
// Reemplaza estos valores con tus credenciales reales
const SUPABASE_URL = 'https://cfkgflwtfsajbzrlftis.supabas.co';
const SUPABASE_SERVICE_ROLE_KEY = 'REEMPLAZAR_CON_SERVICE_ROLE_KEY'; // <--- IMPORTANTE: Usa la clave secreta (service_role) de Supabase
const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));

// Inicializar Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
const APP_ID = "fobamedusis"; // Project ID de Firebase

// Inicializar Supabase Admin Client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function migrate() {
    console.log('🚀 Iniciando Migración Integral (Firebase -> Supabase)');

    try {
        const rootRef = db.collection('artifacts').doc(APP_ID).collection('public').doc('data');

        // 1. MIGRAR INSTRUMENTOS
        console.log('🎹 Consultando Instrumentos en Firebase...');
        const instSnap = await rootRef.collection('instrumentos').get();
        console.log(`📊 Encontrados: ${instSnap.size} instrumentos`);

        const instrumentosMap = {};
        for (const doc of instSnap.docs) {
            const data = doc.data();
            const { data: sInst, error } = await supabase.from('instrumentos').upsert({ nombre: data.instrumento }, { onConflict: 'nombre' }).select().single();
            if (error) {
                console.error(`❌ Error en instrumento ${data.instrumento}:`, error.message);
            } else {
                instrumentosMap[data.instrumento] = sInst.id;
            }
        }

        // 2. MIGRAR MATERIAS
        console.log('📚 Consultando Materias en Firebase...');
        const matSnap = await rootRef.collection('materias').get();
        console.log(`📊 Encontradas: ${matSnap.size} materias`);

        const materiasMap = {};
        for (const doc of matSnap.docs) {
            const data = doc.data();
            const { data: sMat, error } = await supabase.from('materias').upsert({
                plan: data.plan, anio: parseInt(data.anio), nombre: data.materia
            }, { onConflict: 'plan, nombre' }).select().single();
            if (error) {
                console.error(`❌ Error en materia ${data.materia}:`, error.message);
            } else {
                materiasMap[`${data.plan}|${data.materia}`] = sMat.id;
            }
        }

        // 3. MIGRAR PERFILES Y CREAR USUARIOS AUTH
        console.log('👤 Consultando Perfiles en Firebase...');
        const stuSnap = await rootRef.collection('students').get();
        console.log(`📊 Encontrados: ${stuSnap.size} estudiantes`);

        const perfilesMap = {};

        for (const doc of stuSnap.docs) {
            const s = doc.data();
            const email = s.email || `${s.dni}@fobam.edu.ar`;

            const { data: userData, error: authError } = await supabase.auth.admin.createUser({
                email: email,
                password: `Fobam.${s.dni}`,
                email_confirm: true,
                user_metadata: { dni: s.dni, role: 'student' }
            });

            let authId;
            if (authError && authError.message.includes('already registered')) {
                const { data: list } = await supabase.auth.admin.listUsers();
                authId = list.users.find(u => u.email === email)?.id;
            } else if (!authError) {
                authId = userData.user.id;
            }

            if (authId) {
                const { error: pError } = await supabase.from('perfiles').upsert({
                    id: authId,
                    dni: s.dni,
                    apellido: s.apellidos,
                    nombre: s.nombres,
                    email: email,
                    direccion: s.direccion || '',
                    ciudad: s.ciudad || '',
                    telefono: s.telefono || '',
                    telefono_urgencias: s.telefono_urgencias || '',
                    nacionalidad: s.nacionalidad || '',
                    genero: s.genero || '',
                    fecha_nacimiento: s.fecha_nacimiento || null
                });
                if (pError) console.error(`❌ Error en perfil DNI ${s.dni}:`, pError.message);
                else perfilesMap[s.dni] = authId;
            }
        }

        // 4. MIGRAR MATRICULACIONES
        console.log('📝 Consultando Matriculaciones en Firebase...');
        const matricSnap = await rootRef.collection('matriculation').get();
        console.log(`📊 Encontradas: ${matricSnap.size} matriculaciones`);

        const matriculacionesMap = {};
        for (const doc of matricSnap.docs) {
            const m = doc.data();
            const estudiante_id = perfilesMap[m.dni];
            const inst_id = instrumentosMap[m.instrumento];

            if (estudiante_id) {
                const { data: sMatric, error } = await supabase.from('matriculaciones').upsert({
                    estudiante_id: estudiante_id,
                    plan: m.plan,
                    ciclo_lectivo: parseInt(m.cicloLectivo),
                    instrumento_id: inst_id
                }, { onConflict: 'estudiante_id, plan, ciclo_lectivo' }).select().single();
                if (error) console.error(`❌ Error en matrícula DNI ${m.dni}:`, error.message);
                else matriculacionesMap[`${m.dni}|${m.plan}|${m.cicloLectivo}`] = sMatric.id;
            }
        }

        // 5. MIGRAR NOTAS
        console.log('📊 Consultando Notas en Firebase...');
        const nSnap = await rootRef.collection('notas').get();
        console.log(`📊 Encontradas: ${nSnap.size} notas`);

        for (const doc of nSnap.docs) {
            const n = doc.data();
            const matric_id = matriculacionesMap[`${n.dni}|${n.plan}|${new Date(n.fecha).getFullYear()}`] ||
                matriculacionesMap[`${n.dni}|${n.plan}|${new Date().getFullYear()}`];
            const mat_id = materiasMap[`${n.plan}|${n.materia}`];

            if (matric_id && mat_id) {
                const { error } = await supabase.from('notas').insert({
                    matriculacion_id: matric_id,
                    materia_id: mat_id,
                    calificacion: n.nota,
                    condicion: n.condicion,
                    fecha: n.fecha || null,
                    libro_folio: n.libro_folio || '',
                    observaciones: n.observaciones || '',
                    obs_detalle: n.obs_optativa_ensamble || ''
                });
                if (error) console.error(`❌ Error en nota ${n.dni}-${n.materia}:`, error.message);
            }
        }

        console.log('\n✅ Proceso de Diagnóstico Finalizado');
        console.log('------------------------------------');
        console.log(`Total Perfiles Migrados: ${Object.keys(perfilesMap).length}`);
        console.log(`Total Matrículas Migradas: ${Object.keys(matriculacionesMap).length}`);

    } catch (err) {
        console.error('❌ Error fatal en la migración:', err);
    } finally {
        process.exit();
    }
}

migrate();
