<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	import type { Ticket } from '$lib/server/db';

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
	let searchInputElement = $state<HTMLInputElement | null>(null);

	// Drag & Drop State
	let draggedTicket = $state<Ticket | null>(null);
	let activeDropCol = $state<string | null>(null);
	let isSubmittingMove = $state(false);

	$effect(() => {
		if (data.filters.search) searchQuery = data.filters.search;
		if (data.filters.created_by) filterCreatedBy = data.filters.created_by;
		if (data.filters.complexity) filterComplexity = data.filters.complexity;
		if (data.selectedTicket?.ticket?.id) activeTicketId = data.selectedTicket.ticket.id;
	});

	// Global Keyboard Shortcuts (Anti-Jira speed)
	function handleKeydown(e: KeyboardEvent) {
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
			if (e.key === 'Escape') {
				(e.target as HTMLElement).blur();
				closeTicketModal();
				showCreateModal = false;
				returnModalTicketId = null;
				completeModalTicketId = null;
			}
			return;
		}

		if (e.key === 'n' || e.key === 'N') {
			e.preventDefault();
			showCreateModal = true;
		} else if (e.key === '/') {
			e.preventDefault();
			searchInputElement?.focus();
		} else if (e.key === 'Escape') {
			closeTicketModal();
			showCreateModal = false;
			returnModalTicketId = null;
			completeModalTicketId = null;
		}
	}

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

			return matchesSearch && matchesCreatedBy && matchesComplexity;
		})
	);

	let queueTickets = $derived(visibleTickets.filter((t) => t.status === 'queue'));
	let validationTickets = $derived(visibleTickets.filter((t) => t.status === 'in_validation'));
	let completedTickets = $derived(visibleTickets.filter((t) => t.status === 'completed'));

	const teamMembers = [
		{ name: 'Yeison', role: 'Dev Lead', color: 'bg-indigo-500' },
		{ name: 'Julio', role: 'Product / Tech', color: 'bg-violet-500' },
		{ name: 'Domingo', role: 'Operations', color: 'bg-emerald-500' }
	];

	const quickReasons = [
		'Faltan requerimientos o criterios claros',
		'Rechazado en pruebas: requiere corrección',
		'Validación pendiente con el cliente',
		'Ajustar diseño según especificaciones'
	];

	function getComplexityConfig(comp: string) {
		switch (comp) {
			case 'alta':
				return {
					shortLabel: 'Alta',
					dotClass: 'bg-rose-400 shadow-rose-500/50',
					badgeClass: 'bg-rose-500/10 text-rose-300 border-rose-500/30'
				};
			case 'media':
				return {
					shortLabel: 'Media',
					dotClass: 'bg-amber-400 shadow-amber-500/50',
					badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/30'
				};
			default:
				return {
					shortLabel: 'Baja',
					dotClass: 'bg-emerald-400 shadow-emerald-500/50',
					badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
				};
		}
	}

	function getAvatarColor(name: string) {
		if (name.includes('Julio')) return 'bg-violet-500 text-white';
		if (name.includes('Domingo')) return 'bg-emerald-500 text-white';
		if (name.includes('Yeison')) return 'bg-indigo-500 text-white';
		return 'bg-slate-600 text-white';
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

	// ─── DRAG AND DROP HANDLERS ──────────────────────────────────────
	function onDragStart(e: DragEvent, ticket: Ticket) {
		draggedTicket = ticket;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', ticket.id.toString());
		}
	}

	function onDragEnd() {
		draggedTicket = null;
		activeDropCol = null;
	}

	function onDragOver(e: DragEvent, colId: string) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		if (activeDropCol !== colId) {
			activeDropCol = colId;
		}
	}

	function onDragLeave(colId: string) {
		if (activeDropCol === colId) {
			activeDropCol = null;
		}
	}

	async function onDrop(e: DragEvent, targetCol: 'queue' | 'in_validation' | 'completed') {
		e.preventDefault();
		activeDropCol = null;

		if (!draggedTicket || draggedTicket.status === targetCol) {
			draggedTicket = null;
			return;
		}

		const movingTicket = draggedTicket;
		draggedTicket = null;

		// Si se arrastra de vuelta a la cola desde validación, solicitar motivo con modal
		if (movingTicket.status === 'in_validation' && targetCol === 'queue') {
			openReturnModal(movingTicket.id, movingTicket.complexity);
			return;
		}

		// Ejecutar cambio de estado rápido
		isSubmittingMove = true;
		const formData = new FormData();
		formData.append('id', movingTicket.id.toString());
		formData.append('targetStatus', targetCol);
		formData.append('actor', 'Julio');

		try {
			await fetch('?/dragMove', {
				method: 'POST',
				body: formData
			});
			await invalidateAll();
		} catch (err) {
			console.error('Error al mover ticket:', err);
		} finally {
			isSubmittingMove = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>PULSE — Queue & Dispatch Engine</title>
</svelte:head>

<div class="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white antialiased">
	
	<!-- TOP APP BAR -->
	<header class="bg-[#0d1322]/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30 shadow-2xl">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
			
			<!-- Brand: PULSE -->
			<div class="flex items-center gap-3">
				<div class="relative flex items-center justify-center">
					<div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-1 ring-white/20">
						<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
						</svg>
					</div>
					<span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0d1322]"></span>
				</div>
				<div>
					<div class="flex items-center gap-2">
						<span class="font-black text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">
							PULSE
						</span>
						<span class="text-[9px] font-mono font-bold tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 px-2 py-0.5 rounded-md uppercase">
							DISPATCH OS
						</span>
					</div>
					<p class="text-[11px] text-slate-400">Motor de cola y despacho por complejidad</p>
				</div>
			</div>

			<!-- Team Filter Pills (Fast toggle) -->
			<div class="hidden md:flex items-center gap-1.5 bg-white/[0.03] p-1 rounded-xl border border-white/[0.08]">
				<button
					type="button"
					onclick={() => (filterCreatedBy = 'all')}
					class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all {filterCreatedBy === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}"
				>
					Todos
				</button>
				{#each teamMembers as member}
					<button
						type="button"
						onclick={() => (filterCreatedBy = filterCreatedBy === member.name ? 'all' : member.name)}
						class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all {filterCreatedBy === member.name ? 'bg-white/10 text-white ring-1 ring-white/20' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'}"
					>
						<span class="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white {member.color}">
							{member.name.charAt(0)}
						</span>
						<span>{member.name}</span>
					</button>
				{/each}
			</div>

			<!-- Actions & Controls -->
			<div class="flex items-center gap-3">
				<!-- Switcher Vista -->
				<div class="bg-white/[0.04] p-0.5 rounded-xl border border-white/[0.08] flex text-xs">
					<button
						type="button"
						onclick={() => (currentView = 'workflow')}
						class="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 {currentView === 'workflow' ? 'bg-white/10 text-white font-semibold' : 'text-slate-400 hover:text-white'}"
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<rect x="3" y="3" width="7" height="18" rx="1.5" stroke-width="2" />
							<rect x="14" y="3" width="7" height="18" rx="1.5" stroke-width="2" />
						</svg>
						<span class="hidden sm:inline">Tablero Drag & Drop</span>
					</button>
					<button
						type="button"
						onclick={() => (currentView = 'queue_list')}
						class="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 {currentView === 'queue_list' ? 'bg-white/10 text-white font-semibold' : 'text-slate-400 hover:text-white'}"
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<line x1="4" y1="6" x2="20" y2="6" stroke-width="2" stroke-linecap="round" />
							<line x1="4" y1="12" x2="20" y2="12" stroke-width="2" stroke-linecap="round" />
							<line x1="4" y1="18" x2="20" y2="18" stroke-width="2" stroke-linecap="round" />
						</svg>
						<span class="hidden sm:inline">Lista Estricta</span>
					</button>
				</div>

				<!-- Quick Add Ticket -->
				<button
					type="button"
					onclick={() => (showCreateModal = true)}
					class="group inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 via-indigo-600 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white font-semibold text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow-lg shadow-indigo-500/20 border border-white/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
				>
					<svg class="w-4 h-4 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
					</svg>
					<span>Nuevo</span>
					<kbd class="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono bg-black/30 rounded border border-white/20 text-white/80">N</kbd>
				</button>
			</div>
		</div>
	</header>

	<!-- LIVE QUEUE PULSE HERO BAR -->
	<section class="bg-[#0b101c] border-b border-white/[0.06] relative overflow-hidden">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
			<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
				
				<!-- Live Queue -->
				<div class="bg-white/[0.02] hover:bg-white/[0.04] p-3 rounded-2xl border border-white/[0.07] transition-all flex items-center justify-between">
					<div>
						<div class="text-[10px] font-mono uppercase tracking-wider text-amber-400/90 font-bold flex items-center gap-1.5 mb-0.5">
							<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
							Cola de Espera
						</div>
						<div class="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
							{data.stats.queue} <span class="text-xs font-normal text-slate-400">tickets</span>
						</div>
					</div>
					<div class="text-right">
						<span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20">
							{data.stats.highComplexity} Alta
						</span>
					</div>
				</div>

				<!-- Mesa de Validación -->
				<div class="bg-white/[0.02] hover:bg-white/[0.04] p-3 rounded-2xl border border-white/[0.07] transition-all flex items-center justify-between">
					<div>
						<div class="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold flex items-center gap-1.5 mb-0.5">
							<span class="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
							En Validación
						</div>
						<div class="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
							{data.stats.inValidation} <span class="text-xs font-normal text-slate-400">activas</span>
						</div>
					</div>
					<div class="text-[10px] text-slate-400 font-mono">
						Revisando
					</div>
				</div>

				<!-- Devoluciones / Retornos -->
				<div class="bg-white/[0.02] hover:bg-white/[0.04] p-3 rounded-2xl border border-white/[0.07] transition-all flex items-center justify-between">
					<div>
						<div class="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold flex items-center gap-1.5 mb-0.5">
							<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
							</svg>
							Retornados
						</div>
						<div class="text-xl sm:text-2xl font-black font-mono text-rose-300 tracking-tight">
							{data.stats.returnedTotal} <span class="text-xs font-normal text-slate-400">reintentos</span>
						</div>
					</div>
					<div class="text-[10px] text-slate-400 font-mono">
						Ajustes
					</div>
				</div>

				<!-- Completados / Con Salida -->
				<div class="bg-white/[0.02] hover:bg-white/[0.04] p-3 rounded-2xl border border-white/[0.07] transition-all flex items-center justify-between">
					<div>
						<div class="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5 mb-0.5">
							<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
							</svg>
							Con Salida
						</div>
						<div class="text-xl sm:text-2xl font-black font-mono text-emerald-400 tracking-tight">
							{data.stats.completed} <span class="text-xs font-normal text-slate-400">resueltos</span>
						</div>
					</div>
					<div class="text-[10px] text-emerald-400/80 font-mono">
						100% Salida
					</div>
				</div>

			</div>
		</div>
	</section>

	<!-- QUICK FILTER & COMMAND BAR -->
	<section class="bg-[#090d16]/80 border-b border-white/[0.06]">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center gap-3">
			
			<!-- Fast Search with hotkey tip -->
			<div class="relative flex-1 min-w-[200px]">
				<svg class="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				<input
					bind:this={searchInputElement}
					type="text"
					bind:value={searchQuery}
					placeholder="Buscar solicitud o creador..."
					class="w-full pl-9 pr-9 py-1.5 text-xs bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white/[0.06] transition-all"
				/>
				<kbd class="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9px] font-mono bg-white/[0.05] rounded text-slate-400 border border-white/[0.1]">
					/
				</kbd>
			</div>

			<!-- Complexity Chips -->
			<div class="flex items-center gap-1 text-xs">
				<button
					type="button"
					onclick={() => (filterComplexity = 'all')}
					class="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors {filterComplexity === 'all' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}"
				>
					Todas
				</button>
				<button
					type="button"
					onclick={() => (filterComplexity = 'alta')}
					class="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 {filterComplexity === 'alta' ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30' : 'text-slate-400 hover:text-rose-300'}"
				>
					<span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
					Alta
				</button>
				<button
					type="button"
					onclick={() => (filterComplexity = 'media')}
					class="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 {filterComplexity === 'media' ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30' : 'text-slate-400 hover:text-amber-300'}"
				>
					<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
					Media
				</button>
				<button
					type="button"
					onclick={() => (filterComplexity = 'baja')}
					class="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 {filterComplexity === 'baja' ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30' : 'text-slate-400 hover:text-emerald-300'}"
				>
					<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
					Baja
				</button>
			</div>

			<!-- Reset -->
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

	<!-- MAIN KANBAN WITH DRAG & DROP -->
	<main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
		{#if visibleTickets.length === 0}
			<div class="bg-white/[0.02] rounded-3xl border border-dashed border-white/10 p-16 text-center max-w-md mx-auto my-12">
				<div class="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-3 ring-1 ring-indigo-500/20">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
					</svg>
				</div>
				<h3 class="text-sm font-bold text-white">No hay tickets activos</h3>
				<p class="text-xs text-slate-400 mt-1 mb-5">Presiona la tecla <kbd class="px-1.5 py-0.5 rounded bg-white/10 font-mono text-white text-[10px]">N</kbd> para registrar un ticket.</p>
				<button
					type="button"
					onclick={() => (showCreateModal = true)}
					class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all"
				>
					Crear Solicitud
				</button>
			</div>
		{:else if currentView === 'workflow'}
			<!-- 3 COLUMNAS INTERACTIVAS CON DRAG & DROP -->
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
				
				<!-- COLUMNA 1: COLA DE ESPERA -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					ondragover={(e) => onDragOver(e, 'queue')}
					ondragleave={() => onDragLeave('queue')}
					ondrop={(e) => onDrop(e, 'queue')}
					class="rounded-3xl p-4 transition-all flex flex-col min-h-[580px] {activeDropCol === 'queue' ? 'ring-2 ring-amber-400 bg-amber-500/10 border-amber-400/50' : 'bg-white/[0.02] border border-white/[0.07]'}"
				>
					<!-- Header de la Columna -->
					<div class="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
						<div class="flex items-center gap-2">
							<span class="w-2 h-2 rounded-full bg-amber-400"></span>
							<h2 class="font-bold text-xs uppercase tracking-wider text-slate-200">Cola de Espera</h2>
						</div>
						<span class="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
							{queueTickets.length}
						</span>
					</div>

					<!-- Lista de Cards -->
					<div class="space-y-3 flex-1">
						{#each queueTickets as ticket, idx (ticket.id)}
							{@const comp = getComplexityConfig(ticket.complexity)}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div
								draggable="true"
								ondragstart={(e) => onDragStart(e, ticket)}
								ondragend={onDragEnd}
								class="bg-[#121929]/95 rounded-2xl p-4 border border-white/[0.08] shadow-md hover:border-amber-400/40 hover:shadow-xl hover:shadow-amber-500/5 transition-all group cursor-grab active:cursor-grabbing {draggedTicket?.id === ticket.id ? 'opacity-40 scale-95' : ''}"
							>
								<!-- Top Card Bar con Grip de Arrastre -->
								<div class="flex items-center justify-between gap-2 mb-2">
									<div class="flex items-center gap-2">
										<span class="text-slate-500 group-hover:text-slate-300 transition-colors" title="Arrastra para mover a otra columna">
											<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
											</svg>
										</span>
										<span class="font-mono text-xs font-black text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
											TURNO #{idx + 1}
										</span>
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
									class="text-left font-bold text-xs sm:text-sm text-white group-hover:text-amber-200 transition-colors w-full line-clamp-2 mb-1.5"
								>
									{ticket.title}
								</button>

								<!-- Descripción -->
								<p class="text-[11px] text-slate-400 line-clamp-2 mb-3 leading-relaxed">
									{ticket.description}
								</p>

								<!-- Banner de Devolución si aplica -->
								{#if ticket.return_count > 0}
									<div class="mb-3 p-2 bg-rose-500/10 border border-rose-500/25 rounded-xl text-[10px] text-rose-300">
										<span class="font-bold flex items-center gap-1">
											↩️ Devuelto {ticket.return_count}x a la cola:
										</span>
										<p class="italic text-rose-200/80 mt-0.5 truncate">"{ticket.return_reason}"</p>
									</div>
								{/if}

								<!-- Card Footer -->
								<div class="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs">
									<div class="flex items-center gap-1.5">
										<div class="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black {getAvatarColor(ticket.created_by)}">
											{ticket.created_by.charAt(0)}
										</div>
										<span class="text-[10px] text-slate-400 font-medium">{ticket.created_by}</span>
									</div>

									<form method="POST" action="?/takeForValidation" use:enhance>
										<input type="hidden" name="id" value={ticket.id} />
										<input type="hidden" name="validatorName" value="Julio" />
										<button
											type="submit"
											class="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
										>
											<span>Validar</span>
											<span>→</span>
										</button>
									</form>
								</div>
							</div>
						{:else}
							<div class="h-40 rounded-2xl border border-dashed border-white/5 flex items-center justify-center text-xs text-slate-500 italic">
								Arrastra tickets aquí para ponerlos en cola
							</div>
						{/each}
					</div>
				</div>

				<!-- COLUMNA 2: EN VALIDACIÓN -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					ondragover={(e) => onDragOver(e, 'in_validation')}
					ondragleave={() => onDragLeave('in_validation')}
					ondrop={(e) => onDrop(e, 'in_validation')}
					class="rounded-3xl p-4 transition-all flex flex-col min-h-[580px] {activeDropCol === 'in_validation' ? 'ring-2 ring-sky-400 bg-sky-500/10 border-sky-400/50' : 'bg-white/[0.02] border border-white/[0.07]'}"
				>
					<!-- Header Validación -->
					<div class="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
						<div class="flex items-center gap-2">
							<span class="w-2 h-2 rounded-full bg-sky-400"></span>
							<h2 class="font-bold text-xs uppercase tracking-wider text-slate-200">En Validación</h2>
						</div>
						<span class="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
							{validationTickets.length}
						</span>
					</div>

					<!-- Lista de Cards en Validación -->
					<div class="space-y-3 flex-1">
						{#each validationTickets as ticket (ticket.id)}
							{@const comp = getComplexityConfig(ticket.complexity)}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div
								draggable="true"
								ondragstart={(e) => onDragStart(e, ticket)}
								ondragend={onDragEnd}
								class="bg-[#121929]/95 rounded-2xl p-4 border border-sky-500/20 shadow-md hover:border-sky-400/50 transition-all group cursor-grab active:cursor-grabbing {draggedTicket?.id === ticket.id ? 'opacity-40 scale-95' : ''}"
							>
								<!-- Top Bar con Grip -->
								<div class="flex items-center justify-between gap-2 mb-2">
									<div class="flex items-center gap-2">
										<span class="text-slate-500 group-hover:text-slate-300 transition-colors">
											<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
											</svg>
										</span>
										<span class="font-mono text-[10px] text-slate-500">#{ticket.id}</span>
									</div>
									<span class="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border {comp.badgeClass}">
										<span class="w-1.5 h-1.5 rounded-full {comp.dotClass}"></span>
										{comp.shortLabel}
									</span>
								</div>

								<button
									type="button"
									onclick={() => openTicket(ticket.id)}
									class="text-left font-bold text-xs sm:text-sm text-white group-hover:text-sky-300 transition-colors w-full line-clamp-2 mb-1.5"
								>
									{ticket.title}
								</button>

								<p class="text-[11px] text-slate-400 line-clamp-2 mb-3 leading-relaxed">
									{ticket.description}
								</p>

								<div class="flex items-center justify-between text-[10px] text-slate-400 mb-3 bg-white/[0.02] p-2 rounded-xl border border-white/[0.04]">
									<span>Por: <strong class="text-slate-200">{ticket.created_by}</strong></span>
									<span>Valida: <strong class="text-sky-300">{ticket.assigned_to}</strong></span>
								</div>

								<!-- ACCIONES DUALES: RETORNAR O DAR SALIDA -->
								<div class="pt-2.5 border-t border-white/[0.06] grid grid-cols-2 gap-2">
									<button
										type="button"
										onclick={() => openReturnModal(ticket.id, ticket.complexity)}
										class="inline-flex items-center justify-center gap-1 text-[11px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 py-1.5 rounded-xl transition-all"
									>
										<span>↩ Retornar</span>
									</button>

									<button
										type="button"
										onclick={() => openCompleteModal(ticket.id)}
										class="inline-flex items-center justify-center gap-1 text-[11px] font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-1.5 rounded-xl shadow-md transition-all"
									>
										<span>✓ Dar Salida</span>
									</button>
								</div>
							</div>
						{:else}
							<div class="h-40 rounded-2xl border border-dashed border-white/5 flex items-center justify-center text-xs text-slate-500 italic">
								Arrastra aquí una solicitud para validarla
							</div>
						{/each}
					</div>
				</div>

				<!-- COLUMNA 3: CON SALIDA (COMPLETOS) -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					ondragover={(e) => onDragOver(e, 'completed')}
					ondragleave={() => onDragLeave('completed')}
					ondrop={(e) => onDrop(e, 'completed')}
					class="rounded-3xl p-4 transition-all flex flex-col min-h-[580px] {activeDropCol === 'completed' ? 'ring-2 ring-emerald-400 bg-emerald-500/10 border-emerald-400/50' : 'bg-white/[0.02] border border-white/[0.07]'}"
				>
					<!-- Header Completados -->
					<div class="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
						<div class="flex items-center gap-2">
							<span class="w-2 h-2 rounded-full bg-emerald-400"></span>
							<h2 class="font-bold text-xs uppercase tracking-wider text-slate-200">Con Salida</h2>
						</div>
						<span class="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
							{completedTickets.length}
						</span>
					</div>

					<!-- Lista Completadas -->
					<div class="space-y-3 flex-1">
						{#each completedTickets as ticket (ticket.id)}
							{@const comp = getComplexityConfig(ticket.complexity)}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div
								draggable="true"
								ondragstart={(e) => onDragStart(e, ticket)}
								ondragend={onDragEnd}
								class="bg-[#121929]/70 rounded-2xl p-4 border border-white/[0.05] shadow-xs hover:border-emerald-500/40 transition-all group cursor-grab active:cursor-grabbing {draggedTicket?.id === ticket.id ? 'opacity-40 scale-95' : ''}"
							>
								<div class="flex items-center justify-between gap-2 mb-2">
									<div class="flex items-center gap-1.5">
										<span class="text-slate-600 group-hover:text-slate-400 transition-colors">
											<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
											</svg>
										</span>
										<span class="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
											✓ Salida Aprobada
										</span>
									</div>
									<span class="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border {comp.badgeClass}">
										{comp.shortLabel}
									</span>
								</div>

								<button
									type="button"
									onclick={() => openTicket(ticket.id)}
									class="text-left font-bold text-xs text-slate-300 group-hover:text-white transition-colors w-full line-clamp-2 mb-1.5"
								>
									{ticket.title}
								</button>

								<p class="text-[11px] text-slate-500 line-clamp-2 mb-2.5">
									{ticket.description}
								</p>

								<div class="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-slate-400">
									<span>Por: {ticket.created_by}</span>
									<button
										type="button"
										onclick={() => openTicket(ticket.id)}
										class="text-indigo-400 hover:text-indigo-300 font-medium"
									>
										Ver Notas →
									</button>
								</div>
							</div>
						{:else}
							<div class="h-40 rounded-2xl border border-dashed border-white/5 flex items-center justify-center text-xs text-slate-500 italic">
								Arrastra tickets aquí para darles salida aprobada
							</div>
						{/each}
					</div>
				</div>

			</div>
		{:else}
			<!-- VISTA LISTA ESTRICTA DE LA COLA -->
			<div class="bg-white/[0.02] rounded-3xl border border-white/[0.08] shadow-2xl overflow-hidden backdrop-blur-xl">
				<div class="p-5 border-b border-white/[0.06] flex items-center justify-between">
					<div>
						<h3 class="font-extrabold text-sm sm:text-base text-white tracking-tight">Despacho Estricto de la Cola</h3>
						<p class="text-xs text-slate-400">Prioridad absoluta por nivel de complejidad y antigüedad de espera</p>
					</div>
					<span class="text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 px-3 py-1 rounded-full">
						{visibleTickets.length} registros
					</span>
				</div>

				<div class="overflow-x-auto">
					<table class="w-full text-left border-collapse text-xs">
						<thead>
							<tr class="bg-white/[0.02] border-b border-white/[0.06] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
								<th class="py-3.5 px-5 w-24">Turno</th>
								<th class="py-3.5 px-5">Solicitud</th>
								<th class="py-3.5 px-5 w-36">¿Quién lo hizo?</th>
								<th class="py-3.5 px-5 w-36">Complejidad</th>
								<th class="py-3.5 px-5 w-36">Estado</th>
								<th class="py-3.5 px-5 w-28 text-center">Devuelto</th>
								<th class="py-3.5 px-5 w-32 text-right">Acción</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-white/[0.04]">
							{#each visibleTickets as ticket, idx (ticket.id)}
								{@const comp = getComplexityConfig(ticket.complexity)}
								<tr class="hover:bg-white/[0.03] transition-colors">
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
												↩ Motivo retorno: "{ticket.return_reason}"
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
											<span class="bg-sky-500/10 text-sky-300 border border-sky-500/20 px-2.5 py-1 rounded-full font-semibold text-[11px]">En Validación</span>
										{:else}
											<span class="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-1 rounded-full font-semibold text-[11px]">Con Salida</span>
										{/if}
									</td>
									<td class="py-4 px-5 text-center">
										{#if ticket.return_count > 0}
											<span class="font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full text-xs">
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
											class="text-indigo-400 hover:text-indigo-300 font-semibold"
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

<!-- MODAL REGISTRAR NUEVA SOLICITUD (LINEAR STYLE) -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
		<div class="bg-[#101726] rounded-3xl max-w-lg w-full shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
			
			<div class="px-6 py-5 border-b border-white/10 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center ring-1 ring-indigo-500/20">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
						</svg>
					</div>
					<div>
						<h3 class="font-black text-base text-white tracking-tight">Nueva Solicitud</h3>
						<p class="text-xs text-slate-400">Entrará directamente a la cola de despacho</p>
					</div>
				</div>
				<button
					type="button"
					aria-label="Cerrar modal de creación"
					onclick={() => (showCreateModal = false)}
					class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
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
					<label for="create_title" class="block text-xs font-semibold text-slate-300 mb-1.5">Título del Ticket *</label>
					<input
						id="create_title"
						type="text"
						name="title"
						required
						placeholder="Ej. Sincronización de credenciales o ajuste de API"
						class="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
					/>
				</div>

				<div>
					<label for="create_desc" class="block text-xs font-semibold text-slate-300 mb-1.5">Descripción Detallada *</label>
					<textarea
						id="create_desc"
						name="description"
						rows="3"
						required
						placeholder="Explica qué se debe validar o realizar con exactitud..."
						class="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none transition-all"
					></textarea>
				</div>

				<!-- ¿Quién lo hizo? -->
				<div>
					<span class="block text-xs font-semibold text-slate-300 mb-2">¿Quién lo hizo? (Creador)</span>
					<div class="grid grid-cols-3 gap-2">
						{#each teamMembers as member}
							<label class="cursor-pointer">
								<input
									type="radio"
									name="created_by"
									value={member.name}
									bind:group={createCreatedBy}
									class="sr-only"
								/>
								<div class="p-2.5 rounded-2xl border text-center transition-all {createCreatedBy === member.name ? 'bg-indigo-600/20 border-indigo-500 text-white ring-1 ring-indigo-500' : 'bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.05]'}" >
									<div class="w-6 h-6 mx-auto rounded-full flex items-center justify-center text-[10px] font-black text-white mb-1 {member.color}">
										{member.name.charAt(0)}
									</div>
									<div class="text-xs font-bold">{member.name}</div>
									<div class="text-[9px] text-slate-400">{member.role}</div>
								</div>
							</label>
						{/each}
					</div>
				</div>

				<!-- Nivel de Complejidad -->
				<div>
					<span class="block text-xs font-semibold text-slate-300 mb-2">Nivel de Complejidad</span>
					<div class="grid grid-cols-3 gap-2">
						<label class="cursor-pointer">
							<input
								type="radio"
								name="complexity"
								value="alta"
								bind:group={createComplexity}
								class="sr-only"
							/>
							<div class="p-2.5 rounded-2xl border transition-all {createComplexity === 'alta' ? 'bg-rose-500/20 border-rose-500 text-white ring-1 ring-rose-500' : 'bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.05]'}">
								<div class="flex items-center gap-1.5 font-bold text-xs text-rose-300 mb-0.5">
									<span class="w-2 h-2 rounded-full bg-rose-500"></span>
									Alta
								</div>
								<p class="text-[9px] text-slate-400">Prioridad máxima en cola</p>
							</div>
						</label>

						<label class="cursor-pointer">
							<input
								type="radio"
								name="complexity"
								value="media"
								bind:group={createComplexity}
								class="sr-only"
							/>
							<div class="p-2.5 rounded-2xl border transition-all {createComplexity === 'media' ? 'bg-amber-500/20 border-amber-500 text-white ring-1 ring-amber-500' : 'bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.05]'}">
								<div class="flex items-center gap-1.5 font-bold text-xs text-amber-300 mb-0.5">
									<span class="w-2 h-2 rounded-full bg-amber-500"></span>
									Media
								</div>
								<p class="text-[9px] text-slate-400">Espera estándar</p>
							</div>
						</label>

						<label class="cursor-pointer">
							<input
								type="radio"
								name="complexity"
								value="baja"
								bind:group={createComplexity}
								class="sr-only"
							/>
							<div class="p-2.5 rounded-2xl border transition-all {createComplexity === 'baja' ? 'bg-emerald-500/20 border-emerald-500 text-white ring-1 ring-emerald-500' : 'bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.05]'}">
								<div class="flex items-center gap-1.5 font-bold text-xs text-emerald-300 mb-0.5">
									<span class="w-2 h-2 rounded-full bg-emerald-500"></span>
									Baja
								</div>
								<p class="text-[9px] text-slate-400">Resolución ágil</p>
							</div>
						</label>
					</div>
				</div>

				<div class="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
					<button
						type="button"
						onclick={() => (showCreateModal = false)}
						class="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
					>
						Cancelar
					</button>
					<button
						type="submit"
						class="px-5 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
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
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
		<div class="bg-[#101726] rounded-3xl max-w-md w-full shadow-2xl border border-rose-500/30 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
			
			<div class="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-rose-500/10">
				<div>
					<h3 class="font-black text-base text-white tracking-tight">Retornar a la Cola</h3>
					<p class="text-xs text-rose-300">Regresa a esperar turno con su motivo</p>
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
						class="w-full text-xs px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
					>
						<option value="Julio">Julio</option>
						<option value="Domingo">Domingo</option>
						<option value="Yeison">Yeison</option>
					</select>
				</div>

				<div>
					<label for="ret_reason" class="block text-xs font-semibold text-slate-300 mb-1.5">Motivo del Retorno *</label>
					
					<div class="flex flex-wrap gap-1 mb-2">
						{#each quickReasons as qr}
							<button
								type="button"
								onclick={() => (returnReason = qr)}
								class="text-[10px] bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 px-2 py-1 rounded-lg border border-white/10 transition-colors text-left"
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
						placeholder="Indica qué falta antes de dar salida..."
						class="w-full text-xs px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
					></textarea>
				</div>

				<div>
					<label for="ret_comp" class="block text-xs font-semibold text-slate-300 mb-1.5">Reajustar Complejidad en la Cola:</label>
					<select
						id="ret_comp"
						name="adjustedComplexity"
						bind:value={returnComplexity}
						class="w-full text-xs px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
					>
						<option value="alta">🔴 Alta Complejidad (Prioridad máxima en cola)</option>
						<option value="media">🟡 Media Complejidad (Espera estándar)</option>
						<option value="baja">🟢 Baja Complejidad</option>
					</select>
				</div>

				<div class="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
					<button
						type="button"
						onclick={() => (returnModalTicketId = null)}
						class="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
					>
						Cancelar
					</button>
					<button
						type="submit"
						class="px-5 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg transition-all"
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
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
		<div class="bg-[#101726] rounded-3xl max-w-md w-full shadow-2xl border border-emerald-500/30 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
			
			<div class="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-emerald-500/10">
				<div>
					<h3 class="font-black text-base text-white tracking-tight">Dar Salida al Ticket</h3>
					<p class="text-xs text-emerald-300">Aprobar y marcar como terminado con éxito</p>
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
					<label for="comp_who" class="block text-xs font-semibold text-slate-300 mb-1.5">Validador que da la salida:</label>
					<select
						id="comp_who"
						name="resolvedBy"
						bind:value={completeAuthor}
						class="w-full text-xs px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
					>
						<option value="Julio">Julio</option>
						<option value="Domingo">Domingo</option>
						<option value="Yeison">Yeison</option>
					</select>
				</div>

				<div>
					<label for="comp_note" class="block text-xs font-semibold text-slate-300 mb-1.5">Nota de Salida (Opcional):</label>
					<textarea
						id="comp_note"
						name="closingNote"
						rows="2"
						placeholder="Ej. Tarea validada con éxito. Listo para producción..."
						class="w-full text-xs px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
					></textarea>
				</div>

				<div class="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
					<button
						type="button"
						onclick={() => (completeModalTicketId = null)}
						class="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
					>
						Cancelar
					</button>
					<button
						type="submit"
						class="px-5 py-2.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl shadow-lg transition-all"
					>
						Aprobar Salida
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL DETALLE / HISTORIAL -->
{#if activeTicket}
	{@const comp = getComplexityConfig(activeTicket.complexity)}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
		<div class="bg-[#101726] rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
			
			<div class="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
				<div class="flex items-center gap-3">
					<span class="font-mono text-xs font-bold text-slate-400">#{activeTicket.id}</span>
					<span class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border {comp.badgeClass}">
						<span class="w-1.5 h-1.5 rounded-full {comp.dotClass}"></span>
						{comp.shortLabel}
					</span>
					<span class="text-xs font-bold px-2.5 py-0.5 rounded-full {activeTicket.status === 'queue' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' : activeTicket.status === 'in_validation' ? 'bg-sky-500/10 text-sky-300 border border-sky-500/30' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'}">
						{activeTicket.status === 'queue' ? 'En Cola de Espera' : activeTicket.status === 'in_validation' ? 'En Validación' : 'Salida Aprobada'}
					</span>
				</div>
				<button
					type="button"
					aria-label="Cerrar modal de detalle"
					onclick={closeTicketModal}
					class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<div class="p-6 overflow-y-auto space-y-6 flex-1">
				<div>
					<h2 class="text-lg font-bold text-white mb-2">{activeTicket.title}</h2>
					<p class="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed bg-white/[0.03] p-4 rounded-2xl border border-white/[0.06]">
						{activeTicket.description}
					</p>

					<div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
						<div class="bg-white/[0.02] p-3 rounded-xl border border-white/[0.06]">
							<span class="text-slate-400 block text-[10px] uppercase font-bold">Quién lo hizo</span>
							<span class="font-bold text-white">{activeTicket.created_by}</span>
						</div>
						<div class="bg-white/[0.02] p-3 rounded-xl border border-white/[0.06]">
							<span class="text-slate-400 block text-[10px] uppercase font-bold">Complejidad</span>
							<span class="font-bold text-white capitalize">{activeTicket.complexity}</span>
						</div>
						<div class="bg-white/[0.02] p-3 rounded-xl border border-white/[0.06]">
							<span class="text-slate-400 block text-[10px] uppercase font-bold">Devoluciones</span>
							<span class="font-bold text-rose-400">{activeTicket.return_count} veces</span>
						</div>
						<div class="bg-white/[0.02] p-3 rounded-xl border border-white/[0.06]">
							<span class="text-slate-400 block text-[10px] uppercase font-bold">Registro</span>
							<span class="font-bold text-white font-mono text-[11px]">{activeTicket.created_at}</span>
						</div>
					</div>

					{#if activeTicket.return_reason}
						<div class="mt-4 p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-xs text-rose-200">
							<span class="font-bold text-rose-300 block mb-1">Último motivo de retorno a la cola:</span>
							<p class="italic">"{activeTicket.return_reason}"</p>
						</div>
					{/if}
				</div>

				<!-- Bitácora -->
				<div class="border-t border-white/10 pt-5">
					<h4 class="font-bold text-xs uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
						<svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
						</svg>
						Bitácora de Notas y Salidas
					</h4>

					{#if data.selectedTicket?.comments && data.selectedTicket.comments.length > 0}
						<div class="space-y-2 mb-4">
							{#each data.selectedTicket.comments as c (c.id)}
								<div class="bg-white/[0.03] p-3 rounded-xl border border-white/[0.06] text-xs">
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
						class="flex gap-2 bg-white/[0.02] p-2 rounded-xl border border-white/10"
					>
						<input type="hidden" name="ticketId" value={activeTicket.id} />
						<input
							type="text"
							name="author"
							placeholder="Tu nombre (ej. Julio)"
							required
							class="w-1/3 text-xs px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white"
						/>
						<input
							type="text"
							name="content"
							placeholder="Escribe una observación..."
							required
							class="flex-1 text-xs px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white"
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

			<div class="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
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
					class="px-4 py-2 text-xs font-semibold text-slate-300 bg-white/[0.06] hover:bg-white/[0.1] rounded-xl border border-white/10 transition-colors"
				>
					Cerrar
				</button>
			</div>
		</div>
	</div>
{/if}
