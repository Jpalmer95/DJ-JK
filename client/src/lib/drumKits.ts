// Drum Kit Sound Library - All sounds generated via Web Audio API
// 4 kits: 808, 909, Trap, LoFi - 16 sounds each = 64 total

export type KitName = '808' | '909' | 'trap' | 'lofi';

// ============================================================
// 808 KIT
// ============================================================
function generateKick808(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(30, time + 0.25);
  gain.gain.setValueAtTime(0.8, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(time);
  osc.stop(time + 0.5);
}

function generateSnare808(ctx: AudioContext, time: number, dest: AudioNode): void {
  // Tone
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(200, time);
  osc.frequency.exponentialRampToValueAtTime(100, time + 0.1);
  oscGain.gain.setValueAtTime(0.5, time);
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
  osc.connect(oscGain);
  oscGain.connect(dest);
  osc.start(time);
  osc.stop(time + 0.15);
  // Noise
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.03));
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 3000; filt.Q.value = 1;
  const nGain = ctx.createGain(); nGain.gain.setValueAtTime(0.4, time); nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
  src.connect(filt); filt.connect(nGain); nGain.connect(dest);
  src.start(time); src.stop(time + 0.15);
}

function generateClap808(ctx: AudioContext, time: number, dest: AudioNode): void {
  for (let i = 0; i < 3; i++) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.02, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * Math.exp(-j / (ctx.sampleRate * 0.005));
    const src = ctx.createBufferSource(); src.buffer = buf;
    const filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 2500; filt.Q.value = 2;
    const g = ctx.createGain(); g.gain.value = 0.3;
    src.connect(filt); filt.connect(g); g.connect(dest);
    src.start(time + i * 0.01); src.stop(time + i * 0.01 + 0.02);
  }
  // Tail
  const tailBuf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
  const td = tailBuf.getChannelData(0);
  for (let j = 0; j < td.length; j++) td[j] = (Math.random() * 2 - 1) * Math.exp(-j / (ctx.sampleRate * 0.03));
  const tailSrc = ctx.createBufferSource(); tailSrc.buffer = tailBuf;
  const filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 2500; filt.Q.value = 2;
  const tg = ctx.createGain(); tg.gain.setValueAtTime(0.4, time + 0.03); tg.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
  tailSrc.connect(filt); filt.connect(tg); tg.connect(dest);
  tailSrc.start(time + 0.03); tailSrc.stop(time + 0.18);
}

function generateHihat808(ctx: AudioContext, time: number, dest: AudioNode): void {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.008));
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filt = ctx.createBiquadFilter(); filt.type = 'highpass'; filt.frequency.value = 7000;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.25, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  src.connect(filt); filt.connect(g); g.connect(dest);
  src.start(time); src.stop(time + 0.05);
}

function generateOpenhat808(ctx: AudioContext, time: number, dest: AudioNode): void {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filt = ctx.createBiquadFilter(); filt.type = 'highpass'; filt.frequency.value = 6000;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.25, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
  src.connect(filt); filt.connect(g); g.connect(dest);
  src.start(time); src.stop(time + 0.3);
}

function generateRim808(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'triangle'; osc.frequency.value = 400;
  g.gain.setValueAtTime(0.5, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
  osc.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 0.04);
}

function generateTomHi808(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(200, time); osc.frequency.exponentialRampToValueAtTime(80, time + 0.2);
  g.gain.setValueAtTime(0.6, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
  osc.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 0.25);
}

function generateTomLo808(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(120, time); osc.frequency.exponentialRampToValueAtTime(50, time + 0.3);
  g.gain.setValueAtTime(0.6, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
  osc.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 0.35);
}

function generateCongaHi808(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(300, time); osc.frequency.exponentialRampToValueAtTime(150, time + 0.1);
  g.gain.setValueAtTime(0.4, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
  osc.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 0.12);
}

function generateCongaLo808(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(200, time); osc.frequency.exponentialRampToValueAtTime(100, time + 0.15);
  g.gain.setValueAtTime(0.4, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
  osc.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 0.18);
}

