# FOBAM - Gestión Escolar (Supabase)

Sistema de gestión escolar para el conservatorio FOBAM, migrado de Firebase a Supabase para mayor escalabilidad y facilidad de gestión.

## 🚀 Características

- **Acceso Estudiantes**: Consulta de analíticos y generación de certificados de alumno regular mediante DNI.
- **Panel Administrativo**: Gestión completa de estudiantes, matriculaciones, notas, instrumentos y materias.
- **Carga Masiva**: Herramienta para importar datos desde JSON (convertidos de CSV).
- **Reportes Académicos**: Generación y visualización de analíticos detallados por plan de estudio.
- **Certificados**: Generación automática de certificados en formato A5 listos para imprimir.

## 🛠️ Tecnologías

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Supabase (Database, Auth, Real-time)
- **Icons**: Lucide React (simular) y adaptaciones personalizadas.

## ⚙️ Configuración del Entorno

Para ejecutar este proyecto, necesitas configurar las siguientes variables de entorno en un archivo `.env`:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

## 📦 Instalación y Desarrollo

1. Clona el repositorio.
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
4. Para generar el build de producción:
   ```bash
   npm run build
   ```

## 🏗️ Estructura del Proyecto

- `src/App.jsx`: Punto de entrada y enrutador principal.
- `src/components/Icons.jsx`: Biblioteca de iconos SVG centralizada.
- `src/components/UI/SharedUI.jsx`: Componentes de interfaz compartidos (Botones, Mensajes).
- `src/screens/`: Directorio de pantallas modularizadas:
    - `LandingScreen.jsx`
    - `AdminLoginScreen.jsx`
    - `StudentAccessScreen.jsx`
    - `AnaliticoComponents.jsx`
    - `AdminDashboard.jsx`: Panel de administración central.
- `src/supabaseClient.js`: Configuración del cliente de Supabase.

## 📄 Notas de Migración

Este proyecto fue migrado desde Firebase. Se eliminaron todas las dependencias de `firebase` y `firebase-admin`. La lógica de datos ahora utiliza SQL a través de la API de Supabase.

---
© 2026 FOBAM - Gestión Escolar
