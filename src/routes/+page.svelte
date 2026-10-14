<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Modals & Active State
	let showCreateModal = $state(false);
	let activeTicketId = $state<number | null>(null);

	// Return modal state
	let returnModalTicketId = $state<number | null>(null);
	let returnReason = $state('');
	let returnComplexity = $state<'alta' | 'media' | 'baja'>('media');
	let returnAuthor = $state('Julio');

	// Complete modal state
	let completeModalTicketId = $state<number | null>(null);
	let completeNote = $state('');
	let completeAuthor = $state('Julio');

	// Form creation state
	let createCreatedBy = $state('Yeison');
	let createComplexity = $state<'alta' | 'media' | 'baja'>('media');

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

	let queueTickets = $derived(visibleTickets.filter((t) => t.status === 'queue'));
	let validationTickets = $derived(visibleTickets.filter((t) => t.status === 'in_validation'));
	let completedTickets = $derived(visibleTickets.filter((t) => t.status === 'completed'));

	const teamMembers = [
		{ name: 'Yeison', role: 'Dev Lead', color: 'bg-blue-600', border: 'border-blue-400' },
		{ name: 'Julio', role: 'Product / Tech', color: 'bg-purple-600', border: 'border-purple-400' },
		{ name: 'Domingo', role: 'Operations', color: 'bg-emerald-600', border: 'border-emerald-400' }
	];

	const quickReasons = [
		'Faltan especificaciones o requerimientos claros',
		'Rechazado en pruebas: requiere corrección de errores',
		'Pendiente de validación con el usuario solicitante',
		'Ajustar diseño o formato según estándares'
	];

	function getComplexityConfig(comp: string) {
		switch (comp) {
			case 'alta':
				return {
					label: 'Alta Complejidad',
					shortLabel: 'Alta',
					dotClass: 'bg-rose-500 shadow-rose-400/50',
					badgeClass: 'bg-rose-50 text-rose-700 border-rose-200'
				};
			case 'media':
				return {
					label: 'Media Complejidad',
					shortLabel: 'Media',
					dotClass: 'bg-amber-500 shadow-amber-400/50',
					badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
				};
			default:
				return {
					label: 'Baja Complejidad',
					shortLabel: 'Baja',
					dotClass: 'bg-emerald-500 shadow-emerald-400/50',
					badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
				};
		}
	}

	function getAvatarColor(name: string) {
		if (name.includes('Julio')) return 'bg-purple-600 text-white ring-purple-100';
		if (name.includes('Domingo')) return 'bg-emerald-600 text-white ring-emerald-100';
		if (name.includes('Yeison')) return 'bg-blue-600 text-white ring-blue-100';
		return 'bg-slate-500 text-white ring-slate-100';
	}

	function openTicket(id: number) {
		activeTicketId = id;
		const url = new URL(window.location.href);
		url.searchParams.set('ticket', id.toString());
		window.history.replaceState({}, '', url.toString());
	}

	function closeTicketModal() {
		activeTicketId = null;
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
	<title>TicketSystem — Cola Ágil y Salida de Tareas</title>
</svelte:head>

<div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
	
	<!-- NAVBAR PREMIUM LINEAR-STYLE -->
	<header class="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 shadow-lg">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
			
			<!-- Logo y Título -->
			<div class="flex items-center gap-3">
				<div class="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 flex items-center justify-center font-black text-white text-base shadow-md shadow-indigo-500/25 ring-1 ring-white/20">
					TS
				</div>
				<div>
					<div class="flex items-center gap-2">
						<span class="font-extrabold text-sm sm:text-base tracking-tight text-white">TicketSystem</span>
						<span class="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full">
							Cola & Salida
						</span>
					</div>
					<p class="text-[11px] text-slate-400">Flujo ágil de cola por complejidad y validación</p>
				</div>
			</div>

			<!-- Filtros Rápidos por Miembro (Avatares interactivos) -->
			<div class="hidden md:flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
				<button
					type="button"
					onclick={() => (filterCreatedBy = 'all')}
					class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all {filterCreatedBy === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'}"
				>
					Todos
				</button>
				{#each teamMembers as member}
					<button
						type="button"
						onclick={() => (filterCreatedBy = filterCreatedBy === member.name ? 'all' : member.name)}
						class="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all {filterCreatedBy === member.name ? 'bg-slate-700 text-white ring-1 ring-indigo-400' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}"
					>
						<span class="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white {member.color}">
							{member.name.charAt(0)}
						</span>
						<span>{member.name}</span>
					</button>
				{/each}
			</div>

			<!-- Botones de Acción -->
			<div class="flex items-center gap-3">
				<!-- Switcher de Vista -->
				<div class="bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/60 flex text-xs font-medium">
					<button
						type="button"
						onclick={() => (currentView = 'workflow')}
						class="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 {currentView === 'workflow' ? 'bg-slate-700 text-white font-semibold shadow-xs' : 'text-slate-400 hover:text-white'}"
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<rect x="3" y="3" width="7" height="18" rx="1.5" stroke-width="2" />
							<rect x="14" y="3" width="7" height="18" rx="1.5" stroke-width="2" />
						</svg>
						<span class="hidden sm:inline">Flujo Visual</span>
					</button>
					<button
						type="button"
						onclick={() => (currentView = 'queue_list')}
						class="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 {currentView === 'queue_list' ? 'bg-slate-700 text-white font-semibold shadow-xs' : 'text-slate-400 hover:text-white'}"
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<line x1="4" y1="6" x2="20" y2="6" stroke-width="2" stroke-linecap="round" />
							<line x1="4" y1="12" x2="20" y2="12" stroke-width="2" stroke-linecap="round" />
							<line x1="4" y1="18" x2="20" y2="18" stroke-width="2" stroke-linecap="round" />
						</svg>
						<span class="hidden sm:inline">Lista de Cola</span>
					</button>
				</div>

				<!-- Botón Registrar Ticket -->
				<button
					type="button"
					onclick={() => (showCreateModal = true)}
					class="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
					</svg>
					<span>Registrar Ticket</span>
				</button>
			</div>
		</div>
	</header>

	<!-- DASHBOARD EXECUTIVE METRICS -->
	<section class="bg-slate-900 border-b border-slate-800">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
			<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
				
				<!-- Métrica 1: En Cola -->
				<div class="bg-slate-800/60 rounded-2xl p-3.5 border border-amber-500/30 shadow-xs relative overflow-hidden group hover:border-amber-500/60 transition-all">
					<div class="absolute -right-3 -top-3 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none"></div>
					<div class="flex items-center justify-between mb-1.5">
						<span class="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
							<span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
							En Cola
						</span>
						<span class="text-[11px] font-mono text-slate-400">Esperando turno</span>
					</div>
					<div class="flex items-baseline gap-2">
						<span class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">{data.stats.queue}</span>
						<span class="text-[11px] text-amber-300 font-medium">
							({data.stats.highComplexity} de alta complejidad)
						</span>
					</div>
				</div>

				<!-- Métrica 2: En Validación -->
				<div class="bg-slate-800/60 rounded-2xl p-3.5 border border-blue-500/30 shadow-xs relative overflow-hidden group hover:border-blue-500/60 transition-all">
					<div class="absolute -right-3 -top-3 w-16 h-16 bg-blue-500/10 rounded-full blur-xl pointer-events-none"></div>
					<div class="flex items-center justify-between mb-1.5">
						<span class="text-xs font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
							<span class="w-2 h-2 rounded-full bg-blue-400"></span>
							En Validación
						</span>
						<span class="text-[11px] font-mono text-slate-400">En revisión</span>
					</div>
					<div class="flex items-baseline gap-2">
						<span class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">{data.stats.inValidation}</span>
						<span class="text-[11px] text-blue-300 font-medium">Mesa de trabajo</span>
					</div>
				</div>

				<!-- Métrica 3: Devueltos a la cola -->
				<div class="bg-slate-800/60 rounded-2xl p-3.5 border border-rose-500/30 shadow-xs relative overflow-hidden group hover:border-rose-500/60 transition-all">
					<div class="absolute -right-3 -top-3 w-16 h-16 bg-rose-500/10 rounded-full blur-xl pointer-events-none"></div>
					<div class="flex items-center justify-between mb-1.5">
						<span class="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
							<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
							</svg>
							Devoluciones
						</span>
						<span class="text-[11px] font-mono text-slate-400">Reintentos</span>
					</div>
					<div class="flex items-baseline gap-2">
						<span class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">{data.stats.returnedTotal}</span>
						<span class="text-[11px] text-rose-300 font-medium">Requerían ajustes</span>
					</div>
				</div>

				<!-- Métrica 4: Salidas Completadas -->
				<div class="bg-slate-800/60 rounded-2xl p-3.5 border border-emerald-500/30 shadow-xs relative overflow-hidden group hover:border-emerald-500/60 transition-all">
					<div class="absolute -right-3 -top-3 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>
					<div class="flex items-center justify-between mb-1.5">
						<span class="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
							<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
							</svg>
							Con Salida
						</span>
						<span class="text-[11px] font-mono text-slate-400">Completados</span>
					</div>
					<div class="flex items-baseline gap-2">
						<span class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">{data.stats.completed}</span>
						<span class="text-[11px] text-emerald-300 font-medium">Aprobados con éxito</span>
					</div>
				</div>

			</div>
		</div>
	</section>

	<!-- SEARCH AND COMPLEXITY FILTER BAR -->
	<section class="bg-slate-900/60 border-b border-slate-800">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center gap-3">
			
			<!-- Input de Búsqueda -->
			<div class="relative flex-1 min-w-[220px]">
				<svg class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Buscar por título, contenido o persona..."
					class="w-full pl-10 pr-4 py-1.5 text-xs bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
				/>
			</div>

			<!-- Filtro Complejidad en Pills -->
			<div class="flex items-center gap-1.5 text-xs">
				<span class="text-slate-400 font-medium text-[11px]">Complejidad:</span>
				<div class="bg-slate-800/80 p-0.5 rounded-xl border border-slate-700 flex text-xs">
					<button
						type="button"
						onclick={() => (filterComplexity = 'all')}
						class="px-2.5 py-1 rounded-lg transition-colors {filterComplexity === 'all' ? 'bg-slate-700 text-white font-semibold' : 'text-slate-400 hover:text-white'}"
					>
						Todas
					</button>
					<button
						type="button"
						onclick={() => (filterComplexity = 'alta')}
						class="px-2 py-1 rounded-lg transition-colors flex items-center gap-1 {filterComplexity === 'alta' ? 'bg-rose-500/20 text-rose-300 font-semibold' : 'text-slate-400 hover:text-rose-300'}"
					>
						<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
						Alta
					</button>
					<button
						type="button"
						onclick={() => (filterComplexity = 'media')}
						class="px-2 py-1 rounded-lg transition-colors flex items-center gap-1 {filterComplexity === 'media' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-400 hover:text-amber-300'}"
					>
						<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
						Media
					</button>
					<button
						type="button"
						onclick={() => (filterComplexity = 'baja')}
						class="px-2 py-1 rounded-lg transition-colors flex items-center gap-1 {filterComplexity === 'baja' ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-slate-400 hover:text-emerald-300'}"
					>
						<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
						Baja
					</button>
				</div>
			</div>

			<!-- Reset Filter -->
			{#if searchQuery || filterCreatedBy !== 'all' || filterComplexity !== 'all'}
				<button
					type="button"
					onclick={() => {
						searchQuery = '';
						filterCreatedBy = 'all';
						filterComplexity = 'all';
					}}
					class="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline ml-auto"
				>
					Limpiar filtros
				</button>
			{/if}
		</div>
	</section>

	<!-- MAIN WORKSPACE -->
	<main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
		{#if visibleTickets.length === 0}
			<div class="bg-slate-900 rounded-3xl border border-dashed border-slate-800 p-16 text-center max-w-md mx-auto my-12 shadow-xl">
				<div class="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-4 ring-1 ring-indigo-500/20">
					<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
					</svg>
				</div>
				<h3 class="text-base font-bold text-white">No hay tickets que mostrar</h3>
				<p class="text-xs text-slate-400 mt-1 mb-6">No se encontraron solicitudes con los filtros aplicados o la cola está vacía.</p>
				<button
					type="button"
					onclick={() => (showCreateModal = true)}
					class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg transition-all"
				>
					Registrar primer ticket
				</button>
			</div>
		{:else if currentView === 'workflow'}
			<!-- VISTA DE FLUJO: COLA -> VALIDACIÓN -> SALIDA -->
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
				
				<!-- COLUMNA 1: COLA DE SOLICITUDES -->
				<div class="bg-slate-900/80 rounded-3xl p-4 sm:p-5 border border-amber-500/20 shadow-xl flex flex-col min-h-[600px] backdrop-blur-xs">
					
					<!-- Header de la Cola -->
					<div class="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-800">
						<div class="flex items-center gap-2.5">
							<span class="flex h-2.5 w-2.5 relative">
								<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
								<span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
							</span>
							<div>
								<h2 class="font-extrabold text-xs uppercase tracking-wider text-amber-300">Cola de Espera</h2>
								<p class="text-[10px] text-slate-400">Orden estricto por complejidad</p>
							</div>
						</div>
						<span class="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold">
							{queueTickets.length} en fila
						</span>
					</div>

					<!-- Lista de Cards en la Cola -->
					<div class="space-y-3.5 flex-1">
						{#each queueTickets as ticket, idx (ticket.id)}
							{@const comp = getComplexityConfig(ticket.complexity)}
							<div class="bg-slate-800/90 rounded-2xl p-4 border border-slate-700/80 shadow-md hover:border-amber-400/60 hover:shadow-amber-500/5 transition-all group flex flex-col justify-between">
								<div>
									<!-- Turno & Complejidad -->
									<div class="flex items-center justify-between gap-2 mb-2.5">
										<div class="flex items-center gap-1.5">
											<span class="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
												TURNO #{idx + 1}
											</span>
											<span class="text-[10px] font-mono text-slate-500">#{ticket.id}</span>
										</div>
										<span class="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border {comp.badgeClass}">
											<span class="w-1.5 h-1.5 rounded-full {comp.dotClass}"></span>
											{comp.shortLabel}
										</span>
									</div>

									<!-- Título -->
									<button
										type="button"
										onclick={() => openTicket(ticket.id)}
										class="text-left font-bold text-xs sm:text-sm text-white group-hover:text-amber-300 transition-colors w-full line-clamp-2 mb-1.5"
									>
										{ticket.title}
									</button>

									<!-- Descripción -->
									<p class="text-[11px] text-slate-400 line-clamp-2 mb-3 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 leading-relaxed">
										{ticket.description}
									</p>

									<!-- Badge de Devolución -->
									{#if ticket.return_count > 0}
										<div class="mb-3 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-[11px] text-rose-300">
											<div class="flex items-center gap-1.5 font-bold mb-0.5">
												<svg class="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
												</svg>
												<span>Devuelto {ticket.return_count} {ticket.return_count === 1 ? 'vez' : 'veces'} a la cola</span>
											</div>
											<p class="text-[10px] text-rose-200/90 italic pl-5">"{ticket.return_reason}"</p>
										</div>
									{/if}
								</div>

								<!-- Pie de Card -->
								<div class="pt-3 border-t border-slate-700/60 flex items-center justify-between mt-2">
									<div class="flex items-center gap-2">
										<div class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ring-1 {getAvatarColor(ticket.created_by)}">
											{ticket.created_by.charAt(0)}
										</div>
										<span class="text-[10px] text-slate-400 font-medium">Por: <strong class="text-slate-200">{ticket.created_by}</strong></span>
									</div>

									<!-- Acción: Tomar para Validar -->
									<form method="POST" action="?/takeForValidation" use:enhance>
										<input type="hidden" name="id" value={ticket.id} />
										<input type="hidden" name="validatorName" value="Julio" />
										<button
											type="submit"
											class="inline-flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl shadow-md transition-all active:scale-95"
											title="Tomar solicitud para validarla"
										>
											<span>Validar</span>
											<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
											</svg>
										</button>
									</form>
								</div>
							</div>
						{:else}
							<div class="text-center py-16 text-xs text-amber-300/50 italic border border-dashed border-amber-500/20 rounded-2xl">
								No hay tickets esperando en la cola.
							</div>
						{/each}
					</div>
				</div>

				<!-- COLUMNA 2: EN VALIDACIÓN -->
				<div class="bg-slate-900/80 rounded-3xl p-4 sm:p-5 border border-blue-500/20 shadow-xl flex flex-col min-h-[600px] backdrop-blur-xs">
					
					<!-- Header Validación -->
					<div class="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-800">
						<div class="flex items-center gap-2.5">
							<span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
							<div>
								<h2 class="font-extrabold text-xs uppercase tracking-wider text-blue-300">En Validación</h2>
								<p class="text-[10px] text-slate-400">Verificar cumplimiento y salida</p>
							</div>
						</div>
						<span class="bg-blue-500/10 text-blue-300 border border-blue-500/30 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold">
							{validationTickets.length} en revisión
						</span>
					</div>

					<!-- Lista de Cards en Validación -->
					<div class="space-y-3.5 flex-1">
						{#each validationTickets as ticket (ticket.id)}
							{@const comp = getComplexityConfig(ticket.complexity)}
							<div class="bg-slate-800/90 rounded-2xl p-4 border border-blue-500/30 shadow-md hover:border-blue-400/60 transition-all flex flex-col justify-between group">
								<div>
									<div class="flex items-center justify-between gap-2 mb-2.5">
										<span class="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border {comp.badgeClass}">
											<span class="w-1.5 h-1.5 rounded-full {comp.dotClass}"></span>
											{comp.shortLabel}
										</span>
										<span class="font-mono text-[10px] text-slate-500">#{ticket.id}</span>
									</div>

									<button
										type="button"
										onclick={() => openTicket(ticket.id)}
										class="text-left font-bold text-xs sm:text-sm text-white group-hover:text-blue-300 transition-colors w-full line-clamp-2 mb-1.5"
									>
										{ticket.title}
									</button>

									<p class="text-[11px] text-slate-400 line-clamp-2 mb-3 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 leading-relaxed">
										{ticket.description}
									</p>

									<div class="flex items-center gap-3 text-[10px] text-slate-400 mb-3 bg-slate-900/30 p-2 rounded-lg">
										<span>Solicitó: <strong class="text-slate-200">{ticket.created_by}</strong></span>
										<span>•</span>
										<span>Valida: <strong class="text-blue-300">{ticket.assigned_to}</strong></span>
									</div>
								</div>

								<!-- ACCIONES DUALES: SALIDA O RETORNO -->
								<div class="pt-3 border-t border-slate-700/60 grid grid-cols-2 gap-2 mt-2">
									<!-- Retornar a la cola -->
									<button
										type="button"
										onclick={() => openReturnModal(ticket.id, ticket.complexity)}
										class="inline-flex items-center justify-center gap-1.5 text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 py-2 px-2.5 rounded-xl transition-all"
										title="Devolver a la cola para corregir"
									>
										<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
										</svg>
										<span>Retornar</span>
									</button>

									<!-- Dar Salida -->
									<button
										type="button"
										onclick={() => openCompleteModal(ticket.id)}
										class="inline-flex items-center justify-center gap-1.5 text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-2 px-2.5 rounded-xl shadow-md shadow-emerald-500/20 transition-all"
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
							<div class="text-center py-16 text-xs text-blue-300/50 italic border border-dashed border-blue-500/20 rounded-2xl">
								No hay tickets en proceso de validación.
							</div>
						{/each}
					</div>
				</div>

				<!-- COLUMNA 3: CON SALIDA (COMPLETOS) -->
				<div class="bg-slate-900/80 rounded-3xl p-4 sm:p-5 border border-emerald-500/20 shadow-xl flex flex-col min-h-[600px] backdrop-blur-xs">
					
					<!-- Header Completados -->
					<div class="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-800">
						<div class="flex items-center gap-2.5">
							<span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
							<div>
								<h2 class="font-extrabold text-xs uppercase tracking-wider text-emerald-300">Con Salida (Completos)</h2>
								<p class="text-[10px] text-slate-400">Entregados y resueltos</p>
							</div>
						</div>
						<span class="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold">
							{completedTickets.length} resueltos
						</span>
					</div>

					<!-- Lista Completadas -->
					<div class="space-y-3.5 flex-1">
						{#each completedTickets as ticket (ticket.id)}
							{@const comp = getComplexityConfig(ticket.complexity)}
							<div class="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60 shadow-sm hover:border-emerald-500/40 transition-all flex flex-col justify-between group">
								<div>
									<div class="flex items-center justify-between gap-2 mb-2">
										<span class="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border {comp.badgeClass}">
											<span class="w-1.5 h-1.5 rounded-full {comp.dotClass}"></span>
											{comp.shortLabel}
										</span>
										<span class="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
											<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
											</svg>
											Salida Aprobada
										</span>
									</div>

									<button
										type="button"
										onclick={() => openTicket(ticket.id)}
										class="text-left font-bold text-xs sm:text-sm text-slate-200 group-hover:text-emerald-300 transition-colors w-full line-clamp-2 mb-1.5"
									>
										{ticket.title}
									</button>

									<p class="text-[11px] text-slate-400 line-clamp-2 mb-3 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/80">
										{ticket.description}
									</p>
								</div>

								<div class="pt-2.5 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400 mt-2">
									<span>Creado por: <strong class="text-slate-300">{ticket.created_by}</strong></span>
									<button
										type="button"
										onclick={() => openTicket(ticket.id)}
										class="text-indigo-400 hover:text-indigo-300 font-semibold underline"
									>
										Ver Historial
									</button>
								</div>
							</div>
						{:else}
							<div class="text-center py-16 text-xs text-emerald-300/50 italic border border-dashed border-emerald-500/20 rounded-2xl">
								Aún no se han completado solicitudes.
							</div>
						{/each}
					</div>
				</div>

			</div>
		{:else}
			<!-- VISTA TABULAR ELEGANTE DE LA COLA -->
			<div class="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-xs">
				<div class="p-5 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
					<div>
						<h3 class="font-extrabold text-sm sm:text-base text-white tracking-tight">Tabla de Control de la Cola</h3>
						<p class="text-xs text-slate-400">Orden estricto de despacho según nivel de complejidad y antigüedad</p>
					</div>
					<span class="text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full">
						{visibleTickets.length} tickets en sistema
					</span>
				</div>

				<div class="overflow-x-auto">
					<table class="w-full text-left border-collapse text-xs">
						<thead>
							<tr class="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
								<th class="py-3.5 px-5 w-24">Turno</th>
								<th class="py-3.5 px-5">Descripción de la Solicitud</th>
								<th class="py-3.5 px-5 w-36">¿Quién lo hizo?</th>
								<th class="py-3.5 px-5 w-36">Complejidad</th>
								<th class="py-3.5 px-5 w-36">Estado</th>
								<th class="py-3.5 px-5 w-28 text-center">Devuelto</th>
								<th class="py-3.5 px-5 w-32 text-right">Acción</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-800/80">
							{#each visibleTickets as ticket, idx (ticket.id)}
								{@const comp = getComplexityConfig(ticket.complexity)}
								<tr class="hover:bg-slate-800/40 transition-colors">
									<td class="py-4 px-5 font-mono font-bold">
										{#if ticket.status === 'queue'}
											<span class="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs font-black">
												#{ticket.queue_position || idx + 1}
											</span>
										{:else}
											<span class="text-slate-500">#{ticket.id}</span>
										{/if}
									</td>
									<td class="py-4 px-5">
										<button
											type="button"
											onclick={() => openTicket(ticket.id)}
											class="text-left font-bold text-white hover:text-indigo-400 block text-xs sm:text-sm"
										>
											{ticket.title}
										</button>
										<p class="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{ticket.description}</p>
										{#if ticket.return_reason}
											<span class="inline-block text-[10px] text-rose-400 font-medium mt-1">
												↩️ Motivo retorno: "{ticket.return_reason}"
											</span>
										{/if}
									</td>
									<td class="py-4 px-5">
										<div class="flex items-center gap-2">
											<div class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold {getAvatarColor(ticket.created_by)}">
												{ticket.created_by.charAt(0)}
											</div>
											<span class="font-semibold text-slate-200">{ticket.created_by}</span>
										</div>
									</td>
									<td class="py-4 px-5">
										<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold {comp.badgeClass}">
											<span class="w-1.5 h-1.5 rounded-full {comp.dotClass}"></span>
											{comp.shortLabel}
										</span>
									</td>
									<td class="py-4 px-5">
										{#if ticket.status === 'queue'}
											<span class="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-full font-semibold text-[11px]">En Cola</span>
										{:else if ticket.status === 'in_validation'}
											<span class="bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2.5 py-1 rounded-full font-semibold text-[11px]">En Validación</span>
										{:else}
											<span class="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-1 rounded-full font-semibold text-[11px]">Con Salida</span>
										{/if}
									</td>
									<td class="py-4 px-5 text-center">
										{#if ticket.return_count > 0}
											<span class="font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full text-xs">
												{ticket.return_count}x
											</span>
										{:else}
											<span class="text-slate-600">-</span>
										{/if}
									</td>
									<td class="py-4 px-5 text-right">
										<button
											type="button"
											onclick={() => openTicket(ticket.id)}
											class="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline"
										>
											Gestionar →
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

<!-- MODAL REGISTRAR TICKET (REDESIGN HIGH-END) -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
		<div class="bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
			
			<div class="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center ring-1 ring-indigo-500/20">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
					</div>
					<div>
						<h3 class="font-extrabold text-base text-white tracking-tight">Registrar Nuevo Ticket</h3>
						<p class="text-xs text-slate-400">Ingresará a la cola ordenada por complejidad</p>
					</div>
				</div>
				<button
					type="button"
					aria-label="Cerrar modal de creación"
					onclick={() => (showCreateModal = false)}
					class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
				class="p-6 space-y-5"
			>
				<div>
					<label for="create_title" class="block text-xs font-semibold text-slate-300 mb-1.5">Título del Requerimiento *</label>
					<input
						id="create_title"
						type="text"
						name="title"
						required
						placeholder="Ej. Sincronización automática de bases de datos o informe de ventas"
						class="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
					/>
				</div>

				<div>
					<label for="create_desc" class="block text-xs font-semibold text-slate-300 mb-1.5">Descripción Detallada *</label>
					<textarea
						id="create_desc"
						name="description"
						rows="3"
						required
						placeholder="Explica qué se debe hacer, criterios de aceptación y detalles técnicos..."
						class="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-all"
					></textarea>
				</div>

				<!-- ¿Quién lo hizo? (Interactive Cards) -->
				<div>
					<span class="block text-xs font-semibold text-slate-300 mb-2">¿Quién lo hizo? (Solicitante) *</span>
					<div class="grid grid-cols-3 gap-2.5">
						{#each teamMembers as member}
							<label class="cursor-pointer">
								<input
									type="radio"
									name="created_by"
									value={member.name}
									bind:group={createCreatedBy}
									class="sr-only"
								/>
								<div class="p-3 rounded-2xl border text-center transition-all {createCreatedBy === member.name ? 'bg-indigo-600/20 border-indigo-500 text-white ring-1 ring-indigo-500' : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'}">
									<div class="w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-bold text-white mb-1.5 {member.color}">
										{member.name.charAt(0)}
									</div>
									<div class="text-xs font-bold">{member.name}</div>
									<div class="text-[10px] text-slate-400">{member.role}</div>
								</div>
							</label>
						{/each}
					</div>
				</div>

				<!-- Nivel de Complejidad (Segmented Visual Cards) -->
				<div>
					<span class="block text-xs font-semibold text-slate-300 mb-2">Nivel de Complejidad (Prioridad en Cola) *</span>
					<div class="grid grid-cols-3 gap-2.5">
						
						<!-- Alta -->
						<label class="cursor-pointer">
							<input
								type="radio"
								name="complexity"
								value="alta"
								bind:group={createComplexity}
								class="sr-only"
							/>
							<div class="p-3 rounded-2xl border transition-all {createComplexity === 'alta' ? 'bg-rose-500/20 border-rose-500 text-white ring-1 ring-rose-500' : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'}">
								<div class="flex items-center gap-1.5 mb-1 font-bold text-xs text-rose-400">
									<span class="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
									Alta
								</div>
								<p class="text-[10px] text-slate-400 leading-tight">Primeros turnos en cola</p>
							</div>
						</label>

						<!-- Media -->
						<label class="cursor-pointer">
							<input
								type="radio"
								name="complexity"
								value="media"
								bind:group={createComplexity}
								class="sr-only"
							/>
							<div class="p-3 rounded-2xl border transition-all {createComplexity === 'media' ? 'bg-amber-500/20 border-amber-500 text-white ring-1 ring-amber-500' : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'}">
								<div class="flex items-center gap-1.5 mb-1 font-bold text-xs text-amber-400">
									<span class="w-2 h-2 rounded-full bg-amber-500"></span>
									Media
								</div>
								<p class="text-[10px] text-slate-400 leading-tight">Flujo estándar de espera</p>
							</div>
						</label>

						<!-- Baja -->
						<label class="cursor-pointer">
							<input
								type="radio"
								name="complexity"
								value="baja"
								bind:group={createComplexity}
								class="sr-only"
							/>
							<div class="p-3 rounded-2xl border transition-all {createComplexity === 'baja' ? 'bg-emerald-500/20 border-emerald-500 text-white ring-1 ring-emerald-500' : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'}">
								<div class="flex items-center gap-1.5 mb-1 font-bold text-xs text-emerald-400">
									<span class="w-2 h-2 rounded-full bg-emerald-500"></span>
									Baja
								</div>
								<p class="text-[10px] text-slate-400 leading-tight">Resolución rápida</p>
							</div>
						</label>

					</div>
				</div>

				<div class="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
					<button
						type="button"
						onclick={() => (showCreateModal = false)}
						class="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
					>
						Cancelar
					</button>
					<button
						type="submit"
						class="px-5 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
					>
						Poner en Cola de Espera
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL RETORNAR A LA COLA -->
{#if returnModalTicketId}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
		<div class="bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-rose-500/30 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
			
			<div class="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-rose-500/10">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-300 flex items-center justify-center ring-1 ring-rose-500/30">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
						</svg>
					</div>
					<div>
						<h3 class="font-extrabold text-base text-white tracking-tight">Retornar Ticket a la Cola</h3>
						<p class="text-xs text-rose-300">Regresa a esperar turno con su motivo</p>
					</div>
				</div>
				<button
					type="button"
					aria-label="Cerrar modal de retorno"
					onclick={() => (returnModalTicketId = null)}
					class="p-2 rounded-xl text-slate-400 hover:text-white"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
					<label for="ret_who" class="block text-xs font-semibold text-slate-300 mb-1.5">Validador que devuelve:</label>
					<select
						id="ret_who"
						name="returnedBy"
						bind:value={returnAuthor}
						class="w-full text-xs px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
					>
						<option value="Julio">Julio</option>
						<option value="Domingo">Domingo</option>
						<option value="Yeison">Yeison</option>
					</select>
				</div>

				<div>
					<label for="ret_reason" class="block text-xs font-semibold text-slate-300 mb-1.5">Motivo del Retorno *</label>
					
					<!-- Atajos rápidos de motivos -->
					<div class="flex flex-wrap gap-1.5 mb-2">
						{#each quickReasons as qr}
							<button
								type="button"
								onclick={() => (returnReason = qr)}
								class="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-lg border border-slate-700 transition-colors text-left"
							>
								+ {qr}
							</button>
						{/each}
					</div>

					<textarea
						id="ret_reason"
						name="reason"
						required
						rows="3"
						bind:value={returnReason}
						placeholder="Indica qué falta o qué debe ser corregido antes de dar salida..."
						class="w-full text-xs px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
					></textarea>
				</div>

				<div>
					<label for="ret_comp" class="block text-xs font-semibold text-slate-300 mb-1.5">Reajustar Complejidad en la Cola:</label>
					<select
						id="ret_comp"
						name="adjustedComplexity"
						bind:value={returnComplexity}
						class="w-full text-xs px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
					>
						<option value="alta">🔴 Alta Complejidad (Prioridad alta en la cola)</option>
						<option value="media">🟡 Media Complejidad (Espera estándar)</option>
						<option value="baja">🟢 Baja Complejidad</option>
					</select>
				</div>

				<div class="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
					<button
						type="button"
						onclick={() => (returnModalTicketId = null)}
						class="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
					>
						Cancelar
					</button>
					<button
						type="submit"
						class="px-5 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-600/30 transition-all"
					>
						Confirmar y Devolver
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL DAR SALIDA (COMPLETAR) -->
{#if completeModalTicketId}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
		<div class="bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-emerald-500/30 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
			
			<div class="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-emerald-500/10">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center ring-1 ring-emerald-500/30">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
						</svg>
					</div>
					<div>
						<h3 class="font-extrabold text-base text-white tracking-tight">Dar Salida al Ticket</h3>
						<p class="text-xs text-emerald-300">Aprobar y marcar como terminado con éxito</p>
					</div>
				</div>
				<button
					type="button"
					aria-label="Cerrar modal de salida"
					onclick={() => (completeModalTicketId = null)}
					class="p-2 rounded-xl text-slate-400 hover:text-white"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
					<label for="comp_who" class="block text-xs font-semibold text-slate-300 mb-1.5">Validador que aprueba la salida:</label>
					<select
						id="comp_who"
						name="resolvedBy"
						bind:value={completeAuthor}
						class="w-full text-xs px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
					>
						<option value="Julio">Julio</option>
						<option value="Domingo">Domingo</option>
						<option value="Yeison">Yeison</option>
					</select>
				</div>

				<div>
					<label for="comp_note" class="block text-xs font-semibold text-slate-300 mb-1.5">Nota de Cierre / Dictamen (Opcional):</label>
					<textarea
						id="comp_note"
						name="closingNote"
						rows="2"
						placeholder="Ej. Tarea validada con éxito. Cumple con todos los requisitos..."
						class="w-full text-xs px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
					></textarea>
				</div>

				<div class="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
					<button
						type="button"
						onclick={() => (completeModalTicketId = null)}
						class="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
					>
						Cancelar
					</button>
					<button
						type="submit"
						class="px-5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-600/30 transition-all"
					>
						Aprobar y Dar Salida
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL DETALLE / HISTORIAL -->
{#if activeTicket}
	{@const comp = getComplexityConfig(activeTicket.complexity)}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
		<div class="bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
			
			<!-- Header Modal -->
			<div class="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
				<div class="flex items-center gap-3">
					<span class="font-mono text-xs font-bold text-slate-400">#{activeTicket.id}</span>
					<span class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border {comp.badgeClass}">
						<span class="w-1.5 h-1.5 rounded-full {comp.dotClass}"></span>
						{comp.label}
					</span>
					<span class="text-xs font-bold px-2.5 py-0.5 rounded-full {activeTicket.status === 'queue' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' : activeTicket.status === 'in_validation' ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'}">
						{activeTicket.status === 'queue' ? 'En Cola de Espera' : activeTicket.status === 'in_validation' ? 'En Validación' : 'Salida Aprobada'}
					</span>
				</div>
				<button
					type="button"
					aria-label="Cerrar modal de detalle"
					onclick={closeTicketModal}
					class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Contenido Scrollable -->
			<div class="p-6 overflow-y-auto space-y-6 flex-1">
				<div>
					<h2 class="text-lg font-bold text-white mb-2">{activeTicket.title}</h2>
					<p class="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80">
						{activeTicket.description}
					</p>

					<!-- Metadata Cards -->
					<div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
						<div class="bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
							<span class="text-slate-400 block text-[10px] uppercase font-bold">Quién lo hizo</span>
							<span class="font-bold text-white">{activeTicket.created_by}</span>
						</div>
						<div class="bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
							<span class="text-slate-400 block text-[10px] uppercase font-bold">Complejidad</span>
							<span class="font-bold text-white capitalize">{activeTicket.complexity}</span>
						</div>
						<div class="bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
							<span class="text-slate-400 block text-[10px] uppercase font-bold">Reintentos / Devoluciones</span>
							<span class="font-bold text-rose-400">{activeTicket.return_count} veces</span>
						</div>
						<div class="bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
							<span class="text-slate-400 block text-[10px] uppercase font-bold">Registro</span>
							<span class="font-bold text-white font-mono text-[11px]">{activeTicket.created_at}</span>
						</div>
					</div>

					{#if activeTicket.return_reason}
						<div class="mt-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-200">
							<span class="font-bold text-rose-300 block mb-1">Último motivo de retorno a la cola:</span>
							<p class="italic">"{activeTicket.return_reason}"</p>
						</div>
					{/if}
				</div>

				<!-- Bitácora -->
				<div class="border-t border-slate-800 pt-5">
					<h4 class="font-bold text-xs uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
						<svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
						</svg>
						Bitácora de Notas y Salidas
					</h4>

					{#if data.selectedTicket?.comments && data.selectedTicket.comments.length > 0}
						<div class="space-y-2.5 mb-4">
							{#each data.selectedTicket.comments as c (c.id)}
								<div class="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 text-xs">
									<div class="flex items-center justify-between mb-1">
										<div class="flex items-center gap-1.5">
											<div class="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold {getAvatarColor(c.author)}">
												{c.author.charAt(0)}
											</div>
											<span class="font-bold text-white">{c.author}</span>
										</div>
										<span class="text-[10px] text-slate-400 font-mono">{c.created_at}</span>
									</div>
									<p class="text-slate-300 whitespace-pre-wrap">{c.content}</p>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-xs text-slate-500 italic mb-4">No hay notas registradas para este ticket todavía.</p>
					{/if}

					<form
						method="POST"
						action="?/addComment"
						use:enhance
						class="flex gap-2 bg-slate-800/50 p-2 rounded-xl border border-slate-700"
					>
						<input type="hidden" name="ticketId" value={activeTicket.id} />
						<input
							type="text"
							name="author"
							placeholder="Tu nombre (ej. Julio)"
							required
							class="w-1/3 text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
						/>
						<input
							type="text"
							name="content"
							placeholder="Escribe una observación o actualización..."
							required
							class="flex-1 text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
						/>
						<button
							type="submit"
							class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors"
						>
							Comentar
						</button>
					</form>
				</div>
			</div>

			<!-- Footer Modal -->
			<div class="px-6 py-4 border-t border-slate-800 bg-slate-850 flex items-center justify-between">
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
						class="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1.5 hover:underline"
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
					class="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
				>
					Cerrar
				</button>
			</div>
		</div>
	</div>
{/if}