function generateMaracas808(ctx: AudioContext, time: number, dest: AudioNode): void {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filt = ctx.createBiquadFilter(); filt.type = 'highpass'; filt.frequency.value = 8000;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.2, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
  src.connect(filt); filt.connect(g); g.connect(dest); src.start(time); src.stop(time + 0.03);
}

function generateCowbell808(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc1 = ctx.createOscillator(); const osc2 = ctx.createOscillator(); const g = ctx.createGain();
  osc1.type = 'square'; osc1.frequency.value = 560;
  osc2.type = 'square'; osc2.frequency.value = 845;
  g.gain.setValueAtTime(0.3, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
  osc1.connect(g); osc2.connect(g); g.connect(dest);
  osc1.start(time); osc2.start(time); osc1.stop(time + 0.2); osc2.stop(time + 0.2);
}

function generateClave808(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'sine'; osc.frequency.value = 1500;
  g.gain.setValueAtTime(0.3, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
  osc.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 0.02);
}

function generateCymbal808(ctx: AudioContext, time: number, dest: AudioNode): void {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.15));
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filt = ctx.createBiquadFilter(); filt.type = 'highpass'; filt.frequency.value = 5000;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.2, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
  src.connect(filt); filt.connect(g); g.connect(dest); src.start(time); src.stop(time + 0.5);
}

function generateBass808(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'sine'; osc.frequency.value = 55;
  g.gain.setValueAtTime(0.6, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
  osc.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 0.4);
}

function generateSub808(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'sine'; osc.frequency.value = 35;
  g.gain.setValueAtTime(0.7, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.6);
  osc.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 0.6);
}

// ============================================================
// 909 KIT
// ============================================================
function generateKick909(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, time);
  osc.frequency.exponentialRampToValueAtTime(40, time + 0.15);
  g.gain.setValueAtTime(0.8, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
  // Click
  const click = ctx.createOscillator(); const cg = ctx.createGain();
  click.type = 'sine'; click.frequency.value = 1000;
  cg.gain.setValueAtTime(0.3, time); cg.gain.exponentialRampToValueAtTime(0.001, time + 0.005);
  click.connect(cg); cg.connect(dest); click.start(time); click.stop(time + 0.005);
  osc.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 0.35);
}

function generateSnare909(ctx: AudioContext, time: number, dest: AudioNode): void {
  // Tone
  const osc1 = ctx.createOscillator(); const osc2 = ctx.createOscillator();
  const og = ctx.createGain();
  osc1.type = 'triangle'; osc1.frequency.value = 200;
  osc2.type = 'triangle'; osc2.frequency.value = 340;
  og.gain.setValueAtTime(0.4, time); og.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
  osc1.connect(og); osc2.connect(og); og.connect(dest);
  osc1.start(time); osc2.start(time); osc1.stop(time + 0.12); osc2.stop(time + 0.12);
  // Noise
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.03));
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filt = ctx.createBiquadFilter(); filt.type = 'highpass'; filt.frequency.value = 2000;
  const ng = ctx.createGain(); ng.gain.setValueAtTime(0.5, time); ng.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
  src.connect(filt); filt.connect(ng); ng.connect(dest); src.start(time); src.stop(time + 0.2);
}

function generateClap909(ctx: AudioContext, time: number, dest: AudioNode): void {
  for (let i = 0; i < 4; i++) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.015, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 3000; filt.Q.value = 2;
    const g = ctx.createGain(); g.gain.value = 0.25;
    src.connect(filt); filt.connect(g); g.connect(dest);
    src.start(time + i * 0.008); src.stop(time + i * 0.008 + 0.015);
  }
  const tailBuf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
  const td = tailBuf.getChannelData(0);
  for (let j = 0; j < td.length; j++) td[j] = (Math.random() * 2 - 1) * Math.exp(-j / (ctx.sampleRate * 0.04));
  const ts = ctx.createBufferSource(); ts.buffer = tailBuf;
  const tf = ctx.createBiquadFilter(); tf.type = 'bandpass'; tf.frequency.value = 3000; tf.Q.value = 1.5;
  const tg = ctx.createGain(); tg.gain.setValueAtTime(0.4, time + 0.032); tg.gain.exponentialRampToValueAtTime(0.001, time + 0.23);
  ts.connect(tf); tf.connect(tg); tg.connect(dest); ts.start(time + 0.032); ts.stop(time + 0.23);
}

