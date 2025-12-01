import React, { useState, useEffect } from 'react';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    setDoc,
    Timestamp 
} from 'firebase/firestore';

// --- CONSTANTES Y LÓGICA DE CORRELATIVAS (Reutilizada) ---
const INSTRUMENTOS_530 = [
    "Arpa", "Bajo Eléctrico", "Bandoneón", "Batería", "Clarinete", 
    "Contrabajo", "Corno", "Flauta Dulce", "Flauta Traversa", 
    "Guitarra Clásica", "Guitarra Eléctrica", "Guitarra Popular", 
    "Oboe", "Percusión Académica", "Percusión Folklórica", 
    "Piano", "Saxo", "Sikus-Quena", "Trombón", "Trompeta", 
    "Violín", "Viola", "Violoncello"
];

const CORRELATIVAS_FIJAS = {
    "Canto 2": ["Canto 1", "Lenguaje Musical 1"],
    "Dicción Italiana 2": ["Dicción Italiana 1"],
    "Canto 3": ["Canto 2", "Lenguaje Musical 2", "Ensamble 1"],
    "Entrenamiento Escénico": ["Expresión Corporal", "Lenguaje Musical 2"],
    "Canto 4": ["Canto 3", "Lenguaje Musical 3", "Ensamble 2", "Apreciación Musical 1", "Entrenamiento Escénico", "Dicción Alemana 1", "Educación Vocal"],
    "Dicción Alemana 2": ["Canto 3", "Lenguaje Musical 3", "Ensamble 2", "Apreciación Musical 1", "Entrenamiento Escénico", "Dicción Alemana 1", "Educación Vocal"],
    "Canto 5": ["Canto 4", "Lenguaje Musical 4", "Ensamble 3"],
    "Canto Popular 2": ["Canto Popular 1", "Lenguaje Musical 1"],
    "Dicción Portuguesa 2": ["Dicción Portuguesa 1"],
    "Canto Popular 3": ["Canto Popular 2", "Lenguaje Musical 2", "Ensamble 1"],
    "Danzas Folklóricas": ["Expresión Corporal"], 
    "Canto Popular 4": ["Canto Popular 3", "Lenguaje Musical 3", "Ensamble 2", "Apreciación Musical 1", "Danzas Folklóricas", "Dicción Inglesa 1", "Educación Vocal"],
    "Dicción Inglesa 2": ["Canto Popular 3", "Lenguaje Musical 3", "Ensamble 2", "Apreciación Musical 1", "Danzas Folklóricas", "Dicción Inglesa 1", "Educación Vocal"],
    "Canto Popular 5": ["Canto Popular 4", "Lenguaje Musical 4", "Ensamble 3"]
};

const HORARIOS = [
    "08:00", "08:45", "09:30", "10:15", "11:00", "11:45", "12:30", 
    "13:30", "14:15", "15:00", "15:45", "16:30", "17:15", "18:00", 
    "18:45", "19:30", "20:15", "21:00", "21:40", "22:20", "23:00"
];

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

const normalizarTexto = (texto) => {
    return texto.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/-/g, " ");
};

const getReglasPorPlan = (nombrePlan) => {
    let reglas = { ...CORRELATIVAS_FIJAS }; 
    let esPlan530 = false;
    const nombrePlanNorm = normalizarTexto(nombrePlan || "");
    const instrumentoEncontrado = INSTRUMENTOS_530.find(inst => 
        nombrePlanNorm.includes(normalizarTexto(inst))
    );

    if (instrumentoEncontrado) {
        esPlan530 = true;
        const instrumento = INSTRUMENTOS_530.find(i => normalizarTexto(i) === normalizarTexto(instrumentoEncontrado));
        const I1 = `Instrumento Fundamental 1: ${instrumento}`;
        const I2 = `Instrumento Fundamental 2: ${instrumento}`;
        const I3 = `Instrumento Fundamental 3: ${instrumento}`;
        const I4 = `Instrumento Fundamental 4: ${instrumento}`;
        const I5 = `Instrumento Fundamental 5: ${instrumento}`;

        reglas[I2] = [I1, "Lenguaje Musical 1"];
        reglas["Lenguaje Musical 2"] = [I1, "Lenguaje Musical 1"];
        reglas["Ensamble 1"] = [I1, "Lenguaje Musical 1"];
        reglas["Coro 2"] = ["Coro 1"];

        const reqAno3 = [I2, "Lenguaje Musical 2", "Ensamble 1"];
        reglas[I3] = reqAno3;
        reglas["Lenguaje Musical 3"] = reqAno3;
        reglas["Ensamble 2"] = reqAno3;
        reglas["Apreciación Musical 1"] = [I1, "Lenguaje Musical 2"];

        const reqAno4 = [I3, "Lenguaje Musical 3", "Ensamble 2", "Apreciación Musical 1", "Expresión Corporal", "Danzas Folklóricas"];
        reglas[I4] = reqAno4;
        reglas["Lenguaje Musical 4"] = reqAno4;
        reglas["Ensamble 3"] = reqAno4;
        reglas["Apreciación Musical 2"] = reqAno4;
        reglas["Optativa 1"] = reqAno4;

        const reqAno5 = [I4, "Lenguaje Musical 4", "Ensamble 3"];
        reglas[I5] = reqAno5;
        reglas["Seminario Armonía"] = reqAno5;
        reglas["Seminario Ritmo"] = reqAno5;
        reglas["Ensamble 4"] = reqAno5;
        reglas["Optativa 2"] = ["Optativa 1"];
    }
    return { reglas, esPlan530 };
};

