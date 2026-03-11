import { Ganzflicker, type PatternType } from './Ganzflicker';
import { AudioEngine } from './AudioEngine';

export type SessionMode = 'manual' | 'hallucinate' | 'meditate' | 'psychedelic'
    | 'adhd-focus' | 'adhd-protocol' | 'adhd-alpha' | 'theta-deep';

export class SessionManager {
    private engine: Ganzflicker;
    private audio: AudioEngine | null = null;
    public mode: SessionMode = 'manual';
    private startTime: number = 0;
    private isRunning: boolean = false;
    private animationId: number | null = null;

    // UI Callbacks
    public onUpdateUI: ((freq: number, pattern: PatternType) => void) | null = null;
    public onAudioUpdate: ((audioMode: string, audioFreq: number, carrierFreq: number) => void) | null = null;

    constructor(engine: Ganzflicker, audio?: AudioEngine) {
        this.engine = engine;
        this.audio = audio || null;
    }

    public setAudioEngine(audio: AudioEngine): void {
        this.audio = audio;
    }

    public setMode(mode: SessionMode) {
        this.mode = mode;
        this.stop(); // Stop current session logic

        // Stop audio for basic visual modes (let user control manually for ADHD/theta)
        if (!mode.startsWith('adhd-') && mode !== 'theta-deep' && this.audio) {
            this.audio.stop();
        }

        // Initial setup for modes
        if (mode === 'hallucinate') {
            this.engine.setColors(['#ff0000', '#000000']);
            this.engine.setFrequency(7.5);
            this.engine.setPattern('none');
        } else if (mode === 'meditate') {
            this.engine.setColors(['#4b0082', '#000000']); // Indigo
            this.engine.setFrequency(10);
            this.engine.setPattern('pulse-circle');
        } else if (mode === 'psychedelic') {
            this.engine.setColors(['#ff00ff', '#00ffff']);
            this.engine.setFrequency(12);
            this.engine.setPattern('grid');
        } else if (mode === 'adhd-focus') {
            // 40Hz Gamma — Attokaren 2025, MIT GENUS
            // Red/black: red light (628nm) entrains gamma most effectively
            // Isochronic 40Hz at 1kHz carrier: strongest gamma EEG response
            this.engine.setColors(['#ff0000', '#000000']);
            this.engine.setFrequency(40);
            this.engine.setPattern('none');
            if (this.audio) {
                this.audio.setMode('isochronic');
                this.audio.setCarrierFreq(1000);
                this.audio.setFrequency(40);
                this.audio.setVolume(0.15);
                this.audio.start();
                this.notifyAudioUI('isochronic', 40, 1000);
            }
        } else if (mode === 'adhd-protocol') {
            // Joyce/Siever phased 22-min — starts Phase 1
            // Red/black throughout for max gamma entrainment
            this.engine.setColors(['#ff0000', '#000000']);
            this.engine.setFrequency(8);
            this.engine.setPattern('none');
            if (this.audio) {
                this.audio.setMode('isochronic');
                this.audio.setCarrierFreq(1000);
                this.audio.setFrequency(10);
                this.audio.setVolume(0.15);
                this.audio.start();
                this.notifyAudioUI('isochronic', 10, 1000);
            }
            this.start();
        } else if (mode === 'theta-deep') {
            // Theta Deep Session — 20min descent into deep theta
            // Phase 1 (0-5 min): 10Hz alpha — relaxation onset
            // Phase 2 (5-10 min): 7Hz — transition to theta
            // Phase 3 (10-20 min): 5-6Hz deep theta — dreamlike state
            // Soft amber/dark colors, no harsh contrast
            this.engine.setColors(['#ffbf00', '#1a0a00']);
            this.engine.setFrequency(10);
            this.engine.setPattern('none');
            // Don't touch user's audio — they have their ASMR loaded
            // Just slow the pan speed if audio is running
            if (this.audio && this.audio.isPlaying) {
                this.audio.setPanSpeed(0.3); // Ultra-slow intimate panning
            }
            this.start();
        } else if (mode === 'adhd-alpha') {
            // Mohagheghi 2017 — 10Hz alpha entrainment
            // Red/black + 10Hz binaural (1kHz/1010Hz carrier)
            this.engine.setColors(['#ff0000', '#000000']);
            this.engine.setFrequency(10);
            this.engine.setPattern('none');
            if (this.audio) {
                this.audio.setMode('binaural');
                this.audio.setCarrierFreq(1000);
                this.audio.setFrequency(10);
                this.audio.setVolume(0.15);
                this.audio.start();
                this.notifyAudioUI('binaural', 10, 1000);
            }
        }
    }

    private notifyAudioUI(mode: string, freq: number, carrier: number): void {
        if (this.onAudioUpdate) {
            this.onAudioUpdate(mode, freq, carrier);
        }
    }

    public start() {
        if (this.mode === 'manual' || this.isRunning) return;
        this.isRunning = true;
        this.startTime = performance.now() / 1000;
        this.engine.start(); // Ensure engine is running
        this.loop();
    }