function generateHihat909(ctx: AudioContext, time: number, dest: AudioNode): void {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.01));
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filt = ctx.createBiquadFilter(); filt.type = 'highpass'; filt.frequency.value = 8000;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.3, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
  src.connect(filt); filt.connect(g); g.connect(dest); src.start(time); src.stop(time + 0.06);
}

function generateOpenhat909(ctx: AudioContext, time: number, dest: AudioNode): void {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.1));
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filt = ctx.createBiquadFilter(); filt.type = 'highpass'; filt.frequency.value = 7000;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.25, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
  src.connect(filt); filt.connect(g); g.connect(dest); src.start(time); src.stop(time + 0.4);
}

function generateRim909(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'square'; osc.frequency.value = 600;
  g.gain.setValueAtTime(0.4, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
  osc.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 0.02);
}

function generateTomHi909(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(250, time); osc.frequency.exponentialRampToValueAtTime(80, time + 0.2);
  g.gain.setValueAtTime(0.5, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
  osc.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 0.25);
}

function generateTomLo909(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(140, time); osc.frequency.exponentialRampToValueAtTime(50, time + 0.3);
  g.gain.setValueAtTime(0.5, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
  osc.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 0.35);
}

function generateCrash909(ctx: AudioContext, time: number, dest: AudioNode): void {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.4));
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filt = ctx.createBiquadFilter(); filt.type = 'highpass'; filt.frequency.value = 3000;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.3, time); g.gain.exponentialRampToValueAtTime(0.001, time + 1.5);
  src.connect(filt); filt.connect(g); g.connect(dest); src.start(time); src.stop(time + 1.5);
}

function generateRide909(ctx: AudioContext, time: number, dest: AudioNode): void {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.8, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.2));
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filt = ctx.createBiquadFilter(); filt.type = 'highpass'; filt.frequency.value = 6000;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.15, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.8);
  src.connect(filt); filt.connect(g); g.connect(dest); src.start(time); src.stop(time + 0.8);
}

function generatePercHi909(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(800, time); osc.frequency.exponentialRampToValueAtTime(400, time + 0.05);
  g.gain.setValueAtTime(0.3, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
  osc.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 0.06);
}

function generatePercLo909(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(400, time); osc.frequency.exponentialRampToValueAtTime(200, time + 0.08);
  g.gain.setValueAtTime(0.35, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
  osc.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 0.1);
}

function generateBass909(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'sawtooth'; osc.frequency.value = 55;
  const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.setValueAtTime(2000, time); filt.frequency.exponentialRampToValueAtTime(100, time + 0.3);
  g.gain.setValueAtTime(0.4, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
  osc.connect(filt); filt.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 0.4);
}

function generateStab909(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'sawtooth'; osc.frequency.value = 220;
  const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 3000; filt.Q.value = 5;
  g.gain.setValueAtTime(0.3, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
  osc.connect(filt); filt.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 0.15);
}

function generateZap909(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(2000, time); osc.frequency.exponentialRampToValueAtTime(50, time + 0.15);
  g.gain.setValueAtTime(0.3, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
  osc.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 0.15);
}

function generateNoise909(ctx: AudioContext, time: number, dest: AudioNode): void {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.2, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
  src.connect(g); g.connect(dest); src.start(time); src.stop(time + 0.1);
}

// ============================================================
// TRAP KIT
// ============================================================
function generateKickTrap(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, time);
  osc.frequency.exponentialRampToValueAtTime(30, time + 0.3);
  g.gain.setValueAtTime(0.9, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.6);
  osc.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 0.6);
}

function generateSnareTrap(ctx: AudioContext, time: number, dest: AudioNode): void {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02));
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 4000; filt.Q.value = 1;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.5, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
  src.connect(filt); filt.connect(g); g.connect(dest); src.start(time); src.stop(time + 0.15);
}

function generateClapTrap(ctx: AudioContext, time: number, dest: AudioNode): void {
  generateClap909(ctx, time, dest);
}

