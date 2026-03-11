# Ganzflicker FX

A browser-based audiovisual entrainment system combining photic driving (stroboscopic flicker) with auditory stimulation. Built on the Web Audio API and HTML5 Canvas for real-time, research-informed brainwave entrainment sessions.

**WARNING: This application produces rapid flashing lights. Do not use if you have photosensitive epilepsy or are sensitive to flashing/strobing visual stimuli.**

## What It Does

Ganzflicker FX generates precise-frequency light flicker paired with spatial audio (panning noise, binaural beats, isochronic tones) to drive neural oscillations at target brainwave frequencies. It includes research-based presets for ADHD focus training, deep theta meditation, and exploratory consciousness states.

## Features

- **Variable-frequency flicker** (1-60 Hz) with 0.01 Hz precision
- **Three audio entrainment modes:**
  - Panning Noise — pink/white/brown noise or custom audio panned L-R at configurable speed
  - Binaural Beats — stereo frequency difference creates perceived beat (requires headphones)
  - Isochronic Tones — amplitude-modulated carrier for strongest cortical entrainment
- **Custom audio loading** — load MP3/WAV/OGG files with pristine stereo panning (zero signal processing)
- **YouTube audio downloader** — download long-form ambient/ASMR tracks via yt-dlp
- **Visual patterns** — kaleidoscopic grid, simplex noise, ripple pulse with rotation/speed/flow controls
- **Brightness control** — dim output for comfortable extended sessions
- **Research-based session presets** — see below

## Session Presets

### ADHD Focus (40 Hz Gamma)
Constant 40 Hz flicker with 40 Hz isochronic tone at 1 kHz carrier. Red/black high-contrast visual.

- **Basis:** Attokaren et al. (2025) — 40 Hz audiovisual stimulation improved accuracy by 3.7% and reaction time by 11% in sustained attention tasks. Wilson et al. (2012) demonstrated that ADHD adults have measurably reduced 40 Hz gamma power during attention tasks, and 40 Hz entrainment partially normalises this deficit.
- **Modality:** Isochronic tones chosen over binaural beats — a 2024 comparison study found isochronic stimulation produces the strongest gamma EEG response due to sharp on/off transients versus smooth sinusoidal beats.

### ADHD Protocol (22-min Phased Session)
Three-phase session modelled on the Joyce & Siever (2000) neurofeedback protocol:

| Phase | Time | Visual | Audio | Target |
|-------|------|--------|-------|--------|
| 1 — Calming | 0-8 min | 7-9 Hz oscillation | 10 Hz isochronic | Alpha relaxation |
| 2 — SMR Training | 8-16 min | 12-15 Hz oscillation | 15 Hz isochronic | Sensorimotor rhythm |
| 3 — Attention Boost | 16-22 min | 15-19 Hz oscillation | 40 Hz isochronic | Gamma attention |

- **Basis:** Joyce & Siever (2000) used phased audio-visual entrainment with 34 school-age students, producing significant improvements on the Test of Variables of Attention (TOVA) for both inattentive and hyperactive subtypes. Carter & Russell (1993) found similar improvements using phased SMR/beta entrainment protocols.

### ADHD Alpha Boost (10 Hz)
10 Hz flicker with 10 Hz binaural beat (1000/1010 Hz carrier pair).

- **Basis:** Mohagheghi et al. (2017) found 10 Hz alpha entrainment produced superior reduction in omission errors compared to other frequency bands, indicating improved selective attention and vigilance.

### Theta Deep Session
20-minute smooth descent from alpha into deep theta:

| Phase | Time | Frequency | Effect |
|-------|------|-----------|--------|
| 1 — Alpha onset | 0-5 min | 10 Hz → 7 Hz | Relaxation, eyes-closed alpha |
| 2 — Theta transition | 5-10 min | 7 Hz → 5.5 Hz | Hypnagogic imagery onset |
| 3 — Deep theta | 10-20 min | 5.5 Hz ± 0.5 Hz | Dreamlike/meditative state |

Warm amber/dark colour palette. Does not interfere with user-loaded audio — only adjusts panning speed for deeper immersion.

### Deep Hallucination (7.5 Hz Adaptive)
Classic Ganzfeld protocol — 7.5 Hz flicker with progressive pattern introduction. The Ganzfeld effect at theta-alpha border frequencies reliably produces visual phenomena (form constants, geometric hallucinations, and at extended durations, complex imagery).

### Zen Meditation (Alpha to Theta)
60-second ramp from 10 Hz alpha to 5 Hz theta, then gentle breathing-rate oscillation. Indigo/black palette with ripple pulse overlay.

### Psychedelic Trip (Chaos)
Rapidly oscillating 5-25 Hz with cycling patterns. Exploratory/recreational mode.

## Scientific References

| Study | Finding | Relevance |
|-------|---------|-----------|
| Attokaren et al. (2025) | 40 Hz AV stimulation: +3.7% accuracy, 11% faster RT | ADHD Focus preset |
| Wilson et al. (2012) | ADHD adults show reduced 40 Hz gamma during attention | Gamma deficit rationale |
| MIT GENUS (Iaccarino et al. 2016) | 40 Hz flicker reduces amyloid plaques in mice via microglial activation | 40 Hz entrainment mechanism |
| Joyce & Siever (2000) | Phased AVE improved TOVA scores in 34 students (inattentive + hyperactive) | ADHD Protocol preset |
| Carter & Russell (1993) | SMR/beta entrainment improved attention in learning-disabled students | Phased protocol design |
| Mohagheghi et al. (2017) | 10 Hz alpha entrainment reduced omission errors (selective attention) | ADHD Alpha Boost preset |
| Isochronic vs Binaural (2024 review) | Isochronic tones produce stronger cortical gamma response than binaural beats | Audio mode selection |
| Red light entrainment studies | 628 nm red light most effectively entrains gamma oscillations | Red/black colour choice |

## Setup

### Requirements
- Node.js 18+
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) (optional, for YouTube audio downloads)

### Install & Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### YouTube Audio Downloader (Optional)

To download audio from YouTube (useful for long ASMR/ambient tracks):

```bash
# Install yt-dlp
pip install yt-dlp

# Start the download server (separate terminal)
npm run dl-server
```

The download server runs on port 3001. Paste any YouTube URL into the sidebar downloader and click DL. Downloaded files appear as clickable buttons to load directly into the panning audio engine.

## Usage Tips

- **Headphones recommended** for binaural beats (required) and spatial panning audio
- **Eyes closed** works best for most entrainment — the flicker penetrates eyelids at sufficient brightness
- **Eyes open** can produce stronger visual effects but may cause eye fatigue; use brightness control to reduce strain
- **ASMR + Panning** is particularly effective — whispered audio panning left-to-right creates immersive spatial entrainment alongside the visual flicker
- **Start with 15-30 minute sessions** and extend as comfortable
- The brightness slider (5-100%) lets you find a comfortable level for extended use

## Tech Stack

- TypeScript + Vite
- HTML5 Canvas (2D context, no WebGL)
- Web Audio API (AudioContext, OscillatorNode, StereoPannerNode, GainNode)
- Simplex noise (embedded generator for pattern textures)
- Node.js HTTP server + yt-dlp for audio downloads

## Project Structure

```
src/
  main.ts           — UI wiring, event handlers
  Ganzflicker.ts    — Visual engine (canvas flicker + patterns)
  AudioEngine.ts    — Web Audio API (panning, binaural, isochronic)
  SessionManager.ts — Research-based preset session logic
  style.css         — Dark theme UI
server/
  download.js       — yt-dlp download server
index.html          — Application shell
```

## License

MIT
