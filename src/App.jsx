import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged 
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    getDoc, 
    addDoc, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    onSnapshot, 
    collection, 
    query, 
    where, 
    getDocs,
    Timestamp,
    setLogLevel
} from 'firebase/firestore';

// ---
// Configuración Manual de Firebase
// (Usando la configuración que pegaste)
// ---
const firebaseConfig = {
 apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};
// --- Fin de la Configuración Manual ---

// --- Estilos de Impresión (Para Analítico) ---
// --- (NUEVO) Estilos de Impresión (Combinados y Corregidos) ---
const printStyles = `
  @media print {
    /* --- Regla Global: Ocultar todo por defecto --- */
    body * {
      visibility: hidden;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* --- Reglas para MOSTRAR el área de impresión (para ambos) --- */
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

    /* --- Ocultar la UI --- */
    .no-print {
      display: none !important;
    }

    /* --- Estilos específicos del ANALÍTICO (A4) --- */
    body.printing-analitico {
      /* Define el tamaño A4 solo cuando se imprime el analítico */
      @page {
        size: A4 portrait;
        margin: 20mm 15mm;
      }
    }
    
    #analitico-print-area {
      /* Los márgenes se definen en @page */
      font-size: 10pt;
    }
    
    /* Reglas de la tabla del analítico */
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; }
    th { background-color: #eee !important; }
    tr { page-break-inside: avoid; }
    h4 { page-break-before: auto; page-break-after: avoid; font-size: 12pt; font-weight: bold; margin-top: 10px; }
    .print-page-break { page-break-before: always !important; }
    .print-header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; text-align: left; }
    .print-signatures { padding-top: 60px; text-align: center; }
    .print-signature-line { border-top: 1px solid #000; padding-top: 4px; margin: 0 30px; }

    
    /* --- Estilos específicos del CERTIFICADO (A5) --- */
    body.printing-certificado {
      /* Define el tamaño A5 solo cuando se imprime el certificado */
      @page {
        size: A5 portrait;
        /* (AJUSTE) Márgenes reducidos para que sea más ancho */
        margin: 15mm; 
      }
    }

    /* Estilos de la tipografía del certificado */
    .certificate-content {
      width: 100%;
      height: 100%; 
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #000;
    }
    .certificate-header {
      text-align: center;
      font-weight: bold;
      font-size: 14pt;
      margin-bottom: 30px;
    }
    .certificate-body {
      margin-top: 30px;
      margin-bottom: 40px;
    }
    .certificate-footer {
       margin-bottom: 40px;
    }
    .certificate-signatures {
      padding-top: 50px;
      display: flex;
      justify-content: space-around;
      text-align: center;
    }
    .certificate-signature-line {
      border-top: 1px solid #000;
      width: 200px;
      padding-top: 5px;
    }
  }
`;


// --- Componentes de Iconos (Mini SVGs) ---
const IconUser = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
);
const IconAdmin = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h6m-3 0v14" /></svg>
);
const IconCertificate = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
);
const IconReport = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
);
const IconLoading = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
const IconPrint = () => (
  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm7-8a2 2 0 01-2-2v-2H9v2a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2h-2z" /></svg>
);


// --- Componente de Mensajes (Toast) ---
const Message = ({ text, isError, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white ${isError ? 'bg-red-500' : 'bg-green-500'} no-print`}>
      {text}
    </div>
  );
};

// --- Componente Botón de Acceso (Pantalla Principal) ---
const AccessButton = ({ icon, title, description, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center w-full p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition duration-300 ease-in-out border border-gray-200"
  >
    <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center rounded-full bg-indigo-500 text-white shadow-md">
      {icon}
    </div>
    <div className="ml-6 text-left">
      <h3 className="text-2xl font-semibold text-gray-800">{title}</h3>
      <p className="text-gray-500 mt-1">{description}</p>
    </div>
  </button>
);

// --- Componente Botón de Pestaña (Admin) ---
// (ESTILO ACTUALIZADO)
const TabButton = ({ id, label, isActive, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`px-3 py-2 md:px-4 md:py-2 text-sm md:text-base font-medium rounded-md transition duration-200 mx-1 mb-1 ${
      isActive
        ? 'bg-indigo-600 text-white shadow-sm'
        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
    }`}
  >
    {label}
  </button>
);

// Objeto base para el formulario de estudiante
const defaultStudentData = {
    dni: '', apellidos: '', nombres: '', email: '', direccion: '', ciudad: '',
    telefono: '', telefonourgencias: '', nacionalidad: '', genero: 'Masculino', fechanacimiento: ''
};

// --- Componente Principal ---
export default function App() {
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  const [students, setStudents] = useState([]);
  const [instrumentos, setInstrumentos] = useState([]); // Para tabla Instrumentos
  const [matriculaciones, setMatriculaciones] = useState([]);
  const [materias, setMaterias] = useState([]); // Para tabla Materias
  const [notas, setNotas] = useState([]); // (NUEVO) Para tabla Notas
  const [loading, setLoading] = useState(true);
  // (AJUSTE) Añadir 'student_analitico'
  const [appState, setAppState] = useState('landing'); // 'landing', 'student_access', 'student_analitico', 'admin_login', 'admin_dashboard'
  const [activeTab, setActiveTab] = useState('inscribir'); // Pestaña inicial de admin
  const [notasSubTab, setNotasSubTab] = useState('ingresar_nota'); // Para sub-pestañas de notas
  const [message, setMessage] = useState({ text: "", isError: false });
  const [debugInfo, setDebugInfo] = useState({ projectId: null, authStatus: "Idle" });
  
  // App ID (calculado desde la config)
  const appId = useMemo(() => firebaseConfig.projectId || "default-app-id", [firebaseConfig]);

  // --- Inicialización y Autenticación ---
  useEffect(() => {
    // Activar logs detallados de Firestore
    // setLogLevel('debug');

    try {
      if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "SU_API_KEY") {
        throw new Error("Configuración de Firebase no encontrada. Por favor, pegue su 'firebaseConfig' al inicio de App.jsx.");
      }
      
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const userAuth = getAuth(app);
      
      setDb(firestore);
      setDebugInfo(prev => ({ ...prev, projectId: app.options.projectId }));

      // Listener de Autenticación
      const unsubscribeAuth = onAuthStateChanged(userAuth, (user) => {
        if (user) {
          // Usuario (anónimo) autenticado
          setUserId(user.uid);
          setLoading(false);
          setDebugInfo(prev => ({ ...prev, authStatus: `Autenticado (UID: ${user.uid})` }));
        } else {
          // No hay usuario, intentar autenticación anónima
          setDebugInfo(prev => ({ ...prev, authStatus: "Autenticando (Anónimo)..." }));
          signInAnonymously(userAuth).catch((error) => {
            console.error("Error en signInAnonymously:", error);
            if (error.code === 'auth/configuration-not-found') {
                setMessage({ text: "Error: 'Inicio de sesión Anónimo' no está habilitado en Firebase.", isError: true });
                setDebugInfo(prev => ({ ...prev, authStatus: "Error: Auth Anónimo deshabilitado." }));
            } else {
                setMessage({ text: `Error de autenticación: ${error.message}`, isError: true });
                setDebugInfo(prev => ({ ...prev, authStatus: `Error: ${error.code}` }));
            }
          });
        }
      });
      
      return () => unsubscribeAuth();

    } catch (error) {
      console.error("Error de inicialización de Firebase:", error);
      setMessage({ text: error.message, isError: true });
      setLoading(false);
      setDebugInfo(prev => ({ ...prev, authStatus: "Error de Configuración" }));
    }
  }, [firebaseConfig]);


  // --- Definición de snapshotToArray DENTRO de App ---
  // Convertir snapshot a Array (con ID)
  const snapshotToArray = (snapshot) => {
      const array = [];
      snapshot.forEach(doc => {
          array.push({ id: doc.id, ...doc.data() });
      });
      return array;
  };


  // --- Listener de Firestore (Real-Time) ---
  // (AJUSTADO) Estos listeners ahora cargan siempre, no solo en admin
  useEffect(() => {
    // Se activa en cuanto hay BDD y Usuario
    if (!db || !userId) return;

    // Camino base a la data (para cumplir con reglas de seguridad)
    const dataBasePath = ['artifacts', appId, 'public', 'data'];

    // Listener para Estudiantes
    const studentsQuery = query(collection(db, ...dataBasePath, 'students'));
    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      const studentData = snapshotToArray(snapshot);
      studentData.sort((a, b) => (a.dni || "").localeCompare(b.dni || ""));
      setStudents(studentData);
    }, (error) => {
      console.error("Error al cargar estudiantes:", error);
      showMessage(`Error al cargar estudiantes: ${error.message}`, true);
    });

    // Listener para Instrumentos
    const instrumentosQuery = query(collection(db, ...dataBasePath, 'instrumentos'));
    const unsubscribeInstrumentos = onSnapshot(instrumentosQuery, (snapshot) => {
      const data = snapshotToArray(snapshot);
      data.sort((a, b) => (a.instrumento || "").localeCompare(b.instrumento || ""));
      setInstrumentos(data);
    }, (error) => {
      console.error("Error al cargar instrumentos:", error);
      showMessage(`Error al cargar instrumentos: ${error.message}`, true);
    });

    // Listener para Matriculaciones (Carga TODAS las matriculaciones)
    const matriculationQuery = query(
        collection(db, ...dataBasePath, 'matriculation')
    );
    
    const unsubscribeMatriculaciones = onSnapshot(matriculationQuery, (snapshot) => {
        const data = snapshotToArray(snapshot);
        data.sort((a, b) => (a.apellidos || "").localeCompare(b.apellidos || ""));
        setMatriculaciones(data);
    }, (error) => {
        console.error("Error al cargar matriculaciones:", error);
        showMessage(`Error al cargar matriculaciones: ${error.message}`, true);
    });
    
    // Listener para Materias
    const materiasQuery = query(collection(db, ...dataBasePath, 'materias'));
    const unsubscribeMaterias = onSnapshot(materiasQuery, (snapshot) => {
        const data = snapshotToArray(snapshot);
         // (AJUSTADO) Ordenar por plan, luego por año, luego por materia
        data.sort((a, b) => {
            const planA = a.plan || "";
            const planB = b.plan || "";
            const anioA = Number(a.anio) || 0;
            const anioB = Number(b.anio) || 0;
            const matA = a.materia || "";
            const matB = b.materia || "";

            if (planA < planB) return -1;
            if (planA > planB) return 1;
            if (anioA < anioB) return -1;
            if (anioA > anioB) return 1;
            if (matA < matB) return -1;
            if (matA > matB) return 1;
            return 0;
        });
        setMaterias(data);
    }, (error) => {
        console.error("Error al cargar materias:", error);
        showMessage(`Error al cargar materias: ${error.message}`, true);
    });
    
    // Listener para Notas
    const notasQuery = query(collection(db, ...dataBasePath, 'notas'));
    const unsubscribeNotas = onSnapshot(notasQuery, (snapshot) => {
        const data = snapshotToArray(snapshot);
        setNotas(data);
    }, (error) => {
        console.error("Error al cargar notas:", error);
        showMessage(`Error al cargar notas: ${error.message}`, true);
    });


    // Función de limpieza al desmontar
    return () => {
      unsubscribeStudents();
      unsubscribeInstrumentos();
      unsubscribeMatriculaciones();
      unsubscribeMaterias();
      unsubscribeNotas(); 
    };
  }, [db, userId, appId]); // (AJUSTADO) Ya no depende de appState


  // --- Funciones de Utilidad ---
  
  // Mostrar mensaje
  const showMessage = (text, isError) => {
    setMessage({ text, isError });
  };
  
  // --- CRUD Estudiantes ---
  
  // Camino base a la colección de estudiantes
  const getStudentsColRef = () => collection(db, 'artifacts', appId, 'public', 'data', 'students');
  const getStudentDocRef = (id) => doc(db, 'artifacts', appId, 'public', 'data', 'students', id);
  
  const addStudent = async (newStudentData) => {
    try {
      await addDoc(getStudentsColRef(), {
        ...newStudentData,
        timestamp: Timestamp.now()
      });
      showMessage("Estudiante inscrito exitosamente.", false);
    } catch (error) {
      console.error("Error al agregar estudiante:", error);
      showMessage(`Error: ${error.message}`, true);
    }
  };

  const updateStudent = async (id, updatedData) => {
    try {
      await setDoc(getStudentDocRef(id), updatedData, { merge: true });
      showMessage("Datos del estudiante actualizados.", false);
    } catch (error) {
      console.error("Error al actualizar estudiante:", error);
      showMessage(`Error al actualizar estudiante: ${error.message}`, true);
    }
  };
  
  const deleteStudent = async (id, nombre) => {
    // ELIMINADO: Confirmación
    try {
      await deleteDoc(getStudentDocRef(id));
      showMessage(`Estudiante ${nombre} eliminado.`, false);
    } catch (error) {
      console.error("Error al eliminar estudiante:", error);
      showMessage(`Error al eliminar estudiante: ${error.message}`, true);
    }
  };
  // --- Fin CRUD Estudiantes ---


  // CRUD Materias
  const deleteMateria = async (id, nombre) => {
      // ELIMINADO: Confirmación
      try {
          const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'materias', id);
          await deleteDoc(docRef);
          showMessage("Materia eliminada.", false);
      } catch (error) {
          console.error("Error al eliminar materia:", error);
          showMessage(`Error: ${error.message}`, true);
      }
  };


  // --- Navegación ---
  const navigateTo = (screen) => setAppState(screen);
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    // Si salimos de la pestaña de notas, reseteamos la sub-pestaña
    if (tabId !== 'notas') {
      setNotasSubTab('ingresar_nota');
    }
  };

  // --- Renderizado Condicional ---
  
  if (loading && !debugInfo.projectId) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 text-gray-700 no-print">
            <IconLoading />
            <span className="text-xl ml-3">Cargando Configuración...</span>
        </div>
    );
  }

  // Si hay un error de configuración manual
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "SU_API_KEY") {
      return (
          <div className="flex items-center justify-center min-h-screen bg-red-100 p-8 no-print">
              <div className="max-w-2xl bg-white p-10 rounded-lg shadow-xl border border-red-300 text-center">
                  <h1 className="text-3xl font-bold text-red-700 mb-4">Error de Configuración</h1>
                  <p className="text-lg text-gray-800">No se ha encontrado la configuración de Firebase.</p>
                  <p className="text-gray-600 mt-4">
                      Por favor, siga estos pasos:
                  </p>
                  <ol className="text-left list-decimal list-inside mt-4 space-y-2">
                      <li>Vaya a su <strong>Consola de Firebase</strong>.</li>
                      <li>Haga clic en <strong>Configuración del Proyecto</strong> (⚙️).</li>
                      <li>Vaya a <strong>Tus apps</strong> &gt; <strong>App Web</strong>.</li>
                      <li>Copie el objeto <code>firebaseConfig</code>.</li>
                      <li>Pegue ese objeto al inicio del archivo <code>App.jsx</code> (reemplazando el de ejemplo).</li>
                  </ol>
              </div>
          </div>
      );
  }
  
  // Si hay un error de autenticación (Anónimo no habilitado)
  if (debugInfo.authStatus === "Error: Auth Anónimo deshabilitado.") {
      return (
          <div className="flex items-center justify-center min-h-screen bg-yellow-100 p-8 no-print">
              <div className="max-w-2xl bg-white p-10 rounded-lg shadow-xl border border-yellow-400 text-center">
                  <h1 className="text-3xl font-bold text-yellow-800 mb-4">Acción Requerida</h1>
                  <p className="text-lg text-gray-800">La conexión con <code>{debugInfo.projectId}</code> fue exitosa, pero se requiere un paso más.</p>
                  <p className="text-gray-600 mt-4">
                      Para continuar, debe habilitar el inicio de sesión <strong>Anónimo</strong>:
                  </p>
                  <ol className="text-left list-decimal list-inside mt-4 space-y-2">
                      <li>Vaya a su <strong>Consola de Firebase</strong>.</li>
                      <li>Haga clic en <strong>Authentication</strong> (Menú Compilación).</li>
                      <li>Haga clic en la pestaña <strong>Sign-in method</strong>.</li>
                      <li>Busque <strong>Anónimo</strong> en la lista y habilítelo.</li>
                      <li>Guarde y <strong>refresque esta página</strong>.</li>
                  </ol>
              </div>
          </div>
      );
  }

  // Pantalla de carga principal
  if (loading) {
     return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 text-gray-700 no-print">
            <IconLoading />
            <span className="text-xl ml-3">Conectando con {debugInfo.projectId}...</span>
        </div>
    );
  }

  // Renderizado de la App (Router)
  return (
    <div className="min-h-screen bg-gray-50">
      {/* (AJUSTADO) Estilos de impresión globales */}
      <style>{printStyles}</style>
      
      {message.text && <Message text={message.text} isError={message.isError} onClose={() => showMessage("", false)} />}
      
      {/* Caja de Debug (Desaparece si el ID es el de ejemplo) */}
      {/*
      {debugInfo.projectId && debugInfo.projectId !== "SU_PROJECT_ID" && (
         <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 p-3 text-sm text-center no-print">
           <p><strong>ID del Proyecto (App):</strong> <span className="font-mono bg-yellow-200 px-2 py-1 rounded">{debugInfo.projectId}</span></p>
           <p><strong>Estado Auth:</strong> <span className="font-mono bg-yellow-200 px-2 py-1 rounded">{debugInfo.authStatus}</span></p>
         </div>
      )}
      */}

      {/* (NUEVO) Div de impresión para Certificado */}
      <div id="certificate-print-area" className="print-area"></div>

      {/* Router de Pantallas */}
      <div className="no-print">
        {appState === 'landing' && <LandingScreen navigateTo={navigateTo} />}
        {appState === 'student_access' && 
            <StudentAccessScreen 
                navigateTo={navigateTo} 
                db={db} 
                appId={appId} 
                showMessage={showMessage}
                // (AJUSTADO) Pasar listas de 'students' y 'matriculaciones'
                students={students}
                matriculaciones={matriculaciones}
            />
        }
        
        {/* (MOVIDO) La pantalla 'student_analitico' se movió fuera de este div 'no-print' 
          para permitir que la impresión funcione.
        */}
        
        {appState === 'admin_login' && <AdminLoginScreen navigateTo={navigateTo} showMessage={showMessage} />}
      </div>
      
      {/* El Dashboard se maneja fuera del 'no-print' principal para que el analítico pueda imprimirse */}
      {appState === 'admin_dashboard' && (
        <AdminDashboardScreen
          navigateTo={navigateTo}
          activeTab={activeTab}
          handleTabChange={handleTabChange}
          showMessage={showMessage}
          db={db}
          userId={userId}
          appId={appId}
          students={students}
          instrumentos={instrumentos}
          addStudent={addStudent}
          updateStudent={updateStudent}
          deleteStudent={deleteStudent}
          matriculaciones={matriculaciones}
          materias={materias}
          notas={notas} 
          deleteMateria={deleteMateria} 
          notasSubTab={notasSubTab}
          setNotasSubTab={setNotasSubTab}
          snapshotToArray={snapshotToArray}
        />
      )}

      {/* --- (NUEVA UBICACIÓN) --- */}
      {/* El Analítico de Estudiante se renderiza aquí (fuera de 'no-print') */}
      {appState === 'student_analitico' && 
          <StudentAnaliticoScreen 
              navigateTo={navigateTo}
              showMessage={showMessage}
              students={students}
              matriculaciones={matriculaciones}
              materias={materias}
              notas={notas}
          />
      }
      {/* --- FIN DE LA NUEVA UBICACIÓN --- */}

    </div>
  );
}

// -----------------------------------------------------------------
// --- PANTALLAS DE LA APLICACIÓN ---
// -----------------------------------------------------------------

/**
 * Pantalla 1: Bienvenida (Landing)
 * (ESTILO ACTUALIZADO)
 */
const LandingScreen = ({ navigateTo }) => (
  <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-slate-100">
    <header className="text-center mb-12">
      
      {/* --- NUEVO --- */}
      <img src="/logo.png" alt="Logo Escuela" className="w-24 h-auto mx-auto mb-4" />
      {/* --- FIN NUEVO --- */}

      <h1 className="text-5xl font-bold text-gray-800 tracking-tight">Sistema de Gestión Estudiantil</h1>
      <h2 className="text-3xl font-semibold text-indigo-600 mt-2">FOBAM</h2>
      <p className="text-xl text-gray-600 mt-4">Escuela Superior de Música de Neuquén</p>
    </header>
    <main className="w-full max-w-2xl space-y-8">
      <AccessButton
        icon={<IconUser />}
        title="Estudiante"
        description="Consultar certificados y rendimiento académico."
        onClick={() => navigateTo('student_access')}
      />
      <AccessButton
        icon={<IconAdmin />}
        title="Administrativo"
        description="Gestión de estudiantes, matrículas y notas."
        onClick={() => navigateTo('admin_login')}
      />
    </main>
    <footer className="mt-16 text-gray-500">
      FOBAMedusis © {new Date().getFullYear()}
    </footer>
  </div>
);


/**
 * (REFACTORIZADO) Pantalla 2: Acceso Estudiantes
 */
const StudentAccessScreen = ({ navigateTo, db, appId, showMessage, students, matriculaciones }) => {
    const [step, setStep] = useState(1); // 1: DNI, 2: Plan Select, 3: Certificate
    const [dni, setDni] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [studentInfo, setStudentInfo] = useState(null); // { dni, nombres, apellidos, genero }
    const [foundPlans, setFoundPlans] = useState([]); // [plan1, plan2]
    const [selectedPlan, setSelectedPlan] = useState('');
    
    // Función para buscar DNI (en lugar de 'handleCertificateRequest')
    const handleDniSearch = async (e) => {
        e.preventDefault();
        if (!dni) return showMessage("Por favor, ingrese un DNI.", true);
        if (!db) return showMessage("Error: No hay conexión a la base de datos.", true);

        setIsLoading(true);
        const currentYear = new Date().getFullYear().toString();
        
        try {
            // 1. Buscar Matriculaciones (usando la lista global)
            const matriculasDelDNI = matriculaciones.filter(m => 
                m.dni === dni && 
                m.cicloLectivo === currentYear
            );

            if (matriculasDelDNI.length === 0) {
                setIsLoading(false);
                return showMessage(`No se encontró matrícula activa para el DNI ${dni} en el ciclo ${currentYear}.`, true);
            }

            // 2. Buscar Info del Estudiante (usando la lista global)
            const studentData = students.find(s => s.dni === dni);
            
            const firstMatricula = matriculasDelDNI[0];
            
            setStudentInfo({
                dni: firstMatricula.dni,
                nombres: firstMatricula.nombres,
                apellidos: firstMatricula.apellidos,
                genero: studentData ? studentData.genero : 'Otro' // Obtener género
            });

            // 3. Procesar planes
            const planesUnicos = [...new Set(matriculasDelDNI.map(m => m.plan))];
            
            if (planesUnicos.length > 1) {
                setFoundPlans(planesUnicos);
                setStep(2); // Ir a selección de plan
            } else {
                setSelectedPlan(planesUnicos[0]);
                setStep(3); // Ir directo al certificado
            }
            
        } catch (error) {
            console.error("Error buscando matrícula:", error);
            showMessage(`Error al consultar los datos: ${error.message}`, true);
        } finally {
            setIsLoading(false);
        }
    };
    
    // (NUEVO) Manejar selección de plan
    const handlePlanSelect = (plan) => {
        setSelectedPlan(plan);
        setStep(3);
    };

    // (NUEVO) Resetear el flujo
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
            
            {/* Paso 1: Pedir DNI */}
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
            
            {/* Paso 2: Seleccionar Plan */}
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
            
            {/* Paso 3: Mostrar Certificado */}
            {step === 3 && studentInfo && selectedPlan && (
                <CertificateDisplay
                    student={studentInfo}
                    plan={selectedPlan}
                    onCancel={resetFlow}
                />
            )}

            {/* 2. Rendimiento Académico (Botón (AHORA) habilitado) */}
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

/**
 * (NUEVO) Componente de Certificado (Estudiante)
 */
const CertificateDisplay = ({ student, plan, onCancel }) => {
            
    const handlePrint = () => {
        // (CORREGIDO) Apuntar a los IDs correctos del Certificado
        const printArea = document.getElementById('certificate-print-area');
        const previewContent = document.getElementById('certificate-preview-content');
        
        if (printArea && previewContent) {
            // (NUEVO) Añadir clase al body para activar los estilos A5
            document.body.classList.add('printing-certificado');
            
            printArea.innerHTML = previewContent.innerHTML;
            window.print();
            printArea.innerHTML = ''; // Limpiar
            
            // (NUEVO) Quitar clase del body después de imprimir
            document.body.classList.remove('printing-certificado');
        } else {
            console.error("Error al preparar la impresión del certificado.");
        }
    };
    
    // Determinar "alumno/a"
    const alumnoTerm = (student.genero || 'Otro').toLowerCase() === 'femenino' ? 'alumna' : 'alumno';

    return (
        <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-5">Certificado Generado</h2>
            
            {/* Contenedor de VISTA PREVIA */}
            <div id="certificate-preview-content" className="certificate-content" style={{ 
                padding: '1.5rem', 
                border: '1px dashed #ccc', 
                fontFamily: "'Times New Roman', Times, serif", 
                fontSize: '12pt',
                lineHeight: 1.6,
                background: 'white',
                color: 'black'
            }}>
                <div 
                    className="certificate-header" 
                    style={{ 
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontWeight: 'bold', 
                        fontSize: '14pt', 
                        marginBottom: '30px',
                        paddingBottom: '10px',
                        borderBottom: '2px solid #000' // Opcional: añade un borde como el analítico
                    }}
                >
                    {/* Izquierda (Texto) */}
                    <div style={{ textAlign: 'left' }}>
                        <p style={{ margin: 0 }}>Escuela Superior de Música de Neuquén</p>
                        <p style={{ margin: 0, fontSize: '12pt', fontWeight: 'normal' }}>Consejo Provincial de Educación</p>
                    </div>
                    
                    {/* Derecha (Logo) */}
                    <div>
                        <img 
                            src="/logo.png" 
                            alt="Logo" 
                            style={{ width: '80px', height: 'auto' }}
                        />
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
            
            {/* Botones de Acción */}
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


/**
 * (NUEVO) Pantalla 2.5: Analítico del Estudiante
 */
const StudentAnaliticoScreen = ({ 
    navigateTo, showMessage, students, matriculaciones, materias, notas 
}) => {
    return (
        <div className="flex flex-col items-center min-h-screen p-8 bg-gray-100">
            
            {/* Este div es correcto, lo necesita el botón de imprimir */}
            <div id="analitico-print-area" className="print-area"></div>

            {/* SÓLO este header debe ser 'no-print' */}
            <header className="text-center mb-10 no-print">
              <h1 className="text-4xl font-bold text-gray-800">Portal Estudiante</h1>
              <p className="text-lg text-gray-600 mt-2">Consulta de Rendimiento Académico</p>
            </header>
    
            {/* MODIFICADO: Quitamos 'no-print' de aquí */}
            <main className="w-full max-w-7xl p-8 bg-white rounded-xl shadow-lg border border-gray-200">
                {/* Este 'main' CONTIENE el analítico.
                  Si lo ocultamos, la función de imprimir no tiene nada que copiar.
                */}
                <AnaliticoTab
                    db={null}
                    appId={null}
                    showMessage={showMessage}
                    materias={materias}
                    students={students} 
                    matriculaciones={matriculaciones}
                    notas={notas}
                    snapshotToArray={null} // No se usa si no hay queries
                />
            </main>
            
            {/* SÓLO este botón debe ser 'no-print' */}
            <button
              onClick={() => navigateTo('student_access')}
              className="mt-10 text-indigo-600 hover:text-indigo-800 font-medium transition duration-150 no-print"
            >
              &larr; Volver al Portal Estudiante
            </button>
          </div>
    );
};


/**
 * Pantalla 3: Login Administrativo
 */
const AdminLoginScreen = ({ navigateTo, showMessage }) => {
    
    // El login ahora es directo, sin contraseña
    const handleLogin = (e) => {
        e.preventDefault();
        showMessage("Acceso autorizado.", false);
        navigateTo('admin_dashboard');
    };

    return (
      <div className="flex items-center justify-center min-h-screen p-8 bg-gray-100">
        <main className="w-full max-w-md p-10 bg-white rounded-xl shadow-2xl border border-gray-200">
            <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Acceso Administrativo</h1>
            <form onSubmit={handleLogin} className="space-y-6">
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña de Acceso</label>
                    <input 
                        type="password" 
                        id="password"
                        placeholder="(Acceso directo habilitado)"
                        disabled={true}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border bg-gray-100 cursor-not-allowed"
                    />
                </div>
                <button 
                    type="submit" 
                    className="w-full font-bold py-3 px-4 rounded-lg shadow-lg transition duration-200 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                    Ingresar
                </button>
            </form>
             <button
              onClick={() => navigateTo('landing')}
              className="mt-8 text-center w-full text-indigo-600 hover:text-indigo-800 font-medium transition duration-150"
            >
              &larr; Volver al inicio
            </button>
        </main>
      </div>
    );
};

/**
 * Pantalla 4: Dashboard Administrativo
 */
const AdminDashboardScreen = ({ 
    navigateTo, activeTab, handleTabChange, showMessage,
    db, userId, appId, students, instrumentos, matriculaciones, materias, notas, // (NUEVO) notas
    addStudent, updateStudent, deleteStudent, deleteMateria, // (NUEVO) Recibir deleteMateria
    notasSubTab, setNotasSubTab,
    snapshotToArray 
}) => {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* (NUEVO) Contenedor de Impresión (vacío, solo para el analítico) */}
      <div id="analitico-print-area" className="print-area"></div>

      <header className="bg-white shadow-md sticky top-0 z-10 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                    <span className="font-bold text-xl text-indigo-600">FOBAM</span>
                    <span className="font-semibold text-xl text-gray-700 ml-2">Admin</span>
                </div>
                <button 
                    onClick={() => navigateTo('landing')}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                    Cerrar Sesión &rarr;
                </button>
            </div>
        </div>
        
        {/* (REORDENADO Y ESTILO ACTUALIZADO) Barra de Pestañas */}
        <nav className="flex flex-wrap border-b border-gray-200 bg-gray-50 p-2 overflow-x-auto">
             <TabButton 
               id="inscribir" 
               label="1. Inscribir/Editar" 
               isActive={activeTab === 'inscribir'} 
               onClick={handleTabChange}
             />
             <TabButton 
               id="listado" 
               label="2. Listado Estudiantes" 
               isActive={activeTab === 'listado'} 
               onClick={handleTabChange}
             />
             <TabButton 
               id="matriculacion" 
               label="3. Matricular" 
               isActive={activeTab === 'matriculacion'} 
               onClick={handleTabChange}
             />
             <TabButton 
               id="notas" 
               label="4. Gestión de Notas" 
               isActive={activeTab === 'notas'} 
               onClick={handleTabChange}
             />
             <TabButton 
               id="analitico" 
               label="5. Analítico" 
               isActive={activeTab === 'analitico'} 
               onClick={handleTabChange}
             />
             <TabButton 
               id="instrumentos" 
               label="6. Admin Instrumentos" 
               isActive={activeTab === 'instrumentos'} 
               onClick={handleTabChange}
             />
             <TabButton 
               id="materias" 
               label="7. Admin Materias" 
               isActive={activeTab === 'materias'} 
               onClick={handleTabChange}
             />
        </nav>
      </header>
      
      {/* (REORDENADO) Contenido de Pestañas */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 no-print" id="main-content">
          
          {activeTab === 'inscribir' && (
            <InscribirEditarTab 
                db={db}
                appId={appId}
                showMessage={showMessage}
                onStudentAdded={addStudent}
                onStudentUpdated={updateStudent}
                snapshotToArray={snapshotToArray}
            />
          )}
          {activeTab === 'listado' && (
            <ListadoEstudiantesTab 
                students={students}
                deleteStudent={deleteStudent}
            />
          )}
          {activeTab === 'matriculacion' && (
            <MatriculacionTab 
                db={db}
                appId={appId}
                showMessage={showMessage}
                instrumentos={instrumentos}
                matriculaciones={matriculaciones}
                snapshotToArray={snapshotToArray}
            />
          )}
          {activeTab === 'notas' && (
             <NotasTab
                db={db}
                appId={appId}
                showMessage={showMessage}
                materias={materias}
                students={students} 
                matriculaciones={matriculaciones}
                notas={notas}
                notasSubTab={notasSubTab}
                setNotasSubTab={setNotasSubTab}
                snapshotToArray={snapshotToArray}
             />
          )}
          {activeTab === 'analitico' && (
             <AnaliticoTab
                db={db}
                appId={appId}
                showMessage={showMessage}
                materias={materias}
                students={students} 
                matriculaciones={matriculaciones}
                notas={notas}
                snapshotToArray={snapshotToArray}
             />
          )}
          {activeTab === 'instrumentos' && (
            <InstrumentosTab 
                db={db}
                appId={appId}
                showMessage={showMessage}
                instrumentos={instrumentos}
            />
          )}
          {activeTab === 'materias' && (
            <MateriasTab 
                db={db}
                appId={appId}
                showMessage={showMessage}
                materias={materias}
                deleteMateria={deleteMateria} 
            />
          )}
      </main>
    </div>
  );
};

// -----------------------------------------------------------------
// --- COMPONENTES DE PESTAÑAS (TABS) ---
// -----------------------------------------------------------------

/**
 * Pestaña 5: Analítico
 */
const AnaliticoTab = ({ 
    db, appId, showMessage, materias, students, matriculaciones, notas, snapshotToArray 
}) => {
    const [step, setStep] = useState(1); // 1: Buscar DNI, 2: Seleccionar Plan, 3: Mostrar Reporte
    const [dniSearch, setDniSearch] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    
    const [foundPlans, setFoundPlans] = useState([]); // Almacena los planes (strings)
    const [selectedPlan, setSelectedPlan] = useState(''); 
    const [studentInfo, setStudentInfo] = useState(null); // Info del alumno
    
    // (AJUSTE) Estado para la URL del Logo (ELIMINADO)

    // Paso 1: Buscar DNI en Matriculación
    const handleDniSearch = async (e) => {
        e.preventDefault();
        if (!dniSearch) return showMessage("Ingrese un DNI.", true);
        
        setSearchLoading(true);
        setFoundPlans([]);
        setSelectedPlan('');
        setStudentInfo(null);

        try {
            // Usar la lista 'matriculaciones' que ya tenemos
            const matriculasDelDNI = matriculaciones.filter(m => m.dni === dniSearch);
            // Buscar info del estudiante en la tabla 'students'
            const studentData = students.find(s => s.dni === dniSearch);
            
            if (matriculasDelDNI.length === 0 || !studentData) {
                showMessage(`DNI ${dniSearch} no encontrado o sin matriculaciones.`, true);
                setStep(1);
            } else {
                const planesUnicos = [...new Set(matriculasDelDNI.map(m => m.plan))];
                setStudentInfo(studentData); // Guardar info completa de 'students'

                if (planesUnicos.length > 1) {
                    setFoundPlans(planesUnicos);
                    setStep(2);
                } else {
                    setSelectedPlan(planesUnicos[0]);
                    setStep(3);
                }
                showMessage(`Estudiante ${studentData.nombres} ${studentData.apellidos} encontrado.`, false);
            }
        } catch (error) {
            console.error("Error buscando DNI:", error);
            showMessage(`Error de búsqueda: ${error.message}`, true);
        } finally {
            setSearchLoading(false);
        }
    };

    // Paso 2: Seleccionar Plan
    const handlePlanSelect = (plan) => {
        setSelectedPlan(plan);
        setStep(3);
    };

    // Resetear
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

            {/* (AJUSTE) Input de URL del Logo (ELIMINADO) */}

            {/* Paso 1: Buscador de DNI */}
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

            {/* Paso 2: Selector de Plan (si aplica) */}
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
            
            {/* Paso 3: Mostrar Reporte */}
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

/**
 * Componente de Reporte Analítico (para impresión)
 * (AJUSTADO SEGÚN REQUISITOS)
 */
const AnaliticoReport = ({ student, plan, allNotas, allMaterias, onCancel }) => { 

    // 1. (LÓGICA ACTUALIZADA) Procesamiento de notas
    const processedData = useMemo(() => {
        // 1. Get all subjects for the selected plan
        const materiasDelPlan = allMaterias.filter(m => m.plan === plan);

        // 2. Find notes for this student (approved only)
        const notasAprobadas = allNotas.filter(n => 
            n.dni === student.dni && 
            n.plan === plan &&
            ['Promoción', 'Examen', 'Equivalencia'].includes(n.condicion)
        );

        // 3. Map subjects and find their note
        const materiasConNotas = materiasDelPlan.map(materia => {
            // Find the note for this specific subject (materia.materia)
            // (Lógica simplificada: buscar por nombre de materia)
            const notaEncontrada = notasAprobadas.find(n => n.materia === materia.materia);

            return {
                ...materia, // id, materia (name), plan, anio
                notaData: notaEncontrada || null // The full note object, or null
            };
        });

        // 4. Group by year
        const grouped = materiasConNotas.reduce((acc, materia) => {
            const anio = materia.anio;
            if (!acc[anio]) {
                acc[anio] = [];
            }
            acc[anio].push(materia);
            return acc;
        }, {});
        
        // 5. Sort subjects within each year
        Object.keys(grouped).forEach(anio => {
           grouped[anio].sort((a,b) => a.materia.localeCompare(b.materia));
        });

        return grouped;
    }, [student.dni, plan, allNotas, allMaterias]);
    
    // (FIX) Ordenar los años numéricamente
    const anios = Object.keys(processedData).sort((a, b) => {
        if (a === 'N/A') return 1;
        if (b === 'N/A') return -1;
        // Ordenar numéricamente (1, 2, 3, 4, 5)
        return a.localeCompare(b, undefined, { numeric: true });
    });
    
    // (NUEVO) Dividir años para paginación
    const aniosPagina1 = anios.filter(a => ['1', '2', '3'].includes(a));
    const aniosPagina2 = anios.filter(a => !['1', '2', '3'].includes(a)); // 4, 5, N/A

    // 2. Función de Impresión
    const handlePrint = () => {
        const printArea = document.getElementById('analitico-print-area');
        const previewContent = document.getElementById('analitico-preview-content');
        
        if (printArea && previewContent) {
            // (NUEVO) Añadir clase al body para activar los estilos A4
            document.body.classList.add('printing-analitico');
            
            printArea.innerHTML = previewContent.innerHTML;
            window.print();
            printArea.innerHTML = ''; // Limpiar
            
            // (NUEVO) Quitar clase del body después de imprimir
            document.body.classList.remove('printing-analitico');
        } else {
            console.error("Error al preparar la impresión del analítico.");
        }
    };
    
    // Helper para formatear fecha
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            // Ajustar por zona horaria (si viene como YYYY-MM-DD)
            const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
            return utcDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (e) {
            return dateString;
        }
    };
    
    return (
        <div className="bg-white p-8 rounded-lg shadow-lg border">
            {/* Contenedor de VISTA PREVIA. */}
           <div id="analitico-preview-content" className="max-w-4xl mx-auto bg-white text-black">
                
                {/* 1. Encabezado (AJUSTADO) */}
                <div className="print-header text-left text-sm border-b-2 border-black pb-4">
                    
                    {/* --- BLOQUE FLEX (LOGO Y NOMBRE) --- */}
                    <div className="flex justify-between items-center">
                        {/* Izquierda (Texto) */}
                        <div>
                            {/* CAMBIO: Tamaño de fuente ajustado a text-lg */}
                            <h2 className="text-xl font-bold">Escuela Superior de Música de Neuquén</h2>
                            <h3 className="text-lg font-semibold">Consejo Provincial de Educación</h3>
                            <h3 className="text-lg font-semibold">Formación Básica en Música (FOBAM)</h3>
                            <p className="mt-3">Plan de Estudio: <strong>{plan}</strong></p>
                        </div>
                        {/* Derecha (Logo) */}
                        <div>
                            <img src="/logo.png" alt="Logo" className="w-40 h-auto" /> 
                        </div>
                    </div>
                    {/* --- FIN BLOQUE FLEX --- */}

                    {/* CAMBIO: Se eliminó 'mt-4' para juntar los bloques de texto */}
                    <div className=""> 
                        
                        
                        {/* CAMBIO: Se añadió 'text-center' y se mantuvo el margen superior */}
                        <h3 className="text-2xl font-semibold mt-10 text-center">CERTIFICADO DE RENDIMIENTO ACADÉMICO (ANALÍTICO)</h3>
                        
                        
                    </div>
                </div>
                
                {/* 2. Datos del Estudiante (AJUSTADO) */}
                <div className="my-6 text-sm">
                    <h3 className="text-base font-bold mb-3 border-b border-gray-400">DATOS DEL/DE LA ESTUDIANTE</h3>
                    {/* Renglón 1 (AJUSTADO) */}
                    <div className="flex justify-between items-center">
                        <p><strong>Apellidos:</strong> {student.apellidos}</p>
                        <p><strong>Nombres:</strong> {student.nombres}</p>
                        <p><strong>DNI:</strong> {student.dni}</p>
                    </div>
                    {/* Renglón 2 (AJUSTADO) */}
                    <div className="flex justify-between items-center mt-1">
                        <p><strong>Fecha de Nacimiento:</strong> {formatDate(student.fechanacimiento)}</p>
                        <p><strong>Nacionalidad:</strong> {student.nacionalidad}</p>
                        <p></p> {/* Espaciador para alinear */}
                    </div>
                </div>

                {/* 3. Espacios Acreditados (Materias) (LÓGICA DE PAGINACIÓN AJUSTADA) */}
                <div className="my-6">
                    <h3 className="text-base font-bold mb-2 border-b border-gray-400">ESPACIOS CURRICULARES ACREDITADOS</h3>
                    
                    {/* --- PÁGINA 1 (Años 1-3) --- */}
                    {aniosPagina1.map(anio => {
                        const materiasDelAnio = processedData[anio] || [];
                        if (materiasDelAnio.length > 0) {
                            return (
                                <div key={anio} className="mb-4">
                                    <h4 className="text-sm font-bold bg-gray-100 p-2 border border-gray-300">AÑO DE CURSADO: {anio}</h4>
                                    <table className="w-full text-xs border-l border-r border-gray-300">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="p-2 text-left font-semibold border-b border-gray-300">Espacio Curricular (Materia)</th>
                                                <th className="p-2 text-left font-semibold border-b border-gray-300">Condición</th>
                                                <th className="p-2 text-left font-semibold border-b border-gray-300">Calificación</th>
                                                <th className="p-2 text-left font-semibold border-b border-gray-300">Fecha</th>
                                                <th className="p-2 text-left font-semibold border-b border-gray-300">Libro/Folio</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {materiasDelAnio.map(materia => (
                                                <tr key={materia.id} className="border-b border-gray-200">
                                                    {/* Materia Name */}
                                                    <td className="p-2">
                                                        {materia.materia}
                                                        {materia.notaData && materia.notaData.obs_optativa_ensamble && (
                                                            <span className="text-gray-600 italic"> ({materia.notaData.obs_optativa_ensamble})</span>
                                                        )}
                                                    </td>
                                                    {/* Datos de la nota (o vacío si no existe) */}
                                                    <td className="p-2">{materia.notaData ? materia.notaData.condicion : ''}</td>
                                                    <td className="p-2">{materia.notaData ? materia.notaData.nota : ''}</td>
                                                    <td className="p-2">{materia.notaData ? formatDate(materia.notaData.fecha) : ''}</td>
                                                    <td className="p-2">{materia.notaData ? materia.notaData.libro_folio : ''}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        }
                        return null;
                    })}
                    
                    {/* --- PÁGINA 2 (Años 4, 5, etc. + Footer) --- */}
                    {/* (NUEVO) Este div fuerza el salto de página en impresión */}
                    <div className="print-page-break">
                        {aniosPagina2.map(anio => {
                            const materiasDelAnio = processedData[anio] || [];
                            if (materiasDelAnio.length > 0) {
                                return (
                                    <div key={anio} className="mb-4">
                                        <h4 className="text-sm font-bold bg-gray-100 p-2 border border-gray-300">AÑO DE CURSADO: {anio}</h4>
                                        <table className="w-full text-xs border-l border-r border-gray-300">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="p-2 text-left font-semibold border-b border-gray-300">Espacio Curricular (Materia)</th>
                                                    <th className="p-2 text-left font-semibold border-b border-gray-300">Condición</th>
                                                    <th className="p-2 text-left font-semibold border-b border-gray-300">Calificación</th>
                                                    <th className="p-2 text-left font-semibold border-b border-gray-300">Fecha</th>
                                                    <th className="p-2 text-left font-semibold border-b border-gray-300">Libro/Folio</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {materiasDelAnio.map(materia => (
                                                    <tr key={materia.id} className="border-b border-gray-200">
                                                        <td className="p-2">{materia.materia}</td>
                                                        <td className="p-2">{materia.notaData ? materia.notaData.condicion : ''}</td>
                                                        <td className="p-2">{materia.notaData ? materia.notaData.nota : ''}</td>
                                                        <td className="p-2">{materia.notaData ? formatDate(materia.notaData.fecha) : ''}</td>
                                                        <td className="p-2">{materia.notaData ? materia.notaData.libro_folio : ''}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            }
                            return null;
                        })}

                        {/* (AJUSTE) Mensaje de "sin materias" solo si ambas listas están vacías */}
                        {aniosPagina1.length === 0 && aniosPagina2.length === 0 && (
                            <p className="text-center italic text-gray-500 py-4">No se encontraron materias cargadas en la tabla 'Materias' para el plan seleccionado.</p>
                        )}
                        
                        {/* (AJUSTE) Pie de página movido a la Página 2 */}
                        <div className="mt-8 text-sm">
                            <p>Emitido en Neuquén Capital el {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}.</p>
                        </div>

                        {/* (AJUSTE) Firmas movidas a la Página 2 y líneas restauradas */}
                        <div className="print-signatures grid grid-cols-2 gap-8 text-sm">
                            <div>
                                <p className="print-signature-line"></p>
                            </div>
                            <div>
                                <p className="print-signature-line"></p>
                            </div>
                        </div>
                        
                    </div> {/* Fin de .print-page-break */}

                </div>

            </div> {/* Fin de #analitico-preview-content */}

            {/* Botones de Acción (Fuera del área de impresión) */}
            <div className="mt-8 flex space-x-3 no-print">
                <button 
                    type="button" 
                    onClick={onCancel}
                    className="w-1/3 font-bold py-3 px-4 rounded-lg shadow-lg transition duration-200 bg-gray-200 hover:bg-gray-300 text-gray-700"
                >
                    &larr; Volver a buscar
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

/**
 * Sub-Pestaña 4.1: Ingresar Nota Individual
 */
const IngresarNotaIndividual = ({ 
    db, appId, showMessage, materias, matriculaciones, snapshotToArray 
}) => {
    const [step, setStep] = useState(1); // 1: Buscar DNI, 2: Seleccionar Plan, 3: Cargar Nota
    const [dniSearch, setDniSearch] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    
    const [foundPlans, setFoundPlans] = useState([]); // Almacena los planes (strings)
    const [selectedPlan, setSelectedPlan] = useState(''); // El plan (ej: '530 Arpa')
    const [studentInfo, setStudentInfo] = useState({ dni: '', nombres: '', apellidos: '' }); // Info del alumno
    
    // Estado del formulario de nota
    const [selectedMateriaId, setSelectedMateriaId] = useState('');
    const [showObsField, setShowObsField] = useState(false);
    const [notaForm, setNotaForm] = useState({
        materia: '',
        obs_optativa_ensamble: '',
        nota: '',
        fecha: new Date().toISOString().split('T')[0],
        libro_folio: '',
        condicion: 'Promoción',
        observaciones: ''
    });

    const materiasCondicionales = [
        'optativa 1', 'optativa 2', 
        'ensamble 1', 'ensamble 2', 'ensamble 3', 'ensamble 4'
    ];

    // Paso 1: Buscar DNI en Matriculación
    const handleDniSearch = async (e) => {
        e.preventDefault();
        if (!dniSearch) return showMessage("Ingrese un DNI.", true);
        
        setSearchLoading(true);
        setFoundPlans([]);
        setSelectedPlan('');
        setStudentInfo({ dni: '', nombres: '', apellidos: '' });

        try {
            // (FIX) Usar la lista 'matriculaciones' que ya tenemos en lugar de hacer un query
            const matriculasDelDNI = matriculaciones.filter(m => m.dni === dniSearch);

            if (matriculasDelDNI.length === 0) {
                showMessage(`DNI ${dniSearch} no encontrado en ninguna matriculación.`, true);
                setStep(1);
            } else {
                // Usar un Set para obtener planes únicos
                const planesUnicos = [...new Set(matriculasDelDNI.map(m => m.plan))];
                
                // Guardar datos del alumno (del primer registro)
                setStudentInfo({
                    dni: matriculasDelDNI[0].dni,
                    nombres: matriculasDelDNI[0].nombres,
                    apellidos: matriculasDelDNI[0].apellidos
                });

                if (planesUnicos.length > 1) {
                    // Múltiples planes -> Ir al Paso 2
                    setFoundPlans(planesUnicos);
                    setStep(2);
                } else {
                    // Un solo plan -> Saltar al Paso 3
                    const plan = planesUnicos[0];
                    setSelectedPlan(plan);
                    setStep(3);
                }
                // (FIX) Usar los datos recién seteados
                showMessage(`Estudiante ${matriculasDelDNI[0].nombres} ${matriculasDelDNI[0].apellidos} encontrado.`, false);
            }
        } catch (error) {
            console.error("Error buscando DNI en matriculación:", error);
            showMessage(`Error de búsqueda: ${error.message}`, true);
        } finally {
            setSearchLoading(false);
        }
    };

    // Paso 2: Seleccionar Plan (si hay múltiples)
    const handlePlanSelect = (plan) => {
        setSelectedPlan(plan);
        setStep(3);
    };

    // Paso 3: Manejar cambios en el formulario de nota
    const handleNotaFormChange = (e) => {
        const { name, value } = e.target;
        setNotaForm(prev => ({ ...prev, [name]: value }));
    };

    // Manejar selección de materia (para campo condicional)
    const handleMateriaChange = (e) => {
        const materiaId = e.target.value;
        setSelectedMateriaId(materiaId);
        
        if (materiaId) {
            const materiaSeleccionada = materias.find(m => m.id === materiaId);
            if (!materiaSeleccionada) {
                 // Fallback por si la materia no está
                setShowObsField(false);
                setNotaForm(prev => ({ ...prev, materia: 'Error - Materia no encontrada', obs_optativa_ensamble: '' }));
                return;
            }
            
            const materiaNombre = materiaSeleccionada.materia.toLowerCase();
            
            // Actualizar el nombre de la materia en el formulario
            setNotaForm(prev => ({ ...prev, materia: materiaSeleccionada.materia }));
            
            // Verificar si es condicional
            if (materiasCondicionales.includes(materiaNombre)) {
                setShowObsField(true);
            } else {
                setShowObsField(false);
                setNotaForm(prev => ({ ...prev, obs_optativa_ensamble: '' }));
            }
        } else {
            // Limpiar
            setShowObsField(false);
            setNotaForm(prev => ({ ...prev, materia: '', obs_optativa_ensamble: '' }));
        }
    };

    // Filtrar materias por el plan seleccionado
    const materiasDelPlan = useMemo(() => {
        if (!selectedPlan || materias.length === 0) return [];
        return materias.filter(m => m.plan === selectedPlan);
    }, [selectedPlan, materias]);

    // Guardar la nota
    const handleSaveNota = async (e) => {
        e.preventDefault();
        
        // Validación
        if (!selectedMateriaId || !notaForm.nota || !notaForm.fecha || !notaForm.condicion) {
            return showMessage("Complete todos los campos obligatorios (Materia, Calificación, Fecha, Condición).", true);
        }
        if (showObsField && !notaForm.obs_optativa_ensamble) {
            return showMessage("Por favor, especifique la Optativa o Ensamble.", true);
        }

        setSearchLoading(true); // Reutilizar el estado de loading
        
        const notaData = {
            ...studentInfo, // dni, nombres, apellidos
            plan: selectedPlan,
            ...notaForm,
            timestamp: Timestamp.now()
        };

        try {
            const notasRef = collection(db, 'artifacts', appId, 'public', 'data', 'notas');
            await addDoc(notasRef, notaData);
            
            showMessage("Nota guardada exitosamente.", false);
            // Resetear todo
            resetForm();

        } catch (error) {
            console.error("Error guardando la nota:", error);
            showMessage(`Error al guardar: ${error.message}`, true);
        } finally {
            setSearchLoading(false);
        }
    };

    // Resetear el flujo completo
    const resetForm = () => {
        setStep(1);
        setDniSearch('');
        setSearchLoading(false);
        setFoundPlans([]);
        setSelectedPlan('');
        setStudentInfo({ dni: '', nombres: '', apellidos: '' });
        setSelectedMateriaId('');
        setShowObsField(false);
        setNotaForm({
            materia: '',
            obs_optativa_ensamble: '',
            nota: '',
            fecha: new Date().toISOString().split('T')[0],
            libro_folio: '',
            condicion: 'Promoción',
            observaciones: ''
        });
    };

    return (
        <div className="max-w-2xl mx-auto">
            {/* Paso 1: Buscador de DNI */}
            {step === 1 && (
                <form onSubmit={handleDniSearch} className="p-6 bg-indigo-50 rounded-lg border border-indigo-200">
                    <label htmlFor="dni_search_nota" className="block text-sm font-medium text-gray-700">Ingrese DNI del estudiante</label>
                    <div className="mt-1 flex space-x-2">
                        <input 
                            type="text" 
                            id="dni_search_nota"
                            value={dniSearch}
                            onChange={(e) => setDniSearch(e.target.value)}
                            className="flex-grow rounded-md border-gray-300 shadow-sm p-3 border"
                            placeholder="Buscar DNI en matriculaciones..."
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

            {/* Paso 2: Selector de Plan (si aplica) */}
            {step === 2 && studentInfo && (
                <div className="p-6 bg-white rounded-lg shadow-md border">
                    <h3 className="text-lg font-semibold text-gray-800">Múltiples Planes Encontrados</h3>
                    <p className="text-gray-600 mb-4">El estudiante <strong>{studentInfo.nombres} {studentInfo.apellidos}</strong> está matriculado en varios planes. Por favor, seleccione uno para cargar la nota:</p>
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

            {/* Paso 3: Formulario de Carga de Nota */}
            {step === 3 && studentInfo && (
                <form onSubmit={handleSaveNota} className="p-6 bg-white rounded-lg shadow-md border space-y-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-semibold text-gray-800">Cargar Nota</h3>
                            <p className="text-gray-600">Estudiante: <strong>{studentInfo.nombres} {studentInfo.apellidos}</strong> (DNI: {studentInfo.dni})</p>
                            <p className="text-gray-600">Plan Seleccionado: <strong>{selectedPlan}</strong></p>
                        </div>
                        <button type="button" onClick={resetForm} className="text-sm text-indigo-600 hover:text-indigo-800">&larr; Cancelar</button>
                    </div>

                    <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Columna 1 */}
                        <div className="space-y-4">
                            {/* Materia */}
                            <div>
                                <label htmlFor="materia" className="block text-sm font-medium text-gray-700">Materia (del plan {selectedPlan})</label>
                                <select 
                                    id="materia" 
                                    name="materia"
                                    value={selectedMateriaId}
                                    onChange={handleMateriaChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border"
                                    required
                                >
                                    <option value="">Seleccione una materia...</option>
                                    {materiasDelPlan.length > 0 ? (
                                        materiasDelPlan.map(m => (
                                            <option key={m.id} value={m.id}>{m.materia} (Año {m.anio})</option>
                                        ))
                                    ) : (
                                        <option disabled>No hay materias cargadas para este plan.</option>
                                    )}
                                </select>
                            </div>

                            {/* Campo Condicional (Optativa/Ensamble) */}
                            {showObsField && (
                                <div>
                                    <label htmlFor="obs_optativa_ensamble" className="block text-sm font-medium text-gray-700">Especifique Optativa/Ensamble</label>
                                    <input 
                                        type="text" 
                                        id="obs_optativa_ensamble"
                                        name="obs_optativa_ensamble"
                                        value={notaForm.obs_optativa_ensamble}
                                        onChange={handleNotaFormChange}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border"
                                        placeholder="Ej: Ensamble de Rock"
                                        required
                                    />
                                </div>
                            )}

                            {/* Calificación */}
                            <div>
                                <label htmlFor="nota" className="block text-sm font-medium text-gray-700">Calificación</label>
                                <input 
                                    type="text" 
                                    id="nota"
                                    name="nota"
                                    value={notaForm.nota}
                                    onChange={handleNotaFormChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border"
                                    placeholder="Ej: 9 (Nueve) ó AP (Aprobado)"
                                    required
                                />
                            </div>

                            {/* Fecha */}
                            <div>
                                <label htmlFor="fecha" className="block text-sm font-medium text-gray-700">Fecha</label>
                                <input 
                                    type="date" 
                                    id="fecha"
                                    name="fecha"
                                    value={notaForm.fecha}
                                    onChange={handleNotaFormChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border"
                                    required
                                />
                            </div>
                        </div>

                        {/* Columna 2 */}
                        <div className="space-y-4">
                            {/* Condición */}
                            <div>
                                <label htmlFor="condicion" className="block text-sm font-medium text-gray-700">Condición</label>
                                <select 
                                    id="condicion" 
                                    name="condicion"
                                    value={notaForm.condicion}
                                    onChange={handleNotaFormChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border"
                                    required
                                >
                                    <option>Promoción</option>
                                    <option>Examen</option>
                                    <option>Equivalencia</option>
                                </select>
                            </div>

                            {/* Libro/Folio */}
                            <div>
                                <label htmlFor="libro_folio" className="block text-sm font-medium text-gray-700">Libro y Folio</label>
                                <input 
                                    type="text" 
                                    id="libro_folio"
                                    name="libro_folio"
                                    value={notaForm.libro_folio}
                                    onChange={handleNotaFormChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border"
                                    placeholder="Ej: L1 F23"
                                />
                            </div>

                            {/* Observaciones */}
                            <div>
                                <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700">Observaciones</label>
                                <textarea 
                                    id="observaciones"
                                    name="observaciones"
                                    rows="4"
                                    value={notaForm.observaciones}
                                    onChange={handleNotaFormChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border"
                                    placeholder="Cualquier observación adicional..."
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    {/* Botón de Guardar */}
                    <div className="border-t pt-4">
                        <button 
                            type="submit" 
                            disabled={searchLoading}
                            className="w-full flex items-center justify-center font-bold py-3 px-4 rounded-lg shadow-lg transition duration-200 bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400"
                        >
                            {searchLoading ? <IconLoading /> : 'Guardar Nota'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

/**
 * Sub-Pestaña 4.2: Ingresar Planilla
 */
const IngresarPlanilla = ({ db, appId, showMessage, materias, students, matriculaciones }) => {
    
    // Nombres únicos de materias (alfabético)
    const uniqueMaterias = useMemo(() => {
        const names = new Set(materias.map(m => m.materia));
        return [...names].sort();
    }, [materias]);

    // (FIX 1) Opciones para el desplegable de DNI (desde matriculaciones)
    const studentOptions = useMemo(() => {
        const uniqueStudents = new Map();
        
        matriculaciones.forEach(m => {
            if (!uniqueStudents.has(m.dni)) {
                uniqueStudents.set(m.dni, {
                    value: m.dni,
                    label: `${m.dni} - ${m.apellidos}, ${m.nombres}`,
                    nombres: m.nombres,
                    apellidos: m.apellidos
                });
            }
        });
        // Ordenar por DNI
        return [...uniqueStudents.values()].sort((a, b) => a.value.localeCompare(b.value));
    }, [matriculaciones]);

    const materiasCondicionales = [
        'optativa 1', 'optativa 2', 
        'ensamble 1', 'ensamble 2', 'ensamble 3', 'ensamble 4'
    ];
    
    // Estado
    const [commonData, setCommonData] = useState({
        materiaName: '', // Nombre de la materia
        obs_optativa_ensamble: '',
        fecha: new Date().toISOString().split('T')[0],
        libro_folio: '',
        condicion: 'Promoción',
        observaciones: ''
    });
    const [showObsField, setShowObsField] = useState(false);
    const [studentCount, setStudentCount] = useState('');
    const [planillaRows, setPlanillaRows] = useState([]); // Array de { id, dni, nombres, apellidos, nota }
    const [loading, setLoading] = useState(false);

    // Manejar cambio en formulario común
    const handleCommonChange = (e) => {
        const { name, value } = e.target;
        setCommonData(prev => ({ ...prev, [name]: value }));
    };

    // Manejar cambio de materia (para campo condicional)
    const handleMateriaChange = (e) => {
        const materiaNombre = e.target.value;
        setCommonData(prev => ({ ...prev, materiaName: materiaNombre, obs_optativa_ensamble: '' }));
        
        if (materiaNombre && materiasCondicionales.includes(materiaNombre.toLowerCase())) {
            setShowObsField(true);
        } else {
            setShowObsField(false);
        }
    };

    // Generar las filas
    const handleGenerateRows = (e) => {
        e.preventDefault();
        const count = parseInt(studentCount, 10);
        if (isNaN(count) || count <= 0) {
            return showMessage("Ingrese un número válido de estudiantes.", true);
        }
        
        const newRows = Array(count).fill(null).map((_, index) => ({
            id: index,
            dni: '',
            nombres: '',
            apellidos: '',
            nota: ''
        }));
        setPlanillaRows(newRows);
    };

    // Manejar cambio en una fila
    const handleRowChange = (index, field, value) => {
        const newRows = [...planillaRows];
        const row = newRows[index];
        row[field] = value;
        
        // Si el campo es DNI, autocompletar
        if (field === 'dni') {
            const student = studentOptions.find(s => s.value === value);
            if (student) {
                row.nombres = student.nombres;
                row.apellidos = student.apellidos;
            } else {
                row.nombres = '';
                row.apellidos = '';
            }
        }
        setPlanillaRows(newRows);
    };

    // (FIX 2) Guardar la planilla con la lógica de planes
    const handleSavePlanilla = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { materiaName, ...commonFields } = commonData;

        if (!materiaName) {
            setLoading(false);
            return showMessage("Debe seleccionar una materia.", true);
        }
        
        const notasRef = collection(db, 'artifacts', appId, 'public', 'data', 'notas');
        const savePromises = [];
        let notasGuardadas = 0;
        let advertencias = [];

        try {
            for (const row of planillaRows) {
                if (!row.dni || !row.nota) {
                    // Omitir filas vacías en lugar de lanzar error
                    continue; 
                }

                // 1. Encontrar todos los planes para este DNI en matriculaciones
                const planesDelEstudiante = [...new Set(
                    matriculaciones
                        .filter(m => m.dni === row.dni)
                        .map(m => m.plan)
                )];

                if (planesDelEstudiante.length === 0) {
                    advertencias.push(`DNI ${row.dni} (${row.apellidos}) no tiene planes de matriculación. No se guardó nota.`);
                    continue;
                }

                let notaGuardadaParaEsteAlumno = false;

                // 2. Por cada plan, verificar si la materia existe
                for (const plan of planesDelEstudiante) {
                    const materiaExisteEnPlan = materias.some(m => m.plan === plan && m.materia === materiaName);

                    // 3. Si existe, registrar la nota para ESE plan
                    if (materiaExisteEnPlan) {
                        const notaData = {
                            ...commonFields, // fecha, libro_folio, condicion, obs, obs_optativa...
                            materia: materiaName,
                            dni: row.dni,
                            apellidos: row.apellidos,
                            nombres: row.nombres,
                            nota: row.nota,
                            plan: plan, // <-- (FIX) Se asigna el plan correcto
                            timestamp: Timestamp.now()
                        };
                        
                        savePromises.push(addDoc(notasRef, notaData));
                        notaGuardadaParaEsteAlumno = true;
                    }
                } // fin loop planes

                if (notaGuardadaParaEsteAlumno) {
                    notasGuardadas++;
                } else {
                    // Si la materia no existe en NINGUNO de los planes del alumno
                    advertencias.push(`Materia '${materiaName}' no existe en los planes de ${row.apellidos}. No se guardó nota.`);
                }

            } // fin loop rows

            // Esperar que todas las notas válidas se guarden
            await Promise.all(savePromises);
            
            if (notasGuardadas > 0) {
                showMessage(`Planilla procesada. ${notasGuardadas} notas guardadas exitosamente.`, false);
                // (FIX) Usar showMessage para advertencias en lugar de alert
                if (advertencias.length > 0) {
                    setTimeout(() => showMessage(`ADVERTENCIAS: ${advertencias.join('; ')}`, true), 100);
                }
                resetForm();
            } else if (planillaRows.length > 0) {
                showMessage("Se procesó la planilla, pero no se guardó ninguna nota.", true);
                if (advertencias.length > 0) {
                   setTimeout(() => showMessage(`ERRORES: ${advertencias.join('; ')}`, true), 100);
                }
            } else {
                showMessage("No había filas para procesar.", false);
            }

        } catch (error) {
            console.error("Error al guardar planilla:", error);
            showMessage(`Error: ${error.message}`, true);
        } finally {
            setLoading(false);
        }
    };


    // Resetear formulario
    const resetForm = () => {
        setCommonData({
            materiaName: '',
            obs_optativa_ensamble: '',
            fecha: new Date().toISOString().split('T')[0],
            libro_folio: '',
            condicion: 'Promoción',
            observaciones: ''
        });
        setShowObsField(false);
        setStudentCount('');
        setPlanillaRows([]);
        setLoading(false);
    };


    return (
        <div className="max-w-4xl mx-auto">
            {/* 1. Formulario de Datos Comunes */}
            <form onSubmit={handleSavePlanilla} className="p-6 bg-white rounded-lg shadow-md border space-y-4">
                <h3 className="text-xl font-semibold text-gray-800">Cargar Planilla de Notas</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Materia (Nombres Únicos) */}
                    <div>
                        <label htmlFor="materiaName" className="block text-sm font-medium text-gray-700">Materia</label>
                        <select 
                            id="materiaName" 
                            name="materiaName"
                            value={commonData.materiaName}
                            onChange={handleMateriaChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border"
                            required
                        >
                            <option value="">Seleccione materia...</option>
                            {uniqueMaterias.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Campo Condicional (Optativa/Ensamble) */}
                    {showObsField && (
                        <div>
                            <label htmlFor="obs_optativa_ensamble" className="block text-sm font-medium text-gray-700">Especifique Optativa/Ensamble</label>
                            <input 
                                type="text" 
                                id="obs_optativa_ensamble"
                                name="obs_optativa_ensamble"
                                value={commonData.obs_optativa_ensamble}
                                onChange={handleCommonChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border"
                                placeholder="Ej: Ensamble de Rock"
                                required
                            />
                        </div>
                    )}
                    
                    {/* Fecha */}
                    <div>
                        <label htmlFor="fecha" className="block text-sm font-medium text-gray-700">Fecha</label>
                        <input 
                            type="date" 
                            id="fecha"
                            name="fecha"
                            value={commonData.fecha}
                            onChange={handleCommonChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border"
                            required
                        />
                    </div>

                    {/* Condición */}
                    <div>
                        <label htmlFor="condicion" className="block text-sm font-medium text-gray-700">Condición</label>
                        <select 
                            id="condicion" 
                            name="condicion"
                            value={commonData.condicion}
                            onChange={handleCommonChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border"
                            required
                        >
                            <option>Promoción</option>
                            <option>Examen</option>
                            <option>Equivalencia</option>
                        </select>
                    </div>

                    {/* Libro/Folio */}
                    <div>
                        <label htmlFor="libro_folio" className="block text-sm font-medium text-gray-700">Libro y Folio</label>
                        <input 
                            type="text" 
                            id="libro_folio"
                            name="libro_folio"
                            value={commonData.libro_folio}
                            onChange={handleCommonChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border"
                            placeholder="Ej: L1 F23"
                        />
                    </div>
                </div>
                
                 {/* Observaciones */}
                <div>
                    <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700">Observaciones (para toda la planilla)</label>
                    <textarea 
                        id="observaciones"
                        name="observaciones"
                        rows="2"
                        value={commonData.observaciones}
                        onChange={handleCommonChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border"
                        placeholder="Cualquier observación adicional..."
                    ></textarea>
                </div>

                <div className="border-t pt-4"></div>

                {/* 2. Generador de Filas */}
                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <label htmlFor="studentCount" className="block text-sm font-medium text-gray-700">Número de Estudiantes en Planilla</label>
                    <div className="mt-1 flex space-x-2">
                        <input 
                            type="number" 
                            id="studentCount"
                            value={studentCount}
                            onChange={(e) => setStudentCount(e.target.value)}
                            className="w-48 rounded-md border-gray-300 shadow-sm p-3 border"
                            placeholder="Ej: 10"
                        />
                        <button 
                            type="button" 
                            onClick={handleGenerateRows}
                            className="font-medium py-3 px-5 rounded-lg shadow-md transition duration-200 bg-indigo-500 hover:bg-indigo-600 text-white"
                        >
                            Generar Filas
                        </button>
                    </div>
                </div>

                {/* 3. Tabla de Planilla (Dinámica) */}
                {planillaRows.length > 0 && (
                    <div className="mt-6">
                        <h4 className="text-lg font-semibold text-gray-800 mb-3">Estudiantes a Calificar</h4>
                        <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">DNI (Matriculados)</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">Apellidos</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">Nombres</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">Calificación *</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {planillaRows.map((row, index) => (
                                        <tr key={row.id}>
                                            {/* DNI (Desplegable) */}
                                            <td className="px-2 py-1">
                                                <select 
                                                    value={row.dni}
                                                    onChange={(e) => handleRowChange(index, 'dni', e.target.value)}
                                                    className="w-full rounded-md border-gray-300 shadow-sm p-2 border"
                                                >
                                                    <option value="">Seleccione DNI...</option>
                                                    {studentOptions.map(s => (
                                                        <option key={s.value} value={s.value}>{s.label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            {/* Apellidos (Auto) */}
                                            <td className="px-2 py-1">
                                                <input 
                                                    type="text" 
                                                    value={row.apellidos} 
                                                    className="w-full rounded-md p-2 bg-gray-100 border-gray-200"
                                                    readOnly 
                                                />
                                            </td>
                                            {/* Nombres (Auto) */}
                                            <td className="px-2 py-1">
                                                <input 
                                                    type="text" 
                                                    value={row.nombres} 
                                                    className="w-full rounded-md p-2 bg-gray-100 border-gray-200"
                                                    readOnly 
                                                />
                                            </td>
                                            {/* Nota (Editable) */}
                                            <td className="px-2 py-1">
                                                <input 
                                                    type="text" 
                                                    value={row.nota}
                                                    onChange={(e) => handleRowChange(index, 'nota', e.target.value)}
                                                    className="w-full rounded-md border-gray-300 shadow-sm p-2 border"
                                                    placeholder="Ej: 9"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* 4. Botón de Guardar Planilla */}
                        <div className="border-t pt-6 mt-6">
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full flex items-center justify-center font-bold py-3 px-4 rounded-lg shadow-lg transition duration-200 bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400"
                            >
                                {loading ? <IconLoading /> : `Guardar Planilla`}
                            </button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
};
/**
 * (NUEVO) Sub-Pestaña 4.3: Ingresar Analítico Completo
 */
const IngresarAnalitico = ({ db, appId, showMessage, materias, students, matriculaciones, notas }) => {
    
    const [step, setStep] = useState(1); // 1: DNI, 2: Plan, 3: Form
    const [dniSearch, setDniSearch] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    
    const [studentInfo, setStudentInfo] = useState(null); // Full student object
    const [foundPlans, setFoundPlans] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState('');
    
    // Almacena los datos del formulario: { materiaId: { nota: '', fecha: '', ... }, ... }
    const [gradeData, setGradeData] = useState({});
    
    // Almacena la lista de materias filtrada y ordenada para el plan
    const [materiasDelPlan, setMateriasDelPlan] = useState([]);

    const materiasCondicionales = [
        'optativa 1', 'optativa 2', 
        'ensamble 1', 'ensamble 2', 'ensamble 3', 'ensamble 4'
    ];

    const isMateriaCondicional = (materiaNombre) => {
        if (!materiaNombre) return false;
        return materiasCondicionales.includes(materiaNombre.toLowerCase());
    };

    // Paso 1: Buscar DNI
    const handleDniSearch = async (e) => {
        e.preventDefault();
        if (!dniSearch) return showMessage("Ingrese un DNI.", true);
        
        setSearchLoading(true);
        resetForm(false); // Limpiar datos, pero mantener DNI

        try {
            const matriculasDelDNI = matriculaciones.filter(m => m.dni === dniSearch);
            const studentData = students.find(s => s.dni === dniSearch);

            if (matriculasDelDNI.length === 0 || !studentData) {
                showMessage(`DNI ${dniSearch} no encontrado o sin matriculaciones.`, true);
                setStep(1);
            } else {
                const planesUnicos = [...new Set(matriculasDelDNI.map(m => m.plan))];
                setStudentInfo(studentData); // Guardar info completa de 'students'

                if (planesUnicos.length > 1) {
                    setFoundPlans(planesUnicos);
                    setStep(2);
                } else {
                    // Si solo hay un plan, saltar directo al formulario
                    await handlePlanSelect(planesUnicos[0]);
                }
                showMessage(`Estudiante ${studentData.nombres} ${studentData.apellidos} encontrado.`, false);
            }
        } catch (error) {
            console.error("Error buscando DNI:", error);
            showMessage(`Error de búsqueda: ${error.message}`, true);
        } finally {
            setSearchLoading(false);
        }
    };

    // Paso 2: Seleccionar Plan (y preparar formulario)
    const handlePlanSelect = async (plan) => {
        setSelectedPlan(plan);
        setSearchLoading(true); // Usar loading mientras se procesan las materias

        // 1. Filtrar materias del plan
        const materiasFiltradas = materias.filter(m => m.plan === plan);

        // 2. Ordenar por año, luego alfabéticamente (como se pidió)
        materiasFiltradas.sort((a, b) => {
            const anioA = Number(a.anio) || 0;
            const anioB = Number(b.anio) || 0;
            if (anioA !== anioB) return anioA - anioB;
            return a.materia.localeCompare(b.materia);
        });
        
        setMateriasDelPlan(materiasFiltradas);

        // 3. Pre-cargar notas existentes
        const notasExistentes = notas.filter(n => n.dni === studentInfo.dni && n.plan === plan);
        const initialGrades = {};

        for (const materia of materiasFiltradas) {
            // Buscar la nota por nombre de materia
            const nota = notasExistentes.find(n => n.materia === materia.materia);
            
            initialGrades[materia.id] = {
                materia: materia.materia,
                anio: materia.anio,
                nota: nota ? nota.nota : '',
                fecha: nota ? (nota.fecha || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
                condicion: nota ? (nota.condicion || 'Equivalencia') : 'Equivalencia',
                libro_folio: nota ? (nota.libro_folio || '') : '',
                obs_optativa_ensamble: nota ? (nota.obs_optativa_ensamble || '') : '',
                existingNoteId: nota ? nota.id : null // ID original para saber si actualizar o crear
            };
        }
        
        setGradeData(initialGrades);
        setStep(3); // Mostrar formulario
        setSearchLoading(false);
    };

    // Agrupar materias por año para la UI
    const materiasAgrupadas = useMemo(() => {
        if (step !== 3) return {};
        return materiasDelPlan.reduce((acc, materia) => {
            const anio = materia.anio || 'N/A';
            if (!acc[anio]) acc[anio] = [];
            acc[anio].push(materia);
            return acc;
        }, {});
    }, [materiasDelPlan, step]);

    const aniosOrdenados = Object.keys(materiasAgrupadas).sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));

    // Manejar cambio en un campo de nota
    const handleGradeChange = (materiaId, e) => {
        const { name, value } = e.target;
        setGradeData(prev => ({
            ...prev,
            [materiaId]: {
                ...prev[materiaId],
                [name]: value
            }
        }));
    };

    // Guardar TODO el analítico
    const handleSaveAnalitico = async (e) => {
        e.preventDefault();
        setSaveLoading(true);

        const notasRef = collection(db, 'artifacts', appId, 'public', 'data', 'notas');
        const promises = [];
        let notasProcesadas = 0;

        try {
            for (const materiaId in gradeData) {
                const grade = gradeData[materiaId];

                // Solo procesar si se ingresó una calificación
                if (grade.nota && grade.nota.trim() !== '') {
                    notasProcesadas++;
                    
                    const dataToSave = {
                        dni: studentInfo.dni,
                        nombres: studentInfo.nombres,
                        apellidos: studentInfo.apellidos,
                        plan: selectedPlan,
                        materia: grade.materia,
                        anio: grade.anio,
                        nota: grade.nota,
                        fecha: grade.fecha,
                        condicion: grade.condicion,
                        libro_folio: grade.libro_folio,
                        obs_optativa_ensamble: grade.obs_optativa_ensamble || '',
                        observaciones: 'Ingresado por Analítico', // Observación genérica
                        timestamp: Timestamp.now()
                    };

                    if (grade.existingNoteId) {
                        // Actualizar nota existente
                        const docRef = doc(notasRef, grade.existingNoteId);
                        promises.push(setDoc(docRef, dataToSave, { merge: true }));
                    } else {
                        // Crear nota nueva
                        promises.push(addDoc(notasRef, dataToSave));
                    }
                }
            }

            await Promise.all(promises);
            
            if (notasProcesadas > 0) {
                showMessage(`Analítico guardado: ${notasProcesadas} notas fueron creadas/actualizadas.`, false);
            } else {
                showMessage("No se ingresaron nuevas calificaciones para guardar.", false);
            }
            
            resetForm(true); // Resetear todo

        } catch (error) {
            console.error("Error al guardar analítico:", error);
            showMessage(`Error al guardar: ${error.message}`, true);
        } finally {
            setSaveLoading(false);
        }
    };

    // Resetear el flujo completo
    const resetForm = (fullReset = true) => {
        setStep(1);
        if (fullReset) {
            setDniSearch('');
        }
        setSaveLoading(false);
        setFoundPlans([]);
        setSelectedPlan('');
        setStudentInfo(null);
        setGradeData({});
        setMateriasDelPlan([]);
    };

    return (
        <div className="max-w-6xl mx-auto">
            {/* Paso 1: Buscador de DNI */}
            {step === 1 && (
                <form onSubmit={handleDniSearch} className="p-6 bg-indigo-50 rounded-lg border border-indigo-200 max-w-lg mx-auto">
                    <label htmlFor="dni_search_analitico" className="block text-sm font-medium text-gray-700">Ingrese DNI del estudiante</label>
                    <div className="mt-1 flex space-x-2">
                        <input 
                            type="text" 
                            id="dni_search_analitico"
                            value={dniSearch}
                            onChange={(e) => setDniSearch(e.target.value)}
                            className="flex-grow rounded-md border-gray-300 shadow-sm p-3 border focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition duration-150"
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

            {/* Paso 2: Selector de Plan (si aplica) */}
            {step === 2 && studentInfo && (
                <div className="p-6 bg-white rounded-lg shadow-md border max-w-lg mx-auto">
                    <h3 className="text-lg font-semibold text-gray-800">Múltiples Planes Encontrados</h3>
                    <p className="text-gray-600 mb-4">El estudiante <strong>{studentInfo.nombres} {studentInfo.apellidos}</strong> está matriculado en varios planes. Por favor, seleccione uno:</p>
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
                    <button onClick={() => resetForm(true)} className="mt-6 text-sm text-indigo-600 hover:text-indigo-800">&larr; Volver a buscar</button>
                </div>
            )}

            {/* Paso 3: Formulario de Carga de Analítico */}
            {step === 3 && studentInfo && (
                <form onSubmit={handleSaveAnalitico} className="p-6 bg-white rounded-lg shadow-md border space-y-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-semibold text-gray-800">Ingresar Analítico</h3>
                            <p className="text-gray-600">Estudiante: <strong>{studentInfo.nombres} {studentInfo.apellidos}</strong> (DNI: {studentInfo.dni})</p>
                            <p className="text-gray-600">Plan Seleccionado: <strong>{selectedPlan}</strong></p>
                        </div>
                        <button type="button" onClick={() => resetForm(true)} className="text-sm text-indigo-600 hover:text-indigo-800">&larr; Cancelar</button>
                    </div>

                    <div className="border-t pt-4 space-y-4">
                        <p className="text-sm text-gray-600">Ingrese los datos de las materias a acreditar. Las materias sin calificación serán ignoradas. Las notas existentes se pre-cargan y pueden ser modificadas.</p>
                        
                        {/* Cabeceras de la tabla */}
                        <div className="grid grid-cols-12 gap-x-2 px-2 pb-2 border-b font-medium text-sm text-gray-600">
                            <div className="col-span-3">Materia</div>
                            <div className="col-span-2">Optativa/Ensamble (si aplica)</div>
                            <div className="col-span-2">Fecha</div>
                            <div className="col-span-2">Condición</div>
                            <div className="col-span-1">Nota *</div>
                            <div className="col-span-2">Libro/Folio</div>
                        </div>

                        {/* Contenido de la tabla (Materias) */}
                        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                            {aniosOrdenados.map(anio => (
                                <div key={anio} className="space-y-2">
                                    <h4 className="text-md font-semibold text-indigo-700 bg-indigo-50 p-2 rounded-md sticky top-0">Año {anio}</h4>
                                    {materiasAgrupadas[anio].map(materia => {
                                        const grade = gradeData[materia.id];
                                        if (!grade) return null;
                                        
                                        return (
                                            <div key={materia.id} className="grid grid-cols-12 gap-x-2 items-center p-2 hover:bg-gray-50 rounded">
                                                {/* Nombre Materia */}
                                                <div className="col-span-3 text-sm font-medium text-gray-800">
                                                    {materia.materia}
                                                </div>
                                                
                                                {/* Obs Optativa/Ensamble */}
                                                <div className="col-span-2">
                                                    {isMateriaCondicional(materia.materia) ? (
                                                        <input 
                                                            type="text"
                                                            name="obs_optativa_ensamble"
                                                            value={grade.obs_optativa_ensamble}
                                                            onChange={(e) => handleGradeChange(materia.id, e)}
                                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition duration-150"
                                                            placeholder="Ej: Rock"
                                                        />
                                                    ) : (
                                                        <div className="h-9 p-2 text-sm text-gray-400 italic">N/A</div>
                                                    )}
                                                </div>

                                                {/* Fecha */}
                                                <div className="col-span-2">
                                                    <input 
                                                        type="date"
                                                        name="fecha"
                                                        value={grade.fecha}
                                                        onChange={(e) => handleGradeChange(materia.id, e)}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition duration-150"
                                                    />
                                                </div>

                                                {/* Condición */}
                                                <div className="col-span-2">
                                                    <select 
                                                        name="condicion"
                                                        value={grade.condicion}
                                                        onChange={(e) => handleGradeChange(materia.id, e)}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition duration-150"
                                                    >
                                                        <option>Equivalencia</option>
                                                        <option>Promoción</option>
                                                        <option>Examen</option>
                                                    </select>
                                                </div>
                                                
                                                {/* Nota */}
                                                <div className="col-span-1">
                                                    <input 
                                                        type="text"
                                                        name="nota"
                                                        value={grade.nota}
                                                        onChange={(e) => handleGradeChange(materia.id, e)}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition duration-150"
                                                        placeholder="Ej: 9"
                                                    />
                                                </div>

                                                {/* Libro/Folio */}
                                                <div className="col-span-2">
                                                    <input 
                                                        type="text"
                                                        name="libro_folio"
                                                        value={grade.libro_folio}
                                                        onChange={(e) => handleGradeChange(materia.id, e)}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition duration-150"
                                                        placeholder="Ej: L1 F23"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Botón de Guardar */}
                    <div className="border-t pt-4">
                        <button 
                            type="submit" 
                            disabled={saveLoading || searchLoading}
                            className="w-full flex items-center justify-center font-bold py-3 px-4 rounded-lg shadow-lg transition duration-200 bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400"
                        >
                            {saveLoading ? <IconLoading /> : 'Guardar Analítico'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

/**
 * Pestaña 1: Inscribir / Editar Estudiante
 */
const InscribirEditarTab = ({ db, appId, showMessage, onStudentAdded, onStudentUpdated, snapshotToArray }) => {
    const [dniSearch, setDniSearch] = useState('');
    const [foundStudent, setFoundStudent] = useState(null); // Almacena datos del estudiante encontrado (o datos para crear)
    const [searchState, setSearchState] = useState('idle'); // 'idle', 'loading', 'found', 'not_found'
    const [isEditMode, setIsEditMode] = useState(false);

    // Función de búsqueda
    const handleDniSearch = async (e) => {
        e.preventDefault();
        if (!dniSearch) return showMessage("Ingrese un DNI.", true);
        
        setSearchState('loading');
        setFoundStudent(null);
        setIsEditMode(false);

        try {
            const studentRef = collection(db, 'artifacts', appId, 'public', 'data', 'students');
            const q = query(studentRef, where("dni", "==", dniSearch));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                // No encontrado, preparamos para crear
                showMessage(`DNI ${dniSearch} no encontrado. Creando nuevo registro.`, false);
                setSearchState('not_found');
                // IMPORTANTE: Inicializar con TODOS los campos (para evitar error de 'undefined')
                setFoundStudent({ ...defaultStudentData, dni: dniSearch });
                setIsEditMode(false);
            } else {
                // Encontrado, preparamos para editar
                const studentData = querySnapshot.docs[0].data();
                const studentId = querySnapshot.docs[0].id;
                showMessage(`DNI ${dniSearch} encontrado. Cargando datos para edición.`, false);
                setSearchState('found');
                setFoundStudent({ id: studentId, ...studentData });
                setIsEditMode(true);
            }
        } catch (error) {
            console.error("Error buscando DNI:", error);
            showMessage(`Error de búsqueda: ${error.message}`, true);
            setSearchState('idle');
        }
    };

    // Función de guardado (Inscripción o Edición)
    const handleStudentSubmit = async (formData) => {
        if (isEditMode) {
            // Actualizar
            const { id, ...dataToUpdate } = formData;
            await onStudentUpdated(id, dataToUpdate);
        } else {
            // Agregar
            await onStudentAdded(formData);
        }
        // Limpiar
        setFoundStudent(null);
        setDniSearch('');
        setSearchState('idle');
    };
    
    // Cancelar (volver a buscar)
    const handleCancel = () => {
        setFoundStudent(null);
        setDniSearch('');
        setSearchState('idle');
    };

    return (
        <div id="gestion_estudiantes">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Gestión de Estudiantes</h2>
            
            {/* Si no hay estudiante cargado, mostrar buscador */}
            {!foundStudent ? (
                <form onSubmit={handleDniSearch} className="p-6 bg-indigo-50 rounded-lg border border-indigo-200 max-w-lg mx-auto">
                    <label htmlFor="dni_search" className="block text-sm font-medium text-gray-700">Ingrese DNI (sin puntos)</label>
                    <div className="mt-1 flex space-x-2">
                        <input 
                            type="text" 
                            id="dni_search"
                            value={dniSearch}
                            onChange={(e) => setDniSearch(e.target.value)}
                            className="flex-grow rounded-md border-gray-300 shadow-sm p-3 border"
                            placeholder="Buscar o Inscribir..."
                            required
                        />
                        <button 
                            type="submit" 
                            disabled={searchState === 'loading'}
                            className="flex items-center justify-center font-bold py-3 px-5 rounded-lg shadow-lg transition duration-200 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-400"
                        >
                            {searchState === 'loading' ? <IconLoading /> : 'Buscar DNI'}
                        </button>
                    </div>
                </form>
            ) : (
                /* Si hay estudiante cargado (encontrado o nuevo), mostrar formulario */
                <StudentForm 
                    initialData={foundStudent}
                    onSubmit={handleStudentSubmit}
                    buttonLabel={isEditMode ? "Guardar Cambios" : "Inscribir Nuevo Estudiante"}
                    isEdit={isEditMode}
                    onCancel={handleCancel}
                />
            )}
        </div>
    );
};

/**
 * Pestaña 3: Listado de Estudiantes
 */
const ListadoEstudiantesTab = ({ students, deleteStudent }) => {
    // Cálculo de edad (helper)
    const calcularEdad = (fechaNacimiento) => {
        if (!fechaNacimiento) return 'N/A';
        try {
            // Asegurarse de que la fechaNacimiento se interpreta correctamente
            // Si viene de un input type="date", es YYYY-MM-DD.
            // Si la zona horaria causa problemas, forzar UTC:
            const parts = fechaNacimiento.split('-');
            const cumple = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
            
            const hoy = new Date();
            let edad = hoy.getFullYear() - cumple.getFullYear();
            const m = hoy.getMonth() - cumple.getMonth();
            if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) {
                edad--;
            }
            return edad;
        } catch (e) {
            return 'Inválido';
        }
    };
    
    return (
        <div id="listado_estudiantes">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Listado de Estudiantes ({students.length})</h2>
             <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200 max-h-[70vh] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-indigo-600 text-white sticky top-0">
                        <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">DNI</th>
                            <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">Apellido</th>
                            <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">Nombres</th>
                            <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">Email</th>
                            <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">Ciudad</th>
                            <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">Teléfono</th>
                            <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">Edad</th>
                            <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {students.length > 0 ? students.map(student => (
                            <tr key={student.id} className="hover:bg-indigo-50">
                                <td className="px-3 py-3 text-sm font-mono text-gray-500">{student.dni}</td>
                                <td className="px-3 py-3 text-sm text-gray-700">{student.apellidos}</td>
                                <td className="px-3 py-3 text-sm text-gray-700">{student.nombres}</td>
                                <td className="px-3 py-3 text-sm text-gray-700">{student.email}</td>
                                <td className="px-3 py-3 text-sm text-gray-700">{student.ciudad}</td>
                                <td className="px-3 py-3 text-sm text-gray-700">{student.telefono}</td>
                                <td className="px-3 py-3 text-sm text-center text-gray-700">{calcularEdad(student.fechanacimiento)}</td>
                                <td className="px-3 py-3 text-right">
                                    <button 
                                        onClick={() => deleteStudent(student.id, `${student.nombres} ${student.apellidos}`)}
                                        className="text-red-600 hover:text-red-900 font-semibold transition duration-150"
                                    >
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="8" className="text-center py-8 text-gray-500 italic">No hay estudiantes cargados.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

/**
 * Pestaña 2: Matricular Estudiante
 */
const MatriculacionTab = ({ db, appId, showMessage, instrumentos, matriculaciones, snapshotToArray }) => {
    const [dniMatricula, setDniMatricula] = useState('');
    const [studentForMatricula, setStudentForMatricula] = useState(null); // Almacena {dni, nombres, apellidos}
    const [matriculaSearchState, setMatriculaSearchState] = useState('idle'); // 'idle', 'loading'
    
    // Campos del formulario
    const [selectedInstrumentoId, setSelectedInstrumentoId] = useState('');
    const [selectedPlan, setSelectedPlan] = useState('');
    const currentYear = new Date().getFullYear().toString();
    const currentDate = new Date().toISOString().split('T')[0];

    // (FIX) Filtrar matriculaciones del año actual para el listado
    const matriculacionesDelAnio = useMemo(() => {
        return matriculaciones.filter(m => m.cicloLectivo === currentYear);
    }, [matriculaciones, currentYear]);

    // Buscar estudiante por DNI (en 'students')
    const handleDniSearchMatricula = async (e) => {
        e.preventDefault();
        if (!dniMatricula) return showMessage("Ingrese un DNI.", true);
        
        setMatriculaSearchState('loading');
        setStudentForMatricula(null);

        try {
            const studentRef = collection(db, 'artifacts', appId, 'public', 'data', 'students');
            const q = query(studentRef, where("dni", "==", dniMatricula));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                showMessage(`DNI ${dniMatricula} no encontrado en la tabla de Estudiantes. Debe inscribirlo primero.`, true);
                setMatriculaSearchState('idle');
            } else {
                const data = querySnapshot.docs[0].data();
                setStudentForMatricula({
                    dni: data.dni,
                    nombres: data.nombres,
                    apellidos: data.apellidos
                });
                showMessage(`Estudiante ${data.nombres} ${data.apellidos} encontrado.`, false);
                setMatriculaSearchState('found');
            }
        } catch (error) {
            console.error("Error buscando DNI en Estudiantes:", error);
            showMessage(`Error de búsqueda: ${error.message}`, true);
            setMatriculaSearchState('idle');
        }
    };

    // Actualizar plan cuando se selecciona un instrumento
    const handleInstrumentoChange = (e) => {
        const selectedId = e.target.value;
        setSelectedInstrumentoId(selectedId);
        if (selectedId) {
            const instrumento = instrumentos.find(i => i.id === selectedId);
            setSelectedPlan(instrumento.plan);
        } else {
            setSelectedPlan('');
        }
    };

    // Guardar Matriculación
    const handleMatriculaSubmit = async (e) => {
        e.preventDefault();
        
        if (!selectedInstrumentoId || !studentForMatricula) {
            return showMessage("Error: Faltan datos (estudiante o instrumento).", true);
        }

        const instrumentoSeleccionado = instrumentos.find(i => i.id === selectedInstrumentoId);

        const newMatricula = {
            dni: studentForMatricula.dni,
            apellidos: studentForMatricula.apellidos,
            nombres: studentForMatricula.nombres,
            instrumento: instrumentoSeleccionado.instrumento,
            plan: instrumentoSeleccionado.plan,
            cicloLectivo: currentYear,
            fecha_matriculacion: currentDate,
            timestamp: Timestamp.now()
        };

        try {
            // (FIX) Validar contra la lista ya filtrada
            const yaExiste = matriculacionesDelAnio.some(
                m => m.dni === newMatricula.dni && 
                     m.instrumento === newMatricula.instrumento
            );
            
            if (yaExiste) {
                return showMessage(`Error: ${newMatricula.nombres} ${newMatricula.apellidos} ya está matriculado/a en ${newMatricula.instrumento} este año.`, true);
            }

            // Guardar
            const matriculaRef = collection(db, 'artifacts', appId, 'public', 'data', 'matriculation');
            await addDoc(matriculaRef, newMatricula);
            showMessage(`Estudiante matriculado/a en ${newMatricula.instrumento} exitosamente.`, false);
            
            // Limpiar formulario
            setDniMatricula('');
            setStudentForMatricula(null);
            setMatriculaSearchState('idle');
            setSelectedInstrumentoId('');
            setSelectedPlan('');

        } catch (error) {
            console.error("Error al guardar matriculación:", error);
            showMessage(`Error al matricular: ${error.message}`, true);
        }
    };

    // Cancelar (limpiar búsqueda)
    const handleCancelMatricula = () => {
        setDniMatricula('');
        setStudentForMatricula(null);
        setMatriculaSearchState('idle');
    };

    return (
        <div id="matriculacion_estudiantes">
            
            {/* Formulario de Búsqueda y Matriculación */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Columna 1: Formulario */}
                <div>
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Matricular Estudiante (Ciclo {currentYear})</h2>
                    
                    {/* Paso 1: Buscador de DNI */}
                    {!studentForMatricula ? (
                         <form onSubmit={handleDniSearchMatricula} className="p-6 bg-indigo-50 rounded-lg border border-indigo-200">
                            <label htmlFor="dni_search_matricula" className="block text-sm font-medium text-gray-700">Ingrese DNI (sin puntos)</label>
                            <div className="mt-1 flex space-x-2">
                                <input 
                                    type="text" 
                                    id="dni_search_matricula"
                                    value={dniMatricula}
                                    onChange={(e) => setDniMatricula(e.target.value)}
                                    className="flex-grow rounded-md border-gray-300 shadow-sm p-3 border"
                                    placeholder="Buscar DNI en Estudiantes..."
                                    required
                                />
                                <button 
                                    type="submit" 
                                    disabled={matriculaSearchState === 'loading'}
                                    className="flex items-center justify-center font-bold py-3 px-5 rounded-lg shadow-lg transition duration-200 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-400"
                                >
                                    {matriculaSearchState === 'loading' ? <IconLoading /> : 'Buscar'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* Paso 2: Formulario de Matriculación */
                        <form onSubmit={handleMatriculaSubmit} className="p-6 bg-white rounded-lg shadow-md border space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800">Estudiante Encontrado</h3>
                                <p className="text-gray-600"><strong>{studentForMatricula.apellidos}, {studentForMatricula.nombres}</strong> (DNI: {studentForMatricula.dni})</p>
                            </div>

                            {/* Selector de Instrumento */}
                            <div>
                                <label htmlFor="instrumento_select" className="block text-sm font-medium text-gray-700">Seleccione Instrumento (y Plan)</label>
                                <select 
                                    id="instrumento_select"
                                    value={selectedInstrumentoId}
                                    onChange={handleInstrumentoChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border"
                                    required
                                >
                                    <option value="">Seleccione...</option>
                                    {instrumentos.length > 0 ? (
                                        instrumentos.map(i => (
                                            <option key={i.id} value={i.id}>{i.instrumento} (Plan: {i.plan})</option>
                                        ))
                                    ) : (
                                        <option disabled>No hay instrumentos cargados.</option>
                                    )}
                                </select>
                            </div>

                            {/* Campos deshabilitados (auto-completados) */}
                            <input type="text" value={`Plan: ${selectedPlan}`} disabled className="w-full rounded-md border-gray-300 p-3 bg-gray-100" />
                            <input type="text" value={`Ciclo Lectivo: ${currentYear}`} disabled className="w-full rounded-md border-gray-300 p-3 bg-gray-100" />
                            <input type="text" value={`Fecha: ${currentDate}`} disabled className="w-full rounded-md border-gray-300 p-3 bg-gray-100" />
                            
                            {/* Acciones */}
                            <div className="flex space-x-3">
                                <button 
                                    type="button" 
                                    onClick={handleCancelMatricula}
                                    className="w-1/3 font-bold py-3 px-4 rounded-lg shadow-lg transition duration-200 bg-gray-200 hover:bg-gray-300 text-gray-700"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={!selectedInstrumentoId}
                                    className="w-2/3 font-bold py-3 px-4 rounded-lg shadow-lg transition duration-200 bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400"
                                >
                                    Matricular Estudiante
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Columna 2: Listado de Matriculados (Año en curso) */}
                <div>
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Matriculados {currentYear} ({matriculacionesDelAnio.length})</h2>
                    <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200 max-h-[70vh] overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-indigo-600 text-white sticky top-0">
                                <tr>
                                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">Apellido</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">Nombres</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">DNI</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">Instrumento/Plan</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {matriculacionesDelAnio.length > 0 ? matriculacionesDelAnio.map(m => (
                                    <tr key={m.id} className="hover:bg-indigo-50">
                                        <td className="px-3 py-3 text-sm text-gray-700">{m.apellidos}</td>
                                        <td className="px-3 py-3 text-sm text-gray-700">{m.nombres}</td>
                                        <td className="px-3 py-3 text-sm font-mono text-gray-500">{m.dni}</td>
                                        <td className="px-3 py-3 text-sm text-gray-700">{m.instrumento}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="text-center py-8 text-gray-500 italic">No hay matriculaciones este año.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};


/**
 * Pestaña 5: Admin Instrumentos
 */
const InstrumentosTab = ({ db, appId, showMessage, instrumentos }) => {
    const [instrumento, setInstrumento] = useState('');
    const [plan, setPlan] = useState('');
    const [loadingAdd, setLoadingAdd] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!instrumento || !plan) {
            return showMessage("Complete ambos campos.", true);
        }
        setLoadingAdd(true);
        try {
            const newInstrumento = { 
                instrumento: instrumento.trim(), 
                plan: plan.trim(),
                timestamp: Timestamp.now()
            };
            const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'instrumentos');
            await addDoc(colRef, newInstrumento);
            
            showMessage("Instrumento agregado exitosamente.", false);
            setInstrumento('');
            setPlan('');
        } catch (error) {
            console.error("Error al agregar instrumento:", error);
            showMessage(`Error: ${error.message}`, true);
        } finally {
            setLoadingAdd(false);
        }
    };
    
    const deleteInstrumento = async (id, nombre) => {
        // ELIMINADO: if (!window.confirm(`¿Seguro que desea eliminar ${nombre}?`)) return;
        
        try {
            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'instrumentos', id);
            await deleteDoc(docRef);
            showMessage("Instrumento eliminado.", false);
        } catch (error) {
            console.error("Error al eliminar instrumento:", error);
            showMessage(`Error: ${error.message}`, true);
        }
    };

    return (
        <div id="admin_instrumentos">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Administración de Instrumentos</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Columna 1: Formulario */}
                <form onSubmit={handleSubmit} className="md:col-span-1 p-6 bg-white rounded-lg shadow-md border space-y-4 h-fit">
                    <h3 className="text-lg font-semibold">Agregar Nuevo</h3>
                    <div>
                        <label htmlFor="instrumento" className="block text-sm font-medium text-gray-700">Nombre del Instrumento</label>
                        <input 
                            type="text" 
                            id="instrumento"
                            value={instrumento}
                            onChange={(e) => setInstrumento(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border"
                            placeholder="Ej: Piano"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="plan" className="block text-sm font-medium text-gray-700">Plan de Estudio</label>
                        <input 
                            type="text" 
                            id="plan"
                            value={plan}
                            onChange={(e) => setPlan(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border"
                            placeholder="Ej: 530 Arpa"
                            required
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={loadingAdd}
                        className="w-full flex items-center justify-center font-bold py-3 px-4 rounded-lg shadow-lg transition duration-200 bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400"
                    >
                        {loadingAdd ? <IconLoading /> : 'Agregar Instrumento'}
                    </button>
                </form>

                {/* Columna 2: Listado */}
                <div className="md:col-span-2">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Listado ({instrumentos.length})</h2>
                    <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200 max-h-[60vh] overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-indigo-600 text-white sticky top-0">
                                <tr>
                                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">Instrumento</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">Plan</th>
                                    <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {instrumentos.length > 0 ? instrumentos.map(i => (
                                    <tr key={i.id} className="hover:bg-indigo-50">
                                        <td className="px-3 py-3 text-sm text-gray-700">{i.instrumento}</td>
                                        <td className="px-3 py-3 text-sm text-gray-700">{i.plan}</td>
                                        <td className="px-3 py-3 text-right">
                                            <button 
                                                onClick={() => deleteInstrumento(i.id, i.instrumento)}
                                                className="text-red-600 hover:text-red-900 font-semibold transition duration-150"
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="3" className="text-center py-8 text-gray-500 italic">No hay instrumentos cargados.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Pestaña 6: Admin Materias
 */
const MateriasTab = ({ db, appId, showMessage, materias, deleteMateria }) => { // (NUEVO) Recibir deleteMateria
    const [materia, setMateria] = useState('');
    const [plan, setPlan] = useState('');
    const [anio, setAnio] = useState('');
    const [loadingAdd, setLoadingAdd] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!materia || !plan || !anio) {
            return showMessage("Complete todos los campos.", true);
        }
        setLoadingAdd(true);
        try {
            const newMateria = { 
                materia: materia.trim(), 
                plan: plan.trim(),
                anio: anio.trim(),
                timestamp: Timestamp.now()
            };
            const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'materias');
            await addDoc(colRef, newMateria);
            
            showMessage("Materia agregada exitosamente.", false);
            setMateria('');
            setPlan('');
            setAnio('');
        } catch (error) {
            console.error("Error al agregar materia:", error);
            showMessage(`Error: ${error.message}`, true);
        } finally {
            setLoadingAdd(false);
        }
    };
    
    // (FIX) Esta función AHORA se recibe por props.
    /*
    const deleteMateria = async (id, nombre) => {
        if (!window.confirm(`¿Seguro que desea eliminar ${nombre}?`)) return;
        
        try {
            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'materias', id);
            await deleteDoc(docRef);
            showMessage("Materia eliminada.", false);
        } catch (error) {
            console.error("Error al eliminar materia:", error);
            showMessage(`Error: ${error.message}`, true);
        }
    };
    */

    return (
        <div id="admin_materias">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Administración de Materias</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Columna 1: Formulario */}
                <form onSubmit={handleSubmit} className="md:col-span-1 p-6 bg-white rounded-lg shadow-md border space-y-4 h-fit">
                    <h3 className="text-lg font-semibold">Agregar Nueva</h3>
                    <div>
                        <label htmlFor="materia_nombre" className="block text-sm font-medium text-gray-700">Nombre de la Materia</label>
                        <input 
                            type="text" 
                            id="materia_nombre"
                            value={materia}
                            onChange={(e) => setMateria(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border"
                            placeholder="Ej: Lenguaje Musical 1"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="materia_plan" className="block text-sm font-medium text-gray-700">Plan de Estudio</label>
                        <input 
                            type="text" 
                            id="materia_plan"
                            value={plan}
                            onChange={(e) => setPlan(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border"
                            placeholder="Ej: 530 Arpa"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="materia_anio" className="block text-sm font-medium text-gray-700">Año de Cursado</label>
                        <input 
                            type="text" 
                            id="materia_anio"
                            value={anio}
                            onChange={(e) => setAnio(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border"
                            placeholder="Ej: 1"
                            required
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={loadingAdd}
                        className="w-full flex items-center justify-center font-bold py-3 px-4 rounded-lg shadow-lg transition duration-200 bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400"
                    >
                        {loadingAdd ? <IconLoading /> : 'Agregar Materia'}
                    </button>
                </form>

                {/* Columna 2: Listado */}
                <div className="md:col-span-2">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Listado ({materias.length})</h2>
                    <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200 max-h-[60vh] overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-indigo-600 text-white sticky top-0">
                                <tr>
                                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">Plan</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">Materia</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">Año</th>
                                    <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {materias.length > 0 ? materias.map(m => (
                                    <tr key={m.id} className="hover:bg-indigo-50">
                                        <td className="px-3 py-3 text-sm text-gray-700">{m.plan}</td>
                                        <td className="px-3 py-3 text-sm text-gray-700">{m.materia}</td>
                                        <td className="px-3 py-3 text-sm text-center text-gray-700">{m.anio}</td>
                                        <td className="px-3 py-3 text-right">
                                            <button 
                                                onClick={() => deleteMateria(m.id, m.materia)}
                                                className="text-red-600 hover:text-red-900 font-semibold transition duration-150"
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="text-center py-8 text-gray-500 italic">No hay materias cargadas.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};


// -----------------------------------------------------------------
// --- COMPONENTE Formulario de Estudiante (Reutilizable) ---
// -----------------------------------------------------------------
const StudentForm = ({ initialData, onSubmit, buttonLabel, isEdit = false, onCancel }) => {
    const [formData, setFormData] = useState({ ...defaultStudentData, ...initialData });
    const [formLoading, setFormLoading] = useState(false);

    // Sincroniza si initialData cambia (para el flujo DNI-First)
    useEffect(() => {
        setFormData({ ...defaultStudentData, ...initialData });
    }, [initialData]);


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        await onSubmit(formData);
        setFormLoading(false);
    };
    
    // Definición de campos para el formulario
    const fields = [
        { name: 'dni', label: 'DNI (sin puntos)', type: 'text', required: true, disabled: isEdit },
        { name: 'apellidos', label: 'Apellidos', type: 'text', required: true },
        { name: 'nombres', label: 'Nombres', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'fechanacimiento', label: 'Fecha de Nacimiento', type: 'date', required: true },
        { name: 'genero', label: 'Género', type: 'select', required: true, options: ['Masculino', 'Femenino', 'Otro'] },
        { name: 'nacionalidad', label: 'Nacionalidad', type: 'text', required: false },
        { name: 'direccion', label: 'Dirección', type: 'text', required: false },
        { name: 'ciudad', label: 'Ciudad', type: 'text', required: false },
        { name: 'telefono', label: 'Teléfono', type: 'tel', required: false },
        { name: 'telefonourgencias', label: 'Teléfono de Urgencias', type: 'tel', required: false },
    ];

    return (
        <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-md border space-y-4 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-800">{isEdit ? "Editando Estudiante" : "Inscribir Nuevo Estudiante"}</h3>
                <p className="text-sm text-gray-600">ID (Firestore): {initialData.id || 'N/A'}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                {fields.map(field => (
                    <div key={field.name}>
                        <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        {field.type === 'select' ? (
                            <select
                                id={field.name}
                                name={field.name}
                                value={formData[field.name]}
                                onChange={handleChange}
                                required={field.required}
                                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition duration-150"
                            >
                                {field.options.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        ) : (
                            <input 
                                type={field.type}
                                id={field.name}
                                name={field.name}
                                value={formData[field.name]}
                                onChange={handleChange}
                                required={field.required}
                                disabled={field.disabled || formLoading}
                                className={`mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition duration-150 ${field.disabled ? 'bg-gray-100' : ''}`}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Acciones */}
            <div className="flex space-x-3 border-t pt-4">
                <button 
                    type="button" 
                    onClick={onCancel}
                    disabled={formLoading}
                    className="w-1/3 font-semibold py-3 px-4 rounded-lg shadow-sm transition duration-200 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300"
                >
                    Cancelar
                </button>
                <button 
                    type="submit" 
                    disabled={formLoading}
                    className={`w-2/3 font-semibold py-3 px-4 rounded-lg shadow-md transition duration-200 text-white ${isEdit ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-green-600 hover:bg-green-700'} ${formLoading ? 'bg-gray-400' : ''}`}
                >
                    {formLoading ? <IconLoading /> : buttonLabel}
                </button>
            </div>
        </form>
    );
};