function generateHihatTrap(ctx: AudioContext, time: number, dest: AudioNode): void {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.005));
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filt = ctx.createBiquadFilter(); filt.type = 'highpass'; filt.frequency.value = 9000;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.25, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
  src.connect(filt); filt.connect(g); g.connect(dest); src.start(time); src.stop(time + 0.04);
}

function generateOpenhatTrap(ctx: AudioContext, time: number, dest: AudioNode): void {
  generateOpenhat909(ctx, time, dest);
}

function generatePercTrap(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(1200, time); osc.frequency.exponentialRampToValueAtTime(600, time + 0.04);
  g.gain.setValueAtTime(0.3, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  osc.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 0.05);
}

function generateRimTrap(ctx: AudioContext, time: number, dest: AudioNode): void {
  generateRim909(ctx, time, dest);
}

function generateTomTrap(ctx: AudioContext, time: number, dest: AudioNode): void {
  generateTomLo909(ctx, time, dest);
}

function generateCrashTrap(ctx: AudioContext, time: number, dest: AudioNode): void {
  generateCrash909(ctx, time, dest);
}

function generateFxRiser(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, time);
  osc.frequency.exponentialRampToValueAtTime(4000, time + 1.5);
  g.gain.setValueAtTime(0.05, time); g.gain.linearRampToValueAtTime(0.3, time + 1.2); g.gain.linearRampToValueAtTime(0, time + 1.5);
  const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.setValueAtTime(500, time); filt.frequency.exponentialRampToValueAtTime(5000, time + 1.5);
  osc.connect(filt); filt.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 1.5);
}

function generateFxDownlifter(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(4000, time);
  osc.frequency.exponentialRampToValueAtTime(100, time + 1.0);
  g.gain.setValueAtTime(0.3, time); g.gain.linearRampToValueAtTime(0, time + 1.0);
  const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 3000;
  osc.connect(filt); filt.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 1.0);
}

function generateFxImpact(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(80, time); osc.frequency.exponentialRampToValueAtTime(20, time + 0.5);
  g.gain.setValueAtTime(0.8, time); g.gain.exponentialRampToValueAtTime(0.001, time + 1.0);
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.1));
  const src = ctx.createBufferSource(); src.buffer = buf;
  const ng = ctx.createGain(); ng.gain.setValueAtTime(0.4, time); ng.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
  src.connect(ng); ng.connect(dest); src.start(time); src.stop(time + 0.5);
  osc.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 1.0);
}

function generateFxWhoosh(ctx: AudioContext, time: number, dest: AudioNode): void {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.Q.value = 10;
  filt.frequency.setValueAtTime(500, time); filt.frequency.exponentialRampToValueAtTime(5000, time + 0.25); filt.frequency.exponentialRampToValueAtTime(500, time + 0.5);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.01, time); g.gain.linearRampToValueAtTime(0.3, time + 0.2); g.gain.linearRampToValueAtTime(0.01, time + 0.5);
  src.connect(filt); filt.connect(g); g.connect(dest); src.start(time); src.stop(time + 0.5);
}

function generateFxTonal(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'sine'; osc.frequency.value = 880;
  g.gain.setValueAtTime(0.2, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
  osc.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 0.3);
}

function generateSubTrap(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'sine'; osc.frequency.value = 30;
  g.gain.setValueAtTime(0.7, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.8);
  osc.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 0.8);
}

function generate808slide(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(80, time);
  osc.frequency.linearRampToValueAtTime(40, time + 0.8);
  g.gain.setValueAtTime(0.6, time); g.gain.exponentialRampToValueAtTime(0.001, time + 1.0);
  osc.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 1.0);
}

// ============================================================
// LO-FI KIT
// ============================================================
function generateKickLoFi(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(100, time); osc.frequency.exponentialRampToValueAtTime(40, time + 0.2);
  g.gain.setValueAtTime(0.6, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
  // Bitcrush effect
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const x = (i / 128) - 1; curve[i] = Math.round(x * 8) / 8; }
  shaper.curve = curve;
  osc.connect(shaper); shaper.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 0.3);
}

function generateSnareLoFi(ctx: AudioContext, time: number, dest: AudioNode): void {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02));
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 3000;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.4, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
  src.connect(filt); filt.connect(g); g.connect(dest); src.start(time); src.stop(time + 0.12);
}

