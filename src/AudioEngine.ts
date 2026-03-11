export type AudioMode = 'panning-noise' | 'binaural' | 'isochronic';
export type PanSource = 'pink-noise' | 'white-noise' | 'brown-noise' | 'tone' | 'sawtooth' | 'custom';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // Panning mode nodes
  private noiseSource: AudioBufferSourceNode | null = null;
  private panToneSource: OscillatorNode | null = null;
  private pannerNode: StereoPannerNode | null = null;
  private panLFO: OscillatorNode | null = null;
  private panLFOGain: GainNode | null = null;
  // AM for synthetic sources only
  private noiseAmpNode: GainNode | null = null;
  private noiseAmpLFO: OscillatorNode | null = null;
  private noiseAmpLFOGain: GainNode | null = null;

  // Binaural beat nodes
  private oscLeft: OscillatorNode | null = null;
  private oscRight: OscillatorNode | null = null;
  private mergerNode: ChannelMergerNode | null = null;

  // Isochronic tone nodes
  private isoOsc: OscillatorNode | null = null;
  private isoLFO: OscillatorNode | null = null;
  private isoLFOGain: GainNode | null = null;
  private isoAmpNode: GainNode | null = null;

  // State
  public isPlaying: boolean = false;
  public mode: AudioMode = 'isochronic';
  public panSource: PanSource = 'pink-noise';
  public panLoop: boolean = true;
  public frequency: number = 40;
  public carrierFreq: number = 1000;
  public panSpeed: number = 2;
  private _volume: number = 0.15;
  private customBuffer: AudioBuffer | null = null;
  public customFileName: string = '';

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      // Use high sample rate for crisp audio
      this.ctx = new AudioContext({ sampleRate: 48000 });
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  start(): void {
    if (this.isPlaying) return;

    const ctx = this.ensureContext();

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = this._volume;
    this.masterGain.connect(ctx.destination);

    if (this.mode === 'panning-noise') {
      this.startPanning();
    } else if (this.mode === 'binaural') {
      this.startBinaural();
    } else if (this.mode === 'isochronic') {
      this.startIsochronic();
    }

    this.isPlaying = true;
  }

  stop(): void {
    if (!this.isPlaying) return;
    this.teardownNodes();
    this.isPlaying = false;
  }

  setMode(mode: AudioMode): void {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.stop();
    this.mode = mode;
    if (wasPlaying) this.start();
  }

  setPanSource(source: PanSource): void {
    const wasPlaying = this.isPlaying;
    if (wasPlaying && this.mode === 'panning-noise') {
      this.stop();
    }
    this.panSource = source;
    if (wasPlaying && this.mode === 'panning-noise') {
      this.start();
    }
  }

  setFrequency(hz: number): void {
    this.frequency = Math.max(1, Math.min(60, hz));
    if (!this.isPlaying || !this.ctx) return;

    if (this.mode === 'panning-noise' && this.noiseAmpLFO) {
      this.noiseAmpLFO.frequency.setValueAtTime(this.frequency, this.ctx.currentTime);
    } else if (this.mode === 'binaural' && this.oscLeft && this.oscRight) {
      this.oscLeft.frequency.setValueAtTime(this.carrierFreq, this.ctx.currentTime);
      this.oscRight.frequency.setValueAtTime(this.carrierFreq + this.frequency, this.ctx.currentTime);
    } else if (this.mode === 'isochronic' && this.isoLFO) {
      this.isoLFO.frequency.setValueAtTime(this.frequency, this.ctx.currentTime);
    }
  }

  setPanSpeed(hz: number): void {
    this.panSpeed = Math.max(0.1, Math.min(20, hz));
    if (!this.isPlaying || !this.ctx) return;

    if (this.mode === 'panning-noise' && this.panLFO) {
      this.panLFO.frequency.setValueAtTime(this.panSpeed, this.ctx.currentTime);
    }
  }

  setCarrierFreq(hz: number): void {
    this.carrierFreq = Math.max(100, Math.min(2000, hz));
    if (!this.isPlaying || !this.ctx) return;

    if (this.mode === 'binaural' && this.oscLeft && this.oscRight) {
      this.oscLeft.frequency.setValueAtTime(this.carrierFreq, this.ctx.currentTime);
      this.oscRight.frequency.setValueAtTime(this.carrierFreq + this.frequency, this.ctx.currentTime);
    } else if (this.mode === 'isochronic' && this.isoOsc) {
      this.isoOsc.frequency.setValueAtTime(this.carrierFreq, this.ctx.currentTime);
    }
  }

  setVolume(vol: number): void {
    this._volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this._volume, this.ctx.currentTime);
    }
  }

  getVolume(): number {
    return this._volume;
  }

  async loadAudioFile(file: File): Promise<void> {
    const ctx = this.ensureContext();
    const arrayBuffer = await file.arrayBuffer();
    this.customBuffer = await ctx.decodeAudioData(arrayBuffer);
    this.customFileName = file.name;
    this.panSource = 'custom';

    // Restart if currently playing panning mode
    if (this.isPlaying && this.mode === 'panning-noise') {
      this.stop();
      this.start();
    }
  }

  // --- Panning Mode ---

  private startPanning(): void {
    if (!this.ctx || !this.masterGain) return;
    if (this.panSource === 'custom' && !this.customBuffer) return;

    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * 2;
    let sourceNode: AudioNode;
    const isCustom = this.panSource === 'custom';

    // --- Create source ---
    if (this.panSource === 'tone' || this.panSource === 'sawtooth') {
      this.panToneSource = this.ctx.createOscillator();
      this.panToneSource.type = this.panSource === 'tone' ? 'sine' : 'sawtooth';
      this.panToneSource.frequency.value = this.carrierFreq;
      sourceNode = this.panToneSource;
    } else if (isCustom && this.customBuffer) {
      // Custom: play original audio untouched
      this.noiseSource = this.ctx.createBufferSource();
      this.noiseSource.buffer = this.customBuffer;
      this.noiseSource.loop = this.panLoop;
      sourceNode = this.noiseSource;
    } else {
      const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);
      this.generateNoiseBuffer(data, bufferSize);
      this.noiseSource = this.ctx.createBufferSource();
      this.noiseSource.buffer = buffer;
      this.noiseSource.loop = true;
      sourceNode = this.noiseSource;
    }

    // --- Stereo panner LFO ---
    this.pannerNode = this.ctx.createStereoPanner();

    this.panLFO = this.ctx.createOscillator();
    this.panLFO.type = 'sine';
    this.panLFO.frequency.value = this.panSpeed;

    this.panLFOGain = this.ctx.createGain();
    this.panLFOGain.gain.value = 1;

    this.panLFO.connect(this.panLFOGain);
    this.panLFOGain.connect(this.pannerNode.pan);

    if (isCustom) {
      // CUSTOM AUDIO: pristine path — zero processing
      // source -> panner -> master (no EQ, no AM, no resampling)
      sourceNode.connect(this.pannerNode);
      this.pannerNode.connect(this.masterGain);
    } else {
      // SYNTHETIC: amplitude modulation for entrainment
      this.noiseAmpNode = this.ctx.createGain();
      this.noiseAmpNode.gain.value = 0; // Start at 0, LFO brings it to 1

      this.noiseAmpLFO = this.ctx.createOscillator();
      this.noiseAmpLFO.type = 'sine';
      this.noiseAmpLFO.frequency.value = this.frequency;

      // LFO output is -1 to +1. Gain base=0 + LFO*0.5 = range -0.5 to 0.5
      // We want 0 to 1, so base=0.5, depth=0.5
      this.noiseAmpNode.gain.value = 0.5;
      this.noiseAmpLFOGain = this.ctx.createGain();
      this.noiseAmpLFOGain.gain.value = 0.5;

      this.noiseAmpLFO.connect(this.noiseAmpLFOGain);
      this.noiseAmpLFOGain.connect(this.noiseAmpNode.gain);

      sourceNode.connect(this.noiseAmpNode);
      this.noiseAmpNode.connect(this.pannerNode);
      this.pannerNode.connect(this.masterGain);

      this.noiseAmpLFO.start();
    }

    if (this.noiseSource) this.noiseSource.start();
    if (this.panToneSource) this.panToneSource.start();
    this.panLFO.start();
  }

  private generateNoiseBuffer(data: Float32Array, size: number): void {
    if (this.panSource === 'white-noise') {
      for (let i = 0; i < size; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } else if (this.panSource === 'brown-noise') {
      let last = 0;
      for (let i = 0; i < size; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + (0.02 * white)) / 1.02;
        data[i] = last * 3.5;
      }
    } else {
      // Pink noise — Paul Kellet's method
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < size; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    }
  }

  // --- Binaural ---

  private startBinaural(): void {
    if (!this.ctx || !this.masterGain) return;

    this.mergerNode = this.ctx.createChannelMerger(2);

    this.oscLeft = this.ctx.createOscillator();
    this.oscLeft.type = 'sine';
    this.oscLeft.frequency.value = this.carrierFreq;

    this.oscRight = this.ctx.createOscillator();
    this.oscRight.type = 'sine';
    this.oscRight.frequency.value = this.carrierFreq + this.frequency;

    this.oscLeft.connect(this.mergerNode, 0, 0);
    this.oscRight.connect(this.mergerNode, 0, 1);

    this.mergerNode.connect(this.masterGain);

    this.oscLeft.start();
    this.oscRight.start();
  }

  // --- Isochronic ---

  private startIsochronic(): void {
    if (!this.ctx || !this.masterGain) return;

    this.isoOsc = this.ctx.createOscillator();
    this.isoOsc.type = 'sine';
    this.isoOsc.frequency.value = this.carrierFreq;

    this.isoAmpNode = this.ctx.createGain();
    this.isoAmpNode.gain.value = 0.5;

    this.isoLFO = this.ctx.createOscillator();
    this.isoLFO.type = 'square';
    this.isoLFO.frequency.value = this.frequency;

    this.isoLFOGain = this.ctx.createGain();
    this.isoLFOGain.gain.value = 0.5;

    this.isoLFO.connect(this.isoLFOGain);
    this.isoLFOGain.connect(this.isoAmpNode.gain);

    this.isoOsc.connect(this.isoAmpNode);
    this.isoAmpNode.connect(this.masterGain);

    this.isoOsc.start();
    this.isoLFO.start();
  }

  // --- Teardown ---

  private teardownNodes(): void {
    if (this.noiseSource) { try { this.noiseSource.stop(); } catch (_) {} this.noiseSource.disconnect(); this.noiseSource = null; }
    if (this.panToneSource) { try { this.panToneSource.stop(); } catch (_) {} this.panToneSource.disconnect(); this.panToneSource = null; }
    if (this.noiseAmpLFO) { try { this.noiseAmpLFO.stop(); } catch (_) {} this.noiseAmpLFO.disconnect(); this.noiseAmpLFO = null; }
    if (this.noiseAmpLFOGain) { this.noiseAmpLFOGain.disconnect(); this.noiseAmpLFOGain = null; }
    if (this.noiseAmpNode) { this.noiseAmpNode.disconnect(); this.noiseAmpNode = null; }
    if (this.panLFO) { try { this.panLFO.stop(); } catch (_) {} this.panLFO.disconnect(); this.panLFO = null; }
    if (this.panLFOGain) { this.panLFOGain.disconnect(); this.panLFOGain = null; }
    if (this.pannerNode) { this.pannerNode.disconnect(); this.pannerNode = null; }

    if (this.oscLeft) { try { this.oscLeft.stop(); } catch (_) {} this.oscLeft.disconnect(); this.oscLeft = null; }
    if (this.oscRight) { try { this.oscRight.stop(); } catch (_) {} this.oscRight.disconnect(); this.oscRight = null; }
    if (this.mergerNode) { this.mergerNode.disconnect(); this.mergerNode = null; }

    if (this.isoOsc) { try { this.isoOsc.stop(); } catch (_) {} this.isoOsc.disconnect(); this.isoOsc = null; }
    if (this.isoLFO) { try { this.isoLFO.stop(); } catch (_) {} this.isoLFO.disconnect(); this.isoLFO = null; }
    if (this.isoLFOGain) { this.isoLFOGain.disconnect(); this.isoLFOGain = null; }
    if (this.isoAmpNode) { this.isoAmpNode.disconnect(); this.isoAmpNode = null; }

    if (this.masterGain) { this.masterGain.disconnect(); this.masterGain = null; }
  }
}
