import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
	fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'tickets.db');
export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Verify existing schema and migrate if complexity column is missing
const checkTable = db
	.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tickets'")
	.get();

if (checkTable) {
	const columns = (db.prepare("PRAGMA table_info('tickets')").all() as { name: string }[]).map(
		(c) => c.name
	);
	if (!columns.includes('complexity') || !columns.includes('created_by')) {
		// Cleanly drop outdated temporary schema to apply complete structure
		db.exec('DROP TABLE IF EXISTS comments;');
		db.exec('DROP TABLE IF EXISTS tickets;');
	}
}

// Create fresh schema
db.exec(`
	CREATE TABLE IF NOT EXISTS tickets (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		description TEXT NOT NULL DEFAULT '',
		created_by TEXT NOT NULL DEFAULT 'Yeison',
		complexity TEXT NOT NULL DEFAULT 'media' CHECK (complexity IN ('alta', 'media', 'baja')),
		status TEXT NOT NULL DEFAULT 'queue' CHECK (status IN ('queue', 'in_validation', 'completed')),
		priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
		category TEXT NOT NULL DEFAULT 'General',
		assigned_to TEXT NOT NULL DEFAULT 'Sin asignar',
		return_reason TEXT DEFAULT NULL,
		return_count INTEGER NOT NULL DEFAULT 0,
		order_index INTEGER NOT NULL DEFAULT 0,
		created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
		updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
	);

	CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
	CREATE INDEX IF NOT EXISTS idx_tickets_complexity ON tickets(complexity);
	CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);
	CREATE INDEX IF NOT EXISTS idx_tickets_order ON tickets(order_index ASC, id ASC);

	CREATE TABLE IF NOT EXISTS comments (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
		author TEXT NOT NULL,
		content TEXT NOT NULL,
		created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
	);

	CREATE INDEX IF NOT EXISTS idx_comments_ticket ON comments(ticket_id);
`);

// Seed initial representative tickets
const count = (db.prepare('SELECT COUNT(*) as count FROM tickets').get() as { count: number }).count;

if (count === 0) {
	const insert = db.prepare(`
		INSERT INTO tickets (title, description, created_by, complexity, status, priority, category, assigned_to, order_index)
		VALUES (@title, @description, @created_by, @complexity, @status, @priority, @category, @assigned_to, @order_index)
	`);

	const seedTickets = [
		{
			title: 'Revisión y validación de endpoints del sistema',
			description: 'Validar la respuesta de la cola de solicitudes y la devolución por complejidad.',
			created_by: 'Julio',
			complexity: 'alta',
			status: 'in_validation',
			priority: 'urgent',
			category: 'Gestión',
			assigned_to: 'Domingo',
			order_index: 1
		},
		{
			title: 'Ajuste de parámetros en el portal de solicitudes',
			description: 'Incluir campos de descripción detallada y quién registró el ticket.',
			created_by: 'Domingo',
			complexity: 'media',
			status: 'queue',
			priority: 'high',
			category: 'Desarrollo',
			assigned_to: 'Yeison',
			order_index: 2
		},
		{
			title: 'Configurar cola de espera y orden por complejidad',
			description: 'Garantizar que los tickets de alta complejidad tengan visibilidad inmediata en la cola.',
			created_by: 'Yeison',
			complexity: 'alta',
			status: 'queue',
			priority: 'high',
			category: 'Infraestructura',
			assigned_to: 'Julio',
			order_index: 3
		},
		{
			title: 'Documentación de salidas y retornos de tickets',
			description: 'Redactar el manual del proceso para devolver un ticket a la cola si no está completo.',
			created_by: 'Julio',
			complexity: 'baja',
			status: 'completed',
			priority: 'low',
			category: 'Documentación',
			assigned_to: 'Yeison',
			order_index: 4
		}
	];

	const insertMany = db.transaction((tickets) => {
		for (const t of tickets) insert.run(t);
	});

	insertMany(seedTickets);

	db.prepare(`
		INSERT INTO comments (ticket_id, author, content)
		VALUES (1, 'Domingo', 'Iniciando validación técnica del requerimiento.')
	`).run();
}

export interface Ticket {
	id: number;
	title: string;
	description: string;
	created_by: string;
	complexity: 'alta' | 'media' | 'baja';
	status: 'queue' | 'in_validation' | 'completed';
	priority: 'urgent' | 'high' | 'medium' | 'low';
	category: string;
	assigned_to: string;
	return_reason: string | null;
	return_count: number;
	order_index: number;
	created_at: string;
	updated_at: string;
	comments_count?: number;
	queue_position?: number;
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
	created_by?: string;
	complexity?: string;
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

	if (filters?.created_by && filters.created_by !== 'all') {
		query += ' AND t.created_by = @created_by';
		params.created_by = filters.created_by;
	}

	if (filters?.complexity && filters.complexity !== 'all') {
		query += ' AND t.complexity = @complexity';
		params.complexity = filters.complexity;
	}

	if (filters?.search && filters.search.trim() !== '') {
		query += ' AND (t.title LIKE @search OR t.description LIKE @search OR t.created_by LIKE @search)';
		params.search = `%${filters.search.trim()}%`;
	}

