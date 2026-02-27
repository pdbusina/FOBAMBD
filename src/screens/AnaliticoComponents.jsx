import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { IconLoading, IconPrint } from '../components/Icons';

/**
 * Pestaña 5: Analítico
 */
export const AnaliticoTab = ({
    showMessage, students, matriculaciones, materias, notas, loadData
}) => {
    const [step, setStep] = useState(1); // 1: Buscar DNI, 2: Seleccionar Plan, 3: Mostrar Reporte
    const [dniSearch, setDniSearch] = useState('');
    const [foundPlans, setFoundPlans] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState('');
    const [studentInfo, setStudentInfo] = useState(null);

    const [loadingLocal, setLoadingLocal] = useState(false);
    const [freshNotas, setFreshNotas] = useState([]);

    const handleDniSearch = async (e) => {
        e.preventDefault();
        if (!dniSearch) return showMessage("Ingrese un DNI.", true);
        setLoadingLocal(true);

        try {
            // 1. Buscar Perfil del Estudiante
            const { data: student, error: sErr } = await supabase.from('perfiles').select('*').eq('dni', dniSearch).single();
            if (sErr || !student) {
                showMessage(`Estudiante con DNI ${dniSearch} no encontrado.`, true);
                setLoadingLocal(false);
                return;
            }
            setStudentInfo(student);

            // 2. Buscar Matriculaciones del Estudiante
            const { data: mats, error: mErr } = await supabase.from('matriculaciones').select('*').eq('estudiante_id', student.id);
            if (mErr || !mats || mats.length === 0) {
                showMessage(`El estudiante no tiene matriculaciones activas.`, true);
                setLoadingLocal(false);
                return;
            }

            // 3. Buscar Notas del Estudiante (ConsultaDirecta)
            const matriculaIds = mats.map(m => m.id);
            const { data: nts, error: nErr } = await supabase
                .from('notas')
                .select('*, materias(nombre)')
                .in('matriculacion_id', matriculaIds);

            if (nErr) throw nErr;

            // Mapear notas al formato esperado por AnaliticoReport
            const mappedNotas = nts.map(n => ({
                id: n.id,
                dni: dniSearch,
                materia: n.materias?.nombre,
                nota: n.calificacion,
                condicion: n.condicion,
                fecha: n.fecha,
                libro_folio: n.libro_folio,
                observaciones: n.observaciones,
                obs_optativa_ensamble: n.obs_detalle
            }));

            setFreshNotas(mappedNotas);

            const planes = [...new Set(mats.map(m => m.plan))];
            if (planes.length > 1) {
                setFoundPlans(planes);
                setStep(2);
            } else {
                setSelectedPlan(planes[0]);
                setStep(3);
            }
        } catch (err) {
            console.error("Error en búsqueda analítica:", err);
            showMessage("Error al consultar la base de datos.", true);
        } finally {
            setLoadingLocal(false);
        }
    };

    const handlePlanSelect = (plan) => {
        setSelectedPlan(plan);
        setStep(3);
    };

    const resetForm = () => {
        setStep(1);
        setDniSearch('');
        setFoundPlans([]);
        setSelectedPlan('');
        setStudentInfo(null);
    };

    return (
        <div id="gestion_analitico">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 no-print">5. Generar Analítico</h2>

            {step === 1 && (
                <form onSubmit={handleDniSearch} className="p-6 bg-indigo-50 rounded-lg border border-indigo-200 max-w-lg mx-auto no-print">
                    <label htmlFor="dni_search_analitico" className="block text-sm font-medium text-gray-700">Ingrese DNI del estudiante</label>
                    <div className="mt-1 flex space-x-2">
                        <input
                            type="text"
                            id="dni_search_analitico"
                            value={dniSearch}
                            onChange={(e) => setDniSearch(e.target.value)}
                            className="flex-grow rounded-md border-gray-300 shadow-sm p-3 border"
                            placeholder="Buscar DNI..."
                            required
                        />
                        <button type="submit" disabled={loadingLocal} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-5 rounded-lg shadow transition disabled:bg-gray-400">
                            {loadingLocal ? <IconLoading /> : 'Buscar'}
                        </button>
                    </div>
                </form>
            )}

            {step === 2 && studentInfo && (
                <div className="p-6 bg-white rounded-lg shadow-md border max-w-lg mx-auto no-print">
                    <h3 className="text-lg font-semibold text-gray-800">Múltiples Planes Encontrados</h3>
                    <p className="text-gray-600 mb-4">El estudiante <strong>{studentInfo.nombres} {studentInfo.apellidos}</strong> tiene varios planes. Seleccione uno:</p>
                    <div className="grid grid-cols-1 gap-3">
                        {foundPlans.map(plan => (
                            <button key={plan} onClick={() => handlePlanSelect(plan)} className="w-full text-left p-4 bg-gray-100 rounded-lg hover:bg-indigo-100 border transition">
                                {plan}
                            </button>
                        ))}
                    </div>
                    <button onClick={resetForm} className="mt-6 text-sm text-indigo-600 hover:text-indigo-800 italic">&larr; Volver a buscar</button>
                </div>
            )}

            {step === 3 && studentInfo && selectedPlan && (
                <AnaliticoReport
                    student={studentInfo}
                    plan={selectedPlan}
                    allNotas={freshNotas}
                    allMaterias={materias}
                    onCancel={resetForm}
                />
            )}
        </div>
    );
};

