// -- Embed NoiseGenerator for robustness --
class PermutationTable {
    private p: number[] = new Array(512);
    constructor() {
        const p = new Array(256);
        for (let i = 0; i < 256; i++) p[i] = i;
        for (let i = 255; i > 0; i--) {
            const n = Math.floor(Math.random() * (i + 1));
            [p[i], p[n]] = [p[n], p[i]];
        }
        for (let i = 0; i < 512; i++) this.p[i] = p[i & 255];
    }
    public get(i: number) { return this.p[i]; }
}

class NoiseGenerator {
    private perm: PermutationTable = new PermutationTable();
    private grad3: number[][] = [
        [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
        [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
        [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
    ];

    private dot(g: number[], x: number, y: number, z: number): number {
        return g[0] * x + g[1] * y + g[2] * z;
    }

    public noise3D(xin: number, yin: number, zin: number): number {
        let n0, n1, n2, n3;
        const F3 = 1.0 / 3.0;
        const s = (xin + yin + zin) * F3;
        const i = Math.floor(xin + s);
        const j = Math.floor(yin + s);
        const k = Math.floor(zin + s);
        const G3 = 1.0 / 6.0;
        const t = (i + j + k) * G3;
        const X0 = i - t;
        const Y0 = j - t;
        const Z0 = k - t;
        const x0 = xin - X0;
        const y0 = yin - Y0;
        const z0 = zin - Z0;

        let i1, j1, k1;
        let i2, j2, k2;
        if (x0 >= y0) {
            if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
            else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
            else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
        } else {
            if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
            else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
            else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
        }

        const x1 = x0 - i1 + G3;
        const y1 = y0 - j1 + G3;
        const z1 = z0 - k1 + G3;
        const x2 = x0 - i2 + 2.0 * G3;
        const y2 = y0 - j2 + 2.0 * G3;
        const z2 = z0 - k2 + 2.0 * G3;
        const x3 = x0 - 1.0 + 3.0 * G3;
        const y3 = y0 - 1.0 + 3.0 * G3;
        const z3 = z0 - 1.0 + 3.0 * G3;

        const ii = i & 255;
        const jj = j & 255;
        const kk = k & 255;
        const gi0 = this.perm.get(ii + this.perm.get(jj + this.perm.get(kk))) % 12;
        const gi1 = this.perm.get(ii + i1 + this.perm.get(jj + j1 + this.perm.get(kk + k1))) % 12;
        const gi2 = this.perm.get(ii + i2 + this.perm.get(jj + j2 + this.perm.get(kk + k2))) % 12;
        const gi3 = this.perm.get(ii + 1 + this.perm.get(jj + 1 + this.perm.get(kk + 1))) % 12;

        let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
        if (t0 < 0) n0 = 0.0;
        else { t0 *= t0; n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0, z0); }
        let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
        if (t1 < 0) n1 = 0.0;
        else { t1 *= t1; n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1, z1); }
        let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
        if (t2 < 0) n2 = 0.0;
        else { t2 *= t2; n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2, z2); }
        let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
        if (t3 < 0) n3 = 0.0;
        else { t3 *= t3; n3 = t3 * t3 * this.dot(this.grad3[gi3], x3, y3, z3); }

        return 32.0 * (n0 + n1 + n2 + n3);
    }
}

// ------------------------------------

export type PatternType = 'none' | 'grid' | 'noise' | 'pulse-circle';
export type NoiseType = 'white' | 'pink' | 'perlin' | 'liquid' | 'zebra';

export class Ganzflicker {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    private frequency: number = 7.5;
    private _colors: string[] = ['#ff0000', '#000000'];
    private _pattern: PatternType = 'none';

    public isFlickerOn: boolean = false;
    public isPatternOn: boolean = false;
    public patternSpeed: number = 1.0;
    public patternFlow: number = 50;
    public patternOpacity: number = 0.5; // New control for visibility
    public patternRotationSpeed: number = 0; // New control for rotation (spiral)
    public isAutoEvolve: boolean = false; // "Auto-Adjust" tick box
    public isNoiseSynced: boolean = false; // "Sync Noise with Flicker" tick box
    public noiseType: NoiseType = 'white';
    public brightness: number = 1.0; // 0.05 to 1.0 — dims the output

    // Callbacks
    public onParameterUpdate: ((speed: number, flow: number, rotation: number, opacity: number) => void) | null = null;