function generateHihatLoFi(ctx: AudioContext, time: number, dest: AudioNode): void {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.008));
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 5000;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.2, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
  src.connect(filt); filt.connect(g); g.connect(dest); src.start(time); src.stop(time + 0.04);
}

function generateHatLoFi(ctx: AudioContext, time: number, dest: AudioNode): void {
  generateHihatLoFi(ctx, time, dest);
}

function generatePercLoFi(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'triangle'; osc.frequency.setValueAtTime(600, time); osc.frequency.exponentialRampToValueAtTime(300, time + 0.06);
  g.gain.setValueAtTime(0.25, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
  osc.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 0.08);
}

function generateVinylCrackle(ctx: AudioContext, time: number, dest: AudioNode): void {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2.0, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    d[i] = Math.random() < 0.002 ? (Math.random() * 2 - 1) * 0.5 : (Math.random() * 2 - 1) * 0.02;
  }
  const src = ctx.createBufferSource(); src.buffer = buf;
  const g = ctx.createGain(); g.gain.value = 0.15;
  src.connect(g); g.connect(dest); src.start(time); src.stop(time + 2.0);
}

function generateTapeHiss(ctx: AudioContext, time: number, dest: AudioNode): void {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2.0, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.08;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filt = ctx.createBiquadFilter(); filt.type = 'highpass'; filt.frequency.value = 5000;
  const g = ctx.createGain(); g.gain.value = 0.1;
  src.connect(filt); filt.connect(g); g.connect(dest); src.start(time); src.stop(time + 2.0);
}

function generateChordLoFi(ctx: AudioContext, time: number, dest: AudioNode): void {
  [261.6, 329.6, 392.0].forEach(f => {
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.type = 'triangle'; osc.frequency.value = f;
    g.gain.setValueAtTime(0.15, time); g.gain.exponentialRampToValueAtTime(0.001, time + 1.5);
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 1500;
    osc.connect(filt); filt.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 1.5);
  });
}

function generateBassLoFi(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'sine'; osc.frequency.value = 55;
  const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 200;
  g.gain.setValueAtTime(0.4, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
  osc.connect(filt); filt.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 0.5);
}

function generatePadLoFi(ctx: AudioContext, time: number, dest: AudioNode): void {
  [220, 277.2, 330].forEach(f => {
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = f;
    g.gain.setValueAtTime(0.1, time); g.gain.linearRampToValueAtTime(0.15, time + 0.5); g.gain.exponentialRampToValueAtTime(0.001, time + 2.0);
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 1000;
    osc.connect(filt); filt.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 2.0);
  });
}

function generateFxLoFi(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(400, time); osc.frequency.exponentialRampToValueAtTime(100, time + 0.3);
  g.gain.setValueAtTime(0.2, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
  osc.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 0.4);
}

function generateStabLoFi(ctx: AudioContext, time: number, dest: AudioNode): void {
  [330, 415, 494].forEach(f => {
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.type = 'square'; osc.frequency.value = f;
    g.gain.setValueAtTime(0.08, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 2000;
    osc.connect(filt); filt.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 0.2);
  });
}

function generateRimLoFi(ctx: AudioContext, time: number, dest: AudioNode): void {
  generateRim808(ctx, time, dest);
}

function generateOpenhatLoFi(ctx: AudioContext, time: number, dest: AudioNode): void {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.05));
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 4000;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.2, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
  src.connect(filt); filt.connect(g); g.connect(dest); src.start(time); src.stop(time + 0.2);
}

