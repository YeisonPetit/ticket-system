import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	getAllTickets,
	getStats,
	getTicketWithComments,
	createTicket,
	deleteTicket,
	addComment,
	callNextTurnForAgent,
	completeTurn,
	returnTurnToQueue,
	updateTicketStatusDirect,
	getAgentsOverview
} from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
	const status = url.searchParams.get('status') || 'all';
	const served_by = url.searchParams.get('served_by') || 'all';
	const complexity = url.searchParams.get('complexity') || 'all';
	const search = url.searchParams.get('q') || '';
	const selectedTicketId = url.searchParams.get('ticket')
		? Number(url.searchParams.get('ticket'))
		: null;

	const filters = { status, served_by, complexity, search };
	const tickets = getAllTickets(filters);
	const stats = getStats();
	const overview = getAgentsOverview();

	let selectedTicket = null;
	if (selectedTicketId && !isNaN(selectedTicketId)) {
		selectedTicket = getTicketWithComments(selectedTicketId);
	}

	return {
		tickets,
		stats,
		overview,
		filters,
		selectedTicket
	};
};

export const actions: Actions = {
	switchUser: async ({ request, cookies }) => {
		const data = await request.formData();
		const userId = data.get('userId')?.toString();

		if (userId) {
			cookies.set('pulse_user_id', userId, {
				path: '/',
				maxAge: 60 * 60 * 24 * 30, // 30 days
				httpOnly: false,
				sameSite: 'lax'
			});
		}

		return { success: true };
	},

	create: async ({ request }) => {
		const data = await request.formData();
		const title = data.get('title')?.toString()?.trim();
		const description = data.get('description')?.toString()?.trim() || '';
		const created_by = data.get('created_by')?.toString()?.trim() || 'Usuario';
		const complexity = (data.get('complexity')?.toString() || 'media') as 'alta' | 'media' | 'baja';

		if (!title) {
			return fail(400, { error: 'El título del ticket es obligatorio.' });
		}

		const result = createTicket({
			title,
			description,
			created_by,
			complexity
		});

		return { success: true, turnCode: result.turn_code };
	},

	callNext: async ({ request, cookies }) => {
		const data = await request.formData();
		const formAgentId = data.get('agentId')?.toString();
		const cookieUserId = cookies.get('pulse_user_id') || '1';
		const agentId = Number(formAgentId || cookieUserId);

		try {
			const called = callNextTurnForAgent(agentId);
			if (!called) {
				return fail(400, { error: 'No hay turnos disponibles en la cola de espera.' });
			}
			return { success: true };
		} catch (e: any) {
			return fail(500, { error: e.message });
		}
	},

	complete: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const resolvedBy = data.get('resolvedBy')?.toString()?.trim() || 'Julio';
		const closingNote = data.get('closingNote')?.toString()?.trim() || '';

		if (!id) return fail(400, { error: 'ID inválido.' });

		completeTurn(id, resolvedBy, closingNote);
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

		if (!id || !reason) {
			return fail(400, { error: 'Debes indicar el motivo de la devolución a la cola.' });
		}

		returnTurnToQueue(id, returnedBy, reason, adjustedComplexity);
		return { success: true };
	},

	dragMove: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const targetStatus = data.get('targetStatus')?.toString() as
			| 'waiting'
			| 'serving'
			| 'completed';
		const actor = data.get('actor')?.toString()?.trim() || 'Julio';

		if (!id || !targetStatus) return fail(400);

		updateTicketStatusDirect(id, targetStatus, actor);
		return { success: true };
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));

		if (!id) return fail(400);

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
