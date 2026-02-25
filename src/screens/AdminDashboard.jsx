import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import {
    IconLoading, IconUser, IconAdmin, IconCertificate,
    IconReport, IconPrint, IconLoading as Spinner
} from '../components/Icons';
import { TabButton } from '../components/UI/SharedUI';
import { CertificateDisplay } from './StudentAccessScreen';
import { AnaliticoTab } from './AnaliticoComponents';

const defaultStudentData = {
    dni: '', apellidos: '', nombres: '', email: '',
    direccion: '', ciudad: '', telefono: '',
    telefonourgencias: '', nacionalidad: '', genero: 'Masculino',
    fechanacimiento: ''
};

export const AdminDashboardScreen = ({
    userClaims, navigateTo, activeTab, handleTabChange, showMessage,
    userId, students, instrumentos, addStudent, updateStudent, deleteStudent,
    matriculaciones, materias, notas, deleteMateria, notasSubTab, setNotasSubTab
}) => {
    return (
        <div className="flex flex-col min-h-screen">
            <header className="bg-indigo-700 text-white p-4 shadow-md flex justify-between items-center no-print">
                <div className="flex items-center space-x-3">
                    <img src="/logo.png" alt="Logo" className="w-10 h-auto" />
                    <div>
                        <h1 className="text-xl font-bold">FOBAM - Gestión Escolar</h1>
                        <p className="text-xs text-indigo-200">Panel de Administración</p>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="text-right">
                        <p className="text-sm font-medium">{userClaims?.nombre || 'Administrador'}</p>
                        <button onClick={() => supabase.auth.signOut()} className="text-xs text-indigo-300 hover:text-white transition underline">Cerrar Sesión</button>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                <nav className="w-64 bg-slate-800 text-slate-300 p-4 space-y-2 flex-shrink-0 no-print overflow-y-auto">
                    <TabButton id="inscribir" label="ESTUDIANTES" isActive={activeTab === 'inscribir'} onClick={handleTabChange} icon={<IconUser />} vertical />
                    <TabButton id="matricular" label="MATRICULACIÓN" isActive={activeTab === 'matricular'} onClick={handleTabChange} icon={<IconCertificate />} vertical />
                    <TabButton id="listado" label="LISTADO GENERAL" isActive={activeTab === 'listado'} onClick={handleTabChange} icon={<IconUser />} vertical />
                    <div className="pt-4 pb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Académico</div>
                    <TabButton id="notas" label="GESTIÓN DE NOTAS" isActive={activeTab === 'notas'} onClick={handleTabChange} icon={<IconReport />} vertical />
                    <TabButton id="analitico" label="ANALÍTICOS" isActive={activeTab === 'analitico'} onClick={handleTabChange} icon={<IconReport />} vertical />
                    <TabButton id="certificado" label="CERTIFICADOS" isActive={activeTab === 'certificado'} onClick={handleTabChange} icon={<IconCertificate />} vertical />
                    <div className="pt-4 pb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Configuración</div>
                    <TabButton id="instrumentos" label="INSTRUMENTOS" isActive={activeTab === 'instrumentos'} onClick={handleTabChange} icon={<IconAdmin />} vertical />
                    <TabButton id="materias" label="MATERIAS / PLANES" isActive={activeTab === 'materias'} onClick={handleTabChange} icon={<IconAdmin />} vertical />
                    <TabButton id="carga_masiva" label="CARGA MASIVA" isActive={activeTab === 'carga_masiva'} onClick={handleTabChange} icon={<IconAdmin />} vertical />
                </nav>

                <main className="flex-1 p-8 overflow-y-auto bg-gray-50">
                    {activeTab === 'inscribir' && <InscribirEditarTab showMessage={showMessage} onStudentAdded={addStudent} onStudentUpdated={updateStudent} />}
                    {activeTab === 'matricular' && <MatriculacionTab showMessage={showMessage} instrumentos={instrumentos} matriculaciones={matriculaciones} />}
                    {activeTab === 'listado' && <ListadoEstudiantesTab students={students} deleteStudent={deleteStudent} />}
                    {activeTab === 'notas' && <NotasTab showMessage={showMessage} materias={materias} students={students} matriculaciones={matriculaciones} notas={notas} notasSubTab={notasSubTab} setNotasSubTab={setNotasSubTab} />}
                    {activeTab === 'analitico' && <AnaliticoTab showMessage={showMessage} materias={materias} students={students} matriculaciones={matriculaciones} notas={notas} />}
                    {activeTab === 'certificado' && <CertificadoTab showMessage={showMessage} students={students} matriculaciones={matriculaciones} />}
                    {activeTab === 'instrumentos' && <InstrumentosTab showMessage={showMessage} instrumentos={instrumentos} />}
                    {activeTab === 'materias' && <MateriasTab showMessage={showMessage} materias={materias} deleteMateria={deleteMateria} />}
                    {activeTab === 'carga_masiva' && <CargaMasivaTab showMessage={showMessage} />}
                </main>
            </div>
        </div>
    );
};

