<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// View toggle: 'kanban' | 'list'
	let currentView = $state<'kanban' | 'list'>('kanban');

	// Local filters state
	let searchQuery = $state('');
	let filterAssigned = $state('all');
	let filterPriority = $state('all');
	let filterCategory = $state('all');

	// Modals
	let showCreateModal = $state(false);
	let activeTicketId = $state<number | null>(null);
	let isEditingTicket = $state(false);

	$effect(() => {
		if (data.filters.search) searchQuery = data.filters.search;
		if (data.filters.assigned_to) filterAssigned = data.filters.assigned_to;
		if (data.filters.priority) filterPriority = data.filters.priority;
		if (data.filters.category) filterCategory = data.filters.category;
		if (data.selectedTicket?.ticket?.id) activeTicketId = data.selectedTicket.ticket.id;
	});

	// Derived current selected ticket
	let activeTicket = $derived(
		data.tickets.find((t) => t.id === activeTicketId) || data.selectedTicket?.ticket || null
	);

	// Client-side quick search filtering
	let visibleTickets = $derived(
		data.tickets.filter((t) => {
			const matchesSearch =
				searchQuery.trim() === '' ||
				t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				t.description.toLowerCase().includes(searchQuery.toLowerCase());

			const matchesAssigned = filterAssigned === 'all' || t.assigned_to === filterAssigned;
			const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
			const matchesCategory = filterCategory === 'all' || t.category === filterCategory;

			return matchesSearch && matchesAssigned && matchesPriority && matchesCategory;
		})
	);

	const columns = [
		{
			id: 'todo',
			title: 'Por Hacer',
			badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
			iconColor: 'text-slate-500'
		},
		{
			id: 'in_progress',
			title: 'En Proceso',
			badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
			iconColor: 'text-blue-500'
		},
		{
			id: 'review',
			title: 'En Revisión',
			badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
			iconColor: 'text-amber-500'
		},
		{
			id: 'done',
			title: 'Completado',
			badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
			iconColor: 'text-emerald-500'
		}
	];

	function getPriorityBadge(priority: string) {
		switch (priority) {
			case 'urgent':
				return { label: 'Urgente', class: 'bg-rose-100 text-rose-800 border-rose-300' };
			case 'high':
				return { label: 'Alta', class: 'bg-amber-100 text-amber-800 border-amber-300' };
			case 'medium':
				return { label: 'Media', class: 'bg-sky-100 text-sky-800 border-sky-300' };
			default:
				return { label: 'Baja', class: 'bg-slate-100 text-slate-700 border-slate-300' };
		}
	}

	function getStatusLabel(status: string) {
		switch (status) {
			case 'todo':
				return 'Por Hacer';
			case 'in_progress':
				return 'En Proceso';
			case 'review':
				return 'En Revisión';
			case 'done':
				return 'Completado';
			default:
				return status;
		}
	}

	function getNextStatus(current: string): string | null {
		if (current === 'todo') return 'in_progress';
		if (current === 'in_progress') return 'review';
		if (current === 'review') return 'done';
		return null;
	}

	function getPrevStatus(current: string): string | null {
		if (current === 'done') return 'review';
		if (current === 'review') return 'in_progress';
		if (current === 'in_progress') return 'todo';
		return null;
	}

	function getAvatarColor(name: string) {
		if (name.includes('Julio')) return 'bg-purple-600 text-white';
		if (name.includes('Domingo')) return 'bg-teal-600 text-white';
		if (name.includes('Yeison')) return 'bg-blue-600 text-white';
		return 'bg-gray-400 text-white';
	}

	function openTicket(id: number) {
		activeTicketId = id;
		const url = new URL(window.location.href);
		url.searchParams.set('ticket', id.toString());
		window.history.replaceState({}, '', url.toString());
	}

	function closeTicketModal() {
		activeTicketId = null;
		isEditingTicket = false;
		const url = new URL(window.location.href);
		url.searchParams.delete('ticket');
		window.history.replaceState({}, '', url.toString());
	}
</script>

