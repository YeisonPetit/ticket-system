# Documento de Levantamiento: Mini Sistema de Tickets (`ticket-system`)

- **Proyecto:** Ticket System (MVP Ágil de Gestión de Tareas)
- **Equipo de trabajo:** Yeison Petit, Julio, Domingo
- **Ubicación local:** `/Users/yeisonpetit/Documents/ticket-system`
- **Repositorio objetivo:** GitHub (organización/personal)
- **Fecha de versión:** Octubre 2026

---

## 1. Justificación y Objetivos

El objetivo de este sistema es disponer de una plataforma ágil, ligera e independiente para:
1. Registrar rápidamente incidencias, tareas operativas y solicitudes técnicas.
2. Mantener un orden estricto de prioridades (Urgente, Alta, Media, Baja) para que el equipo siempre sepa qué atender primero.
3. Facilitar la colaboración y seguimiento entre los miembros del equipo (Julio, Domingo, Yeison) sin la burocracia de suites pesadas.
4. Llevar una bitácora de avances mediante notas y comentarios en cada tarea.

---

## 2. Alcance Funcional (Fase 1 - MVP Actual)

### 2.1 Flujo de Estados del Ticket
El ciclo de vida del ticket cuenta con 4 estados secuenciales claros:
- **Por Hacer (`todo`):** Requerimiento nuevo registrado en la cola de trabajo.
- **En Proceso (`in_progress`):** Responsable activamente trabajando en la solución.
- **En Revisión (`review`):** Tarea en validación, feedback o pruebas por parte de Julio/Domingo.
- **Completado (`done`):** Tarea resuelta y finalizada.

### 2.2 Atributos del Ticket
Cada ticket almacena la siguiente información:
- **ID único:** Identificador numérico correlativo (`#1`, `#2`, ...).
- **Título:** Resumen conciso de la tarea/incidencia.
- **Descripción:** Detalle técnico o funcional de lo solicitado.
- **Prioridad:**
  - 🔴 **Urgente:** Bloqueante, atención inmediata.
  - 🟠 **Alta:** Impacto importante.
  - 🟡 **Media:** Flujo estándar de trabajo.
  - 🟢 **Baja:** Mejoras o tareas secundarias.
- **Responsable Asignado:** Asignación nominal (Julio, Domingo, Yeison o Sin asignar).
- **Categoría:** Segmentación por área (*Gestión*, *Seguridad*, *Infraestructura*, *Notificaciones*, *Bug*, *Soporte*, *General*).
- **Fechas:** Timestamp de creación y última actualización automática.
- **Bitácora de Notas / Comentarios:** Registro cronológico de observaciones con autor y fecha.

### 2.3 Modos de Visualización
- **Tablero Kanban:** 4 columnas con avance/retroceso rápido de estado en 1 clic.
- **Lista Ordenada:** Tabla compacta ordenada estrictamente por nivel de urgencia y fecha de creación, con cambio de estado directo.

### 2.4 Búsqueda y Filtros
- Búsqueda reactiva en tiempo real por palabra clave (título o descripción).
- Filtros cruzados por Asignado, Prioridad y Categoría.
- Contador de métricas en tiempo real en la cabecera (Total, En Proceso, Urgentes, Completados).

---

## 3. Puntos a Validar con Julio y Domingo (Agenda de Sesión)

Para la siguiente iteración, se sugiere validar los siguientes puntos:
1. **Canales de Notificación:** ¿Desean recibir notificaciones cuando se les asigne un ticket o cambie a revisión? (ej. webhook de Slack, Teams, correo electrónico).
2. **Adjuntos:** ¿Es indispensable subir capturas de pantalla o PDFs en esta fase?
3. **Autenticación:** ¿Desean mantener selector libre de colaboradores o prefieren inicio de sesión con usuario y contraseña / Google Workspace?
4. **Despliegue:** ¿El sistema se ejecutará en un servidor local interno (Docker / VPS) o en la nube (Vercel, Railway, Node.js)?

---

## 4. Stack Tecnológico Implementado

- **Framework:** SvelteKit 2 con Svelte 5 (Runes) & TypeScript.
- **Estilos:** Tailwind CSS v4 (diseño responsivo, limpio y accesible).
- **Base de Datos:** SQLite nativo de alto rendimiento (`better-sqlite3`) en modo WAL (cero latencia, sin necesidad de configurar servicios de bases de datos pesados).
- **Control de Versiones:** Git inicializado localmente, listo para vincular con GitHub.
