/**
 * AudioEngine — Web Audio API pura, contexto singleton.
 *
 * Em vez de samples, sintetiza cada toque por modos ressonantes
 * (osciladores nas razões modais do material + ruído de ataque filtrado),
 * com variação de pitch por disparo. Isso mantém a assinatura do prompt
 * (pools de variação por gesto: hover / pluck / knock) sem depender de
 * arquivos de áudio externos.
 */

const KIND_GAIN = { hover: 0.22, knock: 0.6, pluck: 1.0 };

class AudioEngineImpl {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.comp = null;
    this.reverb = null;
    this.reverbGain = null;
    this.voices = 0;
    this.maxVoices = 26;
    this.lastTrigger = new Map(); // key -> timestamp, anti-metralhadora
    this.muted = false;

    // modo composição: pluck sem variação de pitch (kalimba)
    this.compositionMode = false;

    // cama de áudio ambiente — gain independente do master de interações
    this.ambientOut = null;
    this.ambientVolume = 0.5;
    this.bed = null; // { type, gain, stop }
    this.desiredBed = 'none';

    // vozes de sustain ("tigela cantante"), uma por peça em hover longo
    this.sustains = new Map();
    this.sustainSweepTimer = null;
  }

  setCompositionMode(v) {
    this.compositionMode = v;
  }

  /** Silencia/reativa tudo — interações e cama ambiente (contexto segue vivo). */
  setMuted(muted) {
    this.muted = muted;
    if (this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.85, this.ctx.currentTime, 0.04);
    }
    if (this.ambientOut) {
      this.ambientOut.gain.setTargetAtTime(
        muted ? 0 : this.ambientVolume,
        this.ctx.currentTime,
        0.08
      );
    }
  }

  /** Volume da cama ambiente, independente das interações. */
  setAmbientVolume(v) {
    this.ambientVolume = v;
    if (this.ambientOut && !this.muted) {
      this.ambientOut.gain.setTargetAtTime(v, this.ctx.currentTime, 0.08);
    }
  }

  /** Cria/acorda o contexto. Chamar num gesto do usuário. */
  ensure() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      this.ctx = new Ctx();

      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.85;

      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 24;
      comp.ratio.value = 6;

      this.master.connect(comp);
      comp.connect(this.ctx.destination);
      this.comp = comp;

      // saída da cama ambiente: caminho próprio, volume independente
      this.ambientOut = this.ctx.createGain();
      this.ambientOut.gain.value = this.muted ? 0 : this.ambientVolume;
      this.ambientOut.connect(comp);

      // Reverb procedural: ruído estéreo com decaimento exponencial.
      this.reverb = this.ctx.createConvolver();
      this.reverb.buffer = this._makeImpulse(2.4, 2.6);
      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.value = 1;
      this.reverb.connect(this.reverbGain);
      this.reverbGain.connect(comp);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    // cama escolhida antes do primeiro gesto começa a tocar agora
    if (this.desiredBed !== (this.bed?.type ?? 'none')) {
      this._applyBed(this.desiredBed);
    }
    return true;
  }

  _makeImpulse(seconds, decayPow) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decayPow);
      }
    }
    return buf;
  }

  _noiseBuffer(seconds) {
    const rate = this.ctx.sampleRate;
    const len = Math.max(32, Math.floor(rate * seconds));
    const buf = this.ctx.createBuffer(1, len, rate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  /**
   * Dispara um toque.
   * @param {object} audioCfg  config de áudio do material (materials.config)
   * @param {number} baseFreq  fundamental da peça (Hz)
   * @param {'hover'|'knock'|'pluck'} kind
   * @param {number} intensity 0..1
   * @param {string} throttleKey chave p/ limitar repetição (ex: id da peça)
   * @param {number} pan -1..1 posição estéreo
   */
  strike(audioCfg, baseFreq, kind, intensity, throttleKey, pan = 0) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = performance.now();
    const minGap = kind === 'hover' ? 90 : 45;
    const key = `${throttleKey}:${kind}`;
    const last = this.lastTrigger.get(key) || 0;
    if (now - last < minGap) return;
    this.lastTrigger.set(key, now);
    if (this.voices > this.maxVoices) return;

    const t0 = this.ctx.currentTime + 0.002;
    intensity = Math.min(1, Math.max(0.06, intensity));
    const level = KIND_GAIN[kind] * (0.35 + 0.65 * intensity) * 0.32;

    // Variação de pitch por disparo (±3%) — exceto pluck em modo composição
    // (kalimba: cada peça soa sempre exatamente na mesma altura)
    const varScale = kind === 'pluck' && this.compositionMode ? 0 : 1;
    const f0 =
      baseFreq * audioCfg.pitchMul * (1 + (Math.random() - 0.5) * 0.06 * varScale);
    const decay = audioCfg.decay * (0.65 + 0.55 * intensity) * (kind === 'hover' ? 0.7 : 1);

    const voice = this.ctx.createGain();
    voice.gain.value = 1;

    const panner = this.ctx.createStereoPanner
      ? this.ctx.createStereoPanner()
      : null;
    if (panner) {
      panner.pan.value = Math.max(-0.8, Math.min(0.8, pan));
      voice.connect(panner);
      panner.connect(this.master);
      if (this.reverb) {
        const send = this.ctx.createGain();
        send.gain.value = audioCfg.reverbSend;
        panner.connect(send);
        send.connect(this.reverb);
      }
    } else {
      voice.connect(this.master);
    }

    let longest = 0;

    // Parciais modais
    audioCfg.partials.forEach((ratio, i) => {
      const pGain = audioCfg.partialGains[i] ?? 0.1;
      const pDecay = decay / Math.pow(ratio, 0.55);
      longest = Math.max(longest, pDecay);
      const oscs = audioCfg.detuneCents
        ? [-audioCfg.detuneCents, audioCfg.detuneCents]
        : [0];
      oscs.forEach((cents) => {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f0 * ratio;
        if (cents) osc.detune.value = cents;
        const g = this.ctx.createGain();
        const peak = (level * pGain) / oscs.length;
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(peak, t0 + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.004 + pDecay);
        osc.connect(g);
        g.connect(voice);
        osc.start(t0);
        osc.stop(t0 + 0.02 + pDecay);
      });
    });

    // Ruído de ataque ("toc" da madeira / "tin" do vidro)
    const n = audioCfg.noise;
    if (n) {
      const src = this.ctx.createBufferSource();
      src.buffer = this._noiseBuffer(n.decay * 2);
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = Math.min(14000, f0 * n.freqMul);
      bp.Q.value = n.q;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(level * n.gain, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.decay);
      src.connect(bp);
      bp.connect(g);
      g.connect(voice);
      src.start(t0);
      src.stop(t0 + n.decay + 0.05);
    }

    this.voices++;
    const total = 0.05 + longest;
    setTimeout(() => {
      this.voices--;
      voice.disconnect();
      if (panner) panner.disconnect();
    }, (total + 0.3) * 1000);
  }

  // ---------- cama de áudio ambiente (paisagens sintetizadas em loop) ----------

  /** Troca a paisagem sonora ('none' | 'wind' | 'rain' | 'forest'), com crossfade. */
  setBed(type) {
    this.desiredBed = type;
    if (this.ctx && this.ctx.state === 'running') this._applyBed(type);
  }

  _applyBed(type) {
    if (this.bed && this.bed.type === type) return;

    // fade-out do bed atual
    if (this.bed) {
      const old = this.bed;
      const now = this.ctx.currentTime;
      old.gain.gain.cancelScheduledValues(now);
      old.gain.gain.setValueAtTime(old.gain.gain.value, now);
      old.gain.gain.linearRampToValueAtTime(0, now + 1.6);
      setTimeout(() => old.stop(), 1900);
      this.bed = null;
    }
    if (type === 'none') return;

    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.ambientOut);

    const builders = {
      wind: () => this._buildWind(gain),
      rain: () => this._buildRain(gain),
      forest: () => this._buildForest(gain),
    };
    const built = builders[type] ? builders[type]() : null;
    if (!built) return;

    const now = this.ctx.currentTime;
    gain.gain.linearRampToValueAtTime(built.level, now + 2.2); // ataque lento
    this.bed = {
      type,
      gain,
      stop: () => {
        built.stop();
        gain.disconnect();
      },
    };
  }

  _loopNoise(seconds) {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer(seconds);
    src.loop = true;
    return src;
  }

  /** Vento suave: ruído grave com filtro e amplitude respirando devagar. */
  _buildWind(out) {
    const src = this._loopNoise(4);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 340;
    lp.Q.value = 0.6;

    const breathe = this.ctx.createGain();
    breathe.gain.value = 0.7;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoAmt = this.ctx.createGain();
    lfoAmt.gain.value = 0.25;
    lfo.connect(lfoAmt);
    lfoAmt.connect(breathe.gain);

    const lfo2 = this.ctx.createOscillator();
    lfo2.frequency.value = 0.045;
    const lfo2Amt = this.ctx.createGain();
    lfo2Amt.gain.value = 160;
    lfo2.connect(lfo2Amt);
    lfo2Amt.connect(lp.frequency);

    src.connect(lp);
    lp.connect(breathe);
    breathe.connect(out);
    src.start();
    lfo.start();
    lfo2.start();
    return {
      level: 0.055,
      stop: () => {
        src.stop();
        lfo.stop();
        lfo2.stop();
      },
    };
  }

  /** Chuva leve: banda média constante + pingos esparsos agudos. */
  _buildRain(out) {
    const src = this._loopNoise(3.7);
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 500;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2800;
    src.connect(hp);
    hp.connect(lp);
    lp.connect(out);
    src.start();

    // pingos: blipzinhos de ruído bem curtos, aleatórios e discretos
    let alive = true;
    const drop = () => {
      if (!alive || !this.ctx) return;
      const d = this.ctx.createBufferSource();
      d.buffer = this._noiseBuffer(0.03);
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2600 + Math.random() * 3400;
      bp.Q.value = 6;
      const g = this.ctx.createGain();
      const t = this.ctx.currentTime;
      g.gain.setValueAtTime(0.10 + Math.random() * 0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      d.connect(bp);
      bp.connect(g);
      g.connect(out);
      d.start(t);
      d.stop(t + 0.08);
      this._rainTimer = setTimeout(drop, 90 + Math.random() * 320);
    };
    drop();

    return {
      level: 0.05,
      stop: () => {
        alive = false;
        clearTimeout(this._rainTimer);
        src.stop();
      },
    };
  }

  /** Floresta: folhas (ruído bem baixo) + pássaros distantes ocasionais. */
  _buildForest(out) {
    const src = this._loopNoise(4.4);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 850;
    const leaves = this.ctx.createGain();
    leaves.gain.value = 0.5;
    src.connect(lp);
    lp.connect(leaves);
    leaves.connect(out);
    src.start();

    let alive = true;
    const chirp = () => {
      if (!alive || !this.ctx) return;
      const reps = 2 + Math.floor(Math.random() * 3);
      const base = 2100 + Math.random() * 1400;
      const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      const dest = pan || out;
      if (pan) {
        pan.pan.value = (Math.random() - 0.5) * 1.4;
        pan.connect(out);
      }
      for (let r = 0; r < reps; r++) {
        const t = this.ctx.currentTime + r * (0.16 + Math.random() * 0.08);
        const o = this.ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(base, t);
        o.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.3), t + 0.07);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.05 + Math.random() * 0.04, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
        o.connect(g);
        g.connect(dest);
        o.start(t);
        o.stop(t + 0.16);
      }
      this._forestTimer = setTimeout(chirp, 4500 + Math.random() * 9000);
    };
    this._forestTimer = setTimeout(chirp, 2000);

    return {
      level: 0.06,
      stop: () => {
        alive = false;
        clearTimeout(this._forestTimer);
        src.stop();
      },
    };
  }

  // ---------- "tigela cantante": sustain de hover prolongado ----------

  /**
   * Chamar a cada frame em que o ponteiro segue em contato com a peça.
   * Após ~1.5s de permanência o tom cresce em rampa; quando os ticks
   * param, decai com release longo. Várias peças podem soar ao mesmo tempo.
   */
  sustainTick(audioCfg, baseFreq, key, pan = 0) {
    if (!this.ctx || this.ctx.state !== 'running' || this.muted) return;
    let v = this.sustains.get(key);
    const nowMs = performance.now();

    if (!v) {
      const f = baseFreq * audioCfg.pitchMul * 0.5; // uma oitava abaixo: mais "tigela"
      const g = this.ctx.createGain();
      g.gain.value = 0;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = f * 3;
      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      if (panner) {
        panner.pan.value = Math.max(-0.7, Math.min(0.7, pan));
        g.connect(lp);
        lp.connect(panner);
        panner.connect(this.master);
      } else {
        g.connect(lp);
        lp.connect(this.master);
      }
      const oscs = [-3, 3].map((cents) => {
        const o = this.ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        o.detune.value = cents;
        o.connect(g);
        o.start();
        return o;
      });
      v = { g, oscs, panner, startedAt: nowMs, lastTick: nowMs, level: 0 };
      this.sustains.set(key, v);
      this._startSustainSweep();
    }

    v.lastTick = nowMs;
    const dwell = (nowMs - v.startedAt) / 1000;
    if (dwell > 1.5) {
      // cresce devagar com a permanência, até um teto discreto
      const target = Math.min(0.045, (dwell - 1.5) * 0.012);
      if (target > v.level + 0.002) {
        v.level = target;
        const t = this.ctx.currentTime;
        v.g.gain.cancelScheduledValues(t);
        v.g.gain.setValueAtTime(v.g.gain.value, t);
        v.g.gain.linearRampToValueAtTime(target, t + 0.3);
      }
    }
  }

  _startSustainSweep() {
    if (this.sustainSweepTimer) return;
    this.sustainSweepTimer = setInterval(() => {
      const nowMs = performance.now();
      for (const [key, v] of this.sustains) {
        if (nowMs - v.lastTick > 200) {
          // release longo — nada de corte abrupto
          const t = this.ctx.currentTime;
          v.g.gain.cancelScheduledValues(t);
          v.g.gain.setValueAtTime(v.g.gain.value, t);
          v.g.gain.linearRampToValueAtTime(0, t + 2.4);
          const voice = v;
          setTimeout(() => {
            voice.oscs.forEach((o) => o.stop());
            voice.g.disconnect();
            voice.panner?.disconnect();
          }, 2600);
          this.sustains.delete(key);
        }
      }
      if (this.sustains.size === 0) {
        clearInterval(this.sustainSweepTimer);
        this.sustainSweepTimer = null;
      }
    }, 150);
  }
}

export const AudioEngine = new AudioEngineImpl();

// exposto p/ inspeção no console (depuração/testes)
if (typeof window !== 'undefined') window.__audioEngine = AudioEngine;
