import React, { useState } from 'react';
import { supabase } from './supabaseClient';

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

const CursadosActivos = ({ showMessage }) => {
    const [dni, setDni] = useState('');
    const [loading, setLoading] = useState(false);

    const [studentData, setStudentData] = useState(null);
    const [availablePlans, setAvailablePlans] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState('');
    const [rows, setRows] = useState([]);
    const [allHorarios, setAllHorarios] = useState([]);
    const [conteoInscriptos, setConteoInscriptos] = useState({}); // Mapa: ID_Horario -> Cantidad Inscritos

    const currentYear = new Date().getFullYear();

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
            const { data: horariosList } = await supabase
                .from('horarios')
                .select('*, materias(nombre, plan)');

            setAllHorarios(horariosList);

            const { data: todasCursadas } = await supabase
                .from('cursadas_activas')
                .select('horario_id')
                .eq('ciclo_lectivo', currentYear);

            const mapaConteo = {};
            todasCursadas.forEach(c => {
                const hId = c.horario_id;
                if (hId) mapaConteo[hId] = (mapaConteo[hId] || 0) + 1;
            });
            setConteoInscriptos(mapaConteo);

            // B. BUSCAR ALUMNO
            const { data: profile } = await supabase
                .from('perfiles')
                .select('*')
                .eq('dni', dni)
                .maybeSingle();

            if (!profile) {
                showMessage(`No se encontró estudiante con DNI ${dni}.`, true);
                setLoading(false);
                return;
            }

            // C. BUSCAR MATRICULACIONES DEL ALUMNO
            const { data: matSnap } = await supabase
                .from('matriculaciones')
                .select('plan')
                .eq('estudiante_id', profile.id)
                .eq('ciclo_lectivo', currentYear);

            if (!matSnap || matSnap.length === 0) {
                showMessage(`El DNI ${dni} no está matriculado en ${currentYear}.`, true);
                setLoading(false);
                return;
            }

            setStudentData(profile);
            const planesEncontrados = matSnap.map(m => m.plan);
            setAvailablePlans(planesEncontrados);

            if (planesEncontrados.length === 1) {
                loadPlanData(profile.id, planesEncontrados[0], horariosList);
            } else {
                setLoading(false);
            }

        } catch (error) {
            console.error(error);
            showMessage(`Error: ${error.message}`, true);
            setLoading(false);
        }
    };

    const loadPlanData = async (studentId, planTarget, horariosListOverride = null) => {
        setLoading(true);
        setSelectedPlan(planTarget);
        setRows([]);

        const listaHorarios = horariosListOverride || allHorarios;

        try {
            // Historia Académica (Notas Aprobadas)
            const { data: notasSnap } = await supabase
                .from('notas')
                .select('*, materias(nombre), matriculaciones(plan)')
                .filter('matriculaciones.estudiante_id', 'eq', studentId)
                .filter('matriculaciones.plan', 'eq', planTarget);

            const aprobadas = new Set();
            if (notasSnap) {
                notasSnap.forEach(n => {
                    if (["Promoción", "Examen", "Equivalencia"].includes(n.condicion)) {
                        aprobadas.add(n.materias.nombre);
                    }
                });
            }

            // Materias del Plan
            const { data: materiasSnap } = await supabase
                .from('materias')
                .select('nombre')
                .eq('plan', planTarget);

            const todasLasMaterias = materiasSnap.map(m => m.nombre);

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

            // Cursadas del Alumno (Sincronizar)
            const { data: cursadasSnap } = await supabase
                .from('cursadas_activas')
                .select('*, horarios(*, materias(nombre))')
                .eq('estudiante_id', studentId)
                .eq('ciclo_lectivo', currentYear);

            const cursadasGuardadas = {};
            if (cursadasSnap) {
                cursadasSnap.forEach(c => {
                    const matNombre = c.horarios?.materias?.nombre;
                    if (matNombre) cursadasGuardadas[matNombre] = c;
                });
            }

            // Construir Filas
            const finalRows = habilitadas.map(materia => {
                const guardado = cursadasGuardadas[materia] || {};
                const horariosOpciones = listaHorarios.filter(h => h.materias?.nombre === materia);

                return {
                    materia: materia,
                    selectedScheduleId: guardado.horario_id || "",
                    dia: guardado.horarios?.dia || '',
                    hora: guardado.horarios?.hora || '',
                    docente: guardado.horarios?.docente || '',
                    ciclo_lectivo: currentYear,
                    condicion: guardado.condicion || 'Regular',
                    nota: guardado.nota_parcial || '',
                    docId: guardado.id || null,
                    opciones: horariosOpciones
                };
            }).sort((a, b) => a.materia.localeCompare(b.materia));

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
        setRows(newRows);
    };

    const handleSave = async () => {
        if (!selectedPlan || !studentData) return;
        setLoading(true);
        let processed = 0;

        try {
            for (const row of rows) {
                if (row.selectedScheduleId) {
                    const dataToSave = {
                        estudiante_id: studentData.id,
                        horario_id: row.selectedScheduleId,
                        ciclo_lectivo: currentYear,
                        condicion: row.condicion,
                        nota_parcial: row.nota
                    };

                    const { error } = await supabase
                        .from('cursadas_activas')
                        .upsert(dataToSave, {
                            onConflict: 'estudiante_id, horario_id, ciclo_lectivo'
                        });

                    if (error) throw error;
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
        if (newPlan) loadPlanData(studentData.id, newPlan);
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
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
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
                            <h3 className="text-xl font-bold text-indigo-900">{studentData.apellido}, {studentData.nombre}</h3>
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

                                                        return (
                                                            <option
                                                                key={op.id}
                                                                value={op.id}
                                                                disabled={lleno && !esMiHorario}
                                                            >
                                                                {op.dia} {op.hora} | {op.docente} {lleno ? '(COMPLETO)' : `(${ocupados}/${cupo})`}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">No hay horarios definidos</span>
                                            )}
                                        </td>

                                        <td className="px-4 py-3 align-top text-xs text-gray-600">
                                            {row.dia} {row.hora} <br />
                                            {row.docente}
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
