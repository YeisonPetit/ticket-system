import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? '/tmp/pulse-data' : path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
	fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'tickets.db');
export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 1. Check if older table exists and lacks the turnero schema (e.g. turn_code or served_by_name)
const tableExists = db
	.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tickets'")
	.get();

if (tableExists) {
	const cols = (db.prepare("PRAGMA table_info('tickets')").all() as { name: string }[]).map(
		(c) => c.name
	);
	if (!cols.includes('turn_code') || !cols.includes('served_by_name')) {
		db.exec(`
			DROP TABLE IF EXISTS comments;
			DROP TABLE IF EXISTS tickets;
			DROP TABLE IF EXISTS users;
		`);
	}
}

// 2. Create tables
db.exec(`
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		username TEXT NOT NULL UNIQUE,
		role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('agent', 'supervisor', 'kiosk')),
		desk_name TEXT NOT NULL,
		avatar_color TEXT NOT NULL DEFAULT 'bg-indigo-600',
		status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'busy', 'break', 'offline')),
		created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
	);

	CREATE TABLE IF NOT EXISTS tickets (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		turn_code TEXT NOT NULL UNIQUE,
		title TEXT NOT NULL,
		description TEXT NOT NULL DEFAULT '',
		created_by TEXT NOT NULL DEFAULT 'Usuario',
		complexity TEXT NOT NULL DEFAULT 'media' CHECK (complexity IN ('alta', 'media', 'baja')),
		status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'serving', 'returned', 'completed')),
		served_by_id INTEGER REFERENCES users(id),
		served_by_name TEXT,
		served_desk TEXT,
		served_at TEXT,
		last_called_at TEXT,
		completed_at TEXT,
		return_reason TEXT,
		return_count INTEGER NOT NULL DEFAULT 0,
		order_index INTEGER NOT NULL DEFAULT 0,
		created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
		updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
	);

	CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
	CREATE INDEX IF NOT EXISTS idx_tickets_complexity ON tickets(complexity);
	CREATE INDEX IF NOT EXISTS idx_tickets_served_by ON tickets(served_by_id);
	CREATE INDEX IF NOT EXISTS idx_tickets_order ON tickets(order_index ASC, id ASC);

	CREATE TABLE IF NOT EXISTS comments (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
		author TEXT NOT NULL,
		content TEXT NOT NULL,
		created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
	);
`);

// 3. Seed Users if empty
const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
if (userCount === 0) {
	const insertUser = db.prepare(`
		INSERT INTO users (id, name, username, role, desk_name, avatar_color, status)
		VALUES (@id, @name, @username, @role, @desk_name, @avatar_color, @status)
	`);

	insertUser.run({
		id: 1,
		name: 'Julio',
		username: 'julio',
		role: 'agent',
		desk_name: 'Ventanilla 1 — Julio',
		avatar_color: 'bg-violet-600',
		status: 'busy'
	});

	insertUser.run({
		id: 2,
		name: 'Domingo',
		username: 'domingo',
		role: 'agent',
		desk_name: 'Ventanilla 2 — Domingo',
		avatar_color: 'bg-emerald-600',
		status: 'busy'
	});

	insertUser.run({
		id: 3,
		name: 'Yeison',
		username: 'yeison',
		role: 'supervisor',
		desk_name: 'Supervisión / Despacho',
		avatar_color: 'bg-indigo-600',
		status: 'available'
	});
}

