<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let currentTicket = $derived(data.agent?.current_ticket || null);

	// Modals
	let showReturnModal = $state(false);
	let returnReason = $state('');
	let returnComplexity = $state<'alta' | 'media' | 'baja'>('media');

	let showCompleteModal = $state(false);
	let closingNote = $state('');

	// Cronómetro en vivo de atención
	let elapsedSeconds = $state(0);

	function updateTimer() {
		if (currentTicket?.served_at) {
			const start = new Date(currentTicket.served_at).getTime();
			const now = Date.now();
			elapsedSeconds = Math.max(0, Math.floor((now - start) / 1000));
		} else {
			elapsedSeconds = 0;
		}
	}

	function formatTime(totalSec: number) {
		const mins = Math.floor(totalSec / 60);
		const secs = totalSec % 60;
		return `${mins < 10 ? '0' + mins : mins}:${secs < 10 ? '0' + secs : secs}`;
	}

	onMount(() => {
		updateTimer();
		const timer = setInterval(updateTimer, 1000);
		return () => clearInterval(timer);
	});

	function getComplexityLabel(comp: string) {
		switch (comp) {
			case 'alta':
				return { label: 'ALTA COMPLEJIDAD', class: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
			case 'media':
				return { label: 'MEDIA COMPLEJIDAD', class: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
			default:
				return { label: 'BAJA COMPLEJIDAD', class: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
		}
	}
</script>

<svelte:head>
	<title>Mi Ventanilla — {data.agent?.name || 'Agente'}</title>
</svelte:head>

<div class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col font-sans">
	
	<!-- CABECERA DEL PUESTO DE ATENCIÓN -->
	<div class="bg-[#0f172a]/90 rounded-3xl p-5 border border-white/10 shadow-2xl flex flex-wrap items-center justify-between gap-4 mb-6">
		<div class="flex items-center gap-3.5">
			<div class="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-xl {data.agent?.avatar_color || 'bg-indigo-600'} ring-2 ring-white/10">
				{data.agent?.name.charAt(0) || 'A'}
			</div>
			<div>
				<div class="flex items-center gap-2">
					<h1 class="text-xl font-extrabold text-white">{data.agent?.desk_name}</h1>
					<span class="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold {currentTicket ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/10 text-slate-400'}">
						{currentTicket ? 'EN ATENCIÓN' : 'DISPONIBLE'}
					</span>
				</div>
				<p class="text-xs text-slate-400">Operador: <strong class="text-slate-200">{data.agent?.name}</strong> • Rol: {data.agent?.role}</p>
			</div>
		</div>

		<!-- Métricas del Operador -->
		<div class="flex items-center gap-3 text-xs font-mono">
			<div class="bg-white/[0.03] px-3.5 py-2 rounded-xl border border-white/5">
				<span class="text-slate-400">En espera: </span>
				<strong class="text-amber-400 text-sm">{data.waitingTickets.length}</strong>
			</div>
			<div class="bg-white/[0.03] px-3.5 py-2 rounded-xl border border-white/5">
				<span class="text-slate-400">Atendidos hoy: </span>
				<strong class="text-emerald-400 text-sm">{data.stats.completed}</strong>
			</div>
		</div>
	</div>

	<!-- CONTENIDO: TURNO ACTUAL vs COLA DE ESPERA -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
		
		<!-- ÁREA DE ATENCIÓN PRINCIPAL -->
		<div class="lg:col-span-8 flex flex-col gap-6">
			{#if currentTicket}
				{@const comp = getComplexityLabel(currentTicket.complexity)}
				<div class="bg-gradient-to-b from-[#131b2e] to-[#0d1424] rounded-3xl p-6 sm:p-8 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
					
					<!-- Header de la Ficha en Atención -->
					<div class="flex flex-wrap items-center justify-between pb-4 border-b border-white/10 gap-3">
						<div class="flex items-center gap-3">
							<span class="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">
								TURNO EN ATENCIÓN
							</span>
							<span class="text-xs font-mono font-bold px-3 py-0.5 rounded-full border {comp.class}">
								{comp.label}
							</span>
						</div>

						<!-- Cronómetro de Atención en Vivo -->
						<div class="flex items-center gap-2 bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/30 text-indigo-300 font-mono text-xs">
							<span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
							<span>Tiempo transcurrido:</span>
							<strong class="text-sm font-black text-white">{formatTime(elapsedSeconds)}</strong>
						</div>
					</div>

					<!-- Datos del Usuario / Requerimiento -->
					<div class="my-6">
						<div class="flex items-baseline gap-4 mb-2">
							<span class="text-5xl sm:text-6xl font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-sky-300">
								{currentTicket.turn_code}
							</span>
							<div>
								<div class="text-xl sm:text-2xl font-black text-white">
									{currentTicket.created_by}
								</div>
								<div class="text-xs text-slate-400">
									Solicitado el {currentTicket.created_at}
								</div>
							</div>
						</div>

						<h2 class="text-base font-bold text-slate-100 mt-4 mb-1">
							{currentTicket.title}
						</h2>
						<p class="text-xs sm:text-sm text-slate-300 whitespace-pre-wrap leading-relaxed bg-white/[0.03] p-4 rounded-2xl border border-white/[0.06]">
							{currentTicket.description}
						</p>

						{#if currentTicket.return_count > 0}
							<div class="mt-4 p-3 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-xs text-rose-300">
								<span class="font-bold">↩️ Este ticket fue devuelto a la cola {currentTicket.return_count} vez/veces anteriormente:</span>
								<p class="italic text-rose-200 mt-0.5">"{currentTicket.return_reason}"</p>
							</div>
						{/if}
					</div>

					<!-- ACCIONES DEL AGENTE: RE-LLAMAR, RETORNAR, DAR SALIDA -->
					<div class="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
						<!-- Re-llamar -->
						<form method="POST" action="?/recall" use:enhance>
							<input type="hidden" name="ticketId" value={currentTicket.id} />
							<button
								type="submit"
								class="inline-flex items-center gap-2 text-xs font-bold bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 px-4 py-2.5 rounded-xl border border-white/10 transition-all active:scale-95"
								title="Vuelve a emitir alerta en la pantalla de la sala"
							>
								<span>📢 Re-Llamar en Pantalla</span>
							</button>
						</form>

						<div class="flex items-center gap-3">
							<!-- Retornar a la cola -->
							<button
								type="button"
								onclick={() => {
									returnReason = '';
									returnComplexity = currentTicket.complexity;
									showReturnModal = true;
								}}
								class="inline-flex items-center gap-1.5 text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 px-4 py-2.5 rounded-xl transition-all"
							>
								<span>↩ Retornar a la Cola</span>
							</button>

							<!-- Finalizar y Dar Salida -->
							<button
								type="button"
								onclick={() => {
									closingNote = '';
									showCompleteModal = true;
								}}
								class="inline-flex items-center gap-2 text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all active:scale-95"
							>
								<span>✓ Finalizar y Dar Salida</span>
							</button>
						</div>
					</div>

				</div>
			{:else}
				<!-- ESTADO DISPONIBLE: BOTÓN GIGANTE PARA LLAMAR SIGUIENTE -->
				<div class="bg-gradient-to-b from-[#131b2e] to-[#0d1424] rounded-3xl p-10 sm:p-14 border border-white/10 shadow-2xl text-center flex flex-col items-center justify-center min-h-[420px]">
					<div class="w-20 h-20 rounded-3xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-5 ring-1 ring-indigo-500/20 shadow-2xl shadow-indigo-500/20">
						<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
						</svg>
					</div>

					<h2 class="text-2xl font-black text-white mb-2">Ventanilla Disponible</h2>
					<p class="text-xs text-slate-400 max-w-sm mb-6">
						{#if data.waitingTickets.length > 0}
							Hay <strong>{data.waitingTickets.length} solicitudes</strong> esperando en la cola de despacho.
						{:else}
							No hay personas esperando en la fila en este momento.
						{/if}
					</p>

					{#if data.waitingTickets.length > 0}
						<form method="POST" action="?/callNext" use:enhance>
							<button
								type="submit"
								class="inline-flex items-center gap-3 bg-gradient-to-r from-indigo-500 via-indigo-600 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white font-black text-sm sm:text-base px-8 py-4 rounded-2xl shadow-2xl shadow-indigo-500/30 border border-white/20 transition-all hover:scale-105 active:scale-95"
							>
								<span>⚡ LLAMAR SIGUIENTE TURNO</span>
								<span class="font-mono text-xs bg-white/20 px-2 py-0.5 rounded">
									{data.waitingTickets[0]?.turn_code}
								</span>
							</button>
						</form>
					{/if}
				</div>
			{/if}
		</div>

		<!-- LISTA LATERAL: PRÓXIMOS EN ESPERA -->
		<div class="lg:col-span-4 bg-[#0f172a]/90 rounded-3xl p-5 border border-white/10 shadow-2xl flex flex-col justify-between min-h-[460px]">
			<div>
				<div class="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
					<h3 class="text-xs font-mono uppercase tracking-wider font-bold text-slate-300">
						Cola de Espera
					</h3>
					<span class="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
						{data.waitingTickets.length} en turno
					</span>
				</div>

				<div class="space-y-2.5">
					{#each data.waitingTickets.slice(0, 5) as wait, idx (wait.id)}
						{@const comp = getComplexityLabel(wait.complexity)}
						<div class="bg-white/[0.02] p-3 rounded-2xl border border-white/[0.05] hover:bg-white/[0.05] transition-all">
							<div class="flex items-center justify-between gap-2 mb-1">
								<div class="flex items-center gap-2">
									<span class="font-mono text-xs font-bold text-amber-300">#{idx + 1}</span>
									<span class="font-mono text-xs font-black text-white">{wait.turn_code}</span>
								</div>
								<span class="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border {comp.class}">
									{wait.complexity.toUpperCase()}
								</span>
							</div>
							<div class="text-xs font-bold text-slate-200 truncate">
								{wait.created_by}
							</div>
							<p class="text-[11px] text-slate-400 truncate">
								{wait.title}
							</p>
						</div>
					{:else}
						<div class="py-12 text-center text-xs text-slate-500 italic">
							Cola vacía.
						</div>
					{/each}
				</div>
			</div>

			<div class="pt-4 border-t border-white/10 text-center">
				<a
					href="/pantalla"
					target="_blank"
					class="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline"
				>
					Ver Monitor de Sala en Vivo ↗
				</a>
			</div>
		</div>

	</div>

</div>

<!-- MODAL RETORNAR A LA COLA -->
{#if showReturnModal && currentTicket}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
		<div class="bg-[#101726] rounded-3xl max-w-md w-full shadow-2xl border border-rose-500/30 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
			<div class="px-6 py-5 border-b border-white/10 bg-rose-500/10 flex items-center justify-between">
				<div>
					<h3 class="font-black text-base text-white">Retornar a la Cola de Espera</h3>
					<p class="text-xs text-rose-300">El turno regresará a esperar con su motivo</p>
				</div>
				<button
					type="button"
					aria-label="Cerrar modal"
					onclick={() => (showReturnModal = false)}
					class="p-2 rounded-xl text-slate-400 hover:text-white"
				>
					✕
				</button>
			</div>

			<form
				method="POST"
				action="?/returnToQueue"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						showReturnModal = false;
					};
				}}
				class="p-6 space-y-4"
			>
				<input type="hidden" name="ticketId" value={currentTicket.id} />

				<div>
					<label for="ret_reason" class="block text-xs font-semibold text-slate-300 mb-1.5">Motivo del Retorno *</label>
					<textarea
						id="ret_reason"
						name="reason"
						required
						rows="3"
						bind:value={returnReason}
						placeholder="Indica qué falta o por qué no se completó la atención..."
						class="w-full text-xs px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
					></textarea>
				</div>

				<div>
					<label for="ret_comp" class="block text-xs font-semibold text-slate-300 mb-1.5">Reajustar Complejidad en Cola:</label>
					<select
						id="ret_comp"
						name="adjustedComplexity"
						bind:value={returnComplexity}
						class="w-full text-xs px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
					>
						<option value="alta">🔴 Alta Complejidad (Prioridad máxima en cola)</option>
						<option value="media">🟡 Media Complejidad (Estándar)</option>
						<option value="baja">🟢 Baja Complejidad</option>
					</select>
				</div>

				<div class="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
					<button
						type="button"
						onclick={() => (showReturnModal = false)}
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

<!-- MODAL FINALIZAR Y DAR SALIDA -->
{#if showCompleteModal && currentTicket}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
		<div class="bg-[#101726] rounded-3xl max-w-md w-full shadow-2xl border border-emerald-500/30 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
			<div class="px-6 py-5 border-b border-white/10 bg-emerald-500/10 flex items-center justify-between">
				<div>
					<h3 class="font-black text-base text-white">Finalizar Atención y Dar Salida</h3>
					<p class="text-xs text-emerald-300">Marcar turno como completado exitosamente</p>
				</div>
				<button
					type="button"
					aria-label="Cerrar modal"
					onclick={() => (showCompleteModal = false)}
					class="p-2 rounded-xl text-slate-400 hover:text-white"
				>
					✕
				</button>
			</div>

			<form
				method="POST"
				action="?/complete"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						showCompleteModal = false;
					};
				}}
				class="p-6 space-y-4"
			>
				<input type="hidden" name="ticketId" value={currentTicket.id} />

				<div>
					<label for="close_note" class="block text-xs font-semibold text-slate-300 mb-1.5">Nota de Cierre / Dictamen (Opcional):</label>
					<textarea
						id="close_note"
						name="closingNote"
						rows="3"
						bind:value={closingNote}
						placeholder="Ej. Solicitud atendida con éxito y pruebas validadas..."
						class="w-full text-xs px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
					></textarea>
				</div>

				<div class="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
					<button
						type="button"
						onclick={() => (showCompleteModal = false)}
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
