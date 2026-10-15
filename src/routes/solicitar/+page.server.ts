import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createTicket, getStats, getAgentsOverview } from '$lib/server/db';

export const load: PageServerLoad = async () => {
	const stats = getStats();
	const overview = getAgentsOverview();

	return {
		stats,
		overview
	};
};

export const actions: Actions = {
	requestTicket: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString()?.trim();
		const title = data.get('title')?.toString()?.trim();
		const description = data.get('description')?.toString()?.trim() || '';
		const complexity = (data.get('complexity')?.toString() || 'media') as 'alta' | 'media' | 'baja';

		if (!name || !title) {
			return fail(400, { error: 'Por favor ingresa tu nombre y el motivo del turno.' });
		}

		const result = createTicket({
			title,
			description,
			created_by: name,
			complexity
		});

		return {
			success: true,
			turnCode: result.turn_code,
			ticketId: result.id,
			name,
			title
		};
	}
};
