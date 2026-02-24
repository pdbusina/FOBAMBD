import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

// --- LÓGICA DE CORRELATIVAS ---

const INSTRUMENTOS_530 = [
    "Arpa", "Bajo Eléctrico", "Bandoneón", "Batería", "Clarinete",
    "Contrabajo", "Corno", "Flauta Dulce", "Flauta Traversa",
    "Guitarra Clásica", "Guitarra Eléctrica", "Guitarra Popular",
    "Oboe", "Percusión Académica", "Percusión Folklórica",
    "Piano", "Saxo", "Sikus-Quena", "Trombón", "Trompeta",
    "Violín", "Viola", "Violoncello"
];

const CORRELATIVAS_FIJAS = {
    // --- PLAN 532 CANTO ---
    "Canto 2": ["Canto 1", "Lenguaje Musical 1"],
    "Dicción Italiana 2": ["Dicción Italiana 1"],
    "Canto 3": ["Canto 2", "Lenguaje Musical 2", "Ensamble 1"],
    "Entrenamiento Escénico": ["Expresión Corporal", "Lenguaje Musical 2"],
    "Canto 4": ["Canto 3", "Lenguaje Musical 3", "Ensamble 2", "Apreciación Musical 1", "Entrenamiento Escénico", "Dicción Alemana 1", "Educación Vocal"],
    "Dicción Alemana 2": ["Canto 3", "Lenguaje Musical 3", "Ensamble 2", "Apreciación Musical 1", "Entrenamiento Escénico", "Dicción Alemana 1", "Educación Vocal"],
    "Canto 5": ["Canto 4", "Lenguaje Musical 4", "Ensamble 3"],

    // --- PLAN 533 CANTO POPULAR ---
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

        // AÑO 2
        const reqAno2 = [I1, "Lenguaje Musical 1"];
        reglas[I2] = reqAno2;
        reglas["Lenguaje Musical 2"] = reqAno2;
        reglas["Ensamble 1"] = reqAno2;
        reglas["Coro 2"] = ["Coro 1"];

        // AÑO 3
        const reqAno3 = [I2, "Lenguaje Musical 2", "Ensamble 1"];
        reglas[I3] = reqAno3;
        reglas["Lenguaje Musical 3"] = reqAno3;
        reglas["Ensamble 2"] = reqAno3;
        reglas["Apreciación Musical 1"] = [I1, "Lenguaje Musical 2"];

        // AÑO 4
        const reqAno4 = [
            I3, "Lenguaje Musical 3", "Ensamble 2",
            "Apreciación Musical 1", "Expresión Corporal", "Danzas Folklóricas"
        ];
        reglas[I4] = reqAno4;
        reglas["Lenguaje Musical 4"] = reqAno4;
        reglas["Ensamble 3"] = reqAno4;
        reglas["Apreciación Musical 2"] = reqAno4;
        reglas["Optativa 1"] = reqAno4;

        // AÑO 5
        const reqAno5 = [I4, "Lenguaje Musical 4", "Ensamble 3"];
        reglas[I5] = reqAno5;
        reglas["Seminario Armonía"] = reqAno5;
        reglas["Seminario Ritmo"] = reqAno5;
        reglas["Ensamble 4"] = reqAno5;
        reglas["Optativa 2"] = ["Optativa 1"];
    }

    return { reglas, esPlan530 };
};

