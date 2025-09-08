// audio.js
// Smplr integration and scheduling helpers
import { getCalibrationChords } from './musicTheory.js';

// IMPORTANT: import smplr from a CDN
import { SplendidGrandPiano, Reverb } from 'https://unpkg.com/smplr/dist/index.mjs';

let context = null;
let piano = null;
let reverb = null;
let loaded = false;
let loadingPromise = null;

export function getAudioContext() {
  if (!context) context = new (window.AudioContext || window.webkitAudioContext)();
  return context;
}

export async function initAudio() {
  const ctx = getAudioContext();
  // Unlock/resume on user gesture
  await ctx.resume();
  if (loaded) return;
  if (!loadingPromise) {
    loadingPromise = (async () => {
      piano = await new SplendidGrandPiano(ctx, { volume: 100 }).load;
      // Optional: add a subtle reverb for space
      try {
        reverb = new Reverb(ctx);
        piano.output.addEffect('reverb', reverb, 0.15);
      } catch (e) {
        console.warn('Reverb not available:', e);
      }
      loaded = true;
      return true;
    })();
  }
  await loadingPromise;
}

export function secondsPerWholeNote(bpm) {
  // A whole note is 4 beats if beat = quarter note
  return (4 * 60) / bpm;
}

export function stopAll() {
  if (piano) piano.stop();
}

export async function suspendAudio() {
  const ctx = getAudioContext();
  if (ctx.state !== 'suspended') await ctx.suspend();
}

export async function resumeAudio() {
  const ctx = getAudioContext();
  if (ctx.state !== 'running') await ctx.resume();
}

export function isSuspended() {
  const ctx = getAudioContext();
  return ctx.state === 'suspended';
}

export function playNoteMidi(midi, whenSec = 0, durationSec = 0.5, velocity = 90) {
  if (!piano) return () => {};
  const t = getAudioContext().currentTime + Math.max(0, whenSec);
  const stop = piano.start({ note: midi, time: t, duration: Math.max(0.05, durationSec), velocity });
  return stop;
}

export function playChord(midis, whenSec = 0, durationSec = 0.6, velocity = 90) {
  const stops = midis.map((m) => playNoteMidi(m, whenSec, durationSec, velocity));
  return () => stops.forEach((s) => s && s());
}

export function scheduleMelody(midis, durationFractions, bpm, startOffsetSec = 0, velocity = 90) {
  const wn = secondsPerWholeNote(bpm);
  let acc = startOffsetSec;
  const stops = [];
  for (let i = 0; i < midis.length; i++) {
    const dur = durationFractions[i] * wn;
    stops.push(playNoteMidi(midis[i], acc, Math.max(0.08, dur * 0.98), velocity));
    acc += dur;
  }
  return { stopAll: () => stops.forEach((s) => s && s()), totalDurationSec: acc };
}

export function playCalibration(key, mode) {
  // Each chord is a crotchet at 90bpm, one after another
  const bpm = 90;
  const beatSec = 60 / bpm; // crotchet length
  const chords = getCalibrationChords(key, mode);
  const now = getAudioContext().currentTime;
  chords.forEach((ch, i) => {
    const when = (i * beatSec);
    playChord(ch, when, beatSec * 0.95, 100);
  });
  return chords.length * beatSec; // total seconds
}
