import type { LayoutServerLoad } from './$types';
import { getAllUsers, getUserById, getAgentsOverview } from '$lib/server/db';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const users = getAllUsers();
	const cookieUserId = cookies.get('pulse_user_id');

	let currentUser = null;
	if (cookieUserId) {
		currentUser = getUserById(Number(cookieUserId));
	}

	if (!currentUser && users.length > 0) {
		currentUser = users[0]; // Default to Julio (id: 1)
	}

	const overview = getAgentsOverview();

	return {
		users,
		currentUser,
		overview
	};
};