    public stop() {
        this.isRunning = false;
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    private loop() {
        if (!this.isRunning) return;

        const now = performance.now() / 1000;
        const t = now - this.startTime;

        if (this.mode === 'hallucinate') {
            this.updateHallucinate(t);
        } else if (this.mode === 'meditate') {
            this.updateMeditate(t);
        } else if (this.mode === 'psychedelic') {
            this.updatePsychedelic(t);
        } else if (this.mode === 'adhd-protocol') {
            this.updateADHDProtocol(t);
        } else if (this.mode === 'theta-deep') {
            this.updateThetaDeep(t);
        }

        if (this.onUpdateUI) {
            this.onUpdateUI(this.engine.getFrequency(), this.engine.getPattern());
        }

        this.animationId = requestAnimationFrame(() => this.loop());
    }

    private updateHallucinate(t: number) {
        // Hallucination Curve:
        // 0-10s: 7.5Hz Solid Red/Black (Induction)
        // 10s-30s: Introduce Noise, Freq wobble 7.0-8.0Hz
        // 30s+: Grid/Complex integration

        // Freq Oscillation (7.5 +/- 0.5Hz)
        const wobble = 7.5 + Math.sin(t * 0.5) * 0.5;
        this.engine.setFrequency(wobble);

        if (t > 10 && t < 30) {
            if (this.engine.getPattern() !== 'noise') this.engine.setPattern('noise');
        } else if (t >= 30) {
            if (this.engine.getPattern() !== 'grid') this.engine.setPattern('grid');
        }
    }

    private updateMeditate(t: number) {
        // Slow ramp down from Alpha (10Hz) to Theta (5Hz) over 60 seconds
        const duration = 60;
        const start = 10;
        const end = 5;
        let freq = end;

        if (t < duration) {
            const progress = t / duration; // 0 to 1
            freq = start - (progress * (start - end));
        } else {
            // Breathing oscillation at Theta
            freq = 5 + Math.sin(t * 0.25) * 0.3;
        }

        this.engine.setFrequency(freq);
    }

    private updatePsychedelic(t: number) {
        // Chaos
        const freq = 15 + Math.sin(t * 2) * 8; // 5Hz to 25Hz swing
        this.engine.setFrequency(freq);

        // Randomly switch pattern
        const cycle = Math.floor(t % 6);
        // Simple logic:
        if (cycle < 2 && this.engine.getPattern() !== 'grid') this.engine.setPattern('grid');
        else if (cycle >= 2 && cycle < 4 && this.engine.getPattern() !== 'noise') this.engine.setPattern('noise');
        else if (cycle >= 4 && this.engine.getPattern() !== 'pulse-circle') this.engine.setPattern('pulse-circle');
    }

    private updateADHDProtocol(t: number) {
        // Joyce/Siever phased 22-min session
        // Phase 1 (0-8 min): 7-9Hz flicker + 10Hz isochronic (calming)
        // Phase 2 (8-16 min): 12-15Hz flicker + 15Hz binaural (SMR training)
        // Phase 3 (16-22 min): 15-19Hz flicker + 40Hz panning noise (attention boost)

        const minutes = t / 60;

        if (minutes < 8) {
            // Phase 1: Calming — 7-9Hz visual, 10Hz isochronic
            const freq = 8 + Math.sin(t * 0.3) * 1; // 7-9Hz oscillation
            this.engine.setFrequency(freq);

            // Set colors/pattern once at start (already done in setMode)
            // Audio stays at isochronic 10Hz (set in setMode)
        } else if (minutes < 16) {
            // Phase 2: SMR training — 12-15Hz visual, 15Hz isochronic
            const freq = 13.5 + Math.sin(t * 0.2) * 1.5; // 12-15Hz
            this.engine.setFrequency(freq);

            // Transition audio to 15Hz isochronic (once)
            if (this.audio && this.audio.frequency !== 15) {
                this.audio.setFrequency(15);
                this.notifyAudioUI('isochronic', 15, 1000);
            }
        } else if (minutes < 22) {
            // Phase 3: Attention boost — 15-19Hz visual, 40Hz isochronic
            const freq = 17 + Math.sin(t * 0.15) * 2; // 15-19Hz
            this.engine.setFrequency(freq);

            if (this.audio && this.audio.frequency !== 40) {
                this.audio.setFrequency(40);
                this.notifyAudioUI('isochronic', 40, 1000);
            }
        } else {
            // Session complete — stop
            this.stop();
            if (this.audio) this.audio.stop();
        }
    }

    private updateThetaDeep(t: number) {
        // Theta Deep — smooth 20-min descent
        // Phase 1 (0-5 min): 10Hz → 7Hz alpha descent
        // Phase 2 (5-10 min): 7Hz → 5.5Hz theta transition
        // Phase 3 (10-20 min): 5.5Hz with gentle breathing oscillation

        const minutes = t / 60;

        if (minutes < 5) {
            // Phase 1: Alpha descent 10 → 7Hz over 5 mins
            const progress = minutes / 5;
            const freq = 10 - (progress * 3); // 10 → 7
            this.engine.setFrequency(freq);
        } else if (minutes < 10) {
            // Phase 2: Theta transition 7 → 5.5Hz
            const progress = (minutes - 5) / 5;
            const freq = 7 - (progress * 1.5); // 7 → 5.5
            this.engine.setFrequency(freq);

            // Fade colors to deeper/warmer as we go deeper
            if (minutes > 7 && this.engine.getPattern() !== 'pulse-circle') {
                this.engine.setColors(['#ff6633', '#0a0000']);
                this.engine.setPattern('pulse-circle');
            }
        } else {
            // Phase 3: Deep theta — 5.5Hz with slow breathing oscillation
            // Gentle wobble simulates natural brainwave rhythm
            const breathCycle = Math.sin(t * 0.15) * 0.5; // ~0.15Hz = ~7s breath cycle
            const freq = 5.5 + breathCycle; // 5.0 - 6.0Hz range
            this.engine.setFrequency(freq);

            // Slow pan speed down further over time for deeper immersion
            if (this.audio && this.audio.isPlaying && minutes < 12) {
                this.audio.setPanSpeed(0.2);
            }
        }
        // No auto-stop — session runs until user stops it
    }
}
