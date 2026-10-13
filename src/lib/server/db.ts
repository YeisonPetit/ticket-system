import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
	fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'tickets.db');
export const db = new Database(DB_PATH);

// Enable WAL mode for high performance and concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
	CREATE TABLE IF NOT EXISTS tickets (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		description TEXT NOT NULL DEFAULT '',
		status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
		priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
		category TEXT NOT NULL DEFAULT 'General',
		assigned_to TEXT NOT NULL DEFAULT 'Sin asignar',
		order_index INTEGER NOT NULL DEFAULT 0,
		created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
		updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
	);

	CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
	CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assigned_to);
	CREATE INDEX IF NOT EXISTS idx_tickets_order ON tickets(order_index ASC, id DESC);

	CREATE TABLE IF NOT EXISTS comments (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
		author TEXT NOT NULL,
		content TEXT NOT NULL,
		created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
	);

	CREATE INDEX IF NOT EXISTS idx_comments_ticket ON comments(ticket_id);
`);

// Seed default tasks if empty
const countStmt = db.prepare('SELECT COUNT(*) as count FROM tickets');
const { count } = countStmt.get() as { count: number };

if (count === 0) {
	const insert = db.prepare(`
		INSERT INTO tickets (title, description, status, priority, category, assigned_to, order_index)
		VALUES (@title, @description, @status, @priority, @category, @assigned_to, @order_index)
	`);

	const seedTickets = [
		{
			title: 'Revisión de requerimientos del sistema de tickets',
			description: 'Validar con Julio y Domingo el flujo inicial de estados y priorización.',
			status: 'in_progress',
			priority: 'urgent',
			category: 'Gestión',
			assigned_to: 'Julio',
			order_index: 1
		},
		{
			title: 'Definir asignación de roles y permisos de acceso',
			description: 'Acordar si los colaboradores externos podrán crear tickets o solo el equipo interno.',
			status: 'todo',
			priority: 'high',
			category: 'Seguridad',
			assigned_to: 'Domingo',
			order_index: 2
		},
		{
			title: 'Configurar repositorio en GitHub y despliegue inicial',
			description: 'Subir el proyecto ticket-system al GitHub de la organización y probar ejecución.',
			status: 'todo',
			priority: 'medium',
			category: 'Infraestructura',
			assigned_to: 'Yeison',
			order_index: 3
		},
		{
			title: 'Crear plantilla de correo o alertas automáticas',
			description: 'Evaluar integración básica para notificar cuando un ticket pasa a estado resuelto.',
			status: 'todo',
			priority: 'low',
			category: 'Notificaciones',
			assigned_to: 'Sin asignar',
			order_index: 4
		}
	];

	const insertMany = db.transaction((tickets) => {
		for (const t of tickets) insert.run(t);
	});

	insertMany(seedTickets);

	// Add an initial comment
	db.prepare(`
		INSERT INTO comments (ticket_id, author, content)
		VALUES (1, 'Yeison', 'Levantamiento inicial completado. Estructura base en SvelteKit y SQLite configurada.')
	`).run();
}

export interface Ticket {
	id: number;
	title: string;
	description: string;
	status: 'todo' | 'in_progress' | 'review' | 'done';
	priority: 'urgent' | 'high' | 'medium' | 'low';
	category: string;
	assigned_to: string;
	order_index: number;
	created_at: string;
	updated_at: string;
	comments_count?: number;
}

export interface Comment {
	id: number;
	ticket_id: number;
	author: string;
	content: string;
	created_at: string;
}

export function getAllTickets(filters?: {
	status?: string;
	assigned_to?: string;
	priority?: string;
	category?: string;
	search?: string;
}): Ticket[] {
	let query = `
		SELECT t.*, COUNT(c.id) AS comments_count
		FROM tickets t
		LEFT JOIN comments c ON t.id = c.ticket_id
		WHERE 1=1
	`;
	const params: Record<string, unknown> = {};

	if (filters?.status && filters.status !== 'all') {
		query += ' AND t.status = @status';
		params.status = filters.status;
	}

	if (filters?.assigned_to && filters.assigned_to !== 'all') {
		query += ' AND t.assigned_to = @assigned_to';
		params.assigned_to = filters.assigned_to;
	}

	if (filters?.priority && filters.priority !== 'all') {
		query += ' AND t.priority = @priority';
		params.priority = filters.priority;
	}

	if (filters?.category && filters.category !== 'all') {
		query += ' AND t.category = @category';
		params.category = filters.category;
	}

	if (filters?.search && filters.search.trim() !== '') {
		query += ' AND (t.title LIKE @search OR t.description LIKE @search)';
		params.search = `%${filters.search.trim()}%`;
	}

	query += `
		GROUP BY t.id
		ORDER BY 
			CASE t.priority 
				WHEN 'urgent' THEN 1 
				WHEN 'high' THEN 2 
				WHEN 'medium' THEN 3 
				WHEN 'low' THEN 4 
			END ASC,
			t.order_index ASC,
			t.id DESC
	`;

	return db.prepare(query).all(params) as Ticket[];
}

export function getTicketWithComments(id: number): { ticket: Ticket | null; comments: Comment[] } {
	const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id) as Ticket | undefined;
	if (!ticket) {
		return { ticket: null, comments: [] };
	}
	const comments = db
		.prepare('SELECT * FROM comments WHERE ticket_id = ? ORDER BY id ASC')
		.all(id) as Comment[];

	return { ticket, comments };
}

export function createTicket(ticket: {
	title: string;
	description?: string;
	status?: string;
	priority?: string;
	category?: string;
	assigned_to?: string;
}) {
	// Calculate next order index
	const maxOrder = db.prepare('SELECT MAX(order_index) as max FROM tickets').get() as {
		max: number | null;
	};
	const nextOrder = (maxOrder?.max ?? 0) + 1;

	const stmt = db.prepare(`
		INSERT INTO tickets (title, description, status, priority, category, assigned_to, order_index)
		VALUES (@title, @description, @status, @priority, @category, @assigned_to, @order_index)
	`);

	const info = stmt.run({
		title: ticket.title.trim(),
		description: (ticket.description || '').trim(),
		status: ticket.status || 'todo',
		priority: ticket.priority || 'medium',
		category: ticket.category || 'General',
		assigned_to: ticket.assigned_to || 'Sin asignar',
		order_index: nextOrder
	});

	return Number(info.lastInsertRowid);
}

export function updateTicket(
	id: number,
	fields: Partial<Omit<Ticket, 'id' | 'created_at' | 'comments_count'>>
) {
	const allowedKeys = ['title', 'description', 'status', 'priority', 'category', 'assigned_to', 'order_index'];
	const sets: string[] = ["updated_at = datetime('now', 'localtime')"];
	const params: Record<string, unknown> = { id };

	for (const [key, val] of Object.entries(fields)) {
		if (allowedKeys.includes(key) && val !== undefined) {
			sets.push(`${key} = @${key}`);
			params[key] = val;
		}
	}

	if (sets.length === 1) return;

	const sql = `UPDATE tickets SET ${sets.join(', ')} WHERE id = @id`;
	db.prepare(sql).run(params);
}

export function deleteTicket(id: number) {
	db.prepare('DELETE FROM tickets WHERE id = ?').run(id);
}

export function addComment(ticketId: number, author: string, content: string) {
	db.prepare(`
		INSERT INTO comments (ticket_id, author, content)
		VALUES (?, ?, ?)
	`).run(ticketId, author.trim(), content.trim());

	// Update ticket updated_at
	db.prepare("UPDATE tickets SET updated_at = datetime('now', 'localtime') WHERE id = ?").run(
		ticketId
	);
}

export function getStats() {
	const total = (db.prepare('SELECT COUNT(*) as count FROM tickets').get() as { count: number }).count;
	const todo = (
		db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'todo'").get() as {
			count: number;
		}
	).count;
	const inProgress = (
		db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'in_progress'").get() as {
			count: number;
		}
	).count;
	const review = (
		db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'review'").get() as {
			count: number;
		}
	).count;
	const done = (
		db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'done'").get() as {
			count: number;
		}
	).count;
	const urgent = (
		db.prepare("SELECT COUNT(*) as count FROM tickets WHERE priority = 'urgent' AND status != 'done'").get() as {
			count: number;
		}
	).count;

	return { total, todo, inProgress, review, done, urgent };
}