// 4. Seed Initial Tickets / Turns if empty
const ticketCount = (db.prepare('SELECT COUNT(*) as count FROM tickets').get() as { count: number }).count;
if (ticketCount === 0) {
	const insertTicket = db.prepare(`
		INSERT INTO tickets (turn_code, title, description, created_by, complexity, status, served_by_id, served_by_name, served_desk, served_at, last_called_at, order_index)
		VALUES (@turn_code, @title, @description, @created_by, @complexity, @status, @served_by_id, @served_by_name, @served_desk, @served_at, @last_called_at, @order_index)
	`);

	// Julio is currently serving Turn T-01
	insertTicket.run({
		turn_code: 'T-01',
		title: 'Validación de accesos al servidor de producción',
		description: 'Solicitud urgente para desbloquear permisos de conexión en clúster.',
		created_by: 'Carlos Méndez',
		complexity: 'alta',
		status: 'serving',
		served_by_id: 1,
		served_by_name: 'Julio',
		served_desk: 'Ventanilla 1 — Julio',
		served_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
		last_called_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
		order_index: 1
	});

	// Domingo is currently serving Turn T-02
	insertTicket.run({
		turn_code: 'T-02',
		title: 'Configuración y entrega de equipo corporativo',
		description: 'Entrega de laptop y configuración de certificados de red para nuevo empleado.',
		created_by: 'María Gómez',
		complexity: 'media',
		status: 'serving',
		served_by_id: 2,
		served_by_name: 'Domingo',
		served_desk: 'Ventanilla 2 — Domingo',
		served_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
		last_called_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
		order_index: 2
	});

	// Waiting in queue (Turn #3, Turn #4, Turn #5)
	insertTicket.run({
		turn_code: 'T-03',
		title: 'Revisión de caída de servicio en API de pagos',
		description: 'Errores 504 intermitentes en la pasarela durante la mañana.',
		created_by: 'Pedro Pascal',
		complexity: 'alta',
		status: 'waiting',
		served_by_id: null,
		served_by_name: null,
		served_desk: null,
		served_at: null,
		last_called_at: null,
		order_index: 3
	});

	insertTicket.run({
		turn_code: 'T-04',
		title: 'Actualización de credenciales de VPN',
		description: 'Vencimiento de token de seguridad y reseteo de contraseña.',
		created_by: 'Lucía Fernández',
		complexity: 'media',
		status: 'waiting',
		served_by_id: null,
		served_by_name: null,
		served_desk: null,
		served_at: null,
		last_called_at: null,
		order_index: 4
	});

	insertTicket.run({
		turn_code: 'T-05',
		title: 'Consulta sobre políticas de respaldo de correos',
		description: 'Solicitud de espacio adicional en buzón institucional.',
		created_by: 'Andrés Soto',
		complexity: 'baja',
		status: 'waiting',
		served_by_id: null,
		served_by_name: null,
		served_desk: null,
		served_at: null,
		last_called_at: null,
		order_index: 5
	});

	// Comments
	db.prepare(`
		INSERT INTO comments (ticket_id, author, content)
		VALUES (1, 'Julio', 'Iniciando verificación de permisos en consola.')
	`).run();
}

export interface User {
	id: number;
	name: string;
	username: string;
	role: 'agent' | 'supervisor' | 'kiosk';
	desk_name: string;
	avatar_color: string;
	status: 'available' | 'busy' | 'break' | 'offline';
	created_at: string;
	current_ticket?: Ticket | null;
}

