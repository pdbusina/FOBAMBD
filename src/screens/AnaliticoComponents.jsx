import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { IconLoading, IconPrint } from '../components/Icons';

/**
 * Pestaña 5: Analítico
 */
export const AnaliticoTab = ({
    showMessage, students, matriculaciones, materias, notas
}) => {
    const [step, setStep] = useState(1); // 1: Buscar DNI, 2: Seleccionar Plan, 3: Mostrar Reporte
    const [dniSearch, setDniSearch] = useState('');
    const [foundPlans, setFoundPlans] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState('');
    const [studentInfo, setStudentInfo] = useState(null);

    const handleDniSearch = (e) => {
        e.preventDefault();
        if (!dniSearch) return showMessage("Ingrese un DNI.", true);

        const student = students.find(s => s.dni === dniSearch);
        if (!student) {
            showMessage(`Estudiante con DNI ${dniSearch} no encontrado.`, true);
            return;
        }

        setStudentInfo(student);
        const planes = [...new Set(matriculaciones.filter(m => m.dni === dniSearch).map(m => m.plan))];

        if (planes.length === 0) {
            showMessage(`El estudiante no tiene matriculaciones activas.`, true);
            return;
        }

        if (planes.length > 1) {
            setFoundPlans(planes);
            setStep(2);
        } else {
            setSelectedPlan(planes[0]);
            setStep(3);
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
                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-5 rounded-lg shadow transition">Buscar</button>
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
                    allNotas={notas}
                    allMaterias={materias}
                    onCancel={resetForm}
                />
            )}
        </div>
    );
};

export const AnaliticoReport = ({ student, plan, allNotas, allMaterias, onCancel }) => {
    const processedData = useMemo(() => {
        const materiasDelPlan = allMaterias.filter(m => m.plan === plan);
        const notasDelEstudiante = allNotas.filter(n => n.dni === student.dni);

        const materiasConNotas = materiasDelPlan.map(materia => {
            // Normalizar nombres para búsqueda
            const normalName = materia.materia?.trim().toLowerCase();
            const esOptativaOEnsamble = normalName.includes('optativa') || normalName.includes('ensamble') || normalName.includes('espacio');

            // Buscar nota (priorizar la mejor calificacion o la mas reciente)
            const notaEncontrada = notasDelEstudiante.find(n => {
                const materiaNota = n.materia?.trim().toLowerCase();
                return materiaNota === normalName &&
                    ['Promoción', 'Examen', 'Equivalencia'].includes(n.condicion);
            });

            // Si es optativa/ensamble, agregar el detalle al nombre si existe nota
            let nombreMostrar = materia.materia;
            if (esOptativaOEnsamble && notaEncontrada?.obs_optativa_ensamble) {
                nombreMostrar += ` (${notaEncontrada.obs_optativa_ensamble})`;
            }

            return {
                ...materia,
                materiaNombre: nombreMostrar,
                notaData: notaEncontrada || null
            };
        });

        let materiasFinal = materiasConNotas;

        // Lógica Excluyente Plan 530 (1er Año): EC vs DF
        // Lógica Excluyente Plan 530 (1er Año): EC vs DF
        if (plan && plan.includes('530')) {
            const materiasPrimerAnio = materiasConNotas.filter(m => Number(m.anio) === 1);
            console.log("DEBUG ANALITICO - Plan:", plan, "Materias 1er Año:", materiasPrimerAnio.map(m => m.materiaNombre));

            const findMateria = (regex) => materiasPrimerAnio.find(m => {
                const normalized = m.materiaNombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const isMatch = regex.test(normalized);
                if (isMatch) console.log(`DEBUG ANALITICO - Matched: ${m.materiaNombre} with ${regex}`);
                return isMatch;
            });

            const materiaEC = findMateria(/expresion corporal/);
            const materiaDF = findMateria(/danzas folkloricas/);

            const hasEC = materiaEC && materiaEC.notaData;
            const hasDF = materiaDF && materiaDF.notaData;

            console.log("DEBUG ANALITICO - Status EC:", !!materiaEC, "Nota EC:", !!hasEC, "| Status DF:", !!materiaDF, "Nota DF:", !!hasDF);

            if (hasEC) {
                console.log("DEBUG ANALITICO - Eliminando DF porque EC tiene nota");
                materiasFinal = materiasFinal.filter(m => m.id !== materiaDF?.id);
            } else if (hasDF) {
                console.log("DEBUG ANALITICO - Eliminando EC porque DF tiene nota");
                materiasFinal = materiasFinal.filter(m => m.id !== materiaEC?.id);
            }
        }

        // Agrupar por año
        const grouped = materiasFinal.reduce((acc, m) => {
            const anio = m.anio || 'N/A';
            if (!acc[anio]) acc[anio] = [];
            acc[anio].push(m);
            return acc;
        }, {});

        // Ordenar materias dentro de cada año
        Object.keys(grouped).forEach(anio => {
            grouped[anio].sort((a, b) => a.materiaNombre.localeCompare(b.materiaNombre));
        });

        return grouped;
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