export const AnaliticoReport = ({ student, plan, allNotas, allMaterias, onCancel }) => {
    const processedData = useMemo(() => {
        // 1. Materias base del plan seleccionado
        const materiasBase = allMaterias.filter(m => m.plan === plan);
        const notasEstudiante = allNotas.filter(n => n.dni === student.dni);

        // 2. Procesar cada materia buscando su nota válida (Criterio de aprobación)
        const materiasProcesadas = materiasBase.map(m => {
            const normalPlanName = m.nombre?.trim().toLowerCase();

            // Buscar la mejor nota que cumpla con el criterio de aprobación
            const notaValida = notasEstudiante.find(n => {
                const normalNotaName = n.materia?.trim().toLowerCase();
                if (normalNotaName !== normalPlanName) return false;

                const calif = parseFloat(n.nota);
                const condicionNormal = n.condicion?.trim();

                // Criterios oficiales de aprobación
                if (condicionNormal === 'Promoción') return calif >= 7;
                if (['Examen Final', 'Examen', 'Equivalencia'].includes(condicionNormal)) return calif >= 4;

                // Siglas aprobatorias (A = Aprobado, P = Promovido, E = Equivalencia)
                if (['A', 'P', 'E'].includes(n.nota?.toUpperCase())) return true;

                return false;
            });

            // Detalle para Optativas/Ensambles/Espacios (cualquier año)
            let nombreVisible = m.nombre;
            const esMateriaEspecial = /ensamble|optativa|espacio/i.test(m.nombre);
            if (esMateriaEspecial) {
                const detalle = notaValida?.obs_optativa_ensamble || notaValida?.observaciones;
                if (detalle) {
                    nombreVisible += ` (${detalle})`;
                }
            }

            return {
                ...m,
                materiaNombre: nombreVisible,
                notaData: notaValida || null
            };
        });

        let resultadoFinal = materiasProcesadas;

        // 3. Lógica específica Plan 530 (Mutuamente excluyentes en 1er año)
        if (plan && plan.includes('530')) {
            const materias1Anio = materiasProcesadas.filter(m => Number(m.anio) === 1);

            const findMat = (regex) => materias1Anio.find(m =>
                regex.test(m.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
            );

            const matEC = findMat(/expresion corporal/);
            const matDF = findMat(/danzas folkloricas/);

            if (matEC?.notaData) {
                // Si aprobó EC, ocultamos DF
                resultadoFinal = resultadoFinal.filter(m => m.id !== matDF?.id);
            } else if (matDF?.notaData) {
                // Si aprobó DF, ocultamos EC
                resultadoFinal = resultadoFinal.filter(m => m.id !== matEC?.id);
            }
        }

        // 4. Agrupar por año
        return resultadoFinal.reduce((acc, m) => {
            const anio = m.anio || 'N/A';
            if (!acc[anio]) acc[anio] = [];
            acc[anio].push(m);
            return acc;
        }, {});
    }, [student.dni, plan, allNotas, allMaterias]);

    const anios = Object.keys(processedData).sort((a, b) => a - b);
    const aniosPagina1 = anios.filter(a => Number(a) <= 3);
    const aniosPagina2 = anios.filter(a => Number(a) > 3);

    const handlePrint = () => {
        const printArea = document.getElementById('analitico-print-area');
        const previewContent = document.getElementById('analitico-preview-content');
        if (printArea && previewContent) {
            document.body.classList.add('printing-analitico');
            printArea.innerHTML = previewContent.innerHTML;
            window.print();
            printArea.innerHTML = '';
            document.body.classList.remove('printing-analitico');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleDateString('es-AR');
    };

    const RenderPagina = ({ aniosList, paginaNum }) => (
        <div className={`analitico-page p-10 bg-white shadow-inner mb-10 border-2 border-gray-100 relative ${paginaNum > 1 ? 'print-page-break' : ''}`} style={{ minHeight: '297mm' }}>
            <div className="print-header flex justify-between items-start border-b-2 border-black pb-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold uppercase">Escuela Superior de Música de Neuquén</h2>
                    <h3 className="text-md font-semibold">Formación Básica en Música (FOBAM)</h3>
                    <p className="mt-1 text-sm italic">Plan: <strong>{plan}</strong></p>
                </div>
                <div className="text-right text-xs">
                    <p>Página {paginaNum}</p>
                </div>
            </div>

            <div className="datos-estudiante mb-6 grid grid-cols-3 gap-4 text-sm border-b pb-4">
                <p><strong>Apellidos:</strong> {student.apellidos || student.apellido}</p>
                <p><strong>Nombres:</strong> {student.nombres || student.nombre}</p>
                <p><strong>DNI:</strong> {student.dni}</p>
            </div>

            <div className="espacios-curriculares">
                {aniosList.map(anio => (
                    <div key={anio} className="mb-6">
                        <h4 className="text-sm font-bold bg-gray-100 p-2 border border-gray-300 uppercase">Año de Cursado: {anio}</h4>
                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="p-2 border border-black text-left">Materia</th>
                                    <th className="p-2 border border-black text-center w-24">Condición</th>
                                    <th className="p-2 border border-black text-center w-16">Nota</th>
                                    <th className="p-2 border border-black text-center w-24">Fecha</th>
                                    <th className="p-2 border border-black text-center w-24">Libro/Folio</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processedData[anio].map(m => (
                                    <tr key={m.id} className="h-8">
                                        <td className="p-2 border border-black">{m.materiaNombre}</td>
                                        <td className="p-2 border border-black text-center">{m.notaData?.condicion || ''}</td>
                                        <td className="p-2 border border-black text-center font-bold">{m.notaData?.nota || ''}</td>
                                        <td className="p-2 border border-black text-center">{formatDate(m.notaData?.fecha)}</td>
                                        <td className="p-2 border border-black text-center">{m.notaData?.libro_folio || ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>

            <div className="absolute bottom-10 left-10 right-10 flex justify-between text-[10px] uppercase border-t pt-2">
                <p>Analítico Provisorio - Sistema de Gestión Escolar ESMN</p>
                <p>{new Date().toLocaleDateString()}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center no-print bg-white p-4 rounded-lg shadow border">
                <button onClick={onCancel} className="bg-gray-500 text-white px-6 py-2 rounded font-bold hover:bg-gray-600 transition">Regresar</button>
                <div className="flex space-x-2">
                    <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-bold">Vista de 2 Páginas</span>
                    <button onClick={handlePrint} className="bg-green-600 text-white px-8 py-2 rounded font-bold hover:bg-green-700 shadow-lg flex items-center transition">
                        <IconPrint className="mr-2" /> Imprimir Analítico
                    </button>
                </div>
            </div>

            <div id="analitico-preview-content" className="bg-gray-200 p-2 md:p-8 rounded-xl overflow-y-auto max-h-[80vh] border shadow-inner">
                <div className="mx-auto" style={{ maxWidth: '210mm' }}>
                    <RenderPagina aniosList={aniosPagina1} paginaNum={1} />
                    {aniosPagina2.length > 0 && <RenderPagina aniosList={aniosPagina2} paginaNum={2} />}
                </div>
            </div>
        </div>
    );
};

export const StudentAnaliticoScreen = ({
    navigateTo, showMessage, students, matriculaciones, materias, notas
}) => {
    return (
        <div className="flex flex-col items-center min-h-screen p-4 md:p-8 bg-gray-50">
            <header className="text-center mb-6 no-print">
                <h1 className="text-3xl font-extrabold text-indigo-900 tracking-tight">Reporte Analítico</h1>
                <p className="text-gray-500">Formación Básica en Música</p>
            </header>
            <main className="w-full max-w-6xl">
                <AnaliticoTab
                    showMessage={showMessage}
                    materias={materias}
                    students={students}
                    matriculaciones={matriculaciones}
                    notas={notas}
                />
            </main>
            <button onClick={() => navigateTo('student_access')} className="mt-8 text-indigo-600 hover:text-indigo-800 font-bold no-print flex items-center transition">
                &larr; Volver al Panel de Estudiante
            </button>
        </div>
    );
};

export default StudentAnaliticoScreen;
