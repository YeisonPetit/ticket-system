# Ticket System (`ticket-system`)

Sistema ágil y minimalista para gestión de tickets y seguimiento de tareas en equipo. Construido con **SvelteKit 2**, **Svelte 5 (Runes)**, **TypeScript**, **Tailwind CSS v4** y **SQLite (`better-sqlite3`)**.

---

## Características Principales

- 📋 **Doble Vista:** Tablero Kanban interactivo (4 columnas) y Vista de Lista Priorizada por nivel de urgencia.
- ⚡ **Acciones Rápidas:** Avance de estado de tickets con 1 solo clic.
- 🎯 **Priorización Clara:** Urgente, Alta, Media y Baja con badges de alta visibilidad.
- 💬 **Bitácora de Notas:** Hilo de comentarios y notas de avance por ticket.
- 🔍 **Filtros en Tiempo Real:** Búsqueda textual y filtrado por responsable (Julio, Domingo, Yeison), prioridad y categoría.
- 📊 **Métricas Rápidas:** Contadores en tiempo real de tickets totales, activos, urgentes y completados.
- 💾 **Base de Datos Embebida:** SQLite con modo WAL de alto rendimiento (los datos persisten en `data/tickets.db` automáticamente).

---

## Comandos de Desarrollo

```bash
# 1. Instalar dependencias (si no se han instalado)
npm install

# 2. Iniciar servidor de desarrollo local
npm run dev

# 3. Comprobar tipos y sintaxis
npm run check

# 4. Compilar para producción
npm run build

# 5. Previsualizar compilación
npm run preview
```

---

## Cómo Vincular y Subir a GitHub

Para conectar este repositorio local con tu repositorio remoto en GitHub:

```bash
# 1. Crear el repositorio en GitHub (ej. https://github.com/tu-usuario/ticket-system)

# 2. Vincular el origen remoto
git remote add origin https://github.com/tu-usuario/ticket-system.git

# 3. Configurar la rama principal y subir
git branch -M main
git push -u origin main
```

---

## Documentación del Levantamiento

Para consultar la minuta y los acuerdos técnicos y funcionales para el equipo, revisa el archivo [LEVANTAMIENTO.md](file:///Users/yeisonpetit/Documents/ticket-system/LEVANTAMIENTO.md).
