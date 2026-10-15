<script lang="ts">
	import { enhance } from '$app/forms';
	import { playTicketIssued } from '$lib/audio';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let selectedComplexity = $state<'alta' | 'media' | 'baja'>('media');
	let isSubmitting = $state(false);

	$effect(() => {
		if (form?.success) {
			playTicketIssued();
		}
	});
</script>

<svelte:head>
	<title>Tomar Turno — Quiosco PULSE</title>
</svelte:head>

<div class="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center font-sans">
	
	{#if form?.success}
		<!-- COMPROBANTE DE TURNO EMITIDO -->
		<div class="bg-gradient-to-b from-[#131d33] to-[#0d1424] rounded-3xl p-8 sm:p-10 border border-emerald-500/40 shadow-2xl text-center animate-in zoom-in-95 duration-200">
			<div class="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 ring-2 ring-emerald-500/30">
				<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
				</svg>
			</div>

			<div class="text-xs font-mono uppercase tracking-widest text-emerald-300 font-bold mb-1">
				¡TURNO REGISTRADO CON ÉXITO!
			</div>

			<!-- NÚMERO DE TURNO GIGANTE -->
			<div class="my-6 py-6 bg-white/[0.03] rounded-3xl border border-white/10 shadow-inner">
				<div class="text-xs font-mono text-slate-400 uppercase tracking-widest mb-1">Tu Código de Turno</div>
				<div class="text-6xl sm:text-7xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-white to-sky-300 tracking-tight">
					{form.turnCode}
				</div>
				<div class="text-base font-bold text-slate-200 mt-2">
					{form.name}
				</div>
				<div class="text-xs text-slate-400 mt-0.5">
					{form.title}
				</div>
			</div>

			<p class="text-xs text-slate-300 mb-6 leading-relaxed">
				Por favor toma asiento y observa la <strong>Pantalla TV de la Sala</strong>. Cuando Julio o Domingo llamen tu turno, aparecerá tu número en pantalla.
			</p>

			<div class="flex items-center justify-center gap-3">
				<a
					href="/solicitar"
					class="px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold border border-white/10 transition-colors"
				>
					Tomar Otro Turno
				</a>
				<a
					href="/pantalla"
					target="_blank"
					class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/30 transition-colors"
				>
					Ver Pantalla de Sala ↗
				</a>
			</div>
		</div>
	{:else}
		<!-- FORMULARIO DE SOLICITUD DE TURNO -->
		<div class="bg-[#0f172a]/95 rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl">
			
			<div class="text-center mb-6">
				<div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/30">
					<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
					</svg>
				</div>
				<h2 class="text-xl font-black text-white">Solicitar Turno de Atención</h2>
				<p class="text-xs text-slate-400 mt-1">Ingresa tus datos para entrar en la cola de despacho</p>
			</div>

			<form
				method="POST"
				action="?/requestTicket"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						await update();
						isSubmitting = false;
					};
				}}
				class="space-y-4"
			>
				<div>
					<label for="user_name" class="block text-xs font-semibold text-slate-300 mb-1.5">Tu Nombre y Apellido *</label>
					<input
						id="user_name"
						type="text"
						name="name"
						required
						placeholder="Ej. Roberto Medina"
						class="w-full text-xs sm:text-sm px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
					/>
				</div>

				<div>
					<label for="ticket_title" class="block text-xs font-semibold text-slate-300 mb-1.5">Motivo de la Solicitud / Requerimiento *</label>
					<input
						id="ticket_title"
						type="text"
						name="title"
						required
						placeholder="Ej. Solicitud de acceso a VPN o soporte técnico de equipo"
						class="w-full text-xs sm:text-sm px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
					/>
				</div>

				<div>
					<label for="ticket_desc" class="block text-xs font-semibold text-slate-300 mb-1.5">Detalles Adicionales (Opcional)</label>
					<textarea
						id="ticket_desc"
						name="description"
						rows="2"
						placeholder="Información adicional que ayude al operador a preparar la atención..."
						class="w-full text-xs px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-all"
					></textarea>
				</div>

				<!-- Nivel de Complejidad -->
				<div>
					<span class="block text-xs font-semibold text-slate-300 mb-2">Nivel de Urgencia / Complejidad</span>
					<div class="grid grid-cols-3 gap-2">
						<label class="cursor-pointer">
							<input
								type="radio"
								name="complexity"
								value="alta"
								bind:group={selectedComplexity}
								class="sr-only"
							/>
							<div class="p-2.5 rounded-2xl border text-center transition-all {selectedComplexity === 'alta' ? 'bg-rose-500/20 border-rose-500 text-white ring-1 ring-rose-500' : 'bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.05]'}">
								<div class="text-xs font-bold text-rose-300">Alta</div>
								<div class="text-[9px] text-slate-400">Urgente</div>
							</div>
						</label>

						<label class="cursor-pointer">
							<input
								type="radio"
								name="complexity"
								value="media"
								bind:group={selectedComplexity}
								class="sr-only"
							/>
							<div class="p-2.5 rounded-2xl border text-center transition-all {selectedComplexity === 'media' ? 'bg-amber-500/20 border-amber-500 text-white ring-1 ring-amber-500' : 'bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.05]'}">
								<div class="text-xs font-bold text-amber-300">Media</div>
								<div class="text-[9px] text-slate-400">Normal</div>
							</div>
						</label>

						<label class="cursor-pointer">
							<input
								type="radio"
								name="complexity"
								value="baja"
								bind:group={selectedComplexity}
								class="sr-only"
							/>
							<div class="p-2.5 rounded-2xl border text-center transition-all {selectedComplexity === 'baja' ? 'bg-emerald-500/20 border-emerald-500 text-white ring-1 ring-emerald-500' : 'bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.05]'}">
								<div class="text-xs font-bold text-emerald-300">Baja</div>
								<div class="text-[9px] text-slate-400">Consulta</div>
							</div>
						</label>
					</div>
				</div>

				<button
					type="submit"
					disabled={isSubmitting}
					class="w-full py-3.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white font-black text-sm rounded-2xl shadow-xl shadow-indigo-500/25 transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
				>
					{isSubmitting ? 'Generando ticket...' : 'EMITIR MI TICKET'}
				</button>
			</form>

		</div>
	{/if}

</div>