	query += `
		GROUP BY t.id
		ORDER BY 
			CASE t.status
				WHEN 'queue' THEN 1
				WHEN 'in_validation' THEN 2
				WHEN 'completed' THEN 3
			END ASC,
			CASE t.complexity 
				WHEN 'alta' THEN 1 
				WHEN 'media' THEN 2 
				WHEN 'baja' THEN 3 
			END ASC,
			t.order_index ASC,
			t.id ASC
	`;

	const list = db.prepare(query).all(params) as Ticket[];

	// Assign queue positions dynamically for items in queue
	let queueCounter = 1;
	for (const ticket of list) {
		if (ticket.status === 'queue') {
			ticket.queue_position = queueCounter++;
		}
	}

	return list;
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
	created_by?: string;
	complexity?: 'alta' | 'media' | 'baja';
	assigned_to?: string;
	category?: string;
	status?: 'queue' | 'in_validation' | 'completed';
}) {
	const maxOrder = db.prepare('SELECT MAX(order_index) as max FROM tickets WHERE status = ?').get(
		ticket.status || 'queue'
	) as { max: number | null };
	const nextOrder = (maxOrder?.max ?? 0) + 1;

	const stmt = db.prepare(`
		INSERT INTO tickets (title, description, created_by, complexity, status, category, assigned_to, order_index)
		VALUES (@title, @description, @created_by, @complexity, @status, @category, @assigned_to, @order_index)
	`);

	const info = stmt.run({
		title: ticket.title.trim(),
		description: (ticket.description || '').trim(),
		created_by: (ticket.created_by || 'Yeison').trim(),
		complexity: ticket.complexity || 'media',
		status: ticket.status || 'queue',
		category: ticket.category || 'General',
		assigned_to: ticket.assigned_to || 'Sin asignar',
		order_index: nextOrder
	});

	return Number(info.lastInsertRowid);
}

export function updateTicket(
	id: number,
	fields: Partial<
		Omit<Ticket, 'id' | 'created_at' | 'comments_count' | 'queue_position'>
	>
) {
	const allowedKeys = [
		'title',
		'description',
		'created_by',
		'complexity',
		'status',
		'priority',
		'category',
		'assigned_to',
		'return_reason',
		'return_count',
		'order_index'
	];
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

export function completeTicket(id: number, resolvedBy: string, closingNote?: string) {
	updateTicket(id, {
		status: 'completed',
		assigned_to: resolvedBy
	});

	if (closingNote && closingNote.trim()) {
		addComment(id, resolvedBy, `✅ SALIDA DEL TICKET: ${closingNote.trim()}`);
	}
}

export function returnTicketToQueue(
	id: number,
	returnedBy: string,
	reason: string,
	adjustedComplexity?: 'alta' | 'media' | 'baja'
) {
	const current = db.prepare('SELECT return_count, complexity FROM tickets WHERE id = ?').get(id) as
		| { return_count: number; complexity: 'alta' | 'media' | 'baja' }
		| undefined;

	const newReturnCount = (current?.return_count ?? 0) + 1;
	const finalComplexity = adjustedComplexity || current?.complexity || 'media';

	const maxOrder = db.prepare('SELECT MAX(order_index) as max FROM tickets WHERE status = ?').get(
		'queue'
	) as { max: number | null };
	const nextOrder = (maxOrder?.max ?? 0) + 1;

	updateTicket(id, {
		status: 'queue',
		return_reason: reason.trim(),
		return_count: newReturnCount,
		complexity: finalComplexity,
		order_index: nextOrder
	});

	addComment(
		id,
		returnedBy,
		`↩️ RETORNADO A LA COLA (Intento #${newReturnCount}): ${reason.trim()} [Complejidad: ${finalComplexity.toUpperCase()}]`
	);
}

export function takeTicketForValidation(id: number, validatorName: string) {
	updateTicket(id, {
		status: 'in_validation',
		assigned_to: validatorName
	});

	addComment(id, validatorName, `🔍 Tomado de la cola para validación.`);
}

export function deleteTicket(id: number) {
	db.prepare('DELETE FROM tickets WHERE id = ?').run(id);
}

export function addComment(ticketId: number, author: string, content: string) {
	db.prepare(`
		INSERT INTO comments (ticket_id, author, content)
		VALUES (?, ?, ?)
	`).run(ticketId, author.trim(), content.trim());

	db.prepare("UPDATE tickets SET updated_at = datetime('now', 'localtime') WHERE id = ?").run(
		ticketId
	);
}

export function getStats() {
	const total = (db.prepare('SELECT COUNT(*) as count FROM tickets').get() as { count: number }).count;
	const queue = (
		db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'queue'").get() as {
			count: number;
		}
	).count;
	const inValidation = (
		db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'in_validation'").get() as {
			count: number;
		}
	).count;
	const completed = (
		db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'completed'").get() as {
			count: number;
		}
	).count;
	const highComplexity = (
		db.prepare(
			"SELECT COUNT(*) as count FROM tickets WHERE complexity = 'alta' AND status = 'queue'"
		).get() as { count: number }
	).count;
	const returnedTotal = (
		db.prepare('SELECT COUNT(*) as count FROM tickets WHERE return_count > 0').get() as {
			count: number;
		}
	).count;

	return {
		total,
		queue,
		inValidation,
		completed,
		highComplexity,
		returnedTotal
	};
}
