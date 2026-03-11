import './style.css';
import { Ganzflicker, type PatternType } from './Ganzflicker';
import { SessionManager, type SessionMode } from './SessionManager';
import { AudioEngine, type AudioMode, type PanSource } from './AudioEngine';

document.addEventListener('DOMContentLoaded', () => {
  const canvasId = 'ganzflicker-overlay';
  const ganzflicker = new Ganzflicker(canvasId);
  const audioEngine = new AudioEngine();
  const sessionManager = new SessionManager(ganzflicker, audioEngine);

  // Elements
  const freqSlider = document.getElementById('freq-slider') as HTMLInputElement;
  const freqValue = document.getElementById('freq-value') as HTMLElement;
  const modeSelect = document.getElementById('mode-select') as HTMLSelectElement;
  const patternSelect = document.getElementById('pattern-select') as HTMLSelectElement;
  const noiseTypeContainer = document.getElementById('noise-type-container') as HTMLDivElement;
  const noiseTypeSelect = document.getElementById('noise-type') as HTMLSelectElement;

  const fullscreenBtn = document.getElementById('fullscreen-btn') as HTMLButtonElement;

  const toggleFlickerBtn = document.getElementById('toggle-flicker-btn') as HTMLButtonElement;
  const togglePatternBtn = document.getElementById('toggle-pattern-btn') as HTMLButtonElement;
  const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn') as HTMLButtonElement;

  const patternSpeedSlider = document.getElementById('pattern-speed') as HTMLInputElement;
  const patternFlowSlider = document.getElementById('pattern-flow') as HTMLInputElement;
  const patternOpacitySlider = document.getElementById('pattern-opacity') as HTMLInputElement;
  const patternRotationSlider = document.getElementById('pattern-rotation') as HTMLInputElement;
  const autoEvolveCheck = document.getElementById('auto-evolve') as HTMLInputElement;
  const syncNoiseCheck = document.getElementById('sync-noise') as HTMLInputElement;

  const brightnessSlider = document.getElementById('brightness-slider') as HTMLInputElement;
  const brightnessValue = document.getElementById('brightness-value') as HTMLElement;

  const presetBtns = document.querySelectorAll('.preset-btn');
  const freqBtns = document.querySelectorAll('.freq-btn');
  const freqMinus = document.getElementById('freq-minus') as HTMLButtonElement;
  const freqPlus = document.getElementById('freq-plus') as HTMLButtonElement;

  // Audio Elements
  const audioModeSelect = document.getElementById('audio-mode-select') as HTMLSelectElement;
  const audioFreqSlider = document.getElementById('audio-freq-slider') as HTMLInputElement;
  const audioFreqValue = document.getElementById('audio-freq-value') as HTMLElement;
  const panSourceContainer = document.getElementById('pan-source-container') as HTMLDivElement;
  const panSourceSelect = document.getElementById('pan-source-select') as HTMLSelectElement;
  const panSpeedContainer = document.getElementById('pan-speed-container') as HTMLDivElement;
  const panSpeedSlider = document.getElementById('pan-speed-slider') as HTMLInputElement;
  const panSpeedValue = document.getElementById('pan-speed-value') as HTMLElement;
  const syncPanFlickerCheck = document.getElementById('sync-pan-flicker') as HTMLInputElement;
  const carrierFreqContainer = document.getElementById('carrier-freq-container') as HTMLDivElement;
  const carrierFreqSlider = document.getElementById('carrier-freq-slider') as HTMLInputElement;
  const carrierFreqValue = document.getElementById('carrier-freq-value') as HTMLElement;
  const audioVolumeSlider = document.getElementById('audio-volume-slider') as HTMLInputElement;
  const audioVolumeValue = document.getElementById('audio-volume-value') as HTMLElement;
  const toggleAudioBtn = document.getElementById('toggle-audio-btn') as HTMLButtonElement;
  const customAudioContainer = document.getElementById('custom-audio-container') as HTMLDivElement;
  const audioFileInput = document.getElementById('audio-file-input') as HTMLInputElement;
  const audioFileName = document.getElementById('audio-file-name') as HTMLDivElement;
  const audioLoopCheck = document.getElementById('audio-loop') as HTMLInputElement;

  // YouTube downloader elements
  const ytUrlInput = document.getElementById('yt-url-input') as HTMLInputElement;
  const ytDownloadBtn = document.getElementById('yt-download-btn') as HTMLButtonElement;
  const ytProgress = document.getElementById('yt-progress') as HTMLDivElement;
  const ytFilesList = document.getElementById('yt-files-list') as HTMLDivElement;

  // --- Helper Functions ---

  const updateFreq = (val: number) => {
    val = Math.max(0.1, Math.min(60, val));
    freqValue.textContent = `${val.toFixed(2)} Hz`;
    ganzflicker.setFrequency(val);
    freqSlider.value = val.toString();

    // Sync pan speed to flicker if checkbox is checked
    if (syncPanFlickerCheck.checked && audioEngine.mode === 'panning-noise') {
      audioEngine.setPanSpeed(val);
      panSpeedSlider.value = val.toString();
      panSpeedValue.textContent = `${val.toFixed(1)} Hz`;
    }

    freqBtns.forEach(btn => {
      const btnFreq = parseFloat(btn.getAttribute('data-freq') || '0');
      if (Math.abs(btnFreq - val) < 0.1) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  };

  const updateAudioUI = () => {
    const isOn = audioEngine.isPlaying;
    toggleAudioBtn.textContent = isOn ? 'Audio: ON' : 'Audio: OFF';
    toggleAudioBtn.classList.toggle('active', isOn);
  };

  const showModeControls = (mode: string) => {
    panSourceContainer.style.display = mode === 'panning-noise' ? 'block' : 'none';
    panSpeedContainer.style.display = mode === 'panning-noise' ? 'block' : 'none';
    carrierFreqContainer.style.display = (mode === 'binaural' || mode === 'isochronic' || mode === 'panning-noise') ? 'block' : 'none';
  };

  // --- Session Manager Callbacks ---

  sessionManager.onUpdateUI = (freq, pattern) => {
    freqValue.textContent = `${freq.toFixed(2)} Hz`;
    freqSlider.value = freq.toString();

    if (patternSelect.value !== pattern) {
      patternSelect.value = pattern;
    }

    freqBtns.forEach(btn => {
      const btnFreq = parseFloat(btn.getAttribute('data-freq') || '0');
      if (Math.abs(btnFreq - freq) < 0.1) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  };

  sessionManager.onAudioUpdate = (audioMode, audioFreq, carrierFreq) => {
    audioModeSelect.value = audioMode;
    audioFreqSlider.value = audioFreq.toString();
    audioFreqValue.textContent = `${audioFreq.toFixed(1)} Hz`;
    carrierFreqSlider.value = carrierFreq.toString();
    carrierFreqValue.textContent = `${carrierFreq} Hz`;
    showModeControls(audioMode);
    updateAudioUI();
  };

  // --- Engine Parameter Updates (Auto-Evolve) ---
  ganzflicker.onParameterUpdate = (speed, flow, rotation, opacity) => {
    if (document.activeElement !== patternSpeedSlider) patternSpeedSlider.value = speed.toFixed(2);
    if (document.activeElement !== patternFlowSlider) patternFlowSlider.value = flow.toFixed(0);
    if (document.activeElement !== patternRotationSlider) patternRotationSlider.value = rotation.toFixed(2);
    if (document.activeElement !== patternOpacitySlider) patternOpacitySlider.value = opacity.toFixed(2);
  };

  // --- Event Listeners ---

  // Frequency Slider
  freqSlider.addEventListener('input', (e) => {
    try {
      if (sessionManager.mode !== 'manual') {
        modeSelect.value = 'manual';
        sessionManager.setMode('manual');
      }
      const target = e.target as HTMLInputElement;
      updateFreq(parseFloat(target.value));
    } catch (err) {
      console.error(`Error in freqSlider input handler:`, err);
    }
  });

  // Micro controls
  freqMinus.addEventListener('click', () => {
    if (sessionManager.mode !== 'manual') {
      modeSelect.value = 'manual';
      sessionManager.setMode('manual');
    }
    let current = ganzflicker.getFrequency();
    updateFreq(current - 0.01);
  });

  freqPlus.addEventListener('click', () => {
    if (sessionManager.mode !== 'manual') {
      modeSelect.value = 'manual';
      sessionManager.setMode('manual');
    }
    let current = ganzflicker.getFrequency();
    updateFreq(current + 0.01);
  });

  // Frequency Presets
  freqBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      try {
        if (sessionManager.mode !== 'manual') {
          modeSelect.value = 'manual';
          sessionManager.setMode('manual');
        }
        const freq = parseFloat(btn.getAttribute('data-freq') || '7.5');
        updateFreq(freq);
      } catch (e) { console.error("Preset Error", e); }
    });
  });

  // Pattern Select
  patternSelect.addEventListener('change', (e) => {
    if (sessionManager.mode !== 'manual') {
      modeSelect.value = 'manual';
      sessionManager.setMode('manual');
    }
    const target = e.target as HTMLSelectElement;
    ganzflicker.setPattern(target.value as PatternType);

    if (target.value === 'noise') {
      noiseTypeContainer.style.display = 'block';
    } else {
      noiseTypeContainer.style.display = 'none';
    }
  });

  // Color Presets
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      try {
        presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (sessionManager.mode !== 'manual') {
          modeSelect.value = 'manual';
          sessionManager.setMode('manual');
        }

        const colorsRaw = btn.getAttribute('data-colors');
        if (colorsRaw) {
          const colors = colorsRaw.split(',');
          ganzflicker.setColors(colors);
        }
      } catch (e) { console.error("Color Preset Error", e); }
    });
  });

  const syncButtonStates = () => {
    toggleFlickerBtn.textContent = ganzflicker.isFlickerOn ? "Flicker: ON" : "Flicker: OFF";
    toggleFlickerBtn.classList.toggle('active', ganzflicker.isFlickerOn);
    togglePatternBtn.textContent = ganzflicker.isPatternOn ? "Pattern: ON" : "Pattern: OFF";
    togglePatternBtn.classList.toggle('active', ganzflicker.isPatternOn);
    updateAudioUI();
  };

  // Mode Select
  modeSelect.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement;
    const newMode = target.value as SessionMode;
    sessionManager.setMode(newMode);

    if (newMode !== 'manual') {
      // Session modes auto-start flicker — sync buttons
      if (!ganzflicker.isFlickerOn) {
        ganzflicker.toggleFlicker();
      }
    }

    syncButtonStates();
    updateFreq(ganzflicker.getFrequency());
    patternSelect.value = ganzflicker.getPattern();
    noiseTypeContainer.style.display = ganzflicker.getPattern() === 'noise' ? 'block' : 'none';
  });

  noiseTypeSelect.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement;
    ganzflicker.noiseType = target.value as any;
  });

  // Sidebar Toggle
  if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-hidden');
    });
  }

  // Toggle Flicker
  toggleFlickerBtn.addEventListener('click', () => {
    const isOn = ganzflicker.toggleFlicker();
    toggleFlickerBtn.textContent = isOn ? "Flicker: ON" : "Flicker: OFF";
    toggleFlickerBtn.classList.toggle('active', isOn);

    if (sessionManager.mode !== 'manual') {
      sessionManager.setMode('manual');
      modeSelect.value = 'manual';
    }
  });

  // Toggle Pattern
  togglePatternBtn.addEventListener('click', () => {
    const isOn = ganzflicker.togglePattern();
    togglePatternBtn.textContent = isOn ? "Pattern: ON" : "Pattern: OFF";
    togglePatternBtn.classList.toggle('active', isOn);

    if (sessionManager.mode !== 'manual') {
      sessionManager.setMode('manual');
      modeSelect.value = 'manual';
    }
  });

  // Pattern Sliders
  patternSpeedSlider.addEventListener('input', (e) => {
    ganzflicker.patternSpeed = parseFloat((e.target as HTMLInputElement).value);
  });

  patternFlowSlider.addEventListener('input', (e) => {
    ganzflicker.patternFlow = parseFloat((e.target as HTMLInputElement).value);
  });

  patternOpacitySlider.addEventListener('input', (e) => {
    ganzflicker.patternOpacity = parseFloat((e.target as HTMLInputElement).value);
  });

  patternRotationSlider.addEventListener('input', (e) => {
    ganzflicker.patternRotationSpeed = parseFloat((e.target as HTMLInputElement).value);
  });

  brightnessSlider.addEventListener('input', (e) => {
    const val = parseInt((e.target as HTMLInputElement).value);
    brightnessValue.textContent = `${val}%`;
    ganzflicker.brightness = val / 100;
  });

  autoEvolveCheck.addEventListener('change', (e) => {
    ganzflicker.isAutoEvolve = (e.target as HTMLInputElement).checked;
  });

  if (syncNoiseCheck) {
    syncNoiseCheck.addEventListener('change', (e) => {
      ganzflicker.isNoiseSynced = (e.target as HTMLInputElement).checked;
    });
  }

  // --- Audio Event Listeners ---

  audioModeSelect.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;

    if (val === 'off') {
      audioEngine.stop();
      updateAudioUI();
      showModeControls('off');
      return;
    }

    // Only switch mode — don't auto-start. User must click Audio ON.
    audioEngine.setMode(val as AudioMode);
    showModeControls(val);
    updateAudioUI();
  });

  audioFreqSlider.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    audioFreqValue.textContent = `${val.toFixed(1)} Hz`;
    audioEngine.setFrequency(val);
  });

  panSourceSelect.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value as PanSource;
    customAudioContainer.style.display = val === 'custom' ? 'block' : 'none';
    if (val !== 'custom') {
      audioEngine.setPanSource(val);
    } else if (audioEngine.customFileName) {
      // Already has a file loaded, just switch to it
      audioEngine.setPanSource('custom');
    }
  });

  audioFileInput.addEventListener('change', async () => {
    const file = audioFileInput.files?.[0];
    if (!file) return;
    audioFileName.textContent = file.name;
    await audioEngine.loadAudioFile(file);
    updateAudioUI();
  });

  audioLoopCheck.addEventListener('change', (e) => {
    audioEngine.panLoop = (e.target as HTMLInputElement).checked;
  });

  panSpeedSlider.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    panSpeedValue.textContent = `${val.toFixed(1)} Hz`;
    audioEngine.setPanSpeed(val);
  });

  syncPanFlickerCheck.addEventListener('change', (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    if (checked) {
      // Sync pan speed to current flicker frequency
      const flickerHz = ganzflicker.getFrequency();
      audioEngine.setPanSpeed(flickerHz);
      panSpeedSlider.value = flickerHz.toString();
      panSpeedValue.textContent = `${flickerHz.toFixed(1)} Hz`;
      panSpeedSlider.disabled = true;
    } else {
      panSpeedSlider.disabled = false;
    }
  });

  carrierFreqSlider.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    carrierFreqValue.textContent = `${val} Hz`;
    audioEngine.setCarrierFreq(val);
  });

  audioVolumeSlider.addEventListener('input', (e) => {
    const val = parseInt((e.target as HTMLInputElement).value);
    audioVolumeValue.textContent = `${val}%`;
    audioEngine.setVolume(val / 100);
  });

  toggleAudioBtn.addEventListener('click', () => {
    if (audioEngine.isPlaying) {
      audioEngine.stop();
    } else {
      const mode = audioModeSelect.value;
      if (mode === 'off') return; // Must select a mode first

      // Don't start panning-custom without a file loaded
      if (audioEngine.mode === 'panning-noise' && panSourceSelect.value === 'custom' && !audioEngine.customFileName) {
        return;
      }

      audioEngine.start();
    }
    updateAudioUI();
  });

  // Fullscreen
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    try {
      if (e.code === 'Space') {
        toggleFlickerBtn.click();
      }
    } catch (err) { console.error("Keydown Error", err); }
  });

  // Initial State
  noiseTypeContainer.style.display = ganzflicker.getPattern() === 'noise' ? 'block' : 'none';
  syncButtonStates();

  // --- YouTube Downloader ---

  const DL_SERVER = 'http://localhost:3001';

  const loadAudioFileFromUrl = async (fileUrl: string, fileName: string) => {
    const response = await fetch(fileUrl);
    const blob = await response.blob();
    const file = new File([blob], fileName, { type: blob.type });
    audioFileName.textContent = fileName;
    await audioEngine.loadAudioFile(file);

    // Auto-switch to panning + custom
    audioModeSelect.value = 'panning-noise';
    audioEngine.setMode('panning-noise');
    panSourceSelect.value = 'custom';
    customAudioContainer.style.display = 'block';
    showModeControls('panning-noise');
    updateAudioUI();
  };

  const renderFileList = (files: string[]) => {
    ytFilesList.innerHTML = '';
    files.forEach(f => {
      const btn = document.createElement('button');
      btn.textContent = f.length > 35 ? f.substring(0, 32) + '...' : f;
      btn.title = f;
      btn.style.cssText = 'display:block;width:100%;text-align:left;background:#1a2a2a;border:1px solid #00cccc44;color:#0cc;padding:6px 8px;margin-top:4px;border-radius:4px;cursor:pointer;font-size:0.7em;font-family:Roboto Mono,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      btn.addEventListener('click', () => {
        loadAudioFileFromUrl(`/audio/${encodeURIComponent(f)}`, f);
      });
      ytFilesList.appendChild(btn);
    });
  };

  // Load existing files on startup
  fetch(`${DL_SERVER}/api/audio/list`)
    .then(r => r.json())
    .then(files => { if (files.length) renderFileList(files); })
    .catch(() => {}); // Server not running, that's fine

  ytDownloadBtn.addEventListener('click', () => {
    const url = ytUrlInput.value.trim();
    if (!url) return;

    ytDownloadBtn.disabled = true;
    ytDownloadBtn.textContent = '...';
    ytProgress.textContent = 'Starting download...';

    fetch(`${DL_SERVER}/api/audio/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    }).then(response => {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      const read = (): Promise<void> | undefined => {
        return reader?.read().then(({ done, value }) => {
          if (done) {
            ytDownloadBtn.disabled = false;
            ytDownloadBtn.textContent = 'DL';
            return;
          }

          const text = decoder.decode(value);
          const lines = text.split('\n').filter(l => l.startsWith('data: '));

          for (const line of lines) {
            try {
              const data = JSON.parse(line.replace('data: ', ''));
              if (data.status === 'progress') {
                ytProgress.textContent = data.message;
              } else if (data.status === 'done') {
                ytProgress.textContent = 'Download complete!';
                ytProgress.style.color = '#0c0';
                if (data.files) renderFileList(data.files);
                setTimeout(() => { ytProgress.style.color = '#888'; }, 3000);
              } else if (data.status === 'error') {
                ytProgress.textContent = 'Error: ' + data.message;
                ytProgress.style.color = '#f33';
                setTimeout(() => { ytProgress.style.color = '#888'; }, 5000);
              }
            } catch {}
          }

          return read();
        });
      };

      read();
    }).catch(() => {
      ytProgress.textContent = 'Server not running. Start it with: node server/download.js';
      ytProgress.style.color = '#f33';
      ytDownloadBtn.disabled = false;
      ytDownloadBtn.textContent = 'DL';
    });
  });

});