    private animationId: number | null = null;
    private lastFrameTime: number = 0;
    private accumulatedTime: number = 0;
    private colorIndex: number = 0;
    private parsedColors: { r: number, g: number, b: number }[] = [];

    private noisePattern: CanvasPattern | null = null;
    private noiseGen: NoiseGenerator = new NoiseGenerator();
    private noiseCanvas: HTMLCanvasElement;
    private noiseCtx: CanvasRenderingContext2D;

    constructor(canvasId: string) {
        const el = document.getElementById(canvasId);
        if (!el) throw new Error(`Canvas element #${canvasId} not found`);
        this.canvas = el as HTMLCanvasElement;
        const context = this.canvas.getContext('2d', { alpha: false });
        if (!context) throw new Error("Could not get 2D context");
        this.ctx = context;
        this.ctx.imageSmoothingEnabled = false;

        this.noiseCanvas = document.createElement('canvas');
        this.noiseCanvas.width = 128; // Increased resolution for finer details
        this.noiseCanvas.height = 128;
        this.noiseCtx = this.noiseCanvas.getContext('2d')!;

        this.updateParsedColors();
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Auto-start
        this.start();
    }

    public get isRunning(): boolean {
        return this.animationId !== null;
    }

    private resize(): void {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        if (this.noisePattern) this.generateNoiseTexture();
        if (!this.isRunning) this.draw(0);
    }

    private parseColor(color: string): { r: number, g: number, b: number } {
        const names: Record<string, string> = {
            'red': '#ff0000', 'black': '#000000', 'white': '#ffffff',
            'green': '#00ff00', 'darkviolet': '#9400d3', 'indigo': '#4b0082',
            'cyan': '#00ffff'
        };
        let hex = names[color.toLowerCase()] || color;

        // Handle short hex #f00 -> #ff0000
        if (hex.length === 4 && hex.startsWith('#')) {
            hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
        }

        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    }

    private updateParsedColors(): void {
        this.parsedColors = this._colors.map(c => this.parseColor(c));
    }

