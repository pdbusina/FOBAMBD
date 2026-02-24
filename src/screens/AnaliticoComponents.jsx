import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { IconLoading, IconPrint } from '../components/Icons';

/**
 * Pestaña 5: Analítico
 */
export const AnaliticoTab = ({
    showMessage
}) => {

    const [step, setStep] = useState(1); // 1: Buscar DNI, 2: Seleccionar Plan, 3: Mostrar Reporte
    const [dniSearch, setDniSearch] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);

    const [foundPlans, setFoundPlans] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState('');
    const [studentInfo, setStudentInfo] = useState(null);

    const [materiasData, setMateriasData] = useState([]);
    const [notasData, setNotasData] = useState([]);

    const handleDniSearch = async (e) => {
        e.preventDefault();
        if (!dniSearch) return showMessage("Ingrese un DNI.", true);

        setSearchLoading(true);
        setFoundPlans([]);
        setSelectedPlan('');
        setStudentInfo(null);

        try {
            // 1. Buscar Perfil
            const { data: studentData, error: studentError } = await supabase
                .from('perfiles')
                .select('*')
                .eq('dni', dniSearch)
                .single();

            if (studentError || !studentData) {
                showMessage(`Estudiante con DNI ${dniSearch} no encontrado.`, true);
                setStep(1);
                return;
            }

            setStudentInfo({
                id: studentData.id,
                dni: studentData.dni,
                nombres: studentData.nombre,
                apellidos: studentData.apellido,
                fechanacimiento: studentData.fecha_nacimiento,
                nacionalidad: studentData.nacionalidad
            });

            // 2. Buscar Matriculaciones (para ver planes)
            const { data: matriculas } = await supabase
                .from('matriculaciones')
                .select('plan')
                .eq('perfil_id', studentData.id);

            // 3. Buscar Notas del estudiante (también para ver planes históricos)
            const { data: nts } = await supabase
                .from('notas')
                .select('*, materias(nombre, plan)')
                .eq('perfil_id', studentData.id);

            const plansFromMatriculas = matriculas ? matriculas.map(m => m.plan) : [];
            const plansFromNotas = nts ? nts.map(n => n.materias?.plan).filter(Boolean) : [];

            const planesUnicos = [...new Set([...plansFromMatriculas, ...plansFromNotas])];

            if (planesUnicos.length === 0) {
                showMessage(`El estudiante no tiene matriculaciones ni notas registradas en ningún plan.`, true);
                setStep(1);
                return;
            }

            if (nts) {
                setNotasData(nts.map(n => ({
                    dni: studentData.dni,
                    materia: n.materias?.nombre,
                    nota: n.calificacion,
                    condicion: n.condicion,
                    fecha: n.fecha,
                    libro_folio: n.libro_folio
                })));
            }

            // 4. Buscar todas las materias (necesarias para el reporte)
            const { data: mats } = await supabase.from('materias').select('*');
            if (mats) {
                setMateriasData(mats.map(m => ({ id: m.id, plan: m.plan, anio: m.anio, materia: m.nombre })));
            }

            if (planesUnicos.length > 1) {
                setFoundPlans(planesUnicos);
                setStep(2);
            } else {
                setSelectedPlan(planesUnicos[0]);
                setStep(3);
            }
            showMessage(`Datos cargados para ${studentData.nombre} ${studentData.apellido}.`, false);


        } catch (error) {
            console.error("Error buscando DNI:", error);
            showMessage(`Error de búsqueda: ${error.message}`, true);
        } finally {
            setSearchLoading(false);
        }
    };


    const handlePlanSelect = (plan) => {
        setSelectedPlan(plan);
        setStep(3);
    };

    const resetForm = () => {
        setStep(1);
        setDniSearch('');
        setSearchLoading(false);
        setFoundPlans([]);
        setSelectedPlan('');
        setStudentInfo(null);
    };

    return (
        <div id="gestion_analitico">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Generar Analítico</h2>

            {step === 1 && (
                <form onSubmit={handleDniSearch} className="p-6 bg-indigo-50 rounded-lg border border-indigo-200 max-w-lg mx-auto">
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
                        <button
                            type="submit"
                            disabled={searchLoading}
                            className="flex items-center justify-center font-bold py-3 px-5 rounded-lg shadow-lg transition duration-200 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-400"
                        >
                            {searchLoading ? <IconLoading /> : 'Buscar'}
                        </button>
                    </div>
                </form>
            )}

            {step === 2 && studentInfo && (
                <div className="p-6 bg-white rounded-lg shadow-md border max-w-lg mx-auto">
                    <h3 className="text-lg font-semibold text-gray-800">Múltiples Planes Encontrados</h3>
                    <p className="text-gray-600 mb-4">El estudiante <strong>{studentInfo.nombres} {studentInfo.apellidos}</strong> está matriculado en varios planes. Por favor, seleccione uno para generar el analítico:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {foundPlans.map(plan => (
                            <button
                                key={plan}
                                onClick={() => handlePlanSelect(plan)}
                                className="w-full text-left p-4 bg-gray-100 rounded-lg hover:bg-indigo-100 border border-gray-300"
                            >
                                {plan}
                            </button>
                        ))}
                    </div>
                    <button onClick={resetForm} className="mt-6 text-sm text-indigo-600 hover:text-indigo-800">&larr; Volver a buscar</button>
                </div>
            )}

            {step === 3 && studentInfo && selectedPlan && (
                <AnaliticoReport
                    student={studentInfo}
                    plan={selectedPlan}
                    allNotas={notasData}
                    allMaterias={materiasData}
                    onCancel={resetForm}
                />
            )}

        </div>
    );
};

