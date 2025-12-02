import React, { useState } from 'react';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    setDoc,
    Timestamp 
} from 'firebase/firestore';

// --- CONSTANTES ---
const INSTRUMENTOS_530 = [
    "Arpa", "Bajo Eléctrico", "Bandoneon", "Batería", "Clarinete", 
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

const CursadosActivos = ({ db, appId, showMessage }) => {
    const [dni, setDni] = useState('');
    const [loading, setLoading] = useState(false);
    
    const [studentData, setStudentData] = useState(null);
    const [availablePlans, setAvailablePlans] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState('');
    const [rows, setRows] = useState([]);
    const [allHorarios, setAllHorarios] = useState([]);
    const [conteoInscriptos, setConteoInscriptos] = useState({}); // Mapa: ID_Horario -> Cantidad Inscritos

    const currentYear = new Date().getFullYear().toString();

    // --- BÚSQUEDA ---
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!dni) return;
        setLoading(true);
        setRows([]);
        setStudentData(null);
        setAvailablePlans([]);
        setSelectedPlan('');

        try {
            // A. CARGAR HORARIOS Y CONTAR INSCRITOS
            // 1. Traer horarios
            const horariosRef = collection(db, 'artifacts', appId, 'public', 'data', 'horarios');
            const horariosSnap = await getDocs(horariosRef);
            const horariosList = horariosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllHorarios(horariosList);

            // 2. Traer TODAS las cursadas del año (para contar cupos)
            const todasCursadasRef = collection(db, 'artifacts', appId, 'public', 'data', 'cursadas');
            const qTodas = query(todasCursadasRef, where("ciclo_lectivo", "==", currentYear));
            const todasSnap = await getDocs(qTodas);
            
            // 3. Generar Mapa de Conteo
            const mapaConteo = {};
            todasSnap.forEach(doc => {
                const data = doc.data();
                // Identificamos el horario por coincidencia exacta de materia/dia/hora/docente
                // Ojo: Si guardas el ID del horario en la cursada sería mejor, pero por ahora lo inferimos
                const horarioCorrespondiente = horariosList.find(h => 
                    h.materia === data.materia && 
                    h.dia === data.dia && 
                    h.hora === data.hora && 
                    h.docente === data.docente
                );
                
                if (horarioCorrespondiente) {
                    const hId = horarioCorrespondiente.id;
                    mapaConteo[hId] = (mapaConteo[hId] || 0) + 1;
                }
            });
            setConteoInscriptos(mapaConteo);

            // B. BUSCAR MATRICULACIONES DEL ALUMNO
            const matRef = collection(db, 'artifacts', appId, 'public', 'data', 'matriculation');
            const qMat = query(matRef, where("dni", "==", dni), where("cicloLectivo", "==", currentYear));
            const matSnap = await getDocs(qMat);

            if (matSnap.empty) {
                showMessage(`El DNI ${dni} no está matriculado en ${currentYear}.`, true);
                setLoading(false);
                return;
            }

            const planesEncontrados = [];
            let datosAlumno = null;

            matSnap.forEach(doc => {
                const d = doc.data();
                planesEncontrados.push(d.plan);
                if (!datosAlumno) {
                    datosAlumno = { nombres: d.nombres, apellidos: d.apellidos };
                }
            });

            setStudentData(datosAlumno);
            setAvailablePlans(planesEncontrados);

            if (planesEncontrados.length === 1) {
                loadPlanData(planesEncontrados[0], horariosList);
            } else {
                setLoading(false);
            }

        } catch (error) {
            console.error(error);
            showMessage(`Error: ${error.message}`, true);
            setLoading(false);
        }
    };

    const loadPlanData = async (planTarget, horariosListOverride = null) => {
        setLoading(true);
        setSelectedPlan(planTarget);
        setRows([]);
        
        const listaHorarios = horariosListOverride || allHorarios;

        try {
            // Historia Académica
            const notasRef = collection(db, 'artifacts', appId, 'public', 'data', 'notas');
            const qNotas = query(notasRef, where("dni", "==", dni), where("plan", "==", planTarget));
            const notasSnap = await getDocs(qNotas);
            const aprobadas = new Set();
            notasSnap.forEach(doc => {
                if (["Promoción", "Examen", "Equivalencia"].includes(doc.data().condicion)) {
                    aprobadas.add(doc.data().materia);
                }
            });

            // Materias del Plan
            const materiasRef = collection(db, 'artifacts', appId, 'public', 'data', 'materias');
            const qMaterias = query(materiasRef, where("plan", "==", planTarget));
            const materiasSnap = await getDocs(qMaterias);
            const todasLasMaterias = [];
            materiasSnap.forEach(doc => todasLasMaterias.push(doc.data().materia));

            // Habilitadas
            const { reglas, esPlan530 } = getReglasPorPlan(planTarget);
            const tieneMovimiento = esPlan530 && (aprobadas.has("Expresión Corporal") || aprobadas.has("Danzas Folklóricas"));
            
            const habilitadas = [];
            todasLasMaterias.forEach(materia => {
                if (aprobadas.has(materia)) return;
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

            // Cursadas del Alumno
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

            // Construir Filas
            const finalRows = habilitadas.map(materia => {
                const guardado = cursadasGuardadas[materia] || {};
                const horariosOpciones = listaHorarios.filter(h => h.materia === materia);
                
                let selectedScheduleId = "";
                if (guardado.dia && guardado.hora && guardado.docente) {
                    const found = horariosOpciones.find(h => 
                        h.dia === guardado.dia && h.hora === guardado.hora && h.docente === guardado.docente
                    );
                    selectedScheduleId = found ? found.id : "custom";
                }

                return {
                    materia: materia,
                    selectedScheduleId: selectedScheduleId,
                    dia: guardado.dia || '',
                    hora: guardado.hora || '',
                    docente: guardado.docente || '',
                    ciclo_lectivo: currentYear,
                    condicion: guardado.condicion || 'Regular',
                    nota: guardado.nota || '',
                    docId: guardado.id || null,
                    opciones: horariosOpciones
                };
            }).sort((a,b) => a.materia.localeCompare(b.materia));

            setRows(finalRows);

        } catch (error) {
            console.error(error);
            showMessage(`Error cargando plan: ${error.message}`, true);
        } finally {
            setLoading(false);
        }
    };

    const handleScheduleSelection = (index, scheduleId) => {
        const newRows = [...rows];
        const row = newRows[index];
        row.selectedScheduleId = scheduleId;

        if (scheduleId === "") {
            row.dia = ""; row.hora = ""; row.docente = "";
        } else if (scheduleId === "custom") {
            // Edición manual
        } else {
            const horario = row.opciones.find(h => h.id === scheduleId);
            if (horario) {
                row.dia = horario.dia;
                row.hora = horario.hora;
                row.docente = horario.docente;
            }
        }
        setRows(newRows);
    };

    const handleRowChange = (index, field, value) => {
        const newRows = [...rows];
        newRows[index][field] = value;
        if (['dia','hora','docente'].includes(field)) {
             newRows[index].selectedScheduleId = "custom";
        }
        setRows(newRows);
    };

    const handleSave = async () => {
        if (!selectedPlan) return;
        setLoading(true);
        const cursadasRef = collection(db, 'artifacts', appId, 'public', 'data', 'cursadas');
        let processed = 0;

        try {
            for (const row of rows) {
                if (row.docente || row.dia || row.docId) {
                    const dataToSave = {
                        dni: dni,
                        nombres: studentData.nombres,
                        apellidos: studentData.apellidos,
                        plan: selectedPlan,
                        materia: row.materia,
                        dia: row.dia,
                        hora: row.hora,
                        docente: row.docente,
                        ciclo_lectivo: row.ciclo_lectivo,
                        condicion: row.condicion,
                        nota: row.nota,
                        timestamp: Timestamp.now()
                    };

                    const compositeId = `${dni}_${row.materia.replace(/\s+/g, '')}_${currentYear}`;
                    const docRef = doc(cursadasRef, compositeId);

                    await setDoc(docRef, dataToSave, { merge: true });
                    processed++;
                }
            }
            showMessage(`Se actualizaron ${processed} registros.`, false);
        } catch (error) {
            console.error(error);
            showMessage(`Error al guardar: ${error.message}`, true);
        } finally {
            setLoading(false);
        }
    };

    const handlePlanChange = (e) => {
        const newPlan = e.target.value;
        if (newPlan) loadPlanData(newPlan);
    };

    return (
        <div className="w-full">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Gestión de Cursados Activos</h2>
            
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

            {availablePlans.length > 1 && (
                <div className="bg-yellow-50 p-4 border border-yellow-200 rounded-lg mb-6 flex items-center justify-between">
                    <div>
                        <span className="font-bold text-yellow-800 mr-2">¡Atención!</span>
                        <span className="text-yellow-800">Este estudiante tiene múltiples planes activos. Seleccione uno:</span>
                    </div>
                    <select 
                        value={selectedPlan}
                        onChange={handlePlanChange}
                        className="p-2 border border-yellow-300 rounded bg-white text-gray-700 font-medium"
                    >
                        {selectedPlan === '' && <option value="">-- Seleccione Plan --</option>}
                        {availablePlans.map(p => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                </div>
            )}

            {studentData && selectedPlan && rows.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="p-6 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold text-indigo-900">{studentData.apellidos}, {studentData.nombres}</h3>
                            <p className="text-sm text-indigo-700">Plan: <strong>{selectedPlan}</strong> | Ciclo: {currentYear}</p>
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
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase w-1/4">Materia</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase w-1/3">Horarios (Cupo)</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Detalle</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase w-24">Cond.</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase w-20">Nota</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {rows.map((row, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900 align-top pt-4">
                                            {row.materia}
                                        </td>
                                        
                                        <td className="px-4 py-3 align-top">
                                            {row.opciones && row.opciones.length > 0 ? (
                                                <select 
                                                    className="w-full text-sm border-indigo-300 rounded shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-indigo-50/50"
                                                    value={row.selectedScheduleId}
                                                    onChange={(e) => handleScheduleSelection(index, e.target.value)}
                                                >
                                                    <option value="">-- Seleccionar --</option>
                                                    {row.opciones.map(op => {
                                                        const ocupados = conteoInscriptos[op.id] || 0;
                                                        const cupo = op.cupo || 999;
                                                        const lleno = ocupados >= cupo;
                                                        const esMiHorario = row.selectedScheduleId === op.id; 
                                                        
                                                        // Permite seleccionar si no está lleno O si ya es mi horario actual
                                                        return (
                                                            <option 
                                                                key={op.id} 
                                                                value={op.id} 
                                                                disabled={lleno && !esMiHorario}
                                                            >
                                                                {op.dia} {op.hora} | {op.docente} | Aula: {op.aula || 'S/D'} {lleno ? '(COMPLETO)' : `(${ocupados}/${cupo})`}
                                                            </option>
                                                        );
                                                    })}
                                                    <option value="custom">-- Otro / Manual --</option>
                                                </select>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">No hay horarios definidos</span>
                                            )}
                                        </td>

                                        <td className="px-4 py-3 align-top space-y-1">
                                            <div className="flex gap-1">
                                                <input 
                                                    type="text" 
                                                    value={row.dia} 
                                                    onChange={(e) => handleRowChange(index, 'dia', e.target.value)}
                                                    className="w-1/3 text-xs border-gray-300 rounded" 
                                                    placeholder="Día"
                                                />
                                                <input 
                                                    type="text" 
                                                    value={row.hora} 
                                                    onChange={(e) => handleRowChange(index, 'hora', e.target.value)}
                                                    className="w-1/3 text-xs border-gray-300 rounded" 
                                                    placeholder="Hora"
                                                />
                                            </div>
                                            <input 
                                                type="text" 
                                                value={row.docente} 
                                                onChange={(e) => handleRowChange(index, 'docente', e.target.value)}
                                                className="w-full text-xs border-gray-300 rounded" 
                                                placeholder="Docente"
                                            />
                                        </td>

                                        <td className="px-2 py-3 align-top">
                                            <select 
                                                value={row.condicion}
                                                onChange={(e) => handleRowChange(index, 'condicion', e.target.value)}
                                                className="w-full text-xs border-gray-300 rounded"
                                            >
                                                <option value="Regular">Reg.</option>
                                                <option value="Libre">Lib.</option>
                                                <option value="Oyente">Oye.</option>
                                            </select>
                                        </td>

                                        <td className="px-2 py-3 align-top">
                                            <input 
                                                type="text" 
                                                value={row.nota}
                                                onChange={(e) => handleRowChange(index, 'nota', e.target.value)}
                                                className="w-full text-xs border-gray-300 rounded text-center"
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
        </div>
    );
};

export default CursadosActivos;