    private generateNoiseTexture(): void {
        const size = 256;
        const noiseCanvas = document.createElement('canvas');
        noiseCanvas.width = size;
        noiseCanvas.height = size;
        const nCtx = noiseCanvas.getContext('2d');
        if (!nCtx) return;

        const c1 = this.parsedColors[0] || { r: 255, g: 0, b: 0 };

        const imageData = nCtx.createImageData(size, size);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const norm = Math.random();
            // Map noise intensity to the ALPHA of the primary color
            // This allows the background flicker to shine through the "gaps"
            data[i] = c1.r;
            data[i + 1] = c1.g;
            data[i + 2] = c1.b;
            data[i + 3] = Math.floor(norm * 255);
        }
        nCtx.putImageData(imageData, 0, 0);
        this.noisePattern = this.ctx.createPattern(noiseCanvas, 'repeat');
    }

    public getFrequency(): number { return this.frequency; }
    public getPattern(): PatternType { return this._pattern; }

    public setFrequency(freq: number): void {
        this.frequency = Math.max(0.1, Math.min(60, freq));
        if (!this.isRunning) this.draw(0);
    }

    public setColors(colors: string[]): void {
        this._colors = colors;
        this.updateParsedColors();
        this.generateNoiseTexture(); // Re-theme static noise
        this.colorIndex = 0;
        if (!this.isRunning) this.draw(0);
    }

    public setPattern(pattern: PatternType): void {
        this._pattern = pattern;
        if (pattern === 'noise' && !this.noisePattern) this.generateNoiseTexture();
        if (!this.isRunning) {
            this.draw(0); // Force update state
            if (this.isPatternOn) this.start(); // Auto-start living patterns
        }
    }

    public start(): void {
        if (this.isRunning) return;

        this.lastFrameTime = performance.now();
        // We must set animationId immediately so isRunning is true when loop fires
        this.animationId = requestAnimationFrame((t) => this.loop(t));
    }

    public stop(): void {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    public toggleFlicker(): boolean {
        this.isFlickerOn = !this.isFlickerOn;
        if (this.isFlickerOn || this.isPatternOn) this.start();
        else this.stop();
        return this.isFlickerOn;
    }

    public togglePattern(): boolean {
        this.isPatternOn = !this.isPatternOn;
        if (this.isFlickerOn || this.isPatternOn) this.start();
        else this.stop();
        return this.isPatternOn;
    }

    private loop(timestamp: number): void {
        if (!this.isRunning) return;

        const deltaTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;

        this.accumulatedTime += deltaTime * this.patternSpeed;

        // Auto-Evolve Logic: Slowly modulate parameters if enabled
        if (this.isAutoEvolve) {
            const t = this.accumulatedTime / 1000;
            // Flow: Oscillate between 5 and 95 (Complexity)
            this.patternFlow = 50 + 45 * Math.sin(t * 0.15);
            // Speed: Oscillate between 0.2 and 2.2
            this.patternSpeed = 1.2 + Math.sin(t * 0.1 + 1.0);
            // Rotation: Oscillate between -1.0 and 1.0
            this.patternRotationSpeed = Math.sin(t * 0.08 + 2.0);

            if (this.onParameterUpdate) {
                // Return current opacity so UI stays in sync, even though we don't evolve it
                this.onParameterUpdate(this.patternSpeed, this.patternFlow, this.patternRotationSpeed, this.patternOpacity);
            }
        }

        this.draw(timestamp);

        this.animationId = requestAnimationFrame((t) => this.loop(t));
    }

    private draw(timestamp: number): void {
        const w = this.canvas.width;
        const h = this.canvas.height;

        if (w === 0 || h === 0) return;

        // Flicker Logic
        let color: string;
        if (this.isFlickerOn) {
            const period = 1000 / this.frequency;
            const phase = timestamp % period;
            this.colorIndex = phase < (period / 2) ? 0 : 1;
            color = this._colors[this.colorIndex] || '#000000';
        } else {
            color = this._colors[0] || '#000000';
        }

        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, w, h);

        // 2. Draw Patterns (Safely)
        if (this.isPatternOn && this._pattern !== 'none') {
            try {
                // If synced, we only draw the pattern during the PRIMARY flicker phase
                if (this.isNoiseSynced && this.isFlickerOn && this.colorIndex !== 0) {
                    // Skip pattern during 'off' phase to show solid secondary color
                } else {
                    this.drawPattern(w, h, this.accumulatedTime / 1000);
                }
            } catch (e) {
                console.error("Pattern render failed:", e);
                this.isPatternOn = false;
            }
        }

        // Brightness dimming overlay
        if (this.brightness < 1.0) {
            this.ctx.globalAlpha = 1.0 - this.brightness;
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, w, h);
            this.ctx.globalAlpha = 1.0;
        }
    }

    private drawPattern(w: number, h: number, t: number): void {
        const flow = this.patternFlow;
        this.ctx.save();

        if (this._pattern === 'grid') {
            const segments = 12 + Math.floor(flow / 10);
            const globalRot = t * 0.1 * (flow / 50);
            const centerX = w / 2;
            const centerY = h / 2;
            const maxRadius = Math.max(w, h) * 0.8;

            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(globalRot);

            // USE THEME COLOR 0 instead of white
            const mainColor = this._colors[0] || '#ffffff';
            this.ctx.strokeStyle = mainColor;
            this.ctx.globalAlpha = this.patternOpacity;

            this.ctx.lineWidth = 1 + (flow / 50);
            this.ctx.lineCap = 'round';

            for (let i = 0; i < segments; i++) {
                this.ctx.save();
                this.ctx.rotate((i * Math.PI * 2) / segments);
                this.ctx.beginPath();
                const offset = (t * (20 + flow)) % 100;
                const step = 40 - (flow * 0.2);
                for (let r = 0; r < maxRadius; r += Math.max(5, step)) {
                    const size = (r + offset) % maxRadius;
                    this.ctx.moveTo(size, -size * 0.2);
                    this.ctx.lineTo(size * 1.2, 0);
                    this.ctx.lineTo(size, size * 0.2);
                }
                this.ctx.stroke();
                this.ctx.restore();
            }

        } else if (this._pattern === 'noise') {
            const opacity = this.patternOpacity;
            const centerX = w / 2;
            const centerY = h / 2;
            const diag = Math.sqrt(w * w + h * h);

            // If rotating, we need to draw a larger area to cover corners
            const drawSize = (this.patternRotationSpeed !== 0) ? diag : Math.max(w, h); // simplified
            const drawX = centerX - drawSize / 2;
            const drawY = centerY - drawSize / 2;

            this.ctx.save();
            this.ctx.globalAlpha = opacity;

            // Apply Rotation
            if (this.patternRotationSpeed !== 0) {
                this.ctx.translate(centerX, centerY);
                this.ctx.rotate(t * this.patternRotationSpeed);
                this.ctx.translate(-centerX, -centerY);
            }

            if (this.noiseType === 'white') {
                const randX = Math.random() * 100;
                const randY = Math.random() * 100;
                if (this.noisePattern) {
                    this.ctx.save();
                    // Use Pattern Flow to control Grain Size
                    const scale = 1 + (100 - flow) / 10;
                    this.ctx.translate(drawX, drawY); // Move to top-left of draw area
                    this.ctx.scale(scale, scale);
                    this.ctx.fillStyle = this.noisePattern;
                    this.ctx.translate(randX, randY);
                    // Fill the potentially larger and scaled area
                    // We need to cover 'drawSize' in screen pixels.
                    // In scaled pixels, that is drawSize / scale.
                    this.ctx.fillRect(-100, -100, (drawSize / scale) + 200, (drawSize / scale) + 200);
                    this.ctx.restore();
                } else {
                    this.generateNoiseTexture();
                }
            } else {
                try {
                    this.updateNoiseCanvas(t, flow);
                    this.ctx.imageSmoothingEnabled = true;
                    // Draw noise covering the calculated area
                    this.ctx.drawImage(this.noiseCanvas, drawX, drawY, drawSize, drawSize);
                    this.ctx.imageSmoothingEnabled = false;
                } catch (e) {
                    console.error("Noise generation failed", e);
                    this.noiseType = 'white'; // Fallback
                }
            }
            this.ctx.globalAlpha = 1.0;
            this.ctx.restore(); // Restore rotation/alpha

        } else if (this._pattern === 'pulse-circle') {
            const centerX = w / 2;
            const centerY = h / 2;
            const maxRadius = Math.min(w, h) * 0.45;
            const count = 3 + Math.floor(flow / 20);

            const mainColor = this._colors[0] || '#ffffff';
            this.ctx.strokeStyle = mainColor;

            for (let i = 0; i < count; i++) {
                const phase = (Math.sin(t * 2 + i * (Math.PI * 2 / count)) + 1) / 2;
                const radius = maxRadius * phase;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                this.ctx.globalAlpha = (1 - phase) * this.patternOpacity;
                this.ctx.stroke();
            }
        }

        this.ctx.restore();
    }

    private updateNoiseCanvas(t: number, flow: number): void {
        const w = this.noiseCanvas.width;
        const h = this.noiseCanvas.height;
        const imgData = this.noiseCtx.createImageData(w, h);
        const data = imgData.data;

        // "Complexity" controls zoom. 
        // User wants "1000 times smaller" (micro details).
        // Range: 0.05 (zoomed in) to 4.0 (very zoomed out / micro)
        let zoom = 0.05 + Math.pow(flow / 100, 2) * 4.0;
        if (this.noiseType === 'liquid') zoom *= 0.6;

        const z = t * 0.5;

        const c1 = this.parsedColors[0] || { r: 255, g: 0, b: 0 };

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let val = 0;

                if (this.noiseType === 'pink') {
                    // Deep Static: Granularity controlled by flow
                    // Flow 0 -> Zoom * 5 (Coarse)
                    // Flow 100 -> Zoom * 80 (Fine)
                    const grain = 5 + (flow * 0.75);
                    val = this.noiseGen.noise3D(x * zoom * grain, y * zoom * grain, z * 10);
                } else if (this.noiseType === 'perlin') {
                    val = this.noiseGen.noise3D(x * zoom, y * zoom, z);
                } else if (this.noiseType === 'liquid') {
                    const qx = this.noiseGen.noise3D(x * zoom, y * zoom, z);
                    const qy = this.noiseGen.noise3D(x * zoom + 5.2, y * zoom + 1.3, z);
                    val = this.noiseGen.noise3D(x * zoom + 4.0 * qx, y * zoom + 4.0 * qy, z);
                } else if (this.noiseType === 'zebra') {
                    const n = this.noiseGen.noise3D(x * zoom, y * zoom, z);
                    const phase = (x * zoom * 10) + (y * zoom * 5) + (n * 5);
                    val = Math.sin(phase);
                }

                let norm = (val + 1) / 2;
                norm = Math.max(0, Math.min(1, norm));

                const idx = (x + y * w) * 4;
                // Use ALPHA for noise intensity to reveal background flicker
                data[idx] = c1.r;
                data[idx + 1] = c1.g;
                data[idx + 2] = c1.b;
                data[idx + 3] = Math.floor(norm * 255);
            }
        }
        this.noiseCtx.putImageData(imgData, 0, 0);
    }
}