function generateTomLoFi(ctx: AudioContext, time: number, dest: AudioNode): void {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(100, time); osc.frequency.exponentialRampToValueAtTime(40, time + 0.25);
  g.gain.setValueAtTime(0.4, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
  osc.connect(g); g.connect(dest); osc.start(time); osc.stop(time + 0.3);
}

function generateNoiseLoFi(ctx: AudioContext, time: number, dest: AudioNode): void {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 2000;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.15, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
  src.connect(filt); filt.connect(g); g.connect(dest); src.start(time); src.stop(time + 0.3);
}

// ============================================================
// KIT DEFINITIONS
// ============================================================
type SoundGenFn = (ctx: AudioContext, time: number, dest: AudioNode) => void;

export const KITS: Record<KitName, Record<string, SoundGenFn>> = {
  '808': {
    'Kick': generateKick808, 'Snare': generateSnare808, 'Clap': generateClap808,
    'Hi-Hat': generateHihat808, 'Open Hat': generateOpenhat808, 'Rim': generateRim808,
    'Tom Hi': generateTomHi808, 'Tom Lo': generateTomLo808, 'Conga Hi': generateCongaHi808,
    'Conga Lo': generateCongaLo808, 'Maracas': generateMaracas808, 'Cowbell': generateCowbell808,
    'Clave': generateClave808, 'Cymbal': generateCymbal808, 'Bass': generateBass808, 'Sub': generateSub808,
  },
  '909': {
    'Kick': generateKick909, 'Snare': generateSnare909, 'Clap': generateClap909,
    'Hi-Hat': generateHihat909, 'Open Hat': generateOpenhat909, 'Rim': generateRim909,
    'Tom Hi': generateTomHi909, 'Tom Lo': generateTomLo909, 'Crash': generateCrash909,
    'Ride': generateRide909, 'Perc Hi': generatePercHi909, 'Perc Lo': generatePercLo909,
    'Bass': generateBass909, 'Stab': generateStab909, 'Zap': generateZap909, 'Noise': generateNoise909,
  },
  'trap': {
    'Kick': generateKickTrap, 'Snare': generateSnareTrap, 'Clap': generateClapTrap,
    'Hi-Hat': generateHihatTrap, 'Open Hat': generateOpenhatTrap, 'Perc': generatePercTrap,
    'Rim': generateRimTrap, 'Tom': generateTomTrap, 'Crash': generateCrashTrap,
    'Riser': generateFxRiser, 'Down': generateFxDownlifter, 'Impact': generateFxImpact,
    'Whoosh': generateFxWhoosh, 'Tonal': generateFxTonal, 'Sub': generateSubTrap, 'Slide': generate808slide,
  },
  'lofi': {
    'Kick': generateKickLoFi, 'Snare': generateSnareLoFi, 'Hi-Hat': generateHihatLoFi,
    'Hat': generateHatLoFi, 'Perc': generatePercLoFi, 'Crackle': generateVinylCrackle,
    'Hiss': generateTapeHiss, 'Chord': generateChordLoFi, 'Bass': generateBassLoFi,
    'Pad': generatePadLoFi, 'FX': generateFxLoFi, 'Stab': generateStabLoFi,
    'Rim': generateRimLoFi, 'Open Hat': generateOpenhatLoFi, 'Tom': generateTomLoFi, 'Noise': generateNoiseLoFi,
  },
};

export function getKitSoundNames(kitName: KitName): string[] {
  return Object.keys(KITS[kitName] || {});
}

export function generateSound(kitName: KitName, soundName: string, ctx: AudioContext, time?: number, dest?: AudioNode): void {
  const kit = KITS[kitName];
  if (!kit || !kit[soundName]) {
    console.warn(`Sound ${soundName} not found in kit ${kitName}`);
    return;
  }
  const t = time ?? ctx.currentTime;
  const destination = dest ?? ctx.destination;
  kit[soundName](ctx, t, destination);
}

// Pre-generate AudioBuffers for a kit (useful for pad sampler loading)
export async function generateKitBuffers(kitName: KitName, ctx: AudioContext): Promise<Record<string, AudioBuffer>> {
  const kit = KITS[kitName];
  const buffers: Record<string, AudioBuffer> = {};
  const duration = 2.0; // max duration
  const sampleRate = ctx.sampleRate;
  const dest = ctx.destination;

  for (const [name, genFn] of Object.entries(kit)) {
    const offlineCtx = new OfflineAudioContext(1, Math.ceil(sampleRate * duration), sampleRate);
    const gainNode = offlineCtx.createGain();
    gainNode.connect(offlineCtx.destination);
    genFn(offlineCtx, 0, gainNode);
    const buffer = await offlineCtx.startRendering();
    buffers[name] = buffer;
  }

  return buffers;
}
