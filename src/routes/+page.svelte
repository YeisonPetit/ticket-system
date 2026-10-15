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
	let createCreatedBy = $state('Carlos Méndez');
	let createComplexity = $state<'alta' | 'media' | 'baja'>('media');

	// View toggle: 'workflow' | 'queue_list'
	let currentView = $state<'workflow' | 'queue_list'>('workflow');

	// Local filters
	let searchQuery = $state('');
	let filterServedBy = $state('all');
	let filterComplexity = $state('all');
	let searchInputElement = $state<HTMLInputElement | null>(null);

	// Drag & Drop State
	let draggedTicket = $state<Ticket | null>(null);
	let activeDropCol = $state<string | null>(null);

	$effect(() => {
		if (data.filters.search) searchQuery = data.filters.search;
		if (data.filters.served_by) filterServedBy = data.filters.served_by;
		if (data.filters.complexity) filterComplexity = data.filters.complexity;
		if (data.selectedTicket?.ticket?.id) activeTicketId = data.selectedTicket.ticket.id;
	});

	// Global Keyboard Shortcuts
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

	let activeTicket = $derived(
		data.tickets.find((t) => t.id === activeTicketId) || data.selectedTicket?.ticket || null
	);

	let visibleTickets = $derived(
		data.tickets.filter((t) => {
			const matchesSearch =
				searchQuery.trim() === '' ||
				t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
				t.turn_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
				t.created_by.toLowerCase().includes(searchQuery.toLowerCase());

			const matchesServedBy = filterServedBy === 'all' || t.served_by_name === filterServedBy;
			const matchesComplexity = filterComplexity === 'all' || t.complexity === filterComplexity;

			return matchesSearch && matchesServedBy && matchesComplexity;
		})
	);

	let queueTickets = $derived(
		visibleTickets.filter((t) => t.status === 'waiting' || t.status === 'returned')
	);
	let servingTickets = $derived(visibleTickets.filter((t) => t.status === 'serving'));
	let completedTickets = $derived(visibleTickets.filter((t) => t.status === 'completed'));

	function getComplexityConfig(comp: string) {
		switch (comp) {
			case 'alta':
				return {
					shortLabel: 'Alta',
					dotClass: 'bg-rose-400',
					badgeClass: 'bg-rose-500/10 text-rose-300 border-rose-500/30'
				};
			case 'media':
				return {
					shortLabel: 'Media',
					dotClass: 'bg-amber-400',
					badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/30'
				};
			default:
				return {
					shortLabel: 'Baja',
					dotClass: 'bg-emerald-400',
					badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
				};
		}
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

	// Drag & Drop
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
		activeDropCol = colId;
	}

	function onDragLeave(colId: string) {
		if (activeDropCol === colId) activeDropCol = null;
	}

	async function onDrop(e: DragEvent, targetCol: 'waiting' | 'serving' | 'completed') {
		e.preventDefault();
		activeDropCol = null;

		if (!draggedTicket) return;

		const movingTicket = draggedTicket;
		draggedTicket = null;

		if (movingTicket.status === 'serving' && targetCol === 'waiting') {
			openReturnModal(movingTicket.id, movingTicket.complexity);
			return;
		}

		const formData = new FormData();
		formData.append('id', movingTicket.id.toString());
		formData.append('targetStatus', targetCol);
		formData.append('actor', 'Julio');

		try {
			await fetch('?/dragMove', { method: 'POST', body: formData });
			await invalidateAll();
		} catch (err) {
			console.error(err);
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>PULSE — Panel de Turnos y Despacho</title>
</svelte:head>

<div class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col font-sans">
	
	<!-- SECCIÓN EN VIVO: ¿A QUIÉN ATIENDE JULIO Y A QUIÉN DOMINGO? -->
	<section class="mb-8">
		<div class="flex items-center justify-between mb-4">
			<div class="flex items-center gap-2">
				<span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
				<h2 class="text-xs font-mono uppercase tracking-widest font-black text-slate-300">
					VENTANILLAS EN SERVICIO (EN VIVO)
				</h2>
			</div>
			
			<div class="flex items-center gap-2">
				<a
					href="/pantalla"
					target="_blank"
					class="text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-xl border border-indigo-500/20 transition-all flex items-center gap-1.5"
				>
					<span>📺 Abrir TV de Sala</span>
					<span class="text-[10px]">↗</span>
				</a>
				<a
					href="/solicitar"
					class="text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 rounded-xl border border-white/10 transition-all"
				>
					<span>🎟️ Tomar Ticket</span>
				</a>
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			{#each data.overview.agents as agent}
				{@const ticket = agent.current_ticket}
				<div class="bg-gradient-to-b from-[#111827] to-[#0c1220] rounded-3xl p-5 border {ticket ? 'border-indigo-500/40 shadow-xl shadow-indigo-500/5' : 'border-white/10'} flex flex-col justify-between transition-all">
					
					<!-- Header de la Ventanilla -->
					<div class="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
						<div class="flex items-center gap-3">
							<div class="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white {agent.avatar_color}">
								{agent.name.charAt(0)}
							</div>
							<div>
								<div class="flex items-center gap-2">
									<h3 class="font-extrabold text-sm text-white">{agent.desk_name}</h3>
								</div>
								<p class="text-[11px] text-slate-400">Operador: <strong class="text-slate-200">{agent.name}</strong></p>
							</div>
						</div>

						{#if ticket}
							<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
								<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
								ATENDIENDO
							</span>
						{:else}
							<span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/5 text-slate-400 border border-white/10">
								DISPONIBLE
							</span>
						{/if}
					</div>

					<!-- A quién atiende en este momento -->
					{#if ticket}
						{@const comp = getComplexityConfig(ticket.complexity)}
						<div class="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05] my-1">
							<div class="flex items-center justify-between mb-1.5">
								<span class="font-mono text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-sky-300">
									{ticket.turn_code}
								</span>
								<span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border {comp.badgeClass}">
									{comp.shortLabel}
								</span>
							</div>

							<div class="text-sm font-bold text-white truncate">
								{ticket.created_by}
							</div>
							<p class="text-xs text-slate-400 truncate mt-0.5">
								{ticket.title}
							</p>
						</div>

						<!-- Acciones directas sobre el turno -->
						<div class="pt-3 border-t border-white/10 flex items-center justify-between text-xs mt-3">
							<button
								type="button"
								onclick={() => openReturnModal(ticket.id, ticket.complexity)}
								class="text-rose-400 hover:text-rose-300 font-semibold"
							>
								↩ Devolver a Cola
							</button>

							<button
								type="button"
								onclick={() => openCompleteModal(ticket.id)}
								class="text-emerald-400 hover:text-emerald-300 font-black flex items-center gap-1"
							>
								<span>✓ Dar Salida</span>
							</button>
						</div>
					{:else}
						<div class="py-6 text-center my-1 bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
							<p class="text-xs text-slate-400 mb-3">Ventanilla sin turno asignado actualmente.</p>
							
							<form method="POST" action="?/callNext" use:enhance>
								<input type="hidden" name="agentId" value={agent.id} />
								<button
									type="submit"
									class="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
								>
									<span>⚡ Llamar Siguiente para {agent.name}</span>
								</button>
							</form>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</section>

	<!-- BARRA DE BÚSQUEDA Y CONTROL -->
	<section class="bg-[#0b101c] p-3 rounded-2xl border border-white/10 mb-6 flex flex-wrap items-center gap-3">
		<div class="relative flex-1 min-w-[200px]">
			<svg class="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
			<input
				bind:this={searchInputElement}
				type="text"
				bind:value={searchQuery}
				placeholder="Buscar turno, persona o solicitud... (/)"
				class="w-full pl-9 pr-4 py-1.5 text-xs bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
			/>
		</div>

		<!-- Filtro Complejidad -->
		<div class="flex items-center gap-1 text-xs">
			<button
				type="button"
				onclick={() => (filterComplexity = 'all')}
				class="px-2.5 py-1 rounded-lg text-xs font-medium {filterComplexity === 'all' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}"
			>
				Todas
			</button>
			<button
				type="button"
				onclick={() => (filterComplexity = 'alta')}
				class="px-2.5 py-1 rounded-lg text-xs font-medium text-rose-300 {filterComplexity === 'alta' ? 'bg-rose-500/20 ring-1 ring-rose-500/40' : 'hover:bg-rose-500/10'}"
			>
				Alta
			</button>
			<button
				type="button"
				onclick={() => (filterComplexity = 'media')}
				class="px-2.5 py-1 rounded-lg text-xs font-medium text-amber-300 {filterComplexity === 'media' ? 'bg-amber-500/20 ring-1 ring-amber-500/40' : 'hover:bg-amber-500/10'}"
			>
				Media
			</button>
			<button
				type="button"
				onclick={() => (filterComplexity = 'baja')}
				class="px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-300 {filterComplexity === 'baja' ? 'bg-emerald-500/20 ring-1 ring-emerald-500/40' : 'hover:bg-emerald-500/10'}"
			>
				Baja
			</button>
		</div>

		<!-- Switcher de Vista -->
		<div class="bg-white/[0.04] p-0.5 rounded-xl border border-white/10 flex text-xs">
			<button
				type="button"
				onclick={() => (currentView = 'workflow')}
				class="px-2.5 py-1 rounded-lg font-medium {currentView === 'workflow' ? 'bg-white/10 text-white font-bold' : 'text-slate-400 hover:text-white'}"
			>
				Tablero Drag & Drop
			</button>
			<button
				type="button"
				onclick={() => (currentView = 'queue_list')}
				class="px-2.5 py-1 rounded-lg font-medium {currentView === 'queue_list' ? 'bg-white/10 text-white font-bold' : 'text-slate-400 hover:text-white'}"
			>
				Lista de Despacho
			</button>
		</div>

		<button
			type="button"
			onclick={() => (showCreateModal = true)}
			class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-lg transition-all"
		>
			+ Nuevo Turno
		</button>
	</section>

	<!-- TABLERO PRINCIPAL CON DRAG & DROP -->
	{#if currentView === 'workflow'}
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start flex-1">
			
			<!-- COLUMNA 1: COLA DE ESPERA -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				ondragover={(e) => onDragOver(e, 'waiting')}
				ondragleave={() => onDragLeave('waiting')}
				ondrop={(e) => onDrop(e, 'waiting')}
				class="rounded-3xl p-4 transition-all flex flex-col min-h-[500px] {activeDropCol === 'waiting' ? 'ring-2 ring-amber-400 bg-amber-500/10' : 'bg-white/[0.02] border border-white/[0.07]'}"
			>
				<div class="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
					<div class="flex items-center gap-2">
						<span class="w-2 h-2 rounded-full bg-amber-400"></span>
						<h3 class="font-bold text-xs uppercase tracking-wider text-slate-200">Cola de Espera</h3>
					</div>
					<span class="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
						{queueTickets.length}
					</span>
				</div>

				<div class="space-y-3 flex-1">
					{#each queueTickets as ticket, idx (ticket.id)}
						{@const comp = getComplexityConfig(ticket.complexity)}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							draggable="true"
							ondragstart={(e) => onDragStart(e, ticket)}
							ondragend={onDragEnd}
							class="bg-[#121929]/95 rounded-2xl p-4 border border-white/[0.08] shadow-md hover:border-amber-400/40 transition-all cursor-grab active:cursor-grabbing {draggedTicket?.id === ticket.id ? 'opacity-40' : ''}"
						>
							<div class="flex items-center justify-between gap-2 mb-2">
								<div class="flex items-center gap-1.5">
									<span class="font-mono text-xs font-black text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
										#{idx + 1}
									</span>
									<span class="font-mono text-xs font-bold text-white">{ticket.turn_code}</span>
								</div>
								<span class="text-[10px] font-semibold px-2 py-0.5 rounded-full border {comp.badgeClass}">
									{comp.shortLabel}
								</span>
							</div>

							<button
								type="button"
								onclick={() => openTicket(ticket.id)}
								class="text-left font-bold text-xs sm:text-sm text-white hover:text-amber-200 transition-colors w-full line-clamp-2 mb-1"
							>
								{ticket.title}
							</button>

							<p class="text-[11px] text-slate-400 line-clamp-2 mb-2.5">
								{ticket.description}
							</p>

							<div class="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
								<span>Solicitó: <strong class="text-slate-300">{ticket.created_by}</strong></span>
								<button
									type="button"
									onclick={() => openTicket(ticket.id)}
									class="text-indigo-400 hover:text-indigo-300 font-semibold"
								>
									Detalles →
								</button>
							</div>
						</div>
					{:else}
						<div class="h-32 rounded-2xl border border-dashed border-white/5 flex items-center justify-center text-xs text-slate-500 italic">
							Sin solicitudes esperando
						</div>
					{/each}
				</div>
			</div>

			<!-- COLUMNA 2: EN ATENCIÓN -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				ondragover={(e) => onDragOver(e, 'serving')}
				ondragleave={() => onDragLeave('serving')}
				ondrop={(e) => onDrop(e, 'serving')}
				class="rounded-3xl p-4 transition-all flex flex-col min-h-[500px] {activeDropCol === 'serving' ? 'ring-2 ring-sky-400 bg-sky-500/10' : 'bg-white/[0.02] border border-white/[0.07]'}"
			>
				<div class="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
					<div class="flex items-center gap-2">
						<span class="w-2 h-2 rounded-full bg-sky-400"></span>
						<h3 class="font-bold text-xs uppercase tracking-wider text-slate-200">En Atención</h3>
					</div>
					<span class="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
						{servingTickets.length}
					</span>
				</div>

				<div class="space-y-3 flex-1">
					{#each servingTickets as ticket (ticket.id)}
						{@const comp = getComplexityConfig(ticket.complexity)}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							draggable="true"
							ondragstart={(e) => onDragStart(e, ticket)}
							ondragend={onDragEnd}
							class="bg-[#121929]/95 rounded-2xl p-4 border border-sky-500/30 shadow-md hover:border-sky-400 transition-all cursor-grab active:cursor-grabbing {draggedTicket?.id === ticket.id ? 'opacity-40' : ''}"
						>
							<div class="flex items-center justify-between gap-2 mb-2">
								<span class="font-mono text-sm font-black text-sky-300">{ticket.turn_code}</span>
								<span class="text-[10px] font-semibold px-2 py-0.5 rounded-full border {comp.badgeClass}">
									{comp.shortLabel}
								</span>
							</div>

							<button
								type="button"
								onclick={() => openTicket(ticket.id)}
								class="text-left font-bold text-xs sm:text-sm text-white hover:text-sky-300 transition-colors w-full line-clamp-2 mb-1"
							>
								{ticket.title}
							</button>

							<div class="text-[10px] text-slate-400 mb-2 bg-white/[0.02] p-2 rounded-xl">
								<div>Atendido por: <strong class="text-sky-300">{ticket.served_by_name}</strong></div>
								<div>En: {ticket.served_desk}</div>
							</div>

							<div class="pt-2 border-t border-white/[0.06] grid grid-cols-2 gap-2 text-xs">
								<button
									type="button"
									onclick={() => openReturnModal(ticket.id, ticket.complexity)}
									class="text-rose-400 hover:text-rose-300 text-center py-1 bg-rose-500/10 rounded-lg"
								>
									↩ Devolver
								</button>
								<button
									type="button"
									onclick={() => openCompleteModal(ticket.id)}
									class="text-emerald-400 hover:text-emerald-300 text-center py-1 bg-emerald-500/10 rounded-lg font-bold"
								>
									✓ Dar Salida
								</button>
							</div>
						</div>
					{:else}
						<div class="h-32 rounded-2xl border border-dashed border-white/5 flex items-center justify-center text-xs text-slate-500 italic">
							Ningún turno en atención
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
				class="rounded-3xl p-4 transition-all flex flex-col min-h-[500px] {activeDropCol === 'completed' ? 'ring-2 ring-emerald-400 bg-emerald-500/10' : 'bg-white/[0.02] border border-white/[0.07]'}"
			>
				<div class="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
					<div class="flex items-center gap-2">
						<span class="w-2 h-2 rounded-full bg-emerald-400"></span>
						<h3 class="font-bold text-xs uppercase tracking-wider text-slate-200">Con Salida (Completos)</h3>
					</div>
					<span class="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
						{completedTickets.length}
					</span>
				</div>

				<div class="space-y-3 flex-1">
					{#each completedTickets as ticket (ticket.id)}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							draggable="true"
							ondragstart={(e) => onDragStart(e, ticket)}
							ondragend={onDragEnd}
							class="bg-[#121929]/70 rounded-2xl p-4 border border-white/[0.05] hover:border-emerald-500/40 transition-all cursor-grab active:cursor-grabbing {draggedTicket?.id === ticket.id ? 'opacity-40' : ''}"
						>
							<div class="flex items-center justify-between gap-2 mb-1.5">
								<span class="font-mono text-xs font-bold text-slate-400">{ticket.turn_code}</span>
								<span class="text-[10px] text-emerald-400 font-bold">✓ Salida dada</span>
							</div>
							<div class="font-bold text-xs text-white truncate mb-1">{ticket.title}</div>
							<div class="text-[10px] text-slate-400">Atendió: {ticket.served_by_name || 'Agente'}</div>
						</div>
					{:else}
						<div class="h-32 rounded-2xl border border-dashed border-white/5 flex items-center justify-center text-xs text-slate-500 italic">
							Sin turnos completados
						</div>
					{/each}
				</div>
			</div>

		</div>
	{:else}
		<!-- VISTA TABULAR DE DESPACHO -->
		<div class="bg-white/[0.02] rounded-3xl border border-white/[0.08] shadow-2xl overflow-hidden">
			<table class="w-full text-left border-collapse text-xs">
				<thead>
					<tr class="bg-white/[0.02] border-b border-white/[0.06] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
						<th class="py-3.5 px-4 w-24">Turno</th>
						<th class="py-3.5 px-4">Solicitud</th>
						<th class="py-3.5 px-4 w-36">Solicitante</th>
						<th class="py-3.5 px-4 w-32">Complejidad</th>
						<th class="py-3.5 px-4 w-32">Atendido Por</th>
						<th class="py-3.5 px-4 w-32">Estado</th>
						<th class="py-3.5 px-4 w-28 text-right">Acción</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-white/[0.04]">
					{#each visibleTickets as ticket (ticket.id)}
						{@const comp = getComplexityConfig(ticket.complexity)}
						<tr class="hover:bg-white/[0.03] transition-colors">
							<td class="py-3.5 px-4 font-mono font-bold text-white">{ticket.turn_code}</td>
							<td class="py-3.5 px-4">
								<button type="button" onclick={() => openTicket(ticket.id)} class="font-bold text-white hover:text-indigo-400 text-left">
									{ticket.title}
								</button>
							</td>
							<td class="py-3.5 px-4 text-slate-300">{ticket.created_by}</td>
							<td class="py-3.5 px-4">
								<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold {comp.badgeClass}">
									{comp.shortLabel}
								</span>
							</td>
							<td class="py-3.5 px-4 text-slate-300 font-semibold">{ticket.served_by_name || 'En espera'}</td>
							<td class="py-3.5 px-4">
								{#if ticket.status === 'serving'}
									<span class="text-sky-400 font-bold">En atención</span>
								{:else if ticket.status === 'completed'}
									<span class="text-emerald-400 font-bold">Completado</span>
								{:else}
									<span class="text-amber-400 font-bold">En cola</span>
								{/if}
							</td>
							<td class="py-3.5 px-4 text-right">
								<button type="button" onclick={() => openTicket(ticket.id)} class="text-indigo-400 hover:underline">
									Ver →
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

</div>

<!-- MODAL REGISTRAR NUEVO TICKET -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
		<div class="bg-[#101726] rounded-3xl max-w-lg w-full shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
			<div class="px-6 py-5 border-b border-white/10 flex items-center justify-between">
				<h3 class="font-black text-base text-white">Nuevo Turno / Solicitud</h3>
				<button type="button" onclick={() => (showCreateModal = false)} class="p-2 text-slate-400 hover:text-white">✕</button>
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
					<label for="reg_name" class="block text-xs font-semibold text-slate-300 mb-1">Nombre del Solicitante *</label>
					<input id="reg_name" type="text" name="created_by" required bind:value={createCreatedBy} class="w-full text-xs px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white" />
				</div>

				<div>
					<label for="reg_title" class="block text-xs font-semibold text-slate-300 mb-1">Título de la Solicitud *</label>
					<input id="reg_title" type="text" name="title" required placeholder="Ej. Acceso a base de datos" class="w-full text-xs px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white" />
				</div>

				<div>
					<label for="reg_desc" class="block text-xs font-semibold text-slate-300 mb-1">Descripción</label>
					<textarea id="reg_desc" name="description" rows="2" class="w-full text-xs px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white resize-none"></textarea>
				</div>

				<div>
					<span class="block text-xs font-semibold text-slate-300 mb-1.5">Complejidad</span>
					<div class="grid grid-cols-3 gap-2">
						<label class="cursor-pointer">
							<input type="radio" name="complexity" value="alta" bind:group={createComplexity} class="sr-only" />
							<div class="p-2 rounded-xl border text-center {createComplexity === 'alta' ? 'bg-rose-500/20 border-rose-500 text-white' : 'bg-white/[0.02] border-white/10 text-slate-400'}">Alta</div>
						</label>
						<label class="cursor-pointer">
							<input type="radio" name="complexity" value="media" bind:group={createComplexity} class="sr-only" />
							<div class="p-2 rounded-xl border text-center {createComplexity === 'media' ? 'bg-amber-500/20 border-amber-500 text-white' : 'bg-white/[0.02] border-white/10 text-slate-400'}">Media</div>
						</label>
						<label class="cursor-pointer">
							<input type="radio" name="complexity" value="baja" bind:group={createComplexity} class="sr-only" />
							<div class="p-2 rounded-xl border text-center {createComplexity === 'baja' ? 'bg-emerald-500/20 border-emerald-500 text-white' : 'bg-white/[0.02] border-white/10 text-slate-400'}">Baja</div>
						</label>
					</div>
				</div>

				<div class="pt-4 border-t border-white/10 flex justify-end gap-2">
					<button type="button" onclick={() => (showCreateModal = false)} class="px-4 py-2 text-xs text-slate-400">Cancelar</button>
					<button type="submit" class="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl">Crear Turno</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL RETORNO -->
{#if returnModalTicketId}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
		<div class="bg-[#101726] rounded-3xl max-w-md w-full p-6 border border-rose-500/30">
			<h3 class="font-bold text-white mb-2">Devolver a la Cola de Espera</h3>
			<form method="POST" action="?/returnToQueue" use:enhance={() => { return async ({ update }) => { await update(); returnModalTicketId = null; }; }}>
				<input type="hidden" name="id" value={returnModalTicketId} />
				<div class="mb-3">
					<label for="ret_m" class="block text-xs text-slate-300 mb-1">Motivo de Devolución</label>
					<textarea id="ret_m" name="reason" required rows="2" class="w-full text-xs p-2 bg-white/[0.04] border border-white/10 rounded-xl text-white"></textarea>
				</div>
				<div class="flex justify-end gap-2">
					<button type="button" onclick={() => (returnModalTicketId = null)} class="px-3 py-1.5 text-xs text-slate-400">Cancelar</button>
					<button type="submit" class="px-4 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-xl">Devolver</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL COMPLETAR -->
{#if completeModalTicketId}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
		<div class="bg-[#101726] rounded-3xl max-w-md w-full p-6 border border-emerald-500/30">
			<h3 class="font-bold text-white mb-2">Finalizar Turno y Dar Salida</h3>
			<form method="POST" action="?/complete" use:enhance={() => { return async ({ update }) => { await update(); completeModalTicketId = null; }; }}>
				<input type="hidden" name="id" value={completeModalTicketId} />
				<div class="mb-3">
					<label for="comp_m" class="block text-xs text-slate-300 mb-1">Nota de Salida</label>
					<textarea id="comp_m" name="closingNote" rows="2" class="w-full text-xs p-2 bg-white/[0.04] border border-white/10 rounded-xl text-white"></textarea>
				</div>
				<div class="flex justify-end gap-2">
					<button type="button" onclick={() => (completeModalTicketId = null)} class="px-3 py-1.5 text-xs text-slate-400">Cancelar</button>
					<button type="submit" class="px-4 py-1.5 bg-emerald-500 text-slate-950 text-xs font-bold rounded-xl">Dar Salida</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL DETALLE -->
{#if activeTicket}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
		<div class="bg-[#101726] rounded-3xl max-w-lg w-full p-6 border border-white/10">
			<div class="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
				<span class="font-mono text-lg font-black text-white">{activeTicket.turn_code}</span>
				<button type="button" onclick={closeTicketModal} class="text-slate-400 hover:text-white">✕</button>
			</div>
			<h3 class="text-base font-bold text-white mb-1">{activeTicket.title}</h3>
			<p class="text-xs text-slate-300 mb-4 bg-white/[0.02] p-3 rounded-xl">{activeTicket.description}</p>
			<div class="text-xs text-slate-400 space-y-1 mb-4">
				<div>Solicitado por: <strong class="text-slate-200">{activeTicket.created_by}</strong></div>
				<div>Atendido por: <strong class="text-slate-200">{activeTicket.served_by_name || 'En espera'}</strong></div>
				<div>Complejidad: <strong class="text-slate-200">{activeTicket.complexity}</strong></div>
			</div>
			<div class="flex justify-end">
				<button type="button" onclick={closeTicketModal} class="px-4 py-2 bg-white/[0.06] text-white text-xs rounded-xl">Cerrar</button>
			</div>
		</div>
	</div>
{/if}
