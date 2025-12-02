import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';

// --- COMPONENTES UI AUXILIARES ---

// Tarjeta de Estadística (KPI)
const StatCard = ({ title, value, color = "indigo" }) => (
    <div className={`bg-white p-6 rounded-xl shadow-md border-l-4 border-${color}-500 flex flex-col items-start`}>
        <h4 className="text-gray-500 text-sm font-bold uppercase tracking-wider">{title}</h4>
        <span className={`text-3xl font-bold text-${color}-600 mt-2`}>{value}</span>
    </div>
);

// Tabla Simple (Para los reportes generales)
const DataTable = ({ title, data, headers }) => (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden mb-8">
        <div className="bg-gray-50 p-4 border-b border-gray-200">
            <h3 className="font-bold text-gray-700">{title}</h3>
        </div>
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-100 sticky top-0">
                    <tr>
                        {headers.map((h, i) => (
                            <th key={i} className="px-4 py-3 text-left font-bold text-gray-500 uppercase">{h}</th>
                        ))}
                        <th className="px-4 py-3 text-right font-bold text-gray-500 uppercase">Cantidad</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {data.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                            {headers.map((h, j) => (
                                <td key={j} className="px-4 py-3 text-gray-700">{row[h.toLowerCase()]}</td>
                            ))}
                            <td className="px-4 py-3 text-right font-bold text-indigo-600">{row.count}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

// --- UTILIDADES DE LÓGICA ---

const calculateAge = (birthDateString) => {
    if (!birthDateString) return null;
    try {
        const today = new Date();
        const birthDate = new Date(birthDateString.includes('T') ? birthDateString : `${birthDateString}T00:00:00`);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    } catch (e) {
        return null;
    }
};

// Categoría específica para la Matriz (12, 13... +25)
const getMatrixAgeCategory = (age) => {
    if (age === null) return 'N/D';
    if (age < 12) return '<12';
    if (age >= 12 && age <= 19) return age.toString();
    if (age >= 20 && age <= 24) return '20-24';
    if (age >= 25) return '+25';
    return 'N/D';
};

// Categoría general para el reporte demográfico (Rangos)
const getGeneralAgeRange = (age) => {
    if (age === null) return 'Sin datos';
    if (age < 12) return "Niños (<12)";
    else if (age < 18) return "Adolescentes (12-17)";
    else if (age < 30) return "Jóvenes (18-29)";
    else if (age < 50) return "Adultos (30-49)";
    else return "Mayores (50+)";
};

const extractYearFromSubject = (materia) => {
    const mat = materia.toLowerCase();
    const esTroncal = mat.includes("instrumento") || mat.includes("canto");
    const esLenguaje = mat.includes("lenguaje musical");

    if (esTroncal || esLenguaje) {
        const match = materia.match(/(\d+)(?!.*\d)/); // Busca el último número
        if (match) return parseInt(match[0]);
    }
    return null;
};

// --- COMPONENTE PRINCIPAL ---

const AdminInformes = ({ db, appId }) => {
    const [loading, setLoading] = useState(true);
    
    // Estado para Reportes Generales
    const [stats, setStats] = useState({
        totalEstudiantes: 0,
        totalMatriculados: 0,
        porInstrumento: [],
        porNacionalidad: [],
        porGenero: [],
        porEdadGeneral: [],
        porMateria: []
    });

    // Estado para la Matriz Específica
    const [ageMatrix, setAgeMatrix] = useState({});

    const currentYear = new Date().getFullYear().toString();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Obtener Datos
                const [matSnap, stSnap, curSnap] = await Promise.all([
                    getDocs(query(collection(db, 'artifacts', appId, 'public', 'data', 'matriculation'), where("cicloLectivo", "==", currentYear))),
                    getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'students')),
                    getDocs(query(collection(db, 'artifacts', appId, 'public', 'data', 'cursadas'), where("ciclo_lectivo", "==", currentYear)))
                ]);

                const matriculados = matSnap.docs.map(d => d.data());
                const estudiantesDB = stSnap.docs.map(d => d.data());
                const cursadas = curSnap.docs.map(d => d.data());

                // Mapeos rápidos
                const mapEstudiantes = {};
                estudiantesDB.forEach(s => mapEstudiantes[s.dni] = s);

                // --- PROCESAMIENTO A: REPORTES GENERALES ---
                
                // Identificar estudiantes activos
                const dnisActivos = new Set(matriculados.map(m => m.dni));
                const estudiantesActivosLista = estudiantesDB.filter(s => dnisActivos.has(s.dni));

                // Contadores Generales
                const countInstrumento = {};
                matriculados.forEach(m => {
                    const inst = m.instrumento || 'Sin definir';
                    countInstrumento[inst] = (countInstrumento[inst] || 0) + 1;
                });

                const countNac = {};
                const countGen = {};
                const countEdadGeneral = {};
                
                estudiantesActivosLista.forEach(s => {
                    // Nac
                    const nac = s.nacionalidad || 'No especificada';
                    countNac[nac] = (countNac[nac] || 0) + 1;
                    // Gen
                    const gen = s.genero || 'No especificado';
                    countGen[gen] = (countGen[gen] || 0) + 1;
                    // Edad General
                    const edad = calculateAge(s.fechanacimiento);
                    const rango = getGeneralAgeRange(edad);
                    countEdadGeneral[rango] = (countEdadGeneral[rango] || 0) + 1;
                });

                const countMateria = {};
                cursadas.forEach(c => {
                    countMateria[c.materia] = (countMateria[c.materia] || 0) + 1;
                });

                const toArray = (obj, keyName="nombre") => Object.entries(obj)
                    .map(([k, v]) => ({ [keyName]: k, count: v }))
                    .sort((a, b) => b.count - a.count);

                setStats({
                    totalEstudiantes: estudiantesActivosLista.length,
                    totalMatriculados: matriculados.length,
                    porInstrumento: toArray(countInstrumento, "instrumento"),
                    porNacionalidad: toArray(countNac, "nacionalidad"),
                    porGenero: toArray(countGen, "genero"),
                    porEdadGeneral: toArray(countEdadGeneral, "rango"),
                    porMateria: toArray(countMateria, "materia").slice(0, 20)
                });

                // --- PROCESAMIENTO B: MATRIZ DE EDADES ---

                // Inicializar matriz vacía
                const matrix = {};
                for (let i = 1; i <= 5; i++) {
                    matrix[i] = {
                        total: 0,
                        masculinos: 0,
                        ages: {
                            '<12': 0, '12': 0, '13': 0, '14': 0, '15': 0, 
                            '16': 0, '17': 0, '18': 0, '19': 0, '20-24': 0, '+25': 0, 'N/D': 0
                        }
                    };
                }

                // Agrupar materias por DNI para análisis
                const mapCursadasPorDNI = {};
                cursadas.forEach(c => {
                    if (!mapCursadasPorDNI[c.dni]) mapCursadasPorDNI[c.dni] = [];
                    mapCursadasPorDNI[c.dni].push(c.materia);
                });

                const dnisUnicosCursando = Object.keys(mapCursadasPorDNI);

                dnisUnicosCursando.forEach(dni => {
                    const studentInfo = mapEstudiantes[dni];
                    const materiasAlumno = mapCursadasPorDNI[dni] || [];
                    
                    if (!studentInfo) return; 

                    // Determinar año
                    let anioAsignado = null;
                    
                    // Buscar en troncales
                    for (let materia of materiasAlumno) {
                        if (materia.toLowerCase().includes("instrumento") || materia.toLowerCase().includes("canto")) {
                            const y = extractYearFromSubject(materia);
                            if (y && y >= 1 && y <= 5) {
                                if (!anioAsignado || y > anioAsignado) anioAsignado = y;
                            }
                        }
                    }
                    // Fallback a Lenguaje
                    if (!anioAsignado) {
                        for (let materia of materiasAlumno) {
                            if (materia.toLowerCase().includes("lenguaje musical")) {
                                const y = extractYearFromSubject(materia);
                                if (y && y >= 1 && y <= 5) {
                                    if (!anioAsignado || y > anioAsignado) anioAsignado = y;
                                }
                            }
                        }
                    }

                    if (anioAsignado) {
                        const row = matrix[anioAsignado];
                        row.total++;
                        if (studentInfo.genero === 'Masculino') row.masculinos++;
                        
                        const edad = calculateAge(studentInfo.fechanacimiento);
                        const cat = getMatrixAgeCategory(edad);
                        if (row.ages[cat] !== undefined) row.ages[cat]++;
                    }
                });

                setAgeMatrix(matrix);

            } catch (error) {
                console.error("Error:", error);
            } finally {
                setLoading(false);
            }
        };

        if (appId) fetchData();
    }, [db, appId, currentYear]);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="text-xl text-indigo-600 font-semibold animate-pulse">Procesando datos del ciclo {currentYear}...</div>
        </div>
    );

    const matrixColumns = ['12', '13', '14', '15', '16', '17', '18', '19', '20-24', '+25'];

    return (
        <div className="w-full max-w-7xl mx-auto p-4">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Informe Estadístico</h2>
            <p className="text-gray-500 mb-8">Ciclo Lectivo: {currentYear}</p>

            {/* KPIs Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard title="Estudiantes Activos" value={stats.totalEstudiantes} color="indigo" />
                <StatCard title="Matrículas (Instr.)" value={stats.totalMatriculados} color="blue" />
                <StatCard title="Inscripciones Materias" value={stats.porMateria.reduce((a,b)=>a+b.count,0)} color="green" />
                <StatCard title="Instrumentos" value={stats.porInstrumento.length} color="purple" />
            </div>

            {/* SECCIÓN 1: MATRIZ DE EDADES (Lo nuevo y específico) */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-indigo-100 overflow-hidden mb-12">
                <div className="bg-indigo-50 p-6 border-b border-indigo-200">
                    <h3 className="text-xl font-bold text-indigo-900">Matrícula por Año de Estudio y Edad</h3>
                    <p className="text-sm text-indigo-700 mt-1">
                        Desagregación específica solicitada. Ubicación por: Instrumento/Canto o Lenguaje Musical.
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-indigo-600 text-white">
                            <tr>
                                <th rowSpan="2" className="px-4 py-3 text-left font-bold uppercase border-r border-indigo-500">Año</th>
                                <th rowSpan="2" className="px-4 py-3 text-center font-bold uppercase border-r border-indigo-500 bg-indigo-800 w-16">Total</th>
                                <th rowSpan="2" className="px-4 py-3 text-center font-bold uppercase border-r border-indigo-500 w-16">Masc.</th>
                                <th colSpan={matrixColumns.length} className="px-4 py-2 text-center font-bold uppercase border-b border-indigo-500">Edad</th>
                            </tr>
                            <tr>
                                {matrixColumns.map(age => (
                                    <th key={age} className="px-2 py-2 text-center font-semibold border-r border-indigo-500 last:border-r-0 text-xs">{age}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {[1, 2, 3, 4, 5].map(anio => {
                                const rowData = ageMatrix[anio] || { total: 0, masculinos: 0, ages: {} };
                                return (
                                    <tr key={anio} className="hover:bg-indigo-50 transition-colors">
                                        <td className="px-4 py-3 font-bold text-gray-700 border-r border-gray-200">{anio}° Año</td>
                                        <td className="px-4 py-3 text-center font-bold text-indigo-600 bg-indigo-50 border-r border-gray-200">{rowData.total}</td>
                                        <td className="px-4 py-3 text-center text-gray-600 border-r border-gray-200">{rowData.masculinos}</td>
                                        {matrixColumns.map(age => (
                                            <td key={age} className="px-2 py-3 text-center text-gray-500 border-r border-gray-100 last:border-r-0">
                                                {rowData.ages[age] > 0 ? <span className="font-medium text-gray-800">{rowData.ages[age]}</span> : <span className="text-gray-300">-</span>}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-gray-100 font-bold text-gray-700">
                            <tr>
                                <td className="px-4 py-3 border-r border-gray-300">TOTALES</td>
                                <td className="px-4 py-3 text-center text-indigo-700 border-r border-gray-300">
                                    {[1,2,3,4,5].reduce((acc, curr) => acc + (ageMatrix[curr]?.total || 0), 0)}
                                </td>
                                <td className="px-4 py-3 text-center border-r border-gray-300">
                                    {[1,2,3,4,5].reduce((acc, curr) => acc + (ageMatrix[curr]?.masculinos || 0), 0)}
                                </td>
                                {matrixColumns.map(age => (
                                    <td key={age} className="px-2 py-3 text-center text-gray-600 border-r border-gray-300">
                                        {[1,2,3,4,5].reduce((acc, curr) => acc + (ageMatrix[curr]?.ages[age] || 0), 0)}
                                    </td>
                                ))}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* SECCIÓN 2: INFORMES GENERALES (Lo que tenías antes) */}
            <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Desglose General de Datos</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Columna Izquierda */}
                <div className="space-y-8">
                    <DataTable title="Inscriptos por Instrumento" data={stats.porInstrumento} headers={["Instrumento"]} />
                    <DataTable title="Top 20 Materias Más Cursadas" data={stats.porMateria} headers={["Materia"]} />
                </div>

                {/* Columna Derecha */}
                <div className="space-y-8">
                    <DataTable title="Distribución Demográfica por Edad" data={stats.porEdadGeneral} headers={["rango"]} />
                    <DataTable title="Por Género" data={stats.porGenero} headers={["genero"]} />
                    <DataTable title="Por Nacionalidad" data={stats.porNacionalidad} headers={["nacionalidad"]} />
                </div>
            </div>
        </div>
    );
};

export default AdminInformes;