export interface Ticket {
	id: number;
	turn_code: string;
	title: string;
	description: string;
	created_by: string;
	complexity: 'alta' | 'media' | 'baja';
	status: 'waiting' | 'serving' | 'returned' | 'completed';
	served_by_id: number | null;
	served_by_name: string | null;
	served_desk: string | null;
	served_at: string | null;
	last_called_at: string | null;
	completed_at: string | null;
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

export function getAllUsers(): User[] {
	const users = db.prepare('SELECT * FROM users ORDER BY id ASC').all() as User[];
	for (const user of users) {
		const current = db
			.prepare("SELECT * FROM tickets WHERE served_by_id = ? AND status = 'serving' LIMIT 1")
			.get(user.id) as Ticket | undefined;
		user.current_ticket = current || null;
		user.status = current ? 'busy' : 'available';
	}
	return users;
}

export function getUserById(id: number): User | null {
	const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
	if (!user) return null;

	const current = db
		.prepare("SELECT * FROM tickets WHERE served_by_id = ? AND status = 'serving' LIMIT 1")
		.get(user.id) as Ticket | undefined;
	user.current_ticket = current || null;
	user.status = current ? 'busy' : 'available';
	return user;
}

export function getAgentsOverview(): {
	agents: (User & { current_ticket: Ticket | null })[];
	lastCalled: Ticket | null;
} {
	const agents = getAllUsers().filter((u) => u.role === 'agent' || u.role === 'supervisor');
	const lastCalled = db
		.prepare(
			"SELECT * FROM tickets WHERE status = 'serving' AND last_called_at IS NOT NULL ORDER BY last_called_at DESC LIMIT 1"
		)
		.get() as Ticket | undefined;

	return {
		agents: agents as (User & { current_ticket: Ticket | null })[],
		lastCalled: lastCalled || null
	};
}

export function getAllTickets(filters?: {
	status?: string;
	served_by?: string;
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

	if (filters?.served_by && filters.served_by !== 'all') {
		query += ' AND t.served_by_name = @served_by';
		params.served_by = filters.served_by;
	}

	if (filters?.complexity && filters.complexity !== 'all') {
		query += ' AND t.complexity = @complexity';
		params.complexity = filters.complexity;
	}

	if (filters?.search && filters.search.trim() !== '') {
		query +=
			' AND (t.title LIKE @search OR t.description LIKE @search OR t.turn_code LIKE @search OR t.created_by LIKE @search)';
		params.search = `%${filters.search.trim()}%`;
	}

	query += `
		GROUP BY t.id
		ORDER BY 
			CASE t.status
				WHEN 'serving' THEN 1
				WHEN 'waiting' THEN 2
				WHEN 'returned' THEN 3
				WHEN 'completed' THEN 4
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

	let queueCounter = 1;
	for (const ticket of list) {
		if (ticket.status === 'waiting' || ticket.status === 'returned') {
			ticket.queue_position = queueCounter++;
		}
	}

	return list;
}

export function getTicketWithComments(id: number): { ticket: Ticket | null; comments: Comment[] } {
	const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id) as Ticket | undefined;
	if (!ticket) return { ticket: null, comments: [] };

	const comments = db
		.prepare('SELECT * FROM comments WHERE ticket_id = ? ORDER BY id ASC')
		.all(id) as Comment[];

	return { ticket, comments };
}

export function createTicket(data: {
	title: string;
	description?: string;
	created_by: string;
	complexity?: 'alta' | 'media' | 'baja';
}) {
	const lastTicket = db.prepare('SELECT id FROM tickets ORDER BY id DESC LIMIT 1').get() as {
		id: number;
	} | undefined;
	const nextNum = (lastTicket?.id ?? 0) + 1;
	const turn_code = `T-${nextNum < 10 ? '0' + nextNum : nextNum}`;

	const maxOrder = db.prepare("SELECT MAX(order_index) as max FROM tickets WHERE status = 'waiting'").get() as {
		max: number | null;
	};
	const nextOrder = (maxOrder?.max ?? 0) + 1;

	const stmt = db.prepare(`
		INSERT INTO tickets (turn_code, title, description, created_by, complexity, status, order_index)
		VALUES (@turn_code, @title, @description, @created_by, @complexity, 'waiting', @order_index)
	`);

	const info = stmt.run({
		turn_code,
		title: data.title.trim(),
		description: (data.description || '').trim(),
		created_by: data.created_by.trim(),
		complexity: data.complexity || 'media',
		order_index: nextOrder
	});

	return { id: Number(info.lastInsertRowid), turn_code };
}

export function callNextTurnForAgent(agentId: number) {
	const agent = getUserById(agentId);
	if (!agent) throw new Error('Agente no encontrado');

	const nextTicket = db
		.prepare(
			`
		SELECT * FROM tickets 
		WHERE status IN ('waiting', 'returned')
		ORDER BY 
			CASE complexity 
				WHEN 'alta' THEN 1 
				WHEN 'media' THEN 2 
				WHEN 'baja' THEN 3 
			END ASC,
			order_index ASC,
			id ASC
		LIMIT 1
	`
		)
		.get() as Ticket | undefined;

	if (!nextTicket) return null;

	const now = new Date().toISOString();

	db.transaction(() => {
		db.prepare(
			`
			UPDATE tickets 
			SET status = 'serving',
				served_by_id = @agentId,
				served_by_name = @agentName,
				served_desk = @deskName,
				served_at = @now,
				last_called_at = @now,
				updated_at = @now
			WHERE id = @ticketId
		`
		).run({
			agentId: agent.id,
			agentName: agent.name,
			deskName: agent.desk_name,
			now,
			ticketId: nextTicket.id
		});

		db.prepare("UPDATE users SET status = 'busy' WHERE id = ?").run(agent.id);

		db.prepare(`
			INSERT INTO comments (ticket_id, author, content)
			VALUES (?, ?, ?)
		`).run(nextTicket.id, agent.name, `📢 Turno llamado a ${agent.desk_name}`);
	})();

	return getTicketWithComments(nextTicket.id).ticket;
}

export function recallCurrentTurn(ticketId: number, agentName: string) {
	const now = new Date().toISOString();
	db.prepare('UPDATE tickets SET last_called_at = ?, updated_at = ? WHERE id = ?').run(
		now,
		now,
		ticketId
	);

	db.prepare(`
		INSERT INTO comments (ticket_id, author, content)
		VALUES (?, ?, ?)
	`).run(ticketId, agentName, `📢 Re-llamado en pantalla`);
}

export function completeTurn(ticketId: number, agentName: string, closingNote?: string) {
	const now = new Date().toISOString();

	db.transaction(() => {
		db.prepare(
			`
			UPDATE tickets 
			SET status = 'completed',
				completed_at = @now,
				updated_at = @now
			WHERE id = @ticketId
		`
		).run({ now, ticketId });

		const ticket = db.prepare('SELECT served_by_id FROM tickets WHERE id = ?').get(ticketId) as {
			served_by_id: number | null;
		};
		if (ticket?.served_by_id) {
			db.prepare("UPDATE users SET status = 'available' WHERE id = ?").run(ticket.served_by_id);
		}

		if (closingNote && closingNote.trim()) {
			db.prepare(`
				INSERT INTO comments (ticket_id, author, content)
				VALUES (?, ?, ?)
			`).run(ticketId, agentName, `✅ SALIDA COMPLETADA: ${closingNote.trim()}`);
		}
	})();
}

export function returnTurnToQueue(
	ticketId: number,
	agentName: string,
	reason: string,
	adjustedComplexity?: 'alta' | 'media' | 'baja'
) {
	const current = db
		.prepare('SELECT return_count, complexity, served_by_id FROM tickets WHERE id = ?')
		.get(ticketId) as
		| { return_count: number; complexity: 'alta' | 'media' | 'baja'; served_by_id: number | null }
		| undefined;

	const newReturnCount = (current?.return_count ?? 0) + 1;
	const finalComplexity = adjustedComplexity || current?.complexity || 'media';
	const now = new Date().toISOString();

	const maxOrder = db
		.prepare("SELECT MAX(order_index) as max FROM tickets WHERE status IN ('waiting', 'returned')")
		.get() as { max: number | null };
	const nextOrder = (maxOrder?.max ?? 0) + 1;

	db.transaction(() => {
		db.prepare(
			`
			UPDATE tickets 
			SET status = 'waiting',
				served_by_id = NULL,
				served_by_name = NULL,
				served_desk = NULL,
				return_reason = @reason,
				return_count = @returnCount,
				complexity = @complexity,
				order_index = @orderIndex,
				updated_at = @now
			WHERE id = @ticketId
		`
		).run({
			reason: reason.trim(),
			returnCount: newReturnCount,
			complexity: finalComplexity,
			orderIndex: nextOrder,
			now,
			ticketId
		});

		if (current?.served_by_id) {
			db.prepare("UPDATE users SET status = 'available' WHERE id = ?").run(current.served_by_id);
		}

		db.prepare(`
			INSERT INTO comments (ticket_id, author, content)
			VALUES (?, ?, ?)
		`).run(
			ticketId,
			agentName,
			`↩️ RETORNADO A LA COLA (#${newReturnCount}): ${reason.trim()} [Complejidad: ${finalComplexity.toUpperCase()}]`
		);
	})();
}

