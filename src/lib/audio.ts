/**
 * Web Audio API Sound Synthesizer for PULSE
 * Generates rich, cheerful, celebratory sounds without external MP3 dependencies.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	if (!audioCtx) {
		const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
		if (AudioContextClass) {
			audioCtx = new AudioContextClass();
		}
	}
	if (audioCtx && audioCtx.state === 'suspended') {
		audioCtx.resume();
	}
	return audioCtx;
}

/**
 * Sonido 1: Chime de llamado de turno (El clásico y alegre timbre de sala / aeropuerto)
 * Secuencia armónica alegre: Do mayor brillante (C5 -> E5 -> G5 -> C6)
 */
export function playTurnCallChime() {
	const ctx = getAudioContext();
	if (!ctx) return;

	const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
	const now = ctx.currentTime;

	notes.forEach((freq, idx) => {
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = 'sine';
		osc.frequency.setValueAtTime(freq, now + idx * 0.12);

		// Soft envelope
		gain.gain.setValueAtTime(0, now + idx * 0.12);
		gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.12 + 0.02);
		gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.6);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start(now + idx * 0.12);
		osc.stop(now + idx * 0.12 + 0.65);
	});
}

/**
 * Sonido 2: Fanfarria de Alegría / Éxito (Al dar salida o completar un ticket)
 * Secuencia triunfal y alegre con armónicos brillantes
 */
export function playSuccessJoy() {
	const ctx = getAudioContext();
	if (!ctx) return;

	// Acordes alegres en crescendo festivo
	const chords = [
		{ time: 0.0, freqs: [523.25, 659.25] },       // C5, E5
		{ time: 0.1, freqs: [587.33, 739.99] },       // D5, F#5
		{ time: 0.2, freqs: [659.25, 830.61] },       // E5, G#5
		{ time: 0.35, freqs: [783.99, 987.77, 1318.51] } // G5, B5, E6 (Acorde brillante final)
	];

	const now = ctx.currentTime;

	chords.forEach((chord) => {
		chord.freqs.forEach((freq) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			osc.type = 'triangle';
			osc.frequency.setValueAtTime(freq, now + chord.time);

			gain.gain.setValueAtTime(0, now + chord.time);
			gain.gain.linearRampToValueAtTime(0.2, now + chord.time + 0.03);
			gain.gain.exponentialRampToValueAtTime(0.001, now + chord.time + 0.55);

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(now + chord.time);
			osc.stop(now + chord.time + 0.6);
		});
	});
}

/**
 * Sonido 3: Campana de nuevo ticket emitido (Quiosco)
 * Campanita cristalina de bienvenida
 */
export function playTicketIssued() {
	const ctx = getAudioContext();
	if (!ctx) return;

	const notes = [880.0, 1318.51, 1760.0]; // A5, E6, A6 (Marimba / campana cristalina)
	const now = ctx.currentTime;

	notes.forEach((freq, idx) => {
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = 'sine';
		osc.frequency.setValueAtTime(freq, now + idx * 0.08);

		gain.gain.setValueAtTime(0, now + idx * 0.08);
		gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.08 + 0.01);
		gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.5);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start(now + idx * 0.08);
		osc.stop(now + idx * 0.08 + 0.55);
	});
}

/**
 * Sonido 4: Pop / Click suave de interacción
 */
export function playPop() {
	const ctx = getAudioContext();
	if (!ctx) return;

	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	const now = ctx.currentTime;

	osc.type = 'sine';
	osc.frequency.setValueAtTime(600, now);
	osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);

	gain.gain.setValueAtTime(0.15, now);
	gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

	osc.connect(gain);
	gain.connect(ctx.destination);

	osc.start(now);
	osc.stop(now + 0.07);
}
