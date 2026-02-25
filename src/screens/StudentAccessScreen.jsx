import React, { useState } from 'react';
import { IconLoading, IconCertificate, IconReport, IconPrint } from '../components/Icons';
import { AccessButton } from '../components/UI/SharedUI';

/**
 * (REFACTORIZADO) Pantalla 2: Acceso Estudiantes
 */
export const StudentAccessScreen = ({ navigateTo, db, appId, showMessage, students, matriculaciones }) => {
    const [step, setStep] = useState(1); // 1: DNI, 2: Plan Select, 3: Certificate
    const [dni, setDni] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [studentInfo, setStudentInfo] = useState(null); // { dni, nombres, apellidos, genero }
    const [foundPlans, setFoundPlans] = useState([]); // [plan1, plan2]
    const [selectedPlan, setSelectedPlan] = useState('');

    const handleDniSearch = async (e) => {
        e.preventDefault();
        if (!dni) return showMessage("Por favor, ingrese un DNI.", true);
        if (!db) return showMessage("Error: No hay conexión a la base de datos.", true);

        setIsLoading(true);
        const currentYear = new Date().getFullYear().toString();

        try {
            // 1. Buscar el perfil del estudiante por DNI
            const { data: studentData, error: studentError } = await db
                .from('perfiles')
                .select('*')
                .eq('dni', dni)
                .single();

            if (studentError || !studentData) {
                console.error("Error buscando estudiante:", studentError);
                setIsLoading(false);
                return showMessage(`No se encontró registro para el DNI ${dni}.`, true);
            }

            // 2. Buscar matriculaciones activas para ese perfil en el ciclo actual
            const { data: matriculasDelDNI, error: matriculaError } = await db
                .from('matriculaciones')
                .select('*')
                .eq('estudiante_id', studentData.id)
                .eq('ciclo_lectivo', parseInt(currentYear));


            if (matriculaError || !matriculasDelDNI || matriculasDelDNI.length === 0) {
                console.error("Error buscando matrícula:", matriculaError);
                setIsLoading(false);
                return showMessage(`No se encontró matrícula activa para el DNI ${dni} en el ciclo ${currentYear}.`, true);
            }

            setStudentInfo({
                id: studentData.id,
                dni: studentData.dni,
                nombres: studentData.nombre,
                apellidos: studentData.apellido,
                genero: studentData.genero || 'Otro'
            });

            const planesUnicos = [...new Set(matriculasDelDNI.map(m => m.plan))];

            if (planesUnicos.length > 1) {
                setFoundPlans(planesUnicos);
                setStep(2);
            } else {
                setSelectedPlan(planesUnicos[0]);
                setStep(3);
            }

        } catch (error) {
            console.error("Error en el proceso de búsqueda:", error);
            showMessage(`Error al consultar los datos: ${error.message}`, true);
        } finally {
            setIsLoading(false);
        }
    };


    const handlePlanSelect = (plan) => {
        setSelectedPlan(plan);
        setStep(3);
    };

    const resetFlow = () => {
        setStep(1);
        setDni('');
        setStudentInfo(null);
        setFoundPlans([]);
        setSelectedPlan('');
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-100">
            <header className="text-center mb-10">
                <h1 className="text-4xl font-bold text-gray-800">Portal Estudiante</h1>
                <p className="text-lg text-gray-600 mt-2">Consulte su información académica.</p>
            </header>

            <main className="w-full max-w-lg p-8 bg-white rounded-xl shadow-lg border border-gray-200">
                {step === 1 && (
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-800 mb-5">Certificado de Alumno Regular</h2>
                        <form onSubmit={handleDniSearch} className="space-y-4">
                            <div>
                                <label htmlFor="dni_student" className="block text-sm font-medium text-gray-700">Ingrese su DNI (sin puntos)</label>
                                <input
                                    type="text"
                                    id="dni_student"
                                    value={dni}
                                    onChange={(e) => setDni(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border"
                                    placeholder="Ej: 30123456"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex items-center justify-center font-bold py-3 px-4 rounded-lg shadow-lg transition duration-200 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-400"
                            >
                                {isLoading ? <IconLoading /> : <IconCertificate className="w-5 h-5 mr-2" />}
                                {isLoading ? "Buscando..." : "Solicitar Certificado"}
                            </button>
                        </form>
                    </div>
                )}

                {step === 2 && studentInfo && (
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-800 mb-5">Múltiples Planes</h2>
                        <p className="text-gray-600 mb-4">El/La estudiante <strong>{studentInfo.nombres} {studentInfo.apellidos}</strong> está matriculado/a en múltiples planes este año. Por favor, seleccione uno:</p>
                        <div className="space-y-3">
                            {foundPlans.map(plan => (
                                <button
                                    key={plan}
                                    onClick={() => handlePlanSelect(plan)}
                                    className="w-full text-left p-4 bg-gray-100 rounded-lg hover:bg-indigo-100 border border-gray-300 font-medium"
                                >
                                    {plan}
                                </button>
                            ))}
                        </div>
                        <button onClick={resetFlow} className="mt-6 text-sm text-indigo-600 hover:text-indigo-800">&larr; Volver</button>
                    </div>
                )}

                {step === 3 && studentInfo && selectedPlan && (
                    <CertificateDisplay
                        student={studentInfo}
                        plan={selectedPlan}
                        onCancel={resetFlow}
                    />
                )}

                <div className="mt-8 border-t pt-6">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Rendimiento Académico</h2>
                    <button
                        onClick={() => navigateTo('student_analitico')}
                        className="w-full flex items-center justify-center font-bold py-3 px-4 rounded-lg shadow-lg transition duration-200 bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        <IconReport className="w-5 h-5 mr-2" />
                        Consultar Analítico
                    </button>
                </div>
            </main>

            <button
                onClick={() => navigateTo('landing')}
                className="mt-10 text-indigo-600 hover:text-indigo-800 font-medium transition duration-150"
            >
                &larr; Volver al inicio
            </button>
        </div>
    );
};

export const CertificateDisplay = ({ student, plan, onCancel }) => {
    const handlePrint = () => {
        const printArea = document.getElementById('certificate-print-area');
        const previewContent = document.getElementById('certificate-preview-content');

        if (printArea && previewContent) {
            document.body.classList.add('printing-certificado');
            printArea.innerHTML = previewContent.innerHTML;
            window.print();
            printArea.innerHTML = '';
            document.body.classList.remove('printing-certificado');
        } else {
            console.error("Error al preparar la impresión del certificado.");
        }
    };

    const alumnoTerm = (student.genero || 'Otro').toLowerCase() === 'femenino' ? 'alumna' : 'alumno';

    return (
        <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-5">Certificado Generado</h2>
            <div id="certificate-preview-content" className="certificate-content" style={{
                padding: '1.5rem',
                border: '1px dashed #ccc',
                fontFamily: "'Times New Roman', Times, serif",
                fontSize: '12pt',
                lineHeight: 1.6,
                background: 'white',
                color: 'black'
            }}>
                <div className="certificate-header" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontWeight: 'bold',
                    fontSize: '14pt',
                    marginBottom: '30px',
                    paddingBottom: '10px',
                    borderBottom: '2px solid #000'
                }}>
                    <div style={{ textAlign: 'left' }}>
                        <p style={{ margin: 0 }}>Escuela Superior de Música de Neuquén</p>
                        <p style={{ margin: 0, fontSize: '12pt', fontWeight: 'normal' }}>Consejo Provincial de Educación</p>
                    </div>
                    <div>
                        <img src="/logo.png" alt="Logo" style={{ width: '80px', height: 'auto' }} />
                    </div>
                </div>
                <div className="certificate-body" style={{ marginTop: '30px', marginBottom: '40px' }}>
                    <p>La Escuela Superior de Música de Neuquén certifica que
                        el/la estudiante <strong>{student.nombres} {student.apellidos}</strong>,
                        DNI <strong>{student.dni}</strong>, es {alumnoTerm} regular
                        del plan <strong>{plan}</strong>, de la FORMACIÓN BÁSICA EN MÚSICA.
                    </p>
                </div>
                <div className="certificate-footer" style={{ marginBottom: '40px' }}>
                    <p>Se extiende el presente certificado a los {new Date().toLocaleDateString('es-AR', { day: '2-digit' })} días del mes de {new Date().toLocaleDateString('es-AR', { month: 'long' })} de {new Date().getFullYear()}.</p>
                </div>
                <div className="certificate-signatures" style={{
                    paddingTop: '50px',
                    display: 'flex',
                    justifyContent: 'space-around',
                    textAlign: 'center'
                }}>
                    <div>
                        <p className="certificate-signature-line" style={{ borderTop: '1px solid #000', width: '200px', paddingTop: '5px' }}>Firma</p>
                    </div>
                    <div>
                        <p className="certificate-signature-line" style={{ borderTop: '1px solid #000', width: '200px', paddingTop: '5px' }}>Sello</p>
                    </div>
                </div>
            </div>
            <div className="mt-8 flex space-x-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="w-1/3 font-bold py-3 px-4 rounded-lg shadow-lg transition duration-200 bg-gray-200 hover:bg-gray-300 text-gray-700"
                >
                    &larr; Volver
                </button>
                <button
                    type="button"
                    onClick={handlePrint}
                    className="w-2/3 flex items-center justify-center font-bold py-3 px-4 rounded-lg shadow-lg transition duration-200 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                    <IconPrint />
                    Imprimir / Descargar PDF
                </button>
            </div>
        </div>
    );
};
export default StudentAccessScreen;
