import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	getUserById,
	getAllTickets,
	callNextTurnForAgent,
	recallCurrentTurn,
	completeTurn,
	returnTurnToQueue,
	getStats
} from '$lib/server/db';

export const load: PageServerLoad = async ({ cookies, parent }) => {
	const layoutData = await parent();
	const agent = layoutData.currentUser;

	const waitingTickets = getAllTickets({ status: 'waiting' });
	const stats = getStats();

	return {
		agent,
		waitingTickets,
		stats
	};
};

export const actions: Actions = {
	callNext: async ({ cookies }) => {
		const cookieUserId = cookies.get('pulse_user_id') || '1';
		const agentId = Number(cookieUserId);

		try {
			const calledTicket = callNextTurnForAgent(agentId);
			if (!calledTicket) {
				return fail(400, { error: 'No hay turnos esperando en la cola.' });
			}
			return { success: true };
		} catch (e: any) {
			return fail(500, { error: e.message });
		}
	},

	recall: async ({ request, cookies }) => {
		const data = await request.formData();
		const ticketId = Number(data.get('ticketId'));
		const cookieUserId = cookies.get('pulse_user_id') || '1';
		const agent = getUserById(Number(cookieUserId));

		if (!ticketId || !agent) return fail(400);

		recallCurrentTurn(ticketId, agent.name);
		return { success: true };
	},

	complete: async ({ request, cookies }) => {
		const data = await request.formData();
		const ticketId = Number(data.get('ticketId'));
		const closingNote = data.get('closingNote')?.toString() || '';
		const cookieUserId = cookies.get('pulse_user_id') || '1';
		const agent = getUserById(Number(cookieUserId));

		if (!ticketId || !agent) return fail(400);

		completeTurn(ticketId, agent.name, closingNote);
		return { success: true };
	},

	returnToQueue: async ({ request, cookies }) => {
		const data = await request.formData();
		const ticketId = Number(data.get('ticketId'));
		const reason = data.get('reason')?.toString() || 'Requerimiento incompleto';
		const adjustedComplexity = data.get('adjustedComplexity')?.toString() as
			| 'alta'
			| 'media'
			| 'baja'
			| undefined;
		const cookieUserId = cookies.get('pulse_user_id') || '1';
		const agent = getUserById(Number(cookieUserId));

		if (!ticketId || !agent) return fail(400);

		returnTurnToQueue(ticketId, agent.name, reason, adjustedComplexity);
		return { success: true };
	}
};
