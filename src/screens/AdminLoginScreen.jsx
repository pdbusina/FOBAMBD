import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { IconLoading } from '../components/Icons';

const AdminLoginScreen = ({ navigateTo, showMessage }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            showMessage("Acceso autorizado.", false);
            navigateTo('admin_dashboard');

        } catch (error) {
            console.error("Error en inicio de sesión:", error);
            showMessage(`Error: ${error.message}`, true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-gray-100">
            <main className="w-full max-w-md p-10 bg-white rounded-xl shadow-2xl border border-gray-200">
                <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Acceso Administrativo</h1>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border"
                            placeholder="tu.email@ejemplo.com"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center font-bold py-3 px-4 rounded-lg shadow-lg transition duration-200 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-400"
                    >
                        {loading ? <IconLoading /> : 'Ingresar'}
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

export default AdminLoginScreen;
