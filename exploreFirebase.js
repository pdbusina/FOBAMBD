import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function explore() {
    console.log('🔍 Explorando Firebase Firestore (listDocuments)...');

    try {
        const collections = await db.listCollections();
        for (const col of collections) {
            console.log(`📂 Nivel 1: ${col.id}`);

            const docs = await col.listDocuments();
            console.log(`   📊 Total documentos: ${docs.length}`);
            for (const doc of docs.slice(0, 10)) {
                console.log(`   📄 Documento ID: ${doc.id}`);
                const subCols = await doc.listCollections();
                for (const sc of subCols) {
                    console.log(`      📁 Nivel 2: ${sc.id}`);
                    const subDocs = await sc.listDocuments();
                    console.log(`         📊 Total doc sub: ${subDocs.length}`);
                    for (const sd of subDocs.slice(0, 5)) {
                        console.log(`         📄 Doc N2 ID: ${sd.id}`);
                        const level3 = await sd.listCollections();
                        for (const l3 of level3) {
                            console.log(`            📁 Nivel 3: ${l3.id}`);
                            const l3docs = await l3.limit(1).get();
                            if (l3docs.size > 0) {
                                console.log(`               ✅ DATOS:`, JSON.stringify(l3docs.docs[0].data()).substring(0, 100));
                            }
                        }
                    }
                }
            }
        }

    } catch (err) {
        console.error('❌ Error Firestore:', err);
    }

    console.log('\n🔍 Probando Realtime Database...');
    try {
        const rtdb = admin.database();
        const snapshot = await rtdb.ref('/').limitToFirst(1).get();
        if (snapshot.exists()) {
            console.log('✅ ¡ENCONTRADOS datos en Realtime Database!');
        } else {
            console.log('❌ Realtime Database vacía.');
        }
    } catch (err) {
        console.log('❌ No parece haber Realtime Database activa o sin permisos.');
    }

    process.exit();
}

explore();
