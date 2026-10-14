<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Modals & Active State
	let showCreateModal = $state(false);
	let activeTicketId = $state<number | null>(null);
	let isEditingTicket = $state(false);

	// Return modal state
	let returnModalTicketId = $state<number | null>(null);
	let returnReason = $state('');
	let returnComplexity = $state<'alta' | 'media' | 'baja'>('media');
	let returnAuthor = $state('Julio');

	// Complete modal state
	let completeModalTicketId = $state<number | null>(null);
	let completeNote = $state('');
	let completeAuthor = $state('Julio');

	// View toggle: 'workflow' | 'queue_list'
	let currentView = $state<'workflow' | 'queue_list'>('workflow');

	// Local filters
	let searchQuery = $state('');
	let filterCreatedBy = $state('all');
	let filterComplexity = $state('all');
	let filterAssigned = $state('all');

	$effect(() => {
		if (data.filters.search) searchQuery = data.filters.search;
		if (data.filters.created_by) filterCreatedBy = data.filters.created_by;
		if (data.filters.complexity) filterComplexity = data.filters.complexity;
		if (data.filters.assigned_to) filterAssigned = data.filters.assigned_to;
		if (data.selectedTicket?.ticket?.id) activeTicketId = data.selectedTicket.ticket.id;
	});

	// Derived selected ticket
	let activeTicket = $derived(
		data.tickets.find((t) => t.id === activeTicketId) || data.selectedTicket?.ticket || null
	);

	// Client filtering
	let visibleTickets = $derived(
		data.tickets.filter((t) => {
			const matchesSearch =
				searchQuery.trim() === '' ||
				t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
				t.created_by.toLowerCase().includes(searchQuery.toLowerCase());

			const matchesCreatedBy = filterCreatedBy === 'all' || t.created_by === filterCreatedBy;
			const matchesComplexity = filterComplexity === 'all' || t.complexity === filterComplexity;
			const matchesAssigned = filterAssigned === 'all' || t.assigned_to === filterAssigned;

			return matchesSearch && matchesCreatedBy && matchesComplexity && matchesAssigned;
		})
	);

	// Columns separation
	let queueTickets = $derived(visibleTickets.filter((t) => t.status === 'queue'));
	let validationTickets = $derived(visibleTickets.filter((t) => t.status === 'in_validation'));
	let completedTickets = $derived(visibleTickets.filter((t) => t.status === 'completed'));

	function getComplexityBadge(comp: string) {
		switch (comp) {
			case 'alta':
				return { label: 'Complejidad Alta', class: 'bg-rose-100 text-rose-800 border-rose-300' };
			case 'media':
				return { label: 'Complejidad Media', class: 'bg-amber-100 text-amber-800 border-amber-300' };
			default:
				return { label: 'Complejidad Baja', class: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
		}
	}

	function getAvatarColor(name: string) {
		if (name.includes('Julio')) return 'bg-purple-600 text-white';
		if (name.includes('Domingo')) return 'bg-teal-600 text-white';
		if (name.includes('Yeison')) return 'bg-blue-600 text-white';
		return 'bg-slate-500 text-white';
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

	function openReturnModal(id: number, currentComplexity: 'alta' | 'media' | 'baja') {
		returnModalTicketId = id;
		returnReason = '';
		returnComplexity = currentComplexity;
	}

	function openCompleteModal(id: number) {
		completeModalTicketId = id;
		completeNote = '';
	}
</script>

<svelte:head>
	<title>Sistema de Tickets - Cola y Validación</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
	<!-- Navbar Principal -->
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
							Cola & Salidas
						</span>
					</h1>
					<p class="text-xs text-slate-500">Gestión de cola, orden por complejidad y validación de salidas</p>
				</div>
			</div>

			<!-- Métricas Destacadas de la Cola -->
			<div class="flex items-center gap-2.5 text-xs">
				<!-- Contador Grande de la Cola -->
				<div class="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-900 rounded-xl border border-amber-200 font-semibold shadow-xs">
					<span class="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
					<span>En Cola:</span>
					<span class="text-sm font-black text-amber-700">{data.stats.queue}</span>
				</div>

				<div class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-800 rounded-xl border border-blue-200 font-medium">
					<span>En Validación:</span>
					<span class="font-bold text-blue-700">{data.stats.inValidation}</span>
				</div>

				<div class="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 font-medium">
					<span>Salida Completa:</span>
					<span class="font-bold text-emerald-700">{data.stats.completed}</span>
				</div>

				{#if data.stats.returnedTotal > 0}
					<div class="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 font-medium" title="Tickets que fueron devueltos a la cola">
						<span>Devueltos:</span>
						<span class="font-bold text-rose-700">{data.stats.returnedTotal}</span>
					</div>
				{/if}
			</div>

			<!-- Acciones -->
			<div class="flex items-center gap-2">
				<!-- Selector de Vista -->
				<div class="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex text-xs font-medium">
					<button
						type="button"
						onclick={() => (currentView = 'workflow')}
						class="px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1.5 {currentView === 'workflow' ? 'bg-white shadow-xs text-indigo-700 font-semibold' : 'text-slate-600 hover:text-slate-900'}"
					>
						Flujo de Salida
					</button>
					<button
						type="button"
						onclick={() => (currentView = 'queue_list')}
						class="px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1.5 {currentView === 'queue_list' ? 'bg-white shadow-xs text-indigo-700 font-semibold' : 'text-slate-600 hover:text-slate-900'}"
					>
						Lista de la Cola
					</button>
				</div>

				<!-- Botón Registrar Ticket -->
				<button
					type="button"
					onclick={() => (showCreateModal = true)}
					class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm px-3.5 py-2 rounded-lg shadow-sm shadow-indigo-300 transition-all active:scale-95"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
					</svg>
					Registrar Ticket
				</button>
			</div>
		</div>
	</header>

	<!-- Barra de Búsqueda y Filtros -->
	<section class="bg-white border-b border-slate-200 shadow-2xs">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center gap-3">
			<!-- Buscador -->
			<div class="relative flex-1 min-w-[200px]">
				<svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Buscar por título, descripción o solicitante..."
					class="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
				/>
			</div>

			<!-- Quién lo hizo -->
			<div class="flex items-center gap-1.5 text-xs">
				<span class="text-slate-500 font-medium">Creado por:</span>
				<select
					bind:value={filterCreatedBy}
					class="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
				>
					<option value="all">Todos</option>
					<option value="Julio">Julio</option>
					<option value="Domingo">Domingo</option>
					<option value="Yeison">Yeison</option>
				</select>
			</div>

			<!-- Nivel de Complejidad -->
			<div class="flex items-center gap-1.5 text-xs">
				<span class="text-slate-500 font-medium">Complejidad:</span>
				<select
					bind:value={filterComplexity}
					class="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
				>
					<option value="all">Todas</option>
					<option value="alta">🔴 Alta</option>
					<option value="media">🟡 Media</option>
					<option value="baja">🟢 Baja</option>
				</select>
			</div>

			<!-- Validador / Asignado -->
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

			{#if searchQuery || filterCreatedBy !== 'all' || filterComplexity !== 'all' || filterAssigned !== 'all'}
				<button
					type="button"
					onclick={() => {
						searchQuery = '';
						filterCreatedBy = 'all';
						filterComplexity = 'all';
						filterAssigned = 'all';
					}}
					class="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline ml-auto"
				>
					Limpiar
				</button>
			{/if}
		</div>
	</section>

	<!-- Vista Principal -->
	<main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
		{#if visibleTickets.length === 0}
			<div class="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center max-w-md mx-auto my-12 shadow-xs">
				<div class="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
					</svg>
				</div>
				<h3 class="text-base font-semibold text-slate-800">No hay tickets en la cola</h3>
				<p class="text-xs text-slate-500 mt-1 mb-6">Registra una solicitud para iniciar la cola de trabajo.</p>
				<button
					type="button"
					onclick={() => (showCreateModal = true)}
					class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg"
				>
					Registrar primer ticket
				</button>
			</div>
		{:else if currentView === 'workflow'}
			<!-- VISTA DE FLUJO: COLA -> VALIDACIÓN -> SALIDA -->
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
				
				<!-- COLUMNA 1: COLA DE SOLICITUDES -->
				<div class="bg-amber-50/60 rounded-2xl p-4 border border-amber-200/90 shadow-xs flex flex-col min-h-[550px]">
					<!-- Header Cola -->
					<div class="flex items-center justify-between pb-3 mb-3 border-b border-amber-200/70">
						<div class="flex items-center gap-2">
							<span class="flex h-3 w-3 relative">
								<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
								<span class="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
							</span>
							<h2 class="font-bold text-xs uppercase tracking-wider text-amber-950">Cola de Solicitudes</h2>
						</div>
						<div class="bg-amber-100 text-amber-900 border border-amber-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
							{queueTickets.length} en espera
						</div>
					</div>

					<p class="text-[11px] text-amber-800/80 mb-3">
						Ordenadas por nivel de complejidad y tiempo en espera.
					</p>

					<!-- Cards de la Cola -->
					<div class="space-y-3.5 flex-1">
						{#each queueTickets as ticket, idx (ticket.id)}
							{@const compBadge = getComplexityBadge(ticket.complexity)}
							<div class="bg-white rounded-xl p-4 border border-amber-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
								<div>
									<!-- Posición en la Cola & Complejidad -->
									<div class="flex items-center justify-between gap-2 mb-2">
										<span class="inline-flex items-center gap-1 text-[11px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-md shadow-2xs">
											#{idx + 1} en Cola
										</span>
										<span class="text-[10px] font-semibold px-2 py-0.5 rounded-md border {compBadge.class}">
											{compBadge.label}
										</span>
									</div>

									<!-- Título -->
									<button
										type="button"
										onclick={() => openTicket(ticket.id)}
										class="text-left font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors w-full line-clamp-2 mb-1"
									>
										{ticket.title}
									</button>

									<!-- Descripción -->
									<p class="text-[11px] text-slate-600 line-clamp-2 mb-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
										{ticket.description}
									</p>

									<!-- Si fue retornado anteriormente -->
									{#if ticket.return_count > 0}
										<div class="mb-3 p-2 bg-rose-50 border border-rose-200 rounded-lg text-[10px] text-rose-800">
											<span class="font-bold flex items-center gap-1">
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
												</svg>
												Devuelto {ticket.return_count} {ticket.return_count === 1 ? 'vez' : 'veces'} a la cola:
											</span>
											<p class="italic text-rose-700 mt-0.5">"{ticket.return_reason}"</p>
										</div>
									{/if}
								</div>

								<!-- Pie de la Card -->
								<div class="pt-3 border-t border-slate-100 flex items-center justify-between mt-2">
									<div class="flex items-center gap-2">
										<div
											class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold {getAvatarColor(ticket.created_by)}"
											title={`Registrado por: ${ticket.created_by}`}
										>
											{ticket.created_by.charAt(0)}
										</div>
										<span class="text-[10px] text-slate-500 font-medium">Por: {ticket.created_by}</span>
									</div>

									<!-- Botón Tomar para Validar -->
									<form method="POST" action="?/takeForValidation" use:enhance>
										<input type="hidden" name="id" value={ticket.id} />
										<input type="hidden" name="validatorName" value="Julio" />
										<button
											type="submit"
											class="inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg transition-colors shadow-2xs"
											title="Tomar solicitud para validarla"
										>
											<span>Validar</span>
											<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
											</svg>
										</button>
									</form>
								</div>
							</div>
						{:else}
							<div class="text-center py-12 text-xs text-amber-700/70 italic">
								No hay tickets esperando en la cola.
							</div>
						{/each}
					</div>
				</div>

				<!-- COLUMNA 2: EN VALIDACIÓN -->
				<div class="bg-blue-50/60 rounded-2xl p-4 border border-blue-200/90 shadow-xs flex flex-col min-h-[550px]">
					<!-- Header Validación -->
					<div class="flex items-center justify-between pb-3 mb-3 border-b border-blue-200/70">
						<div class="flex items-center gap-2">
							<span class="inline-block w-2.5 h-2.5 rounded-full bg-blue-600"></span>
							<h2 class="font-bold text-xs uppercase tracking-wider text-blue-950">En Validación</h2>
						</div>
						<div class="bg-blue-100 text-blue-900 border border-blue-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
							{validationTickets.length} en revisión
						</div>
					</div>

					<p class="text-[11px] text-blue-800/80 mb-3">
						Validar si la tarea está completa para darle salida o retornarla a la cola.
					</p>

					<!-- Cards de Validación -->
					<div class="space-y-3.5 flex-1">
						{#each validationTickets as ticket (ticket.id)}
							{@const compBadge = getComplexityBadge(ticket.complexity)}
							<div class="bg-white rounded-xl p-4 border border-blue-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
								<div>
									<div class="flex items-center justify-between gap-2 mb-2">
										<span class="text-[10px] font-semibold px-2 py-0.5 rounded-md border {compBadge.class}">
											{compBadge.label}
										</span>
										<span class="text-[10px] text-slate-400 font-mono">#{ticket.id}</span>
									</div>

									<button
										type="button"
										onclick={() => openTicket(ticket.id)}
										class="text-left font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors w-full line-clamp-2 mb-1"
									>
										{ticket.title}
									</button>

									<p class="text-[11px] text-slate-600 line-clamp-2 mb-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
										{ticket.description}
									</p>

									<div class="flex items-center gap-2 text-[10px] text-slate-500 mb-3">
										<span>Solicitante: <strong class="text-slate-700">{ticket.created_by}</strong></span>
										<span>•</span>
										<span>Validador: <strong class="text-slate-700">{ticket.assigned_to}</strong></span>
									</div>
								</div>

								<!-- ACCIONES PRINCIPALES DE VALIDACIÓN: SALIDA O RETORNO -->
								<div class="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 mt-2">
									<!-- Botón Retornar a la Cola -->
									<button
										type="button"
										onclick={() => openReturnModal(ticket.id, ticket.complexity)}
										class="inline-flex items-center justify-center gap-1 text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 py-1.5 px-2 rounded-lg transition-colors"
										title="Devolver ticket a la cola por requerir ajustes"
									>
										<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
										</svg>
										<span>Retornar</span>
									</button>

									<!-- Botón Dar Salida (Completar) -->
									<button
										type="button"
										onclick={() => openCompleteModal(ticket.id)}
										class="inline-flex items-center justify-center gap-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-2 rounded-lg shadow-2xs transition-colors"
										title="Validar y dar salida al ticket"
									>
										<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
										</svg>
										<span>Dar Salida</span>
									</button>
								</div>
							</div>
						{:else}
							<div class="text-center py-12 text-xs text-blue-700/70 italic">
								No hay tickets en proceso de validación.
							</div>
						{/each}
					</div>
				</div>

				<!-- COLUMNA 3: SALIDA EXITOSA (COMPLETADOS) -->
				<div class="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200/90 shadow-xs flex flex-col min-h-[550px]">
					<!-- Header Completados -->
					<div class="flex items-center justify-between pb-3 mb-3 border-b border-emerald-200/70">
						<div class="flex items-center gap-2">
							<span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
							<h2 class="font-bold text-xs uppercase tracking-wider text-emerald-950">Con Salida (Completos)</h2>
						</div>
						<div class="bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
							{completedTickets.length} resueltos
						</div>
					</div>

					<p class="text-[11px] text-emerald-800/80 mb-3">
						Tickets validados y entregados exitosamente.
					</p>

					<!-- Cards Completadas -->
					<div class="space-y-3.5 flex-1">
						{#each completedTickets as ticket (ticket.id)}
							{@const compBadge = getComplexityBadge(ticket.complexity)}
							<div class="bg-white/90 rounded-xl p-4 border border-emerald-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group opacity-90 hover:opacity-100">
								<div>
									<div class="flex items-center justify-between gap-2 mb-2">
										<span class="text-[10px] font-semibold px-2 py-0.5 rounded-md border {compBadge.class}">
											{compBadge.label}
										</span>
										<span class="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
											<svg class="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
											</svg>
											Salida Aprobada
										</span>
									</div>

									<button
										type="button"
										onclick={() => openTicket(ticket.id)}
										class="text-left font-bold text-xs text-slate-800 group-hover:text-emerald-700 transition-colors w-full line-clamp-2 mb-1"
									>
										{ticket.title}
									</button>

									<p class="text-[11px] text-slate-500 line-clamp-2 mb-3">
										{ticket.description}
									</p>
								</div>

								<div class="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 mt-2">
									<span>Creado por: <strong class="text-slate-700">{ticket.created_by}</strong></span>
									<button
										type="button"
										onclick={() => openTicket(ticket.id)}
										class="text-indigo-600 hover:underline font-semibold"
									>
										Ver Notas
									</button>
								</div>
							</div>
						{:else}
							<div class="text-center py-12 text-xs text-emerald-700/70 italic">
								Aún no se han completado solicitudes.
							</div>
						{/each}
					</div>
				</div>

			</div>
		{:else}
			<!-- VISTA TABULAR: LISTA ORDENADA DE LA COLA -->
			<div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
				<div class="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
					<div>
						<h3 class="font-bold text-sm text-slate-900">Cola General de Solicitudes</h3>
						<p class="text-xs text-slate-500">Orden estricto según llegada y nivel de complejidad</p>
					</div>
					<span class="text-xs bg-indigo-100 text-indigo-800 font-bold px-3 py-1 rounded-full border border-indigo-200">
						{visibleTickets.length} tickets en sistema
					</span>
				</div>

				<div class="overflow-x-auto">
					<table class="w-full text-left border-collapse text-xs">
						<thead>
							<tr class="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
								<th class="py-3 px-4 w-20">Turno</th>
								<th class="py-3 px-4">Descripción del Ticket</th>
								<th class="py-3 px-4 w-32">Quién lo hizo</th>
								<th class="py-3 px-4 w-36">Complejidad</th>
								<th class="py-3 px-4 w-32">Estado</th>
								<th class="py-3 px-4 w-28 text-center">Reintentos</th>
								<th class="py-3 px-4 w-32 text-right">Acción</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100">
							{#each visibleTickets as ticket, idx (ticket.id)}
								{@const compBadge = getComplexityBadge(ticket.complexity)}
								<tr class="hover:bg-indigo-50/30 transition-colors">
									<td class="py-3.5 px-4 font-mono font-bold text-slate-600">
										{#if ticket.status === 'queue'}
											<span class="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-black text-xs">
												#{ticket.queue_position || idx + 1}
											</span>
										{:else}
											<span class="text-slate-400">#{ticket.id}</span>
										{/if}
									</td>
									<td class="py-3.5 px-4">
										<button
											type="button"
											onclick={() => openTicket(ticket.id)}
											class="text-left font-bold text-slate-900 hover:text-indigo-600 block"
										>
											{ticket.title}
										</button>
										<p class="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{ticket.description}</p>
										{#if ticket.return_reason}
											<span class="inline-block text-[10px] text-rose-600 font-medium mt-1">
												↩️ Motivo retorno: "{ticket.return_reason}"
											</span>
										{/if}
									</td>
									<td class="py-3.5 px-4">
										<div class="flex items-center gap-1.5">
											<div class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold {getAvatarColor(ticket.created_by)}">
												{ticket.created_by.charAt(0)}
											</div>
											<span class="font-semibold text-slate-800">{ticket.created_by}</span>
										</div>
									</td>
									<td class="py-3.5 px-4">
										<span class="inline-block px-2 py-0.5 rounded-md border font-semibold text-[11px] {compBadge.class}">
											{compBadge.label}
										</span>
									</td>
									<td class="py-3.5 px-4">
										{#if ticket.status === 'queue'}
											<span class="bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-md text-[11px]">En Cola</span>
										{:else if ticket.status === 'in_validation'}
											<span class="bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-md text-[11px]">En Validación</span>
										{:else}
											<span class="bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-md text-[11px]">Completado</span>
										{/if}
									</td>
									<td class="py-3.5 px-4 text-center">
										{#if ticket.return_count > 0}
											<span class="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
												{ticket.return_count} {ticket.return_count === 1 ? 'vez' : 'veces'}
											</span>
										{:else}
											<span class="text-slate-300">-</span>
										{/if}
									</td>
									<td class="py-3.5 px-4 text-right">
										<button
											type="button"
											onclick={() => openTicket(ticket.id)}
											class="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
										>
											Gestionar
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

<!-- MODAL REGISTRAR TICKET -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
		<div class="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
			<div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
				<div>
					<h3 class="font-bold text-base text-slate-900">Registrar Ticket</h3>
					<p class="text-xs text-slate-500">Ingresa la solicitud para incorporarla a la cola</p>
				</div>
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
					<label for="create_title" class="block text-xs font-semibold text-slate-700 mb-1">Título de la Solicitud *</label>
					<input
						id="create_title"
						type="text"
						name="title"
						required
						placeholder="Ej. Crear script de sincronización o reporte de ventas"
						class="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
					/>
				</div>

				<div>
					<label for="create_desc" class="block text-xs font-semibold text-slate-700 mb-1">Descripción detallada *</label>
					<textarea
						id="create_desc"
						name="description"
						rows="3"
						required
						placeholder="Explica qué se debe hacer, criterios de aceptación o detalles técnicos..."
						class="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none"
					></textarea>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="create_who" class="block text-xs font-semibold text-slate-700 mb-1">¿Quién lo hizo? (Solicitante) *</label>
						<select
							id="create_who"
							name="created_by"
							class="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
						>
							<option value="Julio">Julio</option>
							<option value="Domingo">Domingo</option>
							<option value="Yeison" selected>Yeison</option>
						</select>
					</div>

					<div>
						<label for="create_comp" class="block text-xs font-semibold text-slate-700 mb-1">Nivel de Complejidad *</label>
						<select
							id="create_comp"
							name="complexity"
							class="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
						>
							<option value="alta">🔴 Alta (Prioritaria en cola)</option>
							<option value="media" selected>🟡 Media</option>
							<option value="baja">🟢 Baja</option>
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
						Poner en Cola
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL RETORNAR A LA COLA -->
{#if returnModalTicketId}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
		<div class="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
			<div class="px-6 py-4 border-b border-slate-200 bg-rose-50 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="p-1.5 rounded-lg bg-rose-100 text-rose-700">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
						</svg>
					</span>
					<h3 class="font-bold text-sm text-rose-950">Retornar Ticket a la Cola</h3>
				</div>
				<button
					type="button"
					aria-label="Cerrar modal de retorno"
					onclick={() => (returnModalTicketId = null)}
					class="p-1 rounded text-rose-400 hover:text-rose-700"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<form
				method="POST"
				action="?/returnToQueue"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						returnModalTicketId = null;
					};
				}}
				class="p-6 space-y-4"
			>
				<input type="hidden" name="id" value={returnModalTicketId} />

				<div>
					<label for="ret_who" class="block text-xs font-semibold text-slate-700 mb-1">Validador que devuelve:</label>
					<select
						id="ret_who"
						name="returnedBy"
						bind:value={returnAuthor}
						class="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
					>
						<option value="Julio">Julio</option>
						<option value="Domingo">Domingo</option>
						<option value="Yeison">Yeison</option>
					</select>
				</div>

				<div>
					<label for="ret_reason" class="block text-xs font-semibold text-slate-700 mb-1">Motivo de la Devolución *</label>
					<textarea
						id="ret_reason"
						name="reason"
						required
						rows="3"
						placeholder="Explica qué falta o por qué no está completo (ej. Faltan pruebas, corregir formato, etc.)..."
						class="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
					></textarea>
				</div>

				<div>
					<label for="ret_comp" class="block text-xs font-semibold text-slate-700 mb-1">Reajustar Complejidad en la Cola:</label>
					<select
						id="ret_comp"
						name="adjustedComplexity"
						bind:value={returnComplexity}
						class="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
					>
						<option value="alta">🔴 Alta (esperar con mayor prioridad)</option>
						<option value="media">🟡 Media (esperar estándar)</option>
						<option value="baja">🟢 Baja</option>
					</select>
				</div>

				<div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
					<button
						type="button"
						onclick={() => (returnModalTicketId = null)}
						class="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
					>
						Cancelar
					</button>
					<button
						type="submit"
						class="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition-colors"
					>
						Confirmar y Devolver a la Cola
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL DAR SALIDA (COMPLETAR) -->
{#if completeModalTicketId}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
		<div class="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
			<div class="px-6 py-4 border-b border-slate-200 bg-emerald-50 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
						</svg>
					</span>
					<h3 class="font-bold text-sm text-emerald-950">Dar Salida al Ticket</h3>
				</div>
				<button
					type="button"
					aria-label="Cerrar modal de salida"
					onclick={() => (completeModalTicketId = null)}
					class="p-1 rounded text-emerald-400 hover:text-emerald-700"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<form
				method="POST"
				action="?/complete"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						completeModalTicketId = null;
					};
				}}
				class="p-6 space-y-4"
			>
				<input type="hidden" name="id" value={completeModalTicketId} />

				<div>
					<label for="comp_who" class="block text-xs font-semibold text-slate-700 mb-1">Validador que da la salida:</label>
					<select
						id="comp_who"
						name="resolvedBy"
						bind:value={completeAuthor}
						class="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
					>
						<option value="Julio">Julio</option>
						<option value="Domingo">Domingo</option>
						<option value="Yeison">Yeison</option>
					</select>
				</div>

				<div>
					<label for="comp_note" class="block text-xs font-semibold text-slate-700 mb-1">Nota de Cierre / Salida (Opcional):</label>
					<textarea
						id="comp_note"
						name="closingNote"
						rows="2"
						placeholder="Ej. Tarea validada y aprobada para producción..."
						class="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
					></textarea>
				</div>

				<div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
					<button
						type="button"
						onclick={() => (completeModalTicketId = null)}
						class="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
					>
						Cancelar
					</button>
					<button
						type="submit"
						class="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors"
					>
						Aprobar Salida
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL DETALLE / COMENTARIOS -->
{#if activeTicket}
	{@const compBadge = getComplexityBadge(activeTicket.complexity)}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
		<div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
			<!-- Encabezado Modal -->
			<div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
				<div class="flex items-center gap-3">
					<span class="font-mono text-xs font-bold text-slate-400">#{activeTicket.id}</span>
					<span class="text-xs font-semibold px-2 py-0.5 rounded-md border {compBadge.class}">
						{compBadge.label}
					</span>
					<span class="text-xs font-bold px-2 py-0.5 rounded-md {activeTicket.status === 'queue' ? 'bg-amber-100 text-amber-800' : activeTicket.status === 'in_validation' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}">
						{activeTicket.status === 'queue' ? 'En Cola de Espera' : activeTicket.status === 'in_validation' ? 'En Validación' : 'Completado (Salida Aprobada)'}
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
				<div>
					<h2 class="text-lg font-bold text-slate-900 mb-2">{activeTicket.title}</h2>
					<p class="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
						{activeTicket.description}
					</p>

					<!-- Metadata -->
					<div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
						<div class="bg-white p-2.5 rounded-lg border border-slate-200">
							<span class="text-slate-400 block text-[10px] uppercase font-bold">Quién lo hizo</span>
							<span class="font-semibold text-slate-800">{activeTicket.created_by}</span>
						</div>
						<div class="bg-white p-2.5 rounded-lg border border-slate-200">
							<span class="text-slate-400 block text-[10px] uppercase font-bold">Complejidad</span>
							<span class="font-semibold text-slate-800 capitalize">{activeTicket.complexity}</span>
						</div>
						<div class="bg-white p-2.5 rounded-lg border border-slate-200">
							<span class="text-slate-400 block text-[10px] uppercase font-bold">Devoluciones</span>
							<span class="font-semibold text-slate-800">{activeTicket.return_count} veces</span>
						</div>
						<div class="bg-white p-2.5 rounded-lg border border-slate-200">
							<span class="text-slate-400 block text-[10px] uppercase font-bold">Fecha de Registro</span>
							<span class="font-semibold text-slate-800">{activeTicket.created_at}</span>
						</div>
					</div>

					{#if activeTicket.return_reason}
						<div class="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
							<span class="font-bold block mb-1">Último motivo de retorno a la cola:</span>
							<p class="italic">{activeTicket.return_reason}</p>
						</div>
					{/if}
				</div>

				<!-- Bitácora de Comentarios -->
				<div class="border-t border-slate-200 pt-5">
					<h4 class="font-bold text-xs uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
						<svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
						</svg>
						Bitácora de Notas y Salidas
					</h4>

					{#if data.selectedTicket?.comments && data.selectedTicket.comments.length > 0}
						<div class="space-y-3 mb-4">
							{#each data.selectedTicket.comments as c (c.id)}
								<div class="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
									<div class="flex items-center justify-between mb-1">
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
						<p class="text-xs text-slate-400 italic mb-4">No hay notas registradas todavía.</p>
					{/if}

					<form
						method="POST"
						action="?/addComment"
						use:enhance
						class="flex gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200"
					>
						<input type="hidden" name="ticketId" value={activeTicket.id} />
						<input
							type="text"
							name="author"
							placeholder="Tu nombre (ej. Julio)"
							required
							class="w-1/3 text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
						/>
						<input
							type="text"
							name="content"
							placeholder="Escribe una observación..."
							required
							class="flex-1 text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
						/>
						<button
							type="submit"
							class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg"
						>
							Agregar Nota
						</button>
					</form>
				</div>
			</div>

			<!-- Footer Modal -->
			<div class="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
				<!-- Eliminar -->
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
						Eliminar
					</button>
				</form>

				<button
					type="button"
					onclick={closeTicketModal}
					class="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shadow-xs"
				>
					Cerrar
				</button>
			</div>
		</div>
	</div>
{/if}