export const AnaliticoReport = ({ student, plan, allNotas, allMaterias, onCancel }) => {
    const processedData = useMemo(() => {
        const materiasDelPlan = allMaterias.filter(m => m.plan === plan);
        const notasAprobadas = allNotas.filter(n =>
            n.dni === student.dni &&
            ['Promoción', 'Examen', 'Equivalencia'].includes(n.condicion)
        );

        let materiasConNotas = materiasDelPlan.map(materia => {
            const notaEncontrada = notasAprobadas.find(n => n.materia === materia.materia);
            return {
                ...materia,
                notaData: notaEncontrada || null
            };
        });

        const EC_NAME = "expresión corporal";
        const DF_NAME = "danzas folklóricas";

        const findMateriaAprobada = (nombreMateria) => {
            return materiasConNotas.find(m =>
                String(m.anio) === '1' &&
                m.materia.toLowerCase() === nombreMateria &&
                m.notaData != null
            );
        };

        const ecAprobada = findMateriaAprobada(EC_NAME);
        const dfAprobada = findMateriaAprobada(DF_NAME);

        if (ecAprobada) {
            materiasConNotas = materiasConNotas.filter(m =>
                !(String(m.anio) === '1' && m.materia.toLowerCase() === DF_NAME)
            );
        } else if (dfAprobada) {
            materiasConNotas = materiasConNotas.filter(m =>
                !(String(m.anio) === '1' && m.materia.toLowerCase() === EC_NAME)
            );
        }

        const grouped = materiasConNotas.reduce((acc, materia) => {
            const anio = materia.anio;
            if (!acc[anio]) {
                acc[anio] = [];
            }
            acc[anio].push(materia);
            return acc;
        }, {});

        Object.keys(grouped).forEach(anio => {
            grouped[anio].sort((a, b) => a.materia.localeCompare(b.materia));
        });

        return grouped;
    }, [student.dni, plan, allNotas, allMaterias]);

    const anios = Object.keys(processedData).sort((a, b) => {
        if (a === 'N/A') return 1;
        if (b === 'N/A') return -1;
        return a.localeCompare(b, undefined, { numeric: true });
    });

    const aniosPagina1 = anios.filter(a => ['1', '2', '3'].includes(a));
    const aniosPagina2 = anios.filter(a => !['1', '2', '3'].includes(a));

    const handlePrint = () => {
        const printArea = document.getElementById('analitico-print-area');
        const previewContent = document.getElementById('analitico-preview-content');

        if (printArea && previewContent) {
            document.body.classList.add('printing-analitico');
            printArea.innerHTML = previewContent.innerHTML;
            window.print();
            printArea.innerHTML = '';
            document.body.classList.remove('printing-analitico');
        } else {
            console.error("Error al preparar la impresión del analítico.");
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
            return utcDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (e) {
            return dateString;
        }
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg border">
            <div id="analitico-preview-content" className="max-w-4xl mx-auto bg-white text-black">
                <div className="print-header text-left text-sm border-b-2 border-black pb-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold">Escuela Superior de Música de Neuquén</h2>
                            <h3 className="text-lg font-semibold">Consejo Provincial de Educación</h3>
                            <h3 className="text-lg font-semibold">Formación Básica en Música (FOBAM)</h3>
                            <p className="mt-1">Plan de Estudio: <strong>{plan}</strong></p>
                        </div>
                        <div>
                            <img src="/logo.png" alt="Logo" className="w-20 h-auto" />
                        </div>
                    </div>
                </div>

                <div className="my-6 text-sm">
                    <h3 className="text-base font-bold mb-3 border-b border-gray-400">DATOS DEL/DE LA ESTUDIANTE</h3>
                    <div className="flex justify-between items-center">
                        <p><strong>Apellidos:</strong> {student.apellidos}</p>
                        <p><strong>Nombres:</strong> {student.nombres}</p>
                        <p><strong>DNI:</strong> {student.dni}</p>
                    </div>
                </div>

                <div className="my-6">
                    <h3 className="text-base font-bold mb-2 border-b border-gray-400">ESPACIOS CURRICULARES ACREDITADOS</h3>

                    {aniosPagina1.map(anio => {
                        const materiasDelAnio = processedData[anio] || [];
                        if (materiasDelAnio.length > 0) {
                            return (
                                <div key={anio} className="mb-4">
                                    <h4 className="text-sm font-bold bg-gray-100 p-2 border border-gray-300">AÑO DE CURSADO: {anio}</h4>
                                    <table className="w-full text-xs border border-gray-300">
                                        <thead>
                                            <tr>
                                                <th className="p-2 border">Materia</th>
                                                <th className="p-2 border">Condición</th>
                                                <th className="p-2 border">Nota</th>
                                                <th className="p-2 border">Fecha</th>
                                                <th className="p-2 border">Libro/Folio</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {materiasDelAnio.map(materia => (
                                                <tr key={materia.id}>
                                                    <td className="p-2 border">{materia.materia}</td>
                                                    <td className="p-2 border">{materia.notaData?.condicion}</td>
                                                    <td className="p-2 border">{materia.notaData?.nota}</td>
                                                    <td className="p-2 border">{formatDate(materia.notaData?.fecha)}</td>
                                                    <td className="p-2 border">{materia.notaData?.libro_folio}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        }
                    })}
                </div>
            </div>

            <div className="mt-8 flex space-x-3 no-print">
                <button onClick={onCancel} className="w-1/3 bg-gray-200 py-3 rounded font-bold">Volver</button>
                <button onClick={handlePrint} className="w-2/3 bg-indigo-600 text-white py-3 rounded font-bold">Imprimir</button>
            </div>
        </div>
    );
};

export const StudentAnaliticoScreen = ({
    navigateTo, showMessage, students, matriculaciones, materias, notas
}) => {
    return (
        <div className="flex flex-col items-center min-h-screen p-8 bg-gray-100">
            <div id="analitico-print-area" className="print-area"></div>
            <header className="text-center mb-10 no-print">
                <h1 className="text-4xl font-bold text-gray-800">Portal Estudiante</h1>
            </header>
            <main className="w-full max-w-7xl p-8 bg-white rounded-xl shadow-lg border border-gray-200">
                <AnaliticoTab
                    showMessage={showMessage}
                    materias={materias}
                    students={students}
                    matriculaciones={matriculaciones}
                    notas={notas}
                />
            </main>
            <button
                onClick={() => navigateTo('student_access')}
                className="mt-10 text-indigo-600 no-print"
            >
                &larr; Volver
            </button>
        </div>
    );
};

export default StudentAnaliticoScreen;
