// musicTheory.js
import { KEY_TO_PC, MODE_INTERVALS, RHYTHMS } from './constants.js';

export function keyToPitchClass(key) {
  return KEY_TO_PC[key];
}

export function baseTonicMidi(key) {
  // Place tonic around C4 (60)
  return 60 + keyToPitchClass(key);
}

export function degreeToSemitones(degree, mode) {
  // degree: 1-based, can be >7 (wrap in octaves)
  const intervals = MODE_INTERVALS[mode];
  const d0 = degree - 1;
  const oct = Math.floor(d0 / 7);
  const idx = d0 % 7;
  return intervals[idx] + 12 * oct;
}

export function degreeToMidi(key, mode, degree) {
  return baseTonicMidi(key) + degreeToSemitones(degree, mode);
}

export function getCalibrationChords(key, mode) {
  // Returns array of chord arrays (midi numbers)
  const degrees = [1, 4, 5, 1];
  const isMinor = mode === 'minor';

  const chords = degrees.map((d) => {
    const root = degreeToMidi(key, mode, d);
    // Diatonic triad: 1-3-5 degrees in the given mode
    const third = degreeToMidi(key, mode, d + 2);
    const fifth = degreeToMidi(key, mode, d + 4);

    // For minor mode, v is minor (as requested: i iv v i), already diatonic
    return [root, third, fifth];
  });
  return chords;
}

export function rhythmIdToFraction(id) {
  const r = RHYTHMS.find((x) => x.id === id);
  return r ? r.fraction : 1 / 4; // default quarter
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function nearestMidiWithinMaxJump(targetBase, prevMidi, maxJump) {
  // Find k that minimizes |(targetBase + 12k) - prevMidi| and <= maxJump
  let best = null;
  let bestDiff = Infinity;
  for (let k = -4; k <= 4; k++) {
    const cand = targetBase + 12 * k;
    const diff = Math.abs(cand - prevMidi);
    if (diff <= maxJump && diff < bestDiff) {
      best = cand;
      bestDiff = diff;
    }
  }
  return best; // may be null if none within maxJump
}

export function generateQuestion(settings, setParams) {
  const { degrees: allowedDegrees, rhythms: allowedRhythms, numNotes, maxJump } = settings;
  const { key, mode, tempoBpm } = setParams;

  const degreesSeq = [];
  const midiSeq = [];
  const durFractions = [];

  let attempts = 0;
  const maxAttempts = 2000;

  // Start on a random allowed degree
  const firstDeg = pickRandom(allowedDegrees);
  degreesSeq.push(firstDeg);
  midiSeq.push(degreeToMidi(key, mode, firstDeg));
  durFractions.push(rhythmIdToFraction(pickRandom(allowedRhythms)));

  while (degreesSeq.length < numNotes && attempts < maxAttempts) {
    attempts++;
    const prevMidi = midiSeq[midiSeq.length - 1];
    const d = pickRandom(allowedDegrees);
    const base = degreeToMidi(key, mode, d); // base octave around tonic
    let chosen = nearestMidiWithinMaxJump(base, prevMidi, maxJump);

    if (chosen == null) {
      // try a different degree
      continue;
    }
    degreesSeq.push(d);
    midiSeq.push(chosen);
    durFractions.push(rhythmIdToFraction(pickRandom(allowedRhythms)));
  }

  if (degreesSeq.length < numNotes) {
    // fallback: clip to what we have; ensure not empty
    while (degreesSeq.length < numNotes) {
      degreesSeq.push(degreesSeq[degreesSeq.length - 1] ?? firstDeg);
      midiSeq.push(midiSeq[midiSeq.length - 1] ?? degreeToMidi(key, mode, firstDeg));
      durFractions.push(durFractions[durFractions.length - 1] ?? 1 / 4);
    }
  }

  return {
    degrees: degreesSeq,
    midis: midiSeq,
    durations: durFractions, // fractions of whole note
  };
}

export function formatDegreeLabel(d, solfegeMap) {
  return `${d} (${solfegeMap[d]})`;
}
