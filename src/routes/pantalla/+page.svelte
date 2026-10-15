<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { playTurnCallChime } from '$lib/audio';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let currentTime = $state('');
	let currentDate = $state('');
	let soundEnabled = $state(true);
	let lastPlayedCallTime = $state<string | null>(null);

	function updateClock() {
		const now = new Date();
		currentTime = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
		currentDate = now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
	}

	$effect(() => {
		const currentCallTime = data.overview.lastCalled?.last_called_at;
		if (currentCallTime && currentCallTime !== lastPlayedCallTime) {
			lastPlayedCallTime = currentCallTime;
			if (soundEnabled) {
				playTurnCallChime();
			}
		}
	});

	onMount(() => {
		updateClock();
		const clockInterval = setInterval(updateClock, 1000);

		// Polling suave cada 3.5 segundos para reflejar en el televisor lo que Julio y Domingo hacen en vivo
		const pollInterval = setInterval(() => {
			invalidateAll();
		}, 3500);

		return () => {
			clearInterval(clockInterval);
			clearInterval(pollInterval);
		};
	});

	function toggleSound() {
		soundEnabled = !soundEnabled;
		if (soundEnabled) {
			playTurnCallChime();
		}
	}

	function getComplexityLabel(comp: string) {
		switch (comp) {
			case 'alta':
				return { label: 'ALTA', class: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
			case 'media':
				return { label: 'MEDIA', class: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
			default:
				return { label: 'BAJA', class: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
		}
	}
</script>

<svelte:head>
	<title>TV Turnero — Monitor de Sala</title>
</svelte:head>

<div class="min-h-screen bg-[#050811] text-white flex flex-col font-sans p-6 sm:p-8 lg:p-10 select-none">
	
	<!-- CABECERA DEL MONITOR DE SALA -->
	<header class="flex flex-wrap items-center justify-between pb-6 border-b border-white/10 gap-4">
		<div class="flex items-center gap-4">
			<div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-sky-400 flex items-center justify-center shadow-xl shadow-indigo-500/30 ring-2 ring-white/20">
				<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
				</svg>
			</div>
			<div>
				<div class="flex items-center gap-3">
					<h1 class="text-2xl sm:text-3xl font-black tracking-wider text-white">SALA DE ATENCIÓN</h1>
					<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
						<span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
						EN VIVO
					</span>
				</div>
				<p class="text-sm text-slate-400">Puestos de servicio y orden de llamada</p>
			</div>
		</div>

		<!-- Reloj Digital de Sala y Botón de Sonido -->
		<div class="flex items-center gap-3">
			<button
				type="button"
				onclick={toggleSound}
				class="px-3.5 py-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2 {soundEnabled ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}"
				title="Activar o silenciar avisos sonoros de turno"
			>
				<span>{soundEnabled ? '🔊 Sonido Activado' : '🔇 Silenciado'}</span>
			</button>

			<div class="text-right bg-white/[0.03] px-6 py-2.5 rounded-2xl border border-white/10">
				<div class="font-mono text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-sky-300 tracking-tight">
					{currentTime}
				</div>
				<div class="text-xs text-slate-400 uppercase tracking-widest font-semibold mt-0.5">
					{currentDate}
				</div>
			</div>
		</div>
	</header>

	<!-- BANNER DE ÚLTIMO LLAMADO (Si hay un ticket llamado recientemente) -->
	{#if data.overview.lastCalled}
		<div class="my-6 bg-gradient-to-r from-amber-500/20 via-indigo-500/20 to-sky-500/20 border-2 border-amber-400/60 rounded-3xl p-5 shadow-2xl flex flex-wrap items-center justify-between gap-4 animate-pulse">
			<div class="flex items-center gap-4">
				<div class="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg">
					📢
				</div>
				<div>
					<div class="text-xs uppercase font-mono tracking-widest text-amber-300 font-bold">
						¡ÚLTIMO TURNO LLAMADO!
					</div>
					<div class="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
						<span>TURNO <strong class="text-amber-400">{data.overview.lastCalled.turn_code}</strong></span>
						<span class="text-lg font-normal text-slate-300">— {data.overview.lastCalled.created_by}</span>
					</div>
				</div>
			</div>
			<div class="text-right">
				<div class="text-xs text-slate-400 uppercase font-mono">DIRÍJASE A:</div>
				<div class="text-xl sm:text-2xl font-black text-amber-300">
					{data.overview.lastCalled.served_desk || 'Ventanilla'}
				</div>
			</div>
		</div>
	{/if}

	<!-- CONTENIDO PRINCIPAL: PUESTOS (IZQ) vs COLA DE ESPERA (DER) -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto flex-1 items-stretch">
		
		<!-- PUESTOS DE ATENCIÓN EN VIVO (JULIO & DOMINGO) -->
		<div class="lg:col-span-7 flex flex-col gap-6">
			<div class="flex items-center justify-between">
				<h2 class="text-sm font-mono uppercase tracking-widest font-bold text-slate-400 flex items-center gap-2">
					<span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
					PUESTOS DE ATENCIÓN ACTUAL
				</h2>
				<span class="text-xs text-slate-500">Actualizado en tiempo real</span>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1">
				{#each data.overview.agents as agent}
					{@const ticket = agent.current_ticket}
					<div class="bg-gradient-to-b from-[#101728] to-[#0c1220] rounded-3xl p-6 sm:p-7 border {ticket ? 'border-indigo-500/40 shadow-2xl shadow-indigo-500/10' : 'border-white/[0.08] opacity-75'} flex flex-col justify-between relative overflow-hidden">
						
						<!-- Encabezado del Puesto -->
						<div>
							<div class="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
								<div class="flex items-center gap-3">
									<div class="w-10 h-10 rounded-xl flex items-center justify-center font-black text-base text-white shadow-md {agent.avatar_color}">
										{agent.name.charAt(0)}
									</div>
									<div>
										<h3 class="font-extrabold text-lg text-white">{agent.name}</h3>
										<p class="text-xs text-slate-400">{agent.desk_name}</p>
									</div>
								</div>
								
								{#if ticket}
									<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
										<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
										ATENDIENDO
									</span>
								{:else}
									<span class="px-3 py-1 rounded-full text-xs font-mono font-bold bg-white/5 text-slate-400 border border-white/10">
										DISPONIBLE
									</span>
								{/if}
							</div>

							<!-- Detalle de a quién atiende -->
							{#if ticket}
								{@const comp = getComplexityLabel(ticket.complexity)}
								<div class="my-4 text-center py-4 bg-white/[0.02] rounded-2xl border border-white/[0.05]">
									<div class="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">
										TURNO EN ATENCIÓN
									</div>
									<div class="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white my-1 text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-sky-300">
										{ticket.turn_code}
									</div>
									<div class="text-lg font-bold text-slate-200 mt-2 truncate px-4">
										{ticket.created_by}
									</div>
									<p class="text-xs text-slate-400 line-clamp-2 px-4 mt-1">
										{ticket.title}
									</p>
								</div>
							{:else}
								<div class="my-auto py-12 text-center text-slate-500 italic">
									Esperando llamada del siguiente turno...
								</div>
							{/if}
						</div>

						<!-- Footer del Puesto -->
						<div class="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
							<span>Operador asignado</span>
							<span class="font-mono text-slate-300 font-semibold">{agent.desk_name}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- COLA DE ESPERA EN VIVO (PRÓXIMOS TURNOS) -->
		<div class="lg:col-span-5 bg-gradient-to-b from-[#101728] to-[#0c1220] rounded-3xl p-6 sm:p-7 border border-white/[0.08] shadow-2xl flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
					<div class="flex items-center gap-2">
						<span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
						<h2 class="text-sm font-mono uppercase tracking-widest font-bold text-slate-300">
							PRÓXIMOS EN COLA DE ESPERA
						</h2>
					</div>
					<span class="font-mono text-xs font-bold px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
						{data.waitingTickets.length} en fila
					</span>
				</div>

				<div class="space-y-3">
					{#each data.waitingTickets.slice(0, 6) as item, idx (item.id)}
						{@const comp = getComplexityLabel(item.complexity)}
						<div class="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.06] flex items-center justify-between hover:bg-white/[0.05] transition-all">
							<div class="flex items-center gap-3">
								<span class="font-mono text-xs font-black text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30">
									#{idx + 1}
								</span>
								<div>
									<div class="font-mono text-xl font-black text-white">
										{item.turn_code}
									</div>
									<div class="text-xs text-slate-300 font-medium truncate max-w-[180px]">
										{item.created_by}
									</div>
								</div>
							</div>

							<div class="text-right">
								<span class="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border {comp.class}">
									{comp.label}
								</span>
								<div class="text-[10px] text-slate-400 mt-1">
									Esperando turno
								</div>
							</div>
						</div>
					{:else}
						<div class="py-16 text-center text-slate-500 italic">
							No hay personas esperando en la fila.
						</div>
					{/each}
				</div>
			</div>

			<!-- Resumen de Atención -->
			<div class="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 mt-4">
				<span>Total atendidos hoy: <strong class="text-emerald-400 font-mono text-sm">{data.stats.completed}</strong></span>
				<span>PULSE Turnero Live</span>
			</div>
		</div>

	</div>

</div>
