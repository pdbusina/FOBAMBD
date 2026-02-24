---
description: Sincronización rápida del proyecto con GitHub
---

Este workflow ayuda a mantener el proyecto actualizado al iniciar o terminar de trabajar.

1. Verificar el estado actual
// turbo
run_command("git status", cwd="d:/Pablo/proyectos/FOBAMBD")

2. Traer cambios remotos
// turbo
run_command("git pull origin main", cwd="d:/Pablo/proyectos/FOBAMBD")

3. Mostrar resumen al usuario
notify_user(message="El proyecto se ha sincronizado con el repositorio remoto. ¡Puedes empezar a trabajar!", blockedOnUser=false, shouldAutoProceed=true)
