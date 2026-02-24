import React from 'react';
import { IconUser, IconAdmin } from '../components/Icons';
import { AccessButton } from '../components/UI/SharedUI';


const LandingScreen = ({ navigateTo }) => (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-slate-100">
        <header className="text-center mb-12">
            <img src="/logo.png" alt="Logo Escuela" className="w-24 h-auto mx-auto mb-4" />
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

export default LandingScreen;
