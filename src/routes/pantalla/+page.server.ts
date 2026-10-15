import type { PageServerLoad } from './$types';
import { getAgentsOverview, getAllTickets, getStats } from '$lib/server/db';

export const load: PageServerLoad = async () => {
	const overview = getAgentsOverview();
	const waitingTickets = getAllTickets({ status: 'waiting' });
	const stats = getStats();

	return {
		overview,
		waitingTickets,
		stats
	};
};
