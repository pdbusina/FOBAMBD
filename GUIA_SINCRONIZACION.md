# Guía de Sincronización FOBAMBD

Para trabajar en este proyecto desde dos computadoras diferentes (Casa/Trabajo), sigue este flujo sencillo utilizando Git y Antigravity.

## Flujo Diario

### 1. Al empezar a trabajar
Antes de hacer nada, asegúrate de tener la última versión de los archivos.
- **Opción A (Manual):** Ejecuta `git pull origin main` en la terminal.
- **Opción B (Antigravity):** Usa el workflow de sincronización pidiéndole: "actualiza el proyecto".

### 2. Durante el desarrollo
Trabaja normalmente. Si haces cambios en la estructura de la base de datos o variables de entorno, recuerda que el archivo `.env` **no se sincroniza** por seguridad. Deberás copiarlo manualmente entre PCs si agregas algo nuevo.

### 3. Al terminar la sesión
Sube tus cambios para que estén disponibles en la otra PC.
- `git add .`
- `git commit -m "Descripción de lo que hiciste"`
- `git push origin main`

## Consideraciones Especiales
- **Conflictos:** Si olvidaste hacer `push` en una PC y empezaste a trabajar en la otra, podrías tener conflictos. Git te avisará. Si sucede, pide ayuda a Antigravity para resolverlos.
- **Archivos JSON:** El proyecto ignora todos los archivos `.json` según el `.gitignore` actual. Asegúrate de que esto es lo que deseas, ya que archivos como `package.json` son vitales para el proyecto.
