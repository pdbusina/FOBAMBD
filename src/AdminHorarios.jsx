import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const HORARIOS = [
    "08:00", "08:45", "09:30", "10:15", "11:00", "11:45", "12:30",
    "13:30", "14:15", "15:00", "15:45", "16:30", "17:15", "18:00",
    "18:45", "19:30", "20:15", "21:00", "21:40", "22:20", "23:00"
];

const AdminHorarios = ({ showMessage, materias }) => {
    const [horarios, setHorarios] = useState([]);
    const [loading, setLoading] = useState(false);

    // Formulario
    const [form, setForm] = useState({
        materia_id: '',
        dia: 'Lunes',
        hora: '18:00',
        docente: '',
        cupo: '10',
        aula: ''
    });

    useEffect(() => {
        loadHorarios();

        // Suscripción en tiempo real
        const channel = supabase
            .channel('horarios-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'horarios' }, () => {
                loadHorarios();
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    const loadHorarios = async () => {
        const { data, error } = await supabase
            .from('horarios')
            .select(`
                *,
                materias (
                    nombre,
                    plan
                )
            `)
            .order('creado_en', { ascending: false });

        if (error) {
            console.error("Error cargando horarios:", error);
        } else {
            setHorarios(data);
        }
    };

    // Agrupar materias por nombre para el select (compatibilidad con cómo se venía usando)
    // Pero ahora necesitamos el ID de la materia
    const sortedMaterias = [...materias].sort((a, b) => a.nombre.localeCompare(b.nombre));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.materia_id || !form.docente || !form.cupo) return showMessage("Complete los campos obligatorios", true);

        setLoading(true);
        try {
            const { error } = await supabase
                .from('horarios')
                .insert([{
                    materia_id: form.materia_id,
                    dia: form.dia,
                    hora: form.hora,
                    docente: form.docente,
                    cupo: parseInt(form.cupo),
                    aula: form.aula
                }]);

            if (error) throw error;

            showMessage("Horario creado exitosamente", false);
            setForm({ ...form, docente: '', aula: '', cupo: '10' });
        } catch (error) {
            console.error(error);
            showMessage(`Error: ${error.message}`, true);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Eliminar este horario?")) return;
        try {
            const { error } = await supabase
                .from('horarios')
                .delete()
                .eq('id', id);

            if (error) throw error;
            showMessage("Horario eliminado", false);
        } catch (error) {
            showMessage(`Error: ${error.message}`, true);
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Administrar Oferta de Horarios</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* FORMULARIO */}
                <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-md border h-fit">
                    <h3 className="text-lg font-bold mb-4">Nuevo Horario</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">Materia</label>
                            <select
                                className="w-full p-2 border rounded"
                                value={form.materia_id}
                                onChange={e => setForm({ ...form, materia_id: e.target.value })}
                                required
                            >
                                <option value="">Seleccione Materia...</option>
                                {sortedMaterias.map(m => (
                                    <option key={m.id} value={m.id}>{m.nombre} ({m.plan})</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase">Día</label>
                                <select
                                    className="w-full p-2 border rounded"
                                    value={form.dia}
                                    onChange={e => setForm({ ...form, dia: e.target.value })}
                                >
                                    {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase">Hora</label>
                                <select
                                    className="w-full p-2 border rounded"
                                    value={form.hora}
                                    onChange={e => setForm({ ...form, hora: e.target.value })}
                                >
                                    {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase">Cupo</label>
                                <input
                                    type="number"
                                    className="w-full p-2 border rounded"
                                    value={form.cupo}
                                    onChange={e => setForm({ ...form, cupo: e.target.value })}
                                    min="1"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase">Aula</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border rounded"
                                    placeholder="Ej: 14"
                                    value={form.aula}
                                    onChange={e => setForm({ ...form, aula: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">Docente</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded"
                                placeholder="Ej: Perez"
                                value={form.docente}
                                onChange={e => setForm({ ...form, docente: e.target.value })}
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

                {/* LISTADO */}
                <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-md border overflow-hidden">
                    <h3 className="text-lg font-bold mb-4">Horarios Disponibles ({horarios.length})</h3>
                    <div className="overflow-y-auto max-h-[600px]">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-3 py-2 text-left">Materia</th>
                                    <th className="px-3 py-2 text-left">Detalle</th>
                                    <th className="px-3 py-2 text-center">Cupo</th>
                                    <th className="px-3 py-2 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {horarios.map(h => (
                                    <tr key={h.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 font-medium">
                                            {h.materias?.nombre} <br />
                                            <span className="text-xs text-gray-400">{h.materias?.plan}</span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-700">{h.dia} {h.hora}</span>
                                                <span className="text-xs text-gray-500">
                                                    Prof: {h.docente} {h.aula ? `| Aula: ${h.aula}` : ''}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">
                                                {h.cupo}
                                            </span>
                                        </td>
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
