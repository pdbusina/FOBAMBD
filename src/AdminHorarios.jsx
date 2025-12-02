import React, { useState, useEffect } from 'react';
import { 
    collection, 
    query, 
    onSnapshot, 
    addDoc, 
    deleteDoc, 
    doc,
    orderBy,
    Timestamp 
} from 'firebase/firestore';
import { IconLoading } from './App'; // Asegúrate de importar o definir el icono si lo usas

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const HORARIOS = [
    "08:00", "08:45", "09:30", "10:15", "11:00", "11:45", "12:30", 
    "13:30", "14:15", "15:00", "15:45", "16:30", "17:15", "18:00", 
    "18:45", "19:30", "20:15", "21:00", "21:40", "22:20", "23:00"
];

const AdminHorarios = ({ db, appId, showMessage, materias }) => {
    // materias: viene de App.jsx para poder elegir de la lista existente
    const [horarios, setHorarios] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Formulario
    const [form, setForm] = useState({
        materia: '',
        dia: 'Lunes',
        hora: '18:00',
        docente: '',
        cupo: '' // Opcional, por si quieres controlar cupos a futuro
    });

    // 1. Cargar Horarios Existentes en Tiempo Real
    useEffect(() => {
        const horariosRef = collection(db, 'artifacts', appId, 'public', 'data', 'horarios');
        // Intentamos ordenar, si falla por índices, quita el orderBy
        const q = query(horariosRef, orderBy("materia")); 
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
            setHorarios(data);
        }, (error) => {
            console.error("Error cargando horarios:", error);
        });

        return () => unsubscribe();
    }, [db, appId]);

    // Obtener lista única de materias para el desplegable (ordenada alfabéticamente)
    const uniqueMaterias = [...new Set(materias.map(m => m.materia))].sort();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.materia || !form.docente) return showMessage("Complete Materia y Docente", true);

        setLoading(true);
        try {
            const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'horarios');
            await addDoc(colRef, {
                ...form,
                timestamp: Timestamp.now()
            });
            showMessage("Horario creado exitosamente", false);
            setForm({ ...form, docente: '' }); // Limpiar solo docente para agilizar carga
        } catch (error) {
            console.error(error);
            showMessage(`Error: ${error.message}`, true);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if(!window.confirm("¿Eliminar este horario?")) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'horarios', id));
            showMessage("Horario eliminado", false);
        } catch (error) {
            showMessage(`Error: ${error.message}`, true);
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Administrar Oferta de Horarios</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* FORMULARIO DE CARGA */}
                <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-md border h-fit">
                    <h3 className="text-lg font-bold mb-4">Nuevo Horario</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">Materia</label>
                            <select 
                                className="w-full p-2 border rounded"
                                value={form.materia}
                                onChange={e => setForm({...form, materia: e.target.value})}
                                required
                            >
                                <option value="">Seleccione Materia...</option>
                                {uniqueMaterias.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase">Día</label>
                                <select 
                                    className="w-full p-2 border rounded"
                                    value={form.dia}
                                    onChange={e => setForm({...form, dia: e.target.value})}
                                >
                                    {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase">Hora</label>
                                <select 
                                    className="w-full p-2 border rounded"
                                    value={form.hora}
                                    onChange={e => setForm({...form, hora: e.target.value})}
                                >
                                    {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">Docente</label>
                            <input 
                                type="text"
                                className="w-full p-2 border rounded"
                                placeholder="Ej: Prof. Perez"
                                value={form.docente}
                                onChange={e => setForm({...form, docente: e.target.value})}
                                required
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white py-2 rounded font-bold hover:bg-indigo-700 disabled:bg-gray-400"
                        >
                            {loading ? "Guardando..." : "Crear Horario"}
                        </button>
                    </form>
                </div>

                {/* LISTADO DE HORARIOS */}
                <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-md border overflow-hidden">
                    <h3 className="text-lg font-bold mb-4">Horarios Disponibles ({horarios.length})</h3>
                    <div className="overflow-y-auto max-h-[600px]">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-3 py-2 text-left">Materia</th>
                                    <th className="px-3 py-2 text-left">Día/Hora</th>
                                    <th className="px-3 py-2 text-left">Docente</th>
                                    <th className="px-3 py-2 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {horarios.map(h => (
                                    <tr key={h.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 font-medium">{h.materia}</td>
                                        <td className="px-3 py-2">
                                            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-bold">
                                                {h.dia} {h.hora}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">{h.docente}</td>
                                        <td className="px-3 py-2 text-right">
                                            <button 
                                                onClick={() => handleDelete(h.id)}
                                                className="text-red-500 hover:text-red-700 font-bold text-xs"
                                            >
                                                Eliminar
                                            </button>
                                        </td>
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

export default AdminHorarios;