export const InscribirEditarTab = ({ showMessage, onStudentAdded, onStudentUpdated }) => {
    const [dniSearch, setDniSearch] = useState('');
    const [foundStudent, setFoundStudent] = useState(null);
    const [searchState, setSearchState] = useState('idle');
    const [isEditMode, setIsEditMode] = useState(false);

    const handleDniSearch = async (e) => {
        e.preventDefault();
        const cleanDni = dniSearch.replace(/\D/g, '');
        if (!cleanDni) return showMessage("Ingrese un DNI válido.", true);

        setSearchState('loading');
        try {
            const { data, error } = await supabase.from('perfiles').select('*').eq('dni', cleanDni).single();
            if (error || !data) {
                showMessage(`DNI ${cleanDni} no encontrado. Creando nuevo registro.`, false);
                setSearchState('not_found');
                setFoundStudent({ ...defaultStudentData, dni: cleanDni });
                setIsEditMode(false);
            } else {
                showMessage(`DNI ${cleanDni} encontrado.`, false);
                setSearchState('found');
                setFoundStudent({
                    id: data.id,
                    dni: data.dni,
                    apellidos: data.apellido || "",
                    nombres: data.nombre || "",
                    email: data.email || "",
                    direccion: data.direccion || "",
                    ciudad: data.ciudad || "",
                    telefono: data.telefono || "",
                    telefonourgencias: data.telefono_urgencias || "",
                    nacionalidad: data.nacionalidad || "",
                    genero: data.genero || "Masculino",
                    fechanacimiento: data.fecha_nacimiento || ""
                });
                setIsEditMode(true);
            }
        } catch (error) {
            showMessage(`Error: ${error.message}`, true);
            setSearchState('idle');
        }
    };


    const handleStudentSubmit = async (formData) => {
        let result;
        if (isEditMode) {
            const { id, ...dataToUpdate } = formData;
            result = await onStudentUpdated(id, dataToUpdate);
        } else {
            result = await onStudentAdded(formData);
        }

        if (result && result.success) {
            setFoundStudent(null);
            setDniSearch('');
            setSearchState('idle');
        }
    };


    return (
        <div id="gestion_estudiantes">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Gestión de Estudiantes</h2>
            {!foundStudent ? (
                <form onSubmit={handleDniSearch} className="p-6 bg-indigo-50 rounded-lg border border-indigo-200 max-w-lg mx-auto">
                    <label className="block text-sm font-medium text-gray-700">Ingrese DNI</label>
                    <div className="mt-1 flex space-x-2">
                        <input type="text" value={dniSearch} onChange={(e) => setDniSearch(e.target.value)} className="flex-grow rounded-md border-gray-300 shadow-sm p-3 border" placeholder="Buscar o Inscribir..." required />
                        <button type="submit" disabled={searchState === 'loading'} className="flex items-center justify-center font-bold py-3 px-5 rounded-lg shadow-lg transition duration-200 bg-indigo-600 hover:bg-indigo-700 text-white">
                            {searchState === 'loading' ? <IconLoading /> : 'Buscar DNI'}
                        </button>
                    </div>
                </form>
            ) : (
                <StudentForm initialData={foundStudent} onSubmit={handleStudentSubmit} buttonLabel={isEditMode ? "Guardar Cambios" : "Inscribir Nuevo Estudiante"} isEdit={isEditMode} onCancel={() => { setFoundStudent(null); setDniSearch(''); setSearchState('idle'); }} />
            )}
        </div>
    );
};

export const ListadoEstudiantesTab = ({ students, deleteStudent }) => {
    const calcularEdad = (fechaNacimiento) => {
        if (!fechaNacimiento) return 'N/A';
        try {
            const parts = fechaNacimiento.split('-');
            const cumple = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
            const hoy = new Date();
            let edad = hoy.getFullYear() - cumple.getFullYear();
            const m = hoy.getMonth() - cumple.getMonth();
            if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) edad--;
            return edad;
        } catch (e) { return 'Inválido'; }
    };

    return (
        <div id="listado_estudiantes">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Listado de Estudiantes ({students.length})</h2>
            <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200 max-h-[70vh] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-indigo-600 text-white sticky top-0 text-xs">
                        <tr>
                            <th className="px-3 py-3 text-left">DNI</th>
                            <th className="px-3 py-3 text-left">Apellido</th>
                            <th className="px-3 py-3 text-left">Nombres</th>
                            <th className="px-3 py-3 text-left">Email</th>
                            <th className="px-3 py-3 text-left">Ciudad</th>
                            <th className="px-3 py-3 text-left">Edad</th>
                            <th className="px-3 py-3 text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100 text-sm">
                        {students.map(student => (
                            <tr key={student.id} className="hover:bg-indigo-50">
                                <td className="px-3 py-3 font-mono">{student.dni}</td>
                                <td className="px-3 py-3">{student.apellidos}</td>
                                <td className="px-3 py-3">{student.nombres}</td>
                                <td className="px-3 py-3">{student.email}</td>
                                <td className="px-3 py-3">{student.ciudad}</td>
                                <td className="px-3 py-3 text-center">{calcularEdad(student.fechanacimiento)}</td>
                                <td className="px-3 py-3 text-right">
                                    <button onClick={() => deleteStudent(student.id, `${student.nombres} ${student.apellidos}`)} className="text-red-600 hover:text-red-900 font-semibold">Eliminar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export const MatriculacionTab = ({ showMessage, instrumentos, matriculaciones }) => {
    const [dniMatricula, setDniMatricula] = useState('');
    const [studentForMatricula, setStudentForMatricula] = useState(null);
    const [matriculaSearchState, setMatriculaSearchState] = useState('idle');
    const [selectedInstrumentoId, setSelectedInstrumentoId] = useState('');
    const [selectedPlan, setSelectedPlan] = useState('');
    const currentYear = new Date().getFullYear().toString();

    const matriculacionesDelAnio = useMemo(() => matriculaciones.filter(m => m.cicloLectivo === currentYear), [matriculaciones, currentYear]);

    const handleDniSearchMatricula = async (e) => {
        e.preventDefault();
        setMatriculaSearchState('loading');
        const { data, error } = await supabase.from('perfiles').select('id, nombre, apellido, dni').eq('dni', dniMatricula).single();
        if (error || !data) {
            showMessage(`DNI ${dniMatricula} no encontrado.`, true);
            setMatriculaSearchState('idle');
        } else {
            setStudentForMatricula({ id: data.id, dni: data.dni, nombres: data.nombre, apellidos: data.apellido });
            setMatriculaSearchState('found');
        }
    };

    const handleMatriculaSubmit = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from('matriculaciones').insert([{
            estudiante_id: studentForMatricula.id,
            plan: selectedPlan,
            ciclo_lectivo: parseInt(currentYear),
            instrumento_id: selectedInstrumentoId
        }]);

        if (!error) {
            showMessage("Matriculación exitosa.", false);
            setDniMatricula(''); setStudentForMatricula(null); setSelectedInstrumentoId(''); setSelectedPlan(''); setMatriculaSearchState('idle');
        } else {
            showMessage(`Error al matricular: ${error.message}`, true);
        }
    };


    return (
        <div id="matriculacion_estudiantes">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-2xl font-semibold mb-4 text-gray-800">Matricular Estudiante ({currentYear})</h2>
                    {!studentForMatricula ? (
                        <form onSubmit={handleDniSearchMatricula} className="p-6 bg-indigo-50 rounded-lg border border-indigo-200">
                            <label className="block text-sm font-medium">Ingrese DNI</label>
                            <div className="mt-1 flex space-x-2">
                                <input type="text" value={dniMatricula} onChange={(e) => setDniMatricula(e.target.value)} className="flex-grow rounded-md border-gray-300 p-3 border" required />
                                <button type="submit" className="bg-indigo-600 text-white px-5 rounded-lg font-bold">Buscar</button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleMatriculaSubmit} className="p-6 bg-white rounded-lg shadow-md border space-y-4">
                            <p><strong>{studentForMatricula.apellidos}, {studentForMatricula.nombres}</strong></p>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Instrumento</label>
                                <select value={selectedInstrumentoId} onChange={(e) => { setSelectedInstrumentoId(e.target.value); setSelectedPlan(instrumentos.find(i => i.id === e.target.value)?.plan || ''); }} className="w-full rounded-md border-gray-300 p-3 border" required>
                                    <option value="">Seleccione Instrumento...</option>
                                    {instrumentos.map(i => <option key={i.id} value={i.id}>{i.instrumento} (Plan: {i.plan})</option>)}
                                </select>
                            </div>

                            {selectedPlan && (
                                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-md">
                                    <label className="text-xs font-bold text-indigo-500 uppercase">Plan de Estudio Asignado</label>
                                    <p className="text-lg font-bold text-indigo-900">{selectedPlan}</p>
                                </div>
                            )}

                            <button type="submit" disabled={!selectedInstrumentoId || !selectedPlan} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold shadow-md hover:bg-green-700 disabled:bg-gray-400">
                                Matricular en Ciclo {currentYear}
                            </button>
                            <button type="button" onClick={() => setStudentForMatricula(null)} className="w-full text-gray-500 text-sm">Cancelar</button>

                        </form>
                    )}
                </div>
                <div>
                    <h2 className="text-2xl font-semibold mb-4">Matriculados {currentYear}</h2>
                    <div className="overflow-x-auto rounded-lg shadow-md border max-h-[70vh] overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-indigo-600 text-white">
                                <tr>
                                    <th className="px-3 py-2 text-left">Apellido</th>
                                    <th className="px-3 py-2 text-left">Nombre</th>
                                    <th className="px-3 py-2 text-left">DNI</th>
                                    <th className="px-3 py-2 text-left">Instrumento / Plan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {matriculacionesDelAnio.map(m => (
                                    <tr key={m.id} className="border-b">
                                        <td className="px-3 py-2">{m.apellidos}</td>
                                        <td className="px-3 py-2">{m.nombres}</td>
                                        <td className="px-3 py-2">{m.dni}</td>
                                        <td className="px-3 py-2">{m.instrumento} ({m.plan})</td>
                                    </tr>
                                ))}
                            </tbody>

                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const NotasTab = ({ showMessage, materias, students, matriculaciones, notas, notasSubTab, setNotasSubTab }) => {
    return (
        <div id="gestion_notas">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. Gestión de Notas</h2>
            <div className="flex mb-6 border-b border-gray-300">
                <TabButton id="ingresar_nota" label="Ingresar Nota" isActive={notasSubTab === 'ingresar_nota'} onClick={setNotasSubTab} />
                <TabButton id="ingresar_planilla" label="Ingresar Planilla" isActive={notasSubTab === 'ingresar_planilla'} onClick={setNotasSubTab} />
                <TabButton id="ingresar_analitico" label="Ingresar Analítico" isActive={notasSubTab === 'ingresar_analitico'} onClick={setNotasSubTab} />
            </div>
            {notasSubTab === 'ingresar_nota' && <IngresarNotaIndividual showMessage={showMessage} materias={materias} matriculaciones={matriculaciones} />}
            {notasSubTab === 'ingresar_planilla' && <IngresarPlanilla showMessage={showMessage} materias={materias} students={students} matriculaciones={matriculaciones} />}
            {notasSubTab === 'ingresar_analitico' && <IngresarAnalitico showMessage={showMessage} materias={materias} students={students} matriculaciones={matriculaciones} notes={notas} />}

        </div>
    );
};

const IngresarNotaIndividual = ({ showMessage, materias, matriculaciones }) => {
    /* Implementación original simplificada */
    const [dniSearch, setDniSearch] = useState('');
    const [step, setStep] = useState(1);
    const [studentInfo, setStudentInfo] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState('');
    const [selectedMateriaId, setSelectedMateriaId] = useState('');
    const [nota, setNota] = useState('');

    const handleDniSearch = (e) => {
        e.preventDefault();
        const mats = matriculaciones.filter(m => m.dni === dniSearch);
        if (mats.length > 0) {
            setStudentInfo(mats[0]);
            const planes = [...new Set(mats.map(m => m.plan))];
            if (planes.length > 1) setStep(2); else { setSelectedPlan(planes[0]); setStep(3); }
        } else showMessage("DNI no encontrado.", true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const matricula = matriculaciones.find(m => m.dni === studentInfo.dni && m.plan === selectedPlan);
        const { error } = await supabase.from('notas').insert([{ matriculacion_id: matricula.id, materia_id: selectedMateriaId, calificacion: nota, condicion: 'Promoción', fecha: new Date().toISOString().split('T')[0] }]);
        if (!error) { showMessage("Nota guardada.", false); setStep(1); setDniSearch(''); }
    };

    return (
        <div className="max-w-2xl mx-auto">
            {step === 1 && <form onSubmit={handleDniSearch} className="p-6 bg-indigo-50 border rounded-lg flex space-x-2"><input type="text" value={dniSearch} onChange={(e) => setDniSearch(e.target.value)} className="flex-grow p-3 border rounded" placeholder="DNI..." required /><button type="submit" className="bg-indigo-600 text-white px-5 rounded font-bold">Buscar</button></form>}
            {step === 3 && <form onSubmit={handleSave} className="p-6 bg-white border rounded-lg space-y-4"><h3>Cargar para {studentInfo.nombres} ({selectedPlan})</h3><select value={selectedMateriaId} onChange={(e) => setSelectedMateriaId(e.target.value)} className="w-full p-3 border rounded">{materias.filter(m => m.plan === selectedPlan).map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select><input type="text" value={nota} onChange={(e) => setNota(e.target.value)} className="w-full p-3 border rounded" placeholder="Nota..." required /><button type="submit" className="w-full bg-green-600 text-white py-3 rounded font-bold">Guardar</button></form>}
        </div>
    );
};

const IngresarPlanilla = ({ showMessage, materias, students, matriculaciones }) => {
    const [selectedMateriaId, setSelectedMateriaId] = useState('');
    const [planillaData, setPlanillaData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (selectedMateriaId) {
            const materia = materias.find(m => m.id === selectedMateriaId);
            const alumnosMatriculados = matriculaciones.filter(m => m.plan === materia.plan);
            setPlanillaData(alumnosMatriculados.map(a => ({
                id: a.id,
                dni: a.dni,
                nombreCompleto: `${a.apellidos}, ${a.nombres}`,
                nota: '',
                condicion: 'Promoción'
            })));
        }
    }, [selectedMateriaId, materias, matriculaciones]);

    const handleSavePlanilla = async () => {
        setLoading(true);
        const recordsToInsert = planillaData.filter(p => p.nota !== '').map(p => ({
            matriculacion_id: p.id,
            materia_id: selectedMateriaId,
            calificacion: p.nota,
            condicion: p.condicion,
            fecha: new Date().toISOString().split('T')[0]
        }));

        if (recordsToInsert.length === 0) { showMessage("No hay notas para cargar.", true); setLoading(false); return; }

        const { error } = await supabase.from('notas').insert(recordsToInsert);
        if (!error) { showMessage("Planilla cargada con éxito.", false); setPlanillaData([]); setSelectedMateriaId(''); }
        else { showMessage(`Error: ${error.message}`, true); }
        setLoading(false);
    };

    return (
        <div className="space-y-4">
            <select value={selectedMateriaId} onChange={(e) => setSelectedMateriaId(e.target.value)} className="w-full p-3 border rounded">
                <option value="">Seleccione Materia...</option>
                {materias.map(m => <option key={m.id} value={m.id}>({m.plan}) {m.nombre} - {m.anio}° Año</option>)}
            </select>
            {selectedMateriaId && planillaData.length > 0 && (
                <div className="bg-white border rounded shadow-md overflow-hidden">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 italic"><tr><th className="p-2 text-left">Alumno</th><th className="p-2 text-center w-24">Nota</th><th className="p-2 text-left w-40">Condición</th></tr></thead>
                        <tbody>
                            {planillaData.map((p, idx) => (
                                <tr key={p.id}>
                                    <td className="p-2 border-b">{p.nombreCompleto}</td>
                                    <td className="p-2 border-b text-center"><input type="text" value={p.nota} onChange={(e) => { const nd = [...planillaData]; nd[idx].nota = e.target.value; setPlanillaData(nd); }} className="w-16 border rounded p-1 text-center" /></td>
                                    <td className="p-2 border-b">
                                        <select value={p.condicion} onChange={(e) => { const nd = [...planillaData]; nd[idx].condicion = e.target.value; setPlanillaData(nd); }} className="w-full border rounded p-1">
                                            <option value="Promoción">Promoción</option><option value="Examen">Examen</option><option value="Regular">Regular</option><option value="Equivalencia">Equivalencia</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button onClick={handleSavePlanilla} disabled={loading} className="w-full bg-indigo-600 text-white py-3 font-bold hover:bg-indigo-700 disabled:bg-gray-400">
                        {loading ? 'Guardando...' : 'Guardar Planilla'}
                    </button>
                </div>
            )}
        </div>
    );
};

const IngresarAnalitico = ({ showMessage, materias, students, matriculaciones, notes }) => {
    return <div className="p-6 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
        <p><strong>Nota:</strong> Para cargar el analítico completo, use la herramienta de <strong>Carga Masiva</strong> con formato JSON o utilice <strong>Ingresar Nota</strong> individualmente para cada materia histórica.</p>
    </div>;
};


export const InstrumentosTab = ({ showMessage, instrumentos }) => {
    const [instrumento, setInstrumento] = useState('');
    const [plan, setPlan] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from('instrumentos').insert([{ nombre: instrumento.trim(), plan: plan.trim() }]);
        if (!error) { showMessage("Instrumento agregado.", false); setInstrumento(''); setPlan(''); }
    };

    return (
        <div id="admin_instrumentos">
            <h2 className="text-2xl font-semibold mb-6">Instrumentos</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <form onSubmit={handleSubmit} className="p-6 bg-white border rounded-lg space-y-4 h-fit">
                    <input type="text" value={instrumento} onChange={(e) => setInstrumento(e.target.value)} placeholder="Instrumento..." className="w-full border p-3 rounded" required />
                    <input type="text" value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="Plan..." className="w-full border p-3 rounded" required />
                    <button type="submit" className="w-full bg-green-600 text-white py-3 rounded font-bold">Agregar</button>
                </form>
                <div className="md:col-span-2 overflow-x-auto border rounded shadow-md h-[60vh] overflow-y-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-indigo-600 text-white"><tr><th className="p-3 text-left">Instrumento</th><th className="p-3 text-left">Plan</th></tr></thead>
                        <tbody>{instrumentos.map(i => <tr key={i.id}><td className="p-3 border-b">{i.instrumento}</td><td className="p-3 border-b">{i.plan}</td></tr>)}</tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export const MateriasTab = ({ showMessage, materias, deleteMateria }) => {
    const [materia, setMateria] = useState('');
    const [plan, setPlan] = useState('');
    const [anio, setAnio] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from('materias').insert([{ nombre: materia.trim(), plan: plan.trim(), anio: parseInt(anio) }]);
        if (!error) { showMessage("Materia agregada.", false); setMateria(''); setPlan(''); setAnio(''); }
    };

    return (
        <div id="admin_materias">
            <h2 className="text-2xl font-semibold mb-6">Materias y Planes</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <form onSubmit={handleSubmit} className="p-6 bg-white border rounded-lg space-y-4 h-fit">
                    <input type="text" value={materia} onChange={(e) => setMateria(e.target.value)} placeholder="Materia..." className="w-full border p-3 rounded" required />
                    <input type="text" value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="Plan..." className="w-full border p-3 rounded" required />
                    <input type="text" value={anio} onChange={(e) => setAnio(e.target.value)} placeholder="Año..." className="w-full border p-3 rounded" required />
                    <button type="submit" className="w-full bg-green-600 text-white py-3 rounded font-bold">Agregar</button>
                </form>
                <div className="md:col-span-2 overflow-x-auto border rounded shadow-md h-[60vh] overflow-y-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-indigo-600 text-white"><tr><th>Plan</th><th>Materia</th><th>Año</th><th>Acción</th></tr></thead>
                        <tbody>{materias.map(m => <tr key={m.id}><td>{m.plan}</td><td>{m.nombre}</td><td>{m.anio}</td><td><button onClick={() => deleteMateria(m.id, m.nombre)} className="text-red-600">Eliminar</button></td></tr>)}</tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export const CargaMasivaTab = ({ showMessage }) => {
    const [jsonData, setJsonData] = useState('');
    const [collection, setCollection] = useState('materias');

    const handleUpload = async (e) => {
        e.preventDefault();
        try {
            const data = JSON.parse(jsonData);
            const { error } = await supabase.from(collection === 'students' ? 'perfiles' : collection).insert(data);
            if (!error) { showMessage("Carga masiva exitosa.", false); setJsonData(''); }
        } catch (e) { showMessage("Error en JSON.", true); }
    };

    return (
        <div id="carga_masiva" className="max-w-4xl mx-auto space-y-4">
            <h2 className="text-2xl font-semibold">Carga Masiva</h2>
            <form onSubmit={handleUpload} className="p-6 bg-white border rounded-lg space-y-4">
                <select value={collection} onChange={(e) => setCollection(e.target.value)} className="w-full p-3 border rounded"><option value="materias">Materias</option><option value="students">Estudiantes</option><option value="instrumentos">Instrumentos</option></select>
                <textarea rows="10" value={jsonData} onChange={(e) => setJsonData(e.target.value)} className="w-full p-3 border rounded font-mono text-sm" placeholder='[ { "plan": "...", "materia": "..." } ]' required></textarea>
                <button type="submit" className="w-full bg-green-600 text-white py-3 rounded font-bold">Cargar Datos</button>
            </form>
        </div>
    );
};

export const CertificadoTab = ({ showMessage, students, matriculaciones }) => {
    const [dni, setDni] = useState('');
    const [step, setStep] = useState(1);
    const [studentInfo, setStudentInfo] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState('');
    const currentYear = new Date().getFullYear().toString();

    const handleSearch = (e) => {
        e.preventDefault();
        const mats = matriculaciones.filter(m => m.dni === dni && m.cicloLectivo === currentYear);
        if (mats.length > 0) {
            const studentDetails = students.find(s => s.dni === dni);
            setStudentInfo({ ...mats[0], genero: studentDetails?.genero || 'Otro' });
            const planes = [...new Set(mats.map(m => m.plan))];
            if (planes.length > 1) setStep(2); else { setSelectedPlan(planes[0]); setStep(3); }
        } else showMessage("No hay matrícula activa.", true);
    };

    return (
        <div id="generar_certificado" className="max-w-2xl mx-auto">
            {step === 1 && <form onSubmit={handleSearch} className="p-6 bg-indigo-50 border rounded-lg flex space-x-2"><input type="text" value={dni} onChange={(e) => setDni(e.target.value)} className="flex-grow p-3 border rounded" placeholder="DNI..." required /><button type="submit" className="bg-indigo-600 text-white px-5 rounded font-bold">Buscar</button></form>}
            {step === 3 && <CertificateDisplay student={studentInfo} plan={selectedPlan} onCancel={() => setStep(1)} />}
        </div>
    );
};

const StudentForm = ({ initialData, onSubmit, buttonLabel, isEdit = false, onCancel }) => {
    const [formData, setFormData] = useState({ ...defaultStudentData, ...initialData });
    const fields = [
        { name: 'dni', label: 'DNI', type: 'text', required: true, disabled: isEdit },
        { name: 'apellidos', label: 'Apellidos', type: 'text', required: true },
        { name: 'nombres', label: 'Nombres', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'fechanacimiento', label: 'Fecha de Nacimiento', type: 'date', required: false },
        { name: 'genero', label: 'Género', type: 'select', required: true, options: ['Masculino', 'Femenino', 'Otro'] },
        { name: 'nacionalidad', label: 'Nacionalidad', type: 'text', required: false },
        { name: 'direccion', label: 'Dirección', type: 'text', required: false },
        { name: 'ciudad', label: 'Ciudad', type: 'text', required: false },
        { name: 'telefono', label: 'Teléfono', type: 'text', required: false },
        { name: 'telefonourgencias', label: 'Teléfono Urgencias', type: 'text', required: false },
    ];



    const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData); };
    return (
        <form onSubmit={handleSubmit} noValidate className="p-6 bg-white border rounded-lg space-y-4 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map(f => (
                    <div key={f.name}>
                        <label className="block text-sm font-medium">
                            {f.label} {!f.required && <span className="text-gray-400 font-normal">(Opcional)</span>}
                        </label>

                        {f.type === 'select' ? (
                            <select value={formData[f.name]} onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })} className="w-full border p-3 rounded">
                                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        ) : (
                            <input
                                type={f.type}
                                value={formData[f.name] || ""}
                                onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                                disabled={f.disabled}
                                className="w-full border p-3 rounded"
                                required={f.required ? true : undefined}
                            />
                        )}

                    </div>
                ))}
            </div>
            <div className="flex space-x-3 pt-4 border-t">
                <button type="button" onClick={onCancel} className="w-1/3 border py-3 rounded">Cancelar</button>
                <button type="submit" className="w-2/3 bg-green-600 text-white py-3 rounded font-bold">{buttonLabel}</button>
            </div>
        </form>
    );
};

export default AdminDashboardScreen;