// --- COMPONENTE PRINCIPAL ---
const CorrelativasChecker = () => {
    const [dni, setDni] = useState('');
    const [selectedPlan, setSelectedPlan] = useState('');
    const [availablePlans, setAvailablePlans] = useState([]);
    const [studentName, setStudentName] = useState('');
    const [analysis, setAnalysis] = useState(null);
    const [searching, setSearching] = useState(false);

    const handleSearchStudent = async (e) => {
        e.preventDefault();
        if (!dni) return;

        setSearching(true);
        setAnalysis(null);
        setAvailablePlans([]);

        try {
            // 1. Buscar al alumno en perfiles o matriculaciones
            const { data: profile } = await supabase
                .from('perfiles')
                .select('*')
                .eq('dni', dni)
                .maybeSingle();

            if (!profile) {
                alert("Estudiante no encontrado.");
                setSearching(false);
                return;
            }

            setStudentName(`${profile.apellido}, ${profile.nombre}`);

            // 2. Buscar planes en los que está o estuvo matriculado
            const { data: matriculaciones } = await supabase
                .from('matriculaciones')
                .select('plan')
                .eq('estudiante_id', profile.id);

            const planes = new Set(matriculaciones.map(m => m.plan));

            // También buscar en notas por si acaso hay historial sin matriculación registrada
            const { data: notasHist } = await supabase
                .from('notas')
                .select('matriculaciones(plan)')
                .filter('matriculaciones.estudiante_id', 'eq', profile.id);

            if (notasHist) {
                notasHist.forEach(n => {
                    if (n.matriculaciones?.plan) planes.add(n.matriculaciones.plan);
                });
            }

            if (planes.size === 0) {
                alert("El estudiante existe pero no tiene planes registrados.");
                setSearching(false);
                return;
            }

            setAvailablePlans(Array.from(planes));

            if (planes.size === 1) {
                const planUnico = Array.from(planes)[0];
                setSelectedPlan(planUnico);
                analyzeCorrelativas(profile.id, planUnico);
            }
        } catch (error) {
            console.error("Error:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setSearching(false);
        }
    };

    const analyzeCorrelativas = async (studentId, planTarget) => {
        setSearching(true);
        try {
            const { reglas, esPlan530 } = getReglasPorPlan(planTarget);

            // A. Obtener TODAS las materias del plan
            const { data: todasLasMateriasDelPlan } = await supabase
                .from('materias')
                .select('nombre')
                .eq('plan', planTarget);

            if (!todasLasMateriasDelPlan) throw new Error("No se encontraron materias para este plan");

            // B. Obtener materias APROBADAS
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

            const tieneMovimiento = esPlan530 && (aprobadas.has("Expresión Corporal") || aprobadas.has("Danzas Folklóricas"));

            const reporte = {
                aprobadas: Array.from(aprobadas),
                disponibles: [],
                bloqueadas: []
            };

            const sortedMaterias = todasLasMateriasDelPlan.map(m => m.nombre).sort();

            sortedMaterias.forEach(materia => {
                if (aprobadas.has(materia)) return;

                if (esPlan530 && tieneMovimiento && (materia === "Expresión Corporal" || materia === "Danzas Folklóricas")) {
                    return;
                }

                const requisitos = reglas[materia] || [];

                if (requisitos.length === 0) {
                    reporte.disponibles.push({ nombre: materia, motivo: "Sin correlativas" });
                } else {
                    const faltantes = requisitos.filter(req => {
                        if (esPlan530 && (req === "Expresión Corporal" || req === "Danzas Folklóricas")) {
                            if (tieneMovimiento) return false;
                        }
                        return !aprobadas.has(req);
                    });

                    if (faltantes.length === 0) {
                        reporte.disponibles.push({ nombre: materia, motivo: "Correlativas completas" });
                    } else {
                        reporte.bloqueadas.push({ nombre: materia, faltan: faltantes });
                    }
                }
            });

            setAnalysis(reporte);

        } catch (error) {
            console.error("Error analizando:", error);
        } finally {
            setSearching(false);
        }
    };

    const handleSelectPlan = async (e) => {
        const plan = e.target.value;
        setSelectedPlan(plan);
        if (plan) {
            // Necesitamos el studentId de nuevo
            const { data: profile } = await supabase
                .from('perfiles')
                .select('id')
                .eq('dni', dni)
                .single();
            if (profile) analyzeCorrelativas(profile.id, plan);
        }
    };

    return (
        <div id="correlativas_checker" className="w-full">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Verificador de Correlativas</h2>
            <p className="text-gray-600 mb-6">Consulte qué materias está habilitado a cursar un estudiante según su historia académica.</p>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8 flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-grow w-full">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">DNI del Estudiante</label>
                    <input
                        type="text"
                        value={dni}
                        onChange={(e) => setDni(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchStudent(e)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                        placeholder="Ej: 30123456"
                    />
                </div>
                <button
                    onClick={handleSearchStudent}
                    disabled={searching}
                    className="w-full md:w-auto bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-indigo-700 transition disabled:bg-gray-300 shadow-md"
                >
                    {searching ? "Analizando..." : "Consultar"}
                </button>
            </div>

            {availablePlans.length > 1 && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-8 animate-fade-in">
                    <p className="font-bold text-yellow-800 mb-2">⚠ El estudiante tiene múltiples planes. Seleccione uno:</p>
                    <select
                        value={selectedPlan}
                        onChange={handleSelectPlan}
                        className="w-full p-2 border border-yellow-300 rounded bg-white"
                    >
                        <option value="">-- Seleccionar Plan --</option>
                        {availablePlans.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
            )}

            {analysis && (
                <div className="space-y-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">{studentName}</h2>
                            <p className="text-gray-500 text-sm">Informe de situación académica</p>
                        </div>
                        <div className="mt-4 md:mt-0">
                            <span className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-full text-sm font-bold border border-indigo-200">
                                {selectedPlan}
                            </span>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white p-0 rounded-xl shadow-sm border border-green-200 overflow-hidden">
                            <div className="bg-green-50 p-4 border-b border-green-100 flex items-center">
                                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold mr-3 shadow-sm">✓</div>
                                <div>
                                    <h3 className="text-lg font-bold text-green-800">Habilitadas para Cursar</h3>
                                    <p className="text-xs text-green-600">Materias que cumplen requisitos</p>
                                </div>
                            </div>
                            <div className="p-4 bg-green-50/30 h-full min-h-[200px]">
                                {analysis.disponibles.length > 0 ? (
                                    <ul className="space-y-2">
                                        {analysis.disponibles.map((m, i) => (
                                            <li key={i} className="bg-white p-3 rounded-lg border border-green-100 flex justify-between items-center shadow-sm hover:shadow-md transition">
                                                <span className="font-semibold text-gray-700">{m.nombre}</span>
                                                <span className="text-[10px] uppercase tracking-wider font-bold text-green-600 bg-green-100 px-2 py-1 rounded">{m.motivo}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-40 text-green-700/50 italic">
                                        <p>No hay materias disponibles.</p>
                                        <p className="text-sm">(¿Plan completado o faltan correlativas?)</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white p-0 rounded-xl shadow-sm border border-red-200 overflow-hidden">
                            <div className="bg-red-50 p-4 border-b border-red-100 flex items-center">
                                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold mr-3 shadow-sm">X</div>
                                <div>
                                    <h3 className="text-lg font-bold text-red-800">Bloqueadas</h3>
                                    <p className="text-xs text-red-600">Faltan correlativas previas</p>
                                </div>
                            </div>
                            <div className="p-4 bg-red-50/30 h-full min-h-[200px]">
                                {analysis.bloqueadas.length > 0 ? (
                                    <ul className="space-y-2">
                                        {analysis.bloqueadas.map((m, i) => (
                                            <li key={i} className="bg-white p-3 rounded-lg border border-red-100 shadow-sm">
                                                <div className="font-semibold text-gray-700 mb-1">{m.nombre}</div>
                                                <div className="text-xs text-red-600 bg-red-50 p-2 rounded flex items-start gap-1">
                                                    <span className="font-bold">Falta:</span>
                                                    <span>{m.faltan.join(", ")}</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-40 text-red-700/50 italic">
                                        <p>¡Excelente!</p>
                                        <p className="text-sm">No tienes materias bloqueadas.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Historial de Aprobadas ({analysis.aprobadas.length})</h3>
                        {analysis.aprobadas.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {analysis.aprobadas.map((m, i) => (
                                    <span key={i} className="bg-white text-gray-600 border border-gray-300 px-3 py-1 rounded-full text-xs font-medium shadow-sm">
                                        {m}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 italic">Aún no hay materias aprobadas registradas en este plan.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CorrelativasChecker;
