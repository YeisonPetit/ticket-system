import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	getAllTickets,
	getStats,
	getTicketWithComments,
	createTicket,
	updateTicket,
	deleteTicket,
	addComment,
	takeTicketForValidation,
	completeTicket,
	returnTicketToQueue
} from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
	const status = url.searchParams.get('status') || 'all';
	const assigned_to = url.searchParams.get('assigned') || 'all';
	const created_by = url.searchParams.get('created_by') || 'all';
	const complexity = url.searchParams.get('complexity') || 'all';
	const search = url.searchParams.get('q') || '';
	const selectedTicketId = url.searchParams.get('ticket')
		? Number(url.searchParams.get('ticket'))
		: null;

	const filters = { status, assigned_to, created_by, complexity, search };
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
		const created_by = data.get('created_by')?.toString()?.trim() || 'Yeison';
		const complexity = (data.get('complexity')?.toString() || 'media') as 'alta' | 'media' | 'baja';
		const assigned_to = data.get('assigned_to')?.toString() || 'Sin asignar';
		const category = data.get('category')?.toString() || 'General';

		if (!title) {
			return fail(400, { error: 'El título del ticket es obligatorio.' });
		}

		if (!description) {
			return fail(400, { error: 'La descripción del ticket es obligatoria.' });
		}

		createTicket({
			title,
			description,
			created_by,
			complexity,
			assigned_to,
			category,
			status: 'queue'
		});

		return { success: true };
	},

	dragMove: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const targetStatus = data.get('targetStatus')?.toString() as
			| 'queue'
			| 'in_validation'
			| 'completed';
		const actor = data.get('actor')?.toString()?.trim() || 'Julio';

		if (!id || !targetStatus) {
			return fail(400, { error: 'Parámetros inválidos para mover el ticket.' });
		}

		if (targetStatus === 'in_validation') {
			takeTicketForValidation(id, actor);
		} else if (targetStatus === 'completed') {
			completeTicket(id, actor, 'Aprobado y movido vía drag & drop');
		} else if (targetStatus === 'queue') {
			returnTicketToQueue(id, actor, 'Retornado a la cola vía tablero interactivo');
		}

		return { success: true };
	},

	takeForValidation: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const validatorName = data.get('validatorName')?.toString()?.trim() || 'Julio';

		if (!id) {
			return fail(400, { error: 'ID de ticket inválido.' });
		}

		takeTicketForValidation(id, validatorName);
		return { success: true };
	},

	complete: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const resolvedBy = data.get('resolvedBy')?.toString()?.trim() || 'Julio';
		const closingNote = data.get('closingNote')?.toString()?.trim() || '';

		if (!id) {
			return fail(400, { error: 'ID de ticket inválido.' });
		}

		completeTicket(id, resolvedBy, closingNote);
		return { success: true };
	},

	returnToQueue: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const returnedBy = data.get('returnedBy')?.toString()?.trim() || 'Julio';
		const reason = data.get('reason')?.toString()?.trim();
		const adjustedComplexity = data.get('adjustedComplexity')?.toString() as
			| 'alta'
			| 'media'
			| 'baja'
			| undefined;

		if (!id) {
			return fail(400, { error: 'ID de ticket inválido.' });
		}

		if (!reason) {
			return fail(400, { error: 'Debes indicar el motivo de la devolución a la cola.' });
		}

		returnTicketToQueue(id, returnedBy, reason, adjustedComplexity);
		return { success: true };
	},

	updateTicket: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const title = data.get('title')?.toString()?.trim();
		const description = data.get('description')?.toString()?.trim();
		const created_by = data.get('created_by')?.toString()?.trim();
		const complexity = data.get('complexity')?.toString() as 'alta' | 'media' | 'baja';
		const assigned_to = data.get('assigned_to')?.toString();
		const status = data.get('status')?.toString() as 'queue' | 'in_validation' | 'completed';

		if (!id || !title) {
			return fail(400, { error: 'El título y el ID son obligatorios.' });
		}

		updateTicket(id, {
			title,
			description,
			created_by,
			complexity,
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