export function updateTicketStatusDirect(
	ticketId: number,
	targetStatus: 'waiting' | 'serving' | 'completed',
	actor: string
) {
	if (targetStatus === 'serving') {
		const user = db.prepare('SELECT id FROM users WHERE name = ?').get(actor) as { id: number } | undefined;
		if (user) {
			const now = new Date().toISOString();
			db.prepare(
				`UPDATE tickets SET status = 'serving', served_by_id = ?, served_by_name = ?, served_at = ?, last_called_at = ? WHERE id = ?`
			).run(user.id, actor, now, now, ticketId);
		}
	} else if (targetStatus === 'completed') {
		completeTurn(ticketId, actor, 'Finalizado vía tablero');
	} else if (targetStatus === 'waiting') {
		returnTurnToQueue(ticketId, actor, 'Devuelto a la cola vía tablero');
	}
}

export function addComment(ticketId: number, author: string, content: string) {
	db.prepare(`
		INSERT INTO comments (ticket_id, author, content)
		VALUES (?, ?, ?)
	`).run(ticketId, author.trim(), content.trim());
}

export function deleteTicket(ticketId: number) {
	db.prepare('DELETE FROM tickets WHERE id = ?').run(ticketId);
}

export function getStats() {
	const total = (db.prepare('SELECT COUNT(*) as count FROM tickets').get() as { count: number }).count;
	const waiting = (
		db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status IN ('waiting', 'returned')").get() as {
			count: number;
		}
	).count;
	const serving = (
		db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'serving'").get() as {
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
			"SELECT COUNT(*) as count FROM tickets WHERE complexity = 'alta' AND status IN ('waiting', 'returned')"
		).get() as { count: number }
	).count;
	const returnedTotal = (
		db.prepare('SELECT COUNT(*) as count FROM tickets WHERE return_count > 0').get() as {
			count: number;
		}
	).count;

	return {
		total,
		waiting,
		serving,
		completed,
		highComplexity,
		returnedTotal
	};
}
