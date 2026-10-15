<script lang="ts">
	import './layout.css';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();

	let showUserMenu = $state(false);

	let currentPath = $derived($page.url.pathname);
</script>

<div class="min-h-screen bg-[#070b12] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white antialiased">
	
	<!-- GLOBAL HEADER WITH PROFILE SWITCHER & SCREEN NAVIGATION -->
	<header class="bg-[#0b101c]/95 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40 shadow-xl">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
			
			<!-- Logo / Brand -->
			<div class="flex items-center gap-3">
				<a href="/" class="flex items-center gap-2.5 group">
					<div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20 group-hover:scale-105 transition-transform">
						<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
						</svg>
					</div>
					<div>
						<div class="flex items-center gap-1.5">
							<span class="font-black text-sm tracking-wider text-white">PULSE</span>
							<span class="text-[9px] font-mono font-bold tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.2 rounded uppercase">
								TURNERO
							</span>
						</div>
						<p class="text-[10px] text-slate-400">Sistema Multi-Puesto y Pantalla de Espera</p>
					</div>
				</a>

				<!-- Pantallas Navigation Tabs -->
				<nav class="hidden md:flex items-center gap-1 ml-4 pl-4 border-l border-white/10 text-xs font-medium">
					<a
						href="/"
						class="px-2.5 py-1.5 rounded-lg transition-colors {currentPath === '/' ? 'bg-white/10 text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'}"
					>
						🎛️ Vista General
					</a>
					<a
						href="/agente"
						class="px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 {currentPath === '/agente' ? 'bg-indigo-600/30 text-indigo-300 font-semibold ring-1 ring-indigo-500/40' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'}"
					>
						👨‍💼 Mi Ventanilla
						{#if data.currentUser?.current_ticket}
							<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
						{/if}
					</a>
					<a
						href="/pantalla"
						target="_blank"
						class="px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 {currentPath === '/pantalla' ? 'bg-white/10 text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'}"
					>
						📺 Pantalla TV de Sala
						<span class="text-[9px] opacity-60">↗</span>
					</a>
					<a
						href="/solicitar"
						class="px-2.5 py-1.5 rounded-lg transition-colors {currentPath === '/solicitar' ? 'bg-white/10 text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'}"
					>
						🎟️ Tomar Ticket
					</a>
				</nav>
			</div>

			<!-- User Profile Switcher -->
			<div class="flex items-center gap-2">
				<div class="relative">
					<button
						type="button"
						onclick={() => (showUserMenu = !showUserMenu)}
						class="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] p-1.5 pr-3 rounded-xl border border-white/[0.1] transition-all"
					>
						<div class="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black text-white {data.currentUser?.avatar_color || 'bg-indigo-600'}">
							{data.currentUser?.name.charAt(0) || 'U'}
						</div>
						<div class="text-left">
							<div class="text-xs font-bold text-white leading-tight flex items-center gap-1.5">
								<span>{data.currentUser?.name || 'Invitado'}</span>
								<span class="w-1.5 h-1.5 rounded-full {data.currentUser?.status === 'busy' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}"></span>
							</div>
							<div class="text-[9px] text-slate-400 leading-tight">
								{data.currentUser?.desk_name || 'Sin puesto'}
							</div>
						</div>
						<svg class="w-3.5 h-3.5 text-slate-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>

					<!-- Dropdown Menu para cambiar de perfil -->
					{#if showUserMenu}
						<div
							class="absolute right-0 mt-2 w-64 bg-[#101726] rounded-2xl shadow-2xl border border-white/10 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
						>
							<div class="px-3 py-1.5 border-b border-white/5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
								Cambiar Puesto / Operador
							</div>

							{#each data.users as user}
								<form
									method="POST"
									action="/?/switchUser"
									use:enhance={() => {
										return async ({ update }) => {
											await update();
											showUserMenu = false;
										};
									}}
								>
									<input type="hidden" name="userId" value={user.id} />
									<button
										type="submit"
										class="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-white/[0.05] transition-colors {data.currentUser?.id === user.id ? 'bg-indigo-600/15' : ''}"
									>
										<div class="flex items-center gap-2">
											<div class="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white {user.avatar_color}">
												{user.name.charAt(0)}
											</div>
											<div>
												<div class="text-xs font-bold text-white flex items-center gap-1">
													<span>{user.name}</span>
													{#if user.id === data.currentUser?.id}
														<span class="text-[9px] text-indigo-400 font-normal">(Actual)</span>
													{/if}
												</div>
												<div class="text-[10px] text-slate-400">{user.desk_name}</div>
											</div>
										</div>

										{#if user.current_ticket}
											<span class="text-[9px] font-mono bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
												Atendiendo {user.current_ticket.turn_code}
											</span>
										{:else}
											<span class="text-[9px] font-mono text-slate-500">Disponible</span>
										{/if}
									</button>
								</form>
							{/each}

							<div class="pt-2 mt-1 border-t border-white/5 px-3">
								<a
									href="/pantalla"
									target="_blank"
									class="block text-center text-xs text-indigo-400 hover:text-indigo-300 py-1 font-semibold"
								>
									Abrir Pantalla TV de Sala ↗
								</a>
							</div>
						</div>
					{/if}
				</div>
			</div>

		</div>
	</header>

	<!-- PAGE CONTENT -->
	{@render children()}
</div>