<svelte:head>
	<title>Sistema de Tickets - Gestión Ágil</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
	<!-- Navbar Superior -->
	<header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
			<div class="flex items-center gap-3">
				<div class="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm shadow-indigo-200 text-lg">
					TS
				</div>
				<div>
					<h1 class="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
						Ticket System
						<span class="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-200">
							MVP
						</span>
					</h1>
					<p class="text-xs text-slate-500">Gestión ordenada y colaborativa de tareas</p>
				</div>
			</div>

			<!-- Métricas Rápidas -->
			<div class="hidden md:flex items-center gap-2 text-xs">
				<div class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200 font-medium">
					<span class="text-slate-500">Total:</span>
					<span class="font-bold text-slate-800">{data.stats.total}</span>
				</div>
				<div class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 font-medium">
					<span>En Proceso:</span>
					<span class="font-bold">{data.stats.inProgress}</span>
				</div>
				<div class="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg border border-rose-200 font-medium">
					<span>Urgentes:</span>
					<span class="font-bold">{data.stats.urgent}</span>
				</div>
				<div class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 font-medium">
					<span>Completados:</span>
					<span class="font-bold">{data.stats.done}</span>
				</div>
			</div>

			<!-- Botones de Acción -->
			<div class="flex items-center gap-2.5">
				<!-- Selector de Vista -->
				<div class="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex text-xs font-medium">
					<button
						type="button"
						onclick={() => (currentView = 'kanban')}
						class="px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1.5 {currentView === 'kanban' ? 'bg-white shadow-xs text-indigo-700 font-semibold' : 'text-slate-600 hover:text-slate-900'}"
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<rect x="3" y="3" width="7" height="18" rx="1" stroke-width="2" />
							<rect x="14" y="3" width="7" height="18" rx="1" stroke-width="2" />
						</svg>
						Tablero
					</button>
					<button
						type="button"
						onclick={() => (currentView = 'list')}
						class="px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1.5 {currentView === 'list' ? 'bg-white shadow-xs text-indigo-700 font-semibold' : 'text-slate-600 hover:text-slate-900'}"
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<line x1="4" y1="6" x2="20" y2="6" stroke-width="2" stroke-linecap="round" />
							<line x1="4" y1="12" x2="20" y2="12" stroke-width="2" stroke-linecap="round" />
							<line x1="4" y1="18" x2="20" y2="18" stroke-width="2" stroke-linecap="round" />
						</svg>
						Lista Ordenada
					</button>
				</div>

				<!-- Botón Crear Ticket -->
				<button
					type="button"
					onclick={() => (showCreateModal = true)}
					class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm px-3.5 py-2 rounded-lg shadow-sm shadow-indigo-300 transition-all active:scale-95"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
					</svg>
					Nuevo Ticket
				</button>
			</div>
		</div>
	</header>

	<!-- Barra de Búsqueda y Filtros -->
	<section class="bg-white border-b border-slate-200">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-3">
			<!-- Buscador -->
			<div class="relative flex-1 min-w-[220px]">
				<svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Buscar por título o contenido..."
					class="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
				/>
			</div>

			<!-- Filtro Responsable -->
			<div class="flex items-center gap-1.5 text-xs">
				<span class="text-slate-500 font-medium">Asignado:</span>
				<select
					bind:value={filterAssigned}
					class="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
				>
					<option value="all">Todos</option>
					<option value="Julio">Julio</option>
					<option value="Domingo">Domingo</option>
					<option value="Yeison">Yeison</option>
					<option value="Sin asignar">Sin asignar</option>
				</select>
			</div>

			<!-- Filtro Prioridad -->
			<div class="flex items-center gap-1.5 text-xs">
				<span class="text-slate-500 font-medium">Prioridad:</span>
				<select
					bind:value={filterPriority}
					class="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
				>
					<option value="all">Todas</option>
					<option value="urgent">🔴 Urgente</option>
					<option value="high">🟠 Alta</option>
					<option value="medium">🟡 Media</option>
					<option value="low">🟢 Baja</option>
				</select>
			</div>

			<!-- Filtro Categoría -->
			<div class="flex items-center gap-1.5 text-xs">
				<span class="text-slate-500 font-medium">Categoría:</span>
				<select
					bind:value={filterCategory}
					class="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
				>
					<option value="all">Todas</option>
					<option value="Gestión">Gestión</option>
					<option value="Seguridad">Seguridad</option>
					<option value="Infraestructura">Infraestructura</option>
					<option value="Notificaciones">Notificaciones</option>
					<option value="Bug">Bug</option>
					<option value="General">General</option>
				</select>
			</div>

			{#if searchQuery || filterAssigned !== 'all' || filterPriority !== 'all' || filterCategory !== 'all'}
				<button
					type="button"
					onclick={() => {
						searchQuery = '';
						filterAssigned = 'all';
						filterPriority = 'all';
						filterCategory = 'all';
					}}
					class="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline ml-auto"
				>
					Limpiar filtros
				</button>
			{/if}
		</div>
	</section>

	<!-- Área de Contenido Principal -->
	<main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
		{#if visibleTickets.length === 0}
			<div class="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center max-w-md mx-auto my-12 shadow-xs">
				<div class="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
				</div>
				<h3 class="text-base font-semibold text-slate-800">No se encontraron tickets</h3>
				<p class="text-xs text-slate-500 mt-1 mb-6">No hay tareas que coincidan con los filtros aplicados o la lista está vacía.</p>
				<button
					type="button"
					onclick={() => (showCreateModal = true)}
					class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg"
				>
					Crear primer ticket
				</button>
			</div>
		{:else if currentView === 'kanban'}
			<!-- VISTA KANBAN -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
				{#each columns as col}
					{@const colTickets = visibleTickets.filter((t) => t.status === col.id)}
					<div class="bg-slate-100/80 rounded-xl p-3 border border-slate-200/80 flex flex-col min-h-[500px]">
						<!-- Col Header -->
						<div class="flex items-center justify-between px-1 py-1.5 mb-2.5">
							<div class="flex items-center gap-2">
								<h2 class="font-bold text-xs uppercase tracking-wider text-slate-700">{col.title}</h2>
								<span class="text-xs px-2 py-0.5 rounded-full font-bold {col.badgeColor} border">
									{colTickets.length}
								</span>
							</div>
						</div>

						<!-- Cards List -->
						<div class="space-y-3 flex-1">
							{#each colTickets as ticket (ticket.id)}
								{@const pBadge = getPriorityBadge(ticket.priority)}
								<div class="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between group">
									<div>
										<!-- Encabezado de la Tarjeta -->
										<div class="flex items-center justify-between gap-2 mb-2">
											<span class="text-[11px] font-semibold px-2 py-0.5 rounded-md border {pBadge.class}">
												{pBadge.label}
											</span>
											<span class="text-[11px] text-slate-400 font-medium">#{ticket.id}</span>
										</div>

										<!-- Título -->
										<button
											type="button"
											onclick={() => openTicket(ticket.id)}
											class="text-left font-semibold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 w-full mb-1"
										>
											{ticket.title}
										</button>

										<!-- Descripción Corta -->
										{#if ticket.description}
											<p class="text-[11px] text-slate-500 line-clamp-2 mb-3">
												{ticket.description}
											</p>
										{/if}
									</div>

									<!-- Pie de Tarjeta -->
									<div class="pt-2 border-t border-slate-100 flex items-center justify-between mt-2">
										<!-- Categoría & Asignado -->
										<div class="flex items-center gap-2">
											<span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
												{ticket.category}
											</span>
											<div
												class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold {getAvatarColor(ticket.assigned_to)}"
												title={`Asignado a: ${ticket.assigned_to}`}
											>
												{ticket.assigned_to.charAt(0)}
											</div>
										</div>

										<!-- Controles de Mover Estado Rápido -->
										<div class="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
											{#if getPrevStatus(ticket.status)}
												<form method="POST" action="?/updateStatus" use:enhance>
													<input type="hidden" name="id" value={ticket.id} />
													<input type="hidden" name="status" value={getPrevStatus(ticket.status)} />
													<button
														type="submit"
														title="Mover al estado anterior"
														class="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors"
													>
														<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
														</svg>
													</button>
												</form>
											{/if}

											{#if getNextStatus(ticket.status)}
												<form method="POST" action="?/updateStatus" use:enhance>
													<input type="hidden" name="id" value={ticket.id} />
													<input type="hidden" name="status" value={getNextStatus(ticket.status)} />
													<button
														type="submit"
														title="Avanzar al siguiente estado"
														class="p-1 hover:bg-indigo-50 rounded text-indigo-600 hover:text-indigo-800 transition-colors font-bold"
													>
														<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
														</svg>
													</button>
												</form>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<!-- VISTA LISTA PRIORIZADA -->
			<div class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
				<div class="overflow-x-auto">
					<table class="w-full text-left border-collapse text-xs">
						<thead>
							<tr class="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
								<th class="py-3 px-4 w-16">ID</th>
								<th class="py-3 px-4">Título / Tarea</th>
								<th class="py-3 px-4 w-28">Prioridad</th>
								<th class="py-3 px-4 w-36">Estado</th>
								<th class="py-3 px-4 w-32">Asignado</th>
								<th class="py-3 px-4 w-28">Categoría</th>
								<th class="py-3 px-4 w-24 text-right">Acciones</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100">
							{#each visibleTickets as ticket (ticket.id)}
								{@const pBadge = getPriorityBadge(ticket.priority)}
								<tr class="hover:bg-indigo-50/40 transition-colors">
									<td class="py-3 px-4 font-mono text-slate-400 font-medium">#{ticket.id}</td>
									<td class="py-3 px-4 font-medium text-slate-900">
										<button
											type="button"
											onclick={() => openTicket(ticket.id)}
											class="text-left hover:text-indigo-600 font-semibold"
										>
											{ticket.title}
										</button>
										{#if ticket.description}
											<p class="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{ticket.description}</p>
										{/if}
									</td>
									<td class="py-3 px-4">
										<span class="inline-block px-2 py-0.5 rounded-md border font-semibold {pBadge.class}">
											{pBadge.label}
										</span>
									</td>
									<td class="py-3 px-4">
										<form method="POST" action="?/updateStatus" use:enhance>
											<input type="hidden" name="id" value={ticket.id} />
											<select
												name="status"
												onchange={(e) => e.currentTarget.form?.requestSubmit()}
												class="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
											>
												<option value="todo" selected={ticket.status === 'todo'}>Por Hacer</option>
												<option value="in_progress" selected={ticket.status === 'in_progress'}>En Proceso</option>
												<option value="review" selected={ticket.status === 'review'}>En Revisión</option>
												<option value="done" selected={ticket.status === 'done'}>Completado</option>
											</select>
										</form>
									</td>
									<td class="py-3 px-4">
										<div class="flex items-center gap-1.5">
											<div class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold {getAvatarColor(ticket.assigned_to)}">
												{ticket.assigned_to.charAt(0)}
											</div>
											<span class="text-slate-700 font-medium">{ticket.assigned_to}</span>
										</div>
									</td>
									<td class="py-3 px-4 text-slate-500">{ticket.category}</td>
									<td class="py-3 px-4 text-right">
										<button
											type="button"
											onclick={() => openTicket(ticket.id)}
											class="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
										>
											Ver Detalle
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</main>
</div>

<!-- MODAL CREAR TICKET -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
		<div class="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
			<div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
				<h3 class="font-bold text-base text-slate-900">Crear Nuevo Ticket</h3>
				<button
					type="button"
					aria-label="Cerrar modal de creación"
					onclick={() => (showCreateModal = false)}
					class="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<form
				method="POST"
				action="?/create"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						showCreateModal = false;
					};
				}}
				class="p-6 space-y-4"
			>
				<div>
					<label for="create_title" class="block text-xs font-semibold text-slate-700 mb-1">Título de la tarea / incidencia *</label>
					<input
						id="create_title"
						type="text"
						name="title"
						required
						placeholder="Ej. Revisar sincronización de datos con Julio"
						class="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
					/>
				</div>

				<div>
					<label for="create_desc" class="block text-xs font-semibold text-slate-700 mb-1">Descripción detallada</label>
					<textarea
						id="create_desc"
						name="description"
						rows="3"
						placeholder="Añade detalles, pasos o contexto para el equipo..."
						class="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none"
					></textarea>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="create_prio" class="block text-xs font-semibold text-slate-700 mb-1">Prioridad</label>
						<select
							id="create_prio"
							name="priority"
							class="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
						>
							<option value="urgent">🔴 Urgente</option>
							<option value="high">🟠 Alta</option>
							<option value="medium" selected>🟡 Media</option>
							<option value="low">🟢 Baja</option>
						</select>
					</div>

					<div>
						<label for="create_assign" class="block text-xs font-semibold text-slate-700 mb-1">Asignar a</label>
						<select
							id="create_assign"
							name="assigned_to"
							class="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
						>
							<option value="Julio">Julio</option>
							<option value="Domingo">Domingo</option>
							<option value="Yeison">Yeison</option>
							<option value="Sin asignar" selected>Sin asignar</option>
						</select>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="create_cat" class="block text-xs font-semibold text-slate-700 mb-1">Categoría</label>
						<select
							id="create_cat"
							name="category"
							class="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
						>
							<option value="General" selected>General</option>
							<option value="Gestión">Gestión</option>
							<option value="Seguridad">Seguridad</option>
							<option value="Infraestructura">Infraestructura</option>
							<option value="Notificaciones">Notificaciones</option>
							<option value="Bug">Bug</option>
							<option value="Soporte">Soporte</option>
						</select>
					</div>

					<div>
						<label for="create_status" class="block text-xs font-semibold text-slate-700 mb-1">Estado Inicial</label>
						<select
							id="create_status"
							name="status"
							class="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
						>
							<option value="todo" selected>Por Hacer</option>
							<option value="in_progress">En Proceso</option>
							<option value="review">En Revisión</option>
							<option value="done">Completado</option>
						</select>
					</div>
				</div>

				<div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
					<button
						type="button"
						onclick={() => (showCreateModal = false)}
						class="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
					>
						Cancelar
					</button>
					<button
						type="submit"
						class="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm shadow-indigo-300 transition-colors"
					>
						Guardar Ticket
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL DETALLE / COMENTARIOS -->
{#if activeTicket}
	{@const pBadge = getPriorityBadge(activeTicket.priority)}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
		<div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
			<!-- Encabezado Modal -->
			<div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
				<div class="flex items-center gap-3">
					<span class="font-mono text-xs font-bold text-slate-400">#{activeTicket.id}</span>
					<span class="text-xs font-semibold px-2 py-0.5 rounded-md border {pBadge.class}">
						{pBadge.label}
					</span>
					<span class="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
						{getStatusLabel(activeTicket.status)}
					</span>
				</div>
				<button
					type="button"
					aria-label="Cerrar modal de detalle"
					onclick={closeTicketModal}
					class="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Contenido Scrollable -->
			<div class="p-6 overflow-y-auto space-y-6 flex-1">
				<!-- Edición o Vista de datos principales -->
				{#if isEditingTicket}
					<form
						method="POST"
						action="?/updateTicket"
						use:enhance={() => {
							return async ({ update }) => {
								await update();
								isEditingTicket = false;
							};
						}}
						class="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200"
					>
						<input type="hidden" name="id" value={activeTicket.id} />
						<div>
							<label for="edit_title" class="block text-xs font-semibold text-slate-700 mb-1">Título</label>
							<input
								id="edit_title"
								type="text"
								name="title"
								value={activeTicket.title}
								required
								class="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
							/>
						</div>
						<div>
							<label for="edit_desc" class="block text-xs font-semibold text-slate-700 mb-1">Descripción</label>
							<textarea
								id="edit_desc"
								name="description"
								rows="3"
								class="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg resize-none"
							>{activeTicket.description}</textarea>
						</div>
						<div class="grid grid-cols-3 gap-2">
							<div>
								<label for="edit_status" class="block text-[11px] font-semibold text-slate-600 mb-1">Estado</label>
								<select id="edit_status" name="status" class="w-full text-xs px-2 py-1.5 bg-white border border-slate-300 rounded-lg">
									<option value="todo" selected={activeTicket.status === 'todo'}>Por Hacer</option>
									<option value="in_progress" selected={activeTicket.status === 'in_progress'}>En Proceso</option>
									<option value="review" selected={activeTicket.status === 'review'}>En Revisión</option>
									<option value="done" selected={activeTicket.status === 'done'}>Completado</option>
								</select>
							</div>
							<div>
								<label for="edit_prio" class="block text-[11px] font-semibold text-slate-600 mb-1">Prioridad</label>
								<select id="edit_prio" name="priority" class="w-full text-xs px-2 py-1.5 bg-white border border-slate-300 rounded-lg">
									<option value="urgent" selected={activeTicket.priority === 'urgent'}>🔴 Urgente</option>
									<option value="high" selected={activeTicket.priority === 'high'}>🟠 Alta</option>
									<option value="medium" selected={activeTicket.priority === 'medium'}>🟡 Media</option>
									<option value="low" selected={activeTicket.priority === 'low'}>🟢 Baja</option>
								</select>
							</div>
							<div>
								<label for="edit_assign" class="block text-[11px] font-semibold text-slate-600 mb-1">Asignado</label>
								<select id="edit_assign" name="assigned_to" class="w-full text-xs px-2 py-1.5 bg-white border border-slate-300 rounded-lg">
									<option value="Julio" selected={activeTicket.assigned_to === 'Julio'}>Julio</option>
									<option value="Domingo" selected={activeTicket.assigned_to === 'Domingo'}>Domingo</option>
									<option value="Yeison" selected={activeTicket.assigned_to === 'Yeison'}>Yeison</option>
									<option value="Sin asignar" selected={activeTicket.assigned_to === 'Sin asignar'}>Sin asignar</option>
								</select>
							</div>
						</div>
						<div class="flex justify-end gap-2 pt-2">
							<button
								type="button"
								onclick={() => (isEditingTicket = false)}
								class="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
							>
								Cancelar
							</button>
							<button
								type="submit"
								class="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
							>
								Guardar Cambios
							</button>
						</div>
					</form>
				{:else}
					<div>
						<div class="flex items-start justify-between gap-4 mb-2">
							<h2 class="text-lg font-bold text-slate-900">{activeTicket.title}</h2>
							<button
								type="button"
								onclick={() => (isEditingTicket = true)}
								class="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
							>
								<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
								</svg>
								Editar
							</button>
						</div>
						<p class="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
							{activeTicket.description || 'Sin descripción adicional proporcionada.'}
						</p>

						<!-- Meta Info -->
						<div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
							<div class="bg-white p-2.5 rounded-lg border border-slate-200">
								<span class="text-slate-400 block text-[10px] uppercase font-bold">Asignado</span>
								<span class="font-semibold text-slate-800">{activeTicket.assigned_to}</span>
							</div>
							<div class="bg-white p-2.5 rounded-lg border border-slate-200">
								<span class="text-slate-400 block text-[10px] uppercase font-bold">Categoría</span>
								<span class="font-semibold text-slate-800">{activeTicket.category}</span>
							</div>
							<div class="bg-white p-2.5 rounded-lg border border-slate-200">
								<span class="text-slate-400 block text-[10px] uppercase font-bold">Creado</span>
								<span class="font-semibold text-slate-800">{activeTicket.created_at}</span>
							</div>
							<div class="bg-white p-2.5 rounded-lg border border-slate-200">
								<span class="text-slate-400 block text-[10px] uppercase font-bold">Actualizado</span>
								<span class="font-semibold text-slate-800">{activeTicket.updated_at}</span>
							</div>
						</div>
					</div>
				{/if}

				<!-- Sección de Comentarios / Bitácora -->
				<div class="border-t border-slate-200 pt-5">
					<h4 class="font-bold text-xs uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
						<svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
						</svg>
						Bitácora de Notas y Avances
					</h4>

					<!-- Lista de comentarios -->
					{#if data.selectedTicket?.comments && data.selectedTicket.comments.length > 0}
						<div class="space-y-3 mb-4">
							{#each data.selectedTicket.comments as c (c.id)}
								<div class="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
									<div class="flex items-center justify-between mb-1.5">
										<div class="flex items-center gap-1.5">
											<div class="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold {getAvatarColor(c.author)}">
												{c.author.charAt(0)}
											</div>
											<span class="font-semibold text-slate-900">{c.author}</span>
										</div>
										<span class="text-[10px] text-slate-400">{c.created_at}</span>
									</div>
									<p class="text-slate-700 whitespace-pre-wrap">{c.content}</p>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-xs text-slate-400 italic mb-4">No hay notas registradas para este ticket todavía.</p>
					{/if}

					<!-- Formulario de nuevo comentario -->
					<form
						method="POST"
						action="?/addComment"
						use:enhance
						class="space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-200"
					>
						<input type="hidden" name="ticketId" value={activeTicket.id} />
						<div class="flex gap-2">
							<input
								type="text"
								name="author"
								placeholder="Tu nombre (ej. Yeison, Julio)"
								required
								class="w-1/3 text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
							/>
							<input
								type="text"
								name="content"
								placeholder="Escribe una actualización o nota..."
								required
								class="flex-1 text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
							/>
							<button
								type="submit"
								class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
							>
								Comentar
							</button>
						</div>
					</form>
				</div>
			</div>

			<!-- Pie del Modal -->
			<div class="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
				<!-- Eliminar Ticket -->
				<form
					method="POST"
					action="?/delete"
					use:enhance={() => {
						return async ({ update }) => {
							await update();
							closeTicketModal();
						};
					}}
				>
					<input type="hidden" name="id" value={activeTicket.id} />
					<button
						type="submit"
						onclick={(e) => {
							if (!confirm('¿Estás seguro de que deseas eliminar este ticket?')) e.preventDefault();
						}}
						class="text-xs text-rose-600 hover:text-rose-800 font-medium hover:underline flex items-center gap-1"
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
						</svg>
						Eliminar Ticket
					</button>
				</form>

				<button
					type="button"
					onclick={closeTicketModal}
					class="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shadow-xs transition-colors"
				>
					Cerrar
				</button>
			</div>
		</div>
	</div>
{/if}