// --- COMPONENTE ---
const CursadosActivos = ({ db, appId, showMessage }) => {
    const [dni, setDni] = useState('');
    const [loading, setLoading] = useState(false);
    const [studentData, setStudentData] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState('');
    const [rows, setRows] = useState([]); // Aquí guardaremos las materias habilitadas + datos de cursada
    const currentYear = new Date().getFullYear().toString();

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!dni) return;
        setLoading(true);
        setRows([]);
        setStudentData(null);
        setSelectedPlan('');

        try {
            // 1. Buscar Matriculación (para saber el plan)
            const matRef = collection(db, 'artifacts', appId, 'public', 'data', 'matriculation');
            const qMat = query(matRef, where("dni", "==", dni), where("cicloLectivo", "==", currentYear));
            const matSnap = await getDocs(qMat);

            if (matSnap.empty) {
                showMessage(`El DNI ${dni} no está matriculado en el ciclo ${currentYear}.`, true);
                setLoading(false);
                return;
            }

            // Tomamos el primer plan encontrado (si tiene varios, podrías añadir un selector como en el checker)
            const matriculaData = matSnap.docs[0].data();
            const planTarget = matriculaData.plan;
            
            setStudentData({
                nombres: matriculaData.nombres,
                apellidos: matriculaData.apellidos,
                plan: planTarget
            });
            setSelectedPlan(planTarget);

            // 2. Obtener materias APROBADAS (Historia académica)
            const notasRef = collection(db, 'artifacts', appId, 'public', 'data', 'notas');
            const qNotas = query(notasRef, where("dni", "==", dni), where("plan", "==", planTarget));
            const notasSnap = await getDocs(qNotas);
            
            const aprobadas = new Set();
            notasSnap.forEach(doc => {
                const d = doc.data();
                if (["Promoción", "Examen", "Equivalencia"].includes(d.condicion)) {
                    aprobadas.add(d.materia);
                }
            });

            // 3. Obtener TODAS las materias del plan
            const materiasRef = collection(db, 'artifacts', appId, 'public', 'data', 'materias');
            const qMaterias = query(materiasRef, where("plan", "==", planTarget));
            const materiasSnap = await getDocs(qMaterias);
            const todasLasMaterias = [];
            materiasSnap.forEach(doc => todasLasMaterias.push(doc.data().materia));

            // 4. Calcular HABILITADAS (Logic del CorrelativasChecker)
            const { reglas, esPlan530 } = getReglasPorPlan(planTarget);
            const tieneMovimiento = esPlan530 && (aprobadas.has("Expresión Corporal") || aprobadas.has("Danzas Folklóricas"));
            
            const habilitadas = [];

            todasLasMaterias.forEach(materia => {
                if (aprobadas.has(materia)) return; // Ya aprobada

                // Lógica de movimiento (Plan 530)
                if (esPlan530 && tieneMovimiento && (materia === "Expresión Corporal" || materia === "Danzas Folklóricas")) return;

                const requisitos = reglas[materia] || [];
                if (requisitos.length === 0) {
                    habilitadas.push(materia);
                } else {
                    const faltantes = requisitos.filter(req => {
                        if (esPlan530 && (req === "Expresión Corporal" || req === "Danzas Folklóricas")) {
                            if (tieneMovimiento) return false;
                        }
                        return !aprobadas.has(req);
                    });
                    if (faltantes.length === 0) habilitadas.push(materia);
                }
            });

            // 5. Buscar si ya existen datos de CURSADA ACTIVA guardados en Firebase
            const cursadasRef = collection(db, 'artifacts', appId, 'public', 'data', 'cursadas');
            const qCursadas = query(
                cursadasRef, 
                where("dni", "==", dni), 
                where("plan", "==", planTarget),
                where("ciclo_lectivo", "==", currentYear)
            );
            const cursadasSnap = await getDocs(qCursadas);
            const cursadasGuardadas = {};
            cursadasSnap.forEach(doc => {
                const data = doc.data();
                cursadasGuardadas[data.materia] = { id: doc.id, ...data };
            });

            // 6. Fusionar Habilitadas con Datos Guardados
            const finalRows = habilitadas.map(materia => {
                const guardado = cursadasGuardadas[materia] || {};
                return {
                    materia: materia,
                    dia: guardado.dia || '',
                    hora: guardado.hora || '',
                    docente: guardado.docente || '',
                    ciclo_lectivo: currentYear,
                    condicion: guardado.condicion || 'Regular',
                    nota: guardado.nota || '',
                    docId: guardado.id || null // Si tiene ID, es update. Si no, es create.
                };
            }).sort((a,b) => a.materia.localeCompare(b.materia));

            setRows(finalRows);

        } catch (error) {
            console.error(error);
            showMessage(`Error al cargar datos: ${error.message}`, true);
        } finally {
            setLoading(false);
        }
    };

    const handleRowChange = (index, field, value) => {
        const newRows = [...rows];
        newRows[index][field] = value;
        setRows(newRows);
    };

    const handleSave = async () => {
        setLoading(true);
        const cursadasRef = collection(db, 'artifacts', appId, 'public', 'data', 'cursadas');
        let processed = 0;

        try {
            for (const row of rows) {
                // Solo guardamos si el usuario llenó al menos el Docente o el Día (para no guardar basura en blanco)
                // O si ya existía (tiene docId) y queremos actualizar cambios
                if (row.docente || row.dia || row.docId) {
                    const dataToSave = {
                        dni: dni,
                        nombres: studentData.nombres,
                        apellidos: studentData.apellidos,
                        plan: studentData.plan,
                        materia: row.materia,
                        dia: row.dia,
                        hora: row.hora,
                        docente: row.docente,
                        ciclo_lectivo: row.ciclo_lectivo,
                        condicion: row.condicion,
                        nota: row.nota,
                        timestamp: Timestamp.now()
                    };

                    // Generamos un ID único compuesto para evitar duplicados: DNI_MATERIA_CICLO
                    // Limpiamos espacios en la materia para el ID
                    const compositeId = `${dni}_${row.materia.replace(/\s+/g, '')}_${currentYear}`;
                    const docRef = doc(cursadasRef, compositeId);

                    await setDoc(docRef, dataToSave, { merge: true });
                    processed++;
                }
            }
            showMessage(`Se actualizaron ${processed} registros de cursada exitosamente.`, false);
        } catch (error) {
            console.error(error);
            showMessage(`Error al guardar: ${error.message}`, true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Gestión de Cursados Activos</h2>
            <p className="text-gray-600 mb-6">Asigne días, horarios y docentes a las materias que el estudiante está habilitado a cursar.</p>

            {/* BUSCADOR */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8 flex gap-4 items-end">
                <div className="flex-grow">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">DNI del Estudiante</label>
                    <input 
                        type="text" 
                        value={dni}
                        onChange={(e) => setDni(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Ej: 30123456"
                    />
                </div>
                <button 
                    onClick={handleSearch}
                    disabled={loading}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-indigo-700 transition disabled:bg-gray-300"
                >
                    {loading ? "Cargando..." : "Buscar Cursadas"}
                </button>
            </div>

            {/* RESULTADOS Y TABLA EDITABLE */}
            {studentData && rows.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="p-6 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold text-indigo-900">{studentData.apellidos}, {studentData.nombres}</h3>
                            <p className="text-sm text-indigo-700">Plan: {studentData.plan} | Ciclo Lectivo: {currentYear}</p>
                        </div>
                        <button 
                            onClick={handleSave}
                            disabled={loading}
                            className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 shadow-md transition disabled:bg-gray-400"
                        >
                            {loading ? "Guardando..." : "Guardar Cambios"}
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Materia</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase w-32">Día</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase w-32">Hora</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Docente</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase w-32">Condición</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase w-24">Nota (Parcial)</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {rows.map((row, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.materia}</td>
                                        
                                        {/* DÍA */}
                                        <td className="px-2 py-2">
                                            <select 
                                                value={row.dia}
                                                onChange={(e) => handleRowChange(index, 'dia', e.target.value)}
                                                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                            >
                                                <option value="">-</option>
                                                {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </td>

                                        {/* HORA */}
                                        <td className="px-2 py-2">
                                            <select 
                                                value={row.hora}
                                                onChange={(e) => handleRowChange(index, 'hora', e.target.value)}
                                                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                            >
                                                <option value="">-</option>
                                                {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                        </td>

                                        {/* DOCENTE */}
                                        <td className="px-2 py-2">
                                            <input 
                                                type="text" 
                                                value={row.docente}
                                                onChange={(e) => handleRowChange(index, 'docente', e.target.value)}
                                                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                placeholder="Nombre Docente"
                                            />
                                        </td>

                                        {/* CONDICIÓN */}
                                        <td className="px-2 py-2">
                                            <select 
                                                value={row.condicion}
                                                onChange={(e) => handleRowChange(index, 'condicion', e.target.value)}
                                                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                            >
                                                <option value="Regular">Regular</option>
                                                <option value="Libre">Libre</option>
                                                <option value="Oyente">Oyente</option>
                                            </select>
                                        </td>

                                        {/* NOTA */}
                                        <td className="px-2 py-2">
                                            <input 
                                                type="text" 
                                                value={row.nota}
                                                onChange={(e) => handleRowChange(index, 'nota', e.target.value)}
                                                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                placeholder="-"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {studentData && rows.length === 0 && (
                <div className="bg-yellow-50 p-4 border border-yellow-200 rounded-lg text-yellow-800 mt-4">
                    Este estudiante no tiene materias habilitadas por correlatividad o ya aprobó todo el plan.
                </div>
            )}
        </div>
    );
};

export default CursadosActivos;