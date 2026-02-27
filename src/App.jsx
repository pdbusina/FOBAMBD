import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

// --- IMPORTANTE: Componentes Externos ---
import CorrelativasChecker from './CorrelativasChecker';
import CursadosActivos from './CursadosActivos';
import AdminHorarios from './AdminHorarios';
import AdminInformes from './AdminInformes';

// --- NUEVOS: Componentes Modularizados ---
import { IconLoading } from './components/Icons';
import { Message } from './components/UI/SharedUI';
import LandingScreen from './screens/LandingScreen';
import StudentAccessScreen from './screens/StudentAccessScreen';
import AdminLoginScreen from './screens/AdminLoginScreen';
import { StudentAnaliticoScreen } from './screens/AnaliticoComponents';
import { AdminDashboardScreen } from './screens/AdminDashboard';

// --- Estilos de Impresión (Combinados) ---
const printStyles = `
  @media print {
    body * {
      visibility: hidden;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .print-area, .print-area * {
      visibility: visible;
    }

    .print-area {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }

    .no-print {
      display: none !important;
    }

    body.printing-analitico {
       /* Estilos específicos para analítico si los hubiera */
    }

    @page {
      size: A4 portrait;
      margin: 15mm;
    }
    
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; }
    th { background-color: #eee !important; }
    tr { page-break-inside: avoid; }
    .print-page-break { page-break-before: always !important; }
    .print-header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; text-align: left; }
    .print-signatures { padding-top: 60px; text-align: center; }
    .print-signature-line { border-top: 1px solid #000; padding-top: 4px; margin: 0 30px; }

    .certificate-content {
      width: 100%;
      height: 100%; 
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #000;
    }
  }
`;

export default function App() {
    const [userId, setUserId] = useState(null);
    const [students, setStudents] = useState([]);
    const [instrumentos, setInstrumentos] = useState([]);
    const [matriculaciones, setMatriculaciones] = useState([]);
    const [materias, setMaterias] = useState([]);
    const [notas, setNotas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [appState, setAppState] = useState('landing');
    const [activeTab, setActiveTab] = useState('inscribir');
    const [notasSubTab, setNotasSubTab] = useState('ingresar_nota');
    const [message, setMessage] = useState({ text: "", isError: false });
    const [userClaims, setUserClaims] = useState(null);

    const loadMatriculaciones = useCallback(async () => {
        const { data: matric } = await supabase.from('matriculaciones').select('*, perfiles!estudiante_id(dni, apellido, nombre), instrumentos(nombre, plan)');
        if (matric) {
            setMatriculaciones(matric.map(m => ({
                id: m.id,
                dni: m.perfiles?.dni,
                apellidos: m.perfiles?.apellido,
                nombres: m.perfiles?.nombre,
                plan: m.plan || m.instrumentos?.plan || "Sin Plan",
                cicloLectivo: m.ciclo_lectivo?.toString() || "",
                instrumentoId: m.instrumento_id,
                instrumento: m.instrumentos?.nombre || "No asignado"
            })).sort((a, b) =>
                (a.apellidos || "").localeCompare(b.apellidos || "") ||
                (a.nombres || "").localeCompare(b.nombres || "") ||
                (a.dni || "").localeCompare(b.dni || "")
            ));
        }
    }, []);

    const loadData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        const { data: profiles } = await supabase.from('perfiles').select('*');
        if (profiles) {
            setStudents(profiles.map(p => ({
                id: p.id, dni: p.dni, apellidos: p.apellido, nombres: p.nombre,
                email: p.email, direccion: p.direccion, ciudad: p.ciudad,
                telefono: p.telefono, telefonourgencias: p.telefono_urgencias,
                nacionalidad: p.nacionalidad, genero: p.genero, fechanacimiento: p.fecha_nacimiento
            })).sort((a, b) =>
                (a.apellidos || "").localeCompare(b.apellidos || "") ||
                (a.nombres || "").localeCompare(b.nombres || "") ||
                (a.dni || "").localeCompare(b.dni || "")
            ));
        }

        const { data: inst } = await supabase.from('instrumentos').select('*');
        if (inst) {
            setInstrumentos(inst.map(i => ({
                id: i.id,
                instrumento: i.nombre,
                plan: i.plan
            })).sort((a, b) => a.instrumento.localeCompare(b.instrumento)));
        }

        const { data: mats } = await supabase.from('materias').select('*');
        if (mats) {
            setMaterias(mats.map(m => ({ id: m.id, plan: m.plan, anio: m.anio, nombre: m.nombre, materia: m.nombre })).sort((a, b) => (a.plan || "").localeCompare(b.plan || "") || (a.anio - b.anio)));
        }

        await loadMatriculaciones();

        const { data: nts } = await supabase.from('notas').select('*, materias(nombre), matriculaciones(perfiles!estudiante_id(dni))');
        if (nts) {
            setNotas(nts.map(n => ({
                id: n.id,
                dni: n.matriculaciones?.perfiles?.dni,
                materia: n.materias?.nombre,
                nota: n.calificacion,
                condicion: n.condicion,
                fecha: n.fecha,
                libro_folio: n.libro_folio,
                observaciones: n.observaciones,
                obs_optativa_ensamble: n.obs_detalle
            })));
        }
        if (!isSilent) setLoading(false);
    }, [loadMatriculaciones]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setUserId(session.user.id);
                setUserClaims(session.user.user_metadata);
            }
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                setUserId(session.user.id);
                setUserClaims(session.user.user_metadata);
            } else {
                setUserId(null);
                setUserClaims(null);
                setAppState('landing'); // Volver al inicio al cerrar sesión
            }
        });

        return () => subscription.unsubscribe();
    }, []);


    useEffect(() => {
        if (!userId) return;

        loadData();

        const channel = supabase.channel('db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'perfiles' }, () => loadData(true))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'instrumentos' }, () => loadData(true))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'materias' }, () => loadData(true))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matriculaciones' }, () => loadMatriculaciones())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notas' }, () => loadData(true))
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, loadData, loadMatriculaciones]);

    const showMessage = (text, isError) => setMessage({ text, isError });
    const navigateTo = (screen) => setAppState(screen);
    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        if (tabId !== 'notas') setNotasSubTab('ingresar_nota');
    };

    const addStudent = async (formData) => {
        const studentData = {
            dni: formData.dni.replace(/\D/g, ''),
            apellido: formData.apellidos,
            nombre: formData.nombres,
            email: formData.email,
            genero: formData.genero || "Otro"
        };
        if (formData.direccion) studentData.direccion = formData.direccion;
        if (formData.ciudad) studentData.ciudad = formData.ciudad;
        if (formData.telefono) studentData.telefono = formData.telefono;
        if (formData.telefonourgencias) studentData.telefono_urgencias = formData.telefonourgencias;
        if (formData.nacionalidad) studentData.nacionalidad = formData.nacionalidad;
        if (formData.fechanacimiento) studentData.fecha_nacimiento = formData.fechanacimiento;

        const { error } = await supabase.from('perfiles').insert([studentData]);
        if (error) {
            showMessage(error.message, true);
            return { success: false, error };
        } else {
            showMessage("Estudiante agregado.", false);
            return { success: true };
        }
    };

    const updateStudent = async (id, dataToUpdate) => {
        const studentData = {
            apellido: dataToUpdate.apellidos,
            nombre: dataToUpdate.nombres,
            email: dataToUpdate.email,
            genero: dataToUpdate.genero || "Otro"
        };
        if (dataToUpdate.direccion !== undefined) studentData.direccion = dataToUpdate.direccion || "";
        if (dataToUpdate.ciudad !== undefined) studentData.ciudad = dataToUpdate.ciudad || "";
        if (dataToUpdate.telefono !== undefined) studentData.telefono = dataToUpdate.telefono || "";
        if (dataToUpdate.telefonourgencias !== undefined) studentData.telefono_urgencias = dataToUpdate.telefonourgencias || "";
        if (dataToUpdate.nacionalidad !== undefined) studentData.nacionalidad = dataToUpdate.nacionalidad || "";

        // Only update birth date if it's provided, otherwise avoid sending it to prevent null constraint errors
        if (dataToUpdate.fechanacimiento) {
            studentData.fecha_nacimiento = dataToUpdate.fechanacimiento;
        }

        const { error } = await supabase.from('perfiles').update(studentData).eq('id', id);
        if (error) {
            showMessage(error.message, true);
            return { success: false, error };
        } else {
            showMessage("Estudiante actualizado.", false);
            return { success: true };
        }
    };




    const deleteStudent = async (id, nombre) => {
        if (!window.confirm(`¿Confirmas eliminar a ${nombre}?`)) return;
        const { error } = await supabase.from('perfiles').delete().eq('id', id);
        if (error) showMessage(error.message, true); else showMessage("Estudiante eliminado.", false);
    };

    const deleteMateria = async (id, nombre) => {
        if (!window.confirm(`¿Confirmas eliminar la materia ${nombre}?`)) return;
        const { error } = await supabase.from('materias').delete().eq('id', id);
        if (error) showMessage(error.message, true); else showMessage("Materia eliminada.", false);
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen bg-gray-100"><IconLoading /><span className="ml-3">Cargando...</span></div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <style>{printStyles}</style>
            {message.text && <Message text={message.text} isError={message.isError} onClose={() => showMessage("", false)} />}

            <div id="certificate-print-area" className="print-area"></div>
            <div id="analitico-print-area" className="print-area"></div>

            <div className="no-print">
                {appState === 'landing' && <LandingScreen navigateTo={navigateTo} />}
                {appState === 'student_access' &&
                    <StudentAccessScreen
                        navigateTo={navigateTo}
                        db={supabase}
                        appId="supabase"
                        showMessage={showMessage}
                        students={students}
                        matriculaciones={matriculaciones}
                    />
                }
                {appState === 'admin_login' && <AdminLoginScreen navigateTo={navigateTo} showMessage={showMessage} />}
            </div>

            {appState === 'admin_dashboard' && (
                <AdminDashboardScreen
                    userClaims={userClaims} navigateTo={navigateTo} activeTab={activeTab}
                    handleTabChange={handleTabChange} showMessage={showMessage}
                    userId={userId} students={students} instrumentos={instrumentos}
                    addStudent={addStudent} updateStudent={updateStudent} deleteStudent={deleteStudent}
                    matriculaciones={matriculaciones} materias={materias} notas={notas}
                    deleteMateria={deleteMateria} notasSubTab={notasSubTab} setNotasSubTab={setNotasSubTab}
                    loadMatriculaciones={loadMatriculaciones}
                />

            )}

            {appState === 'student_analitico' &&
                <StudentAnaliticoScreen
                    navigateTo={navigateTo} showMessage={showMessage}
                    students={students} matriculaciones={matriculaciones}
                    materias={materias} notas={notas}
                />
            }
        </div>
    );
}
