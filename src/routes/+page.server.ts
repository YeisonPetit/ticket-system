import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	getAllTickets,
	getStats,
	getTicketWithComments,
	createTicket,
	updateTicket,
	deleteTicket,
	addComment
} from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
	const status = url.searchParams.get('status') || 'all';
	const assigned_to = url.searchParams.get('assigned') || 'all';
	const priority = url.searchParams.get('priority') || 'all';
	const category = url.searchParams.get('category') || 'all';
	const search = url.searchParams.get('q') || '';
	const selectedTicketId = url.searchParams.get('ticket')
		? Number(url.searchParams.get('ticket'))
		: null;

	const filters = { status, assigned_to, priority, category, search };
	const tickets = getAllTickets(filters);
	const stats = getStats();

	let selectedTicket = null;
	if (selectedTicketId && !isNaN(selectedTicketId)) {
		selectedTicket = getTicketWithComments(selectedTicketId);
	}

	return {
		tickets,
		stats,
		filters,
		selectedTicket
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const title = data.get('title')?.toString()?.trim();
		const description = data.get('description')?.toString()?.trim() || '';
		const priority = data.get('priority')?.toString() || 'medium';
		const category = data.get('category')?.toString() || 'General';
		const assigned_to = data.get('assigned_to')?.toString() || 'Sin asignar';
		const status = data.get('status')?.toString() || 'todo';

		if (!title) {
			return fail(400, { error: 'El título del ticket es obligatorio.' });
		}

		createTicket({
			title,
			description,
			priority,
			category,
			assigned_to,
			status
		});

		return { success: true };
	},

	updateStatus: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const status = data.get('status')?.toString() as 'todo' | 'in_progress' | 'review' | 'done';

		if (!id || !status) {
			return fail(400, { error: 'Datos incompletos para actualizar estado.' });
		}

		updateTicket(id, { status });
		return { success: true };
	},

	updatePriority: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const priority = data.get('priority')?.toString() as 'urgent' | 'high' | 'medium' | 'low';

		if (!id || !priority) {
			return fail(400, { error: 'Datos incompletos para actualizar prioridad.' });
		}

		updateTicket(id, { priority });
		return { success: true };
	},

	updateTicket: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const title = data.get('title')?.toString()?.trim();
		const description = data.get('description')?.toString()?.trim();
		const priority = data.get('priority')?.toString() as 'urgent' | 'high' | 'medium' | 'low';
		const category = data.get('category')?.toString();
		const assigned_to = data.get('assigned_to')?.toString();
		const status = data.get('status')?.toString() as 'todo' | 'in_progress' | 'review' | 'done';

		if (!id || !title) {
			return fail(400, { error: 'El título y el ID son obligatorios.' });
		}

		updateTicket(id, {
			title,
			description,
			priority,
			category,
			assigned_to,
			status
		});

		return { success: true };
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));

		if (!id) {
			return fail(400, { error: 'ID de ticket no proporcionado.' });
		}

		deleteTicket(id);
		return { success: true };
	},

	addComment: async ({ request }) => {
		const data = await request.formData();
		const ticketId = Number(data.get('ticketId'));
		const author = data.get('author')?.toString()?.trim() || 'Colaborador';
		const content = data.get('content')?.toString()?.trim();

		if (!ticketId || !content) {
			return fail(400, { error: 'El comentario no puede estar vacío.' });
		}

		addComment(ticketId, author, content);
		return { success: true };
	}
};
