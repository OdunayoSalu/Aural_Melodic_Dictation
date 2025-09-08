// constants.js
// Static constants shared across the app

export const KEYS = [
  { id: "C", label: "C" },
  { id: "Db", label: "Db" },
  { id: "D", label: "D" },
  { id: "Eb", label: "Eb" },
  { id: "E", label: "E" },
  { id: "F", label: "F" },
  { id: "Gb", label: "Gb" },
  { id: "G", label: "G" },
  { id: "Ab", label: "Ab" },
  { id: "A", label: "A" },
  { id: "Bb", label: "Bb" },
  { id: "B", label: "B" },
];

export const SOLFEGE = {
  1: "do",
  2: "re",
  3: "mi",
  4: "fa",
  5: "so",
  6: "la",
  7: "ti",
};

export const RHYTHMS = [
  // name, symbol (safe for iOS), fraction of whole note
  { id: "semibreve", label: "Semibreve", symbol: "𝅝", fraction: 1 },
  { id: "minim", label: "Minim", symbol: "𝅗𝅥", fraction: 1 / 2 },
  { id: "crotchet", label: "Crotchet", symbol: "♩", fraction: 1 / 4 },
  { id: "quaver", label: "Quaver", symbol: "♪", fraction: 1 / 8 },
  { id: "semiquaver", label: "Semiquaver", symbol: "♬", fraction: 1 / 16 },
];

export const DEFAULT_SETTINGS = {
  keys: ["C", "D", "E", "F", "G", "A", "B"],
  degrees: [1, 2, 3, 4, 5, 6, 7],
  tempoChoice: "medium", // slow=60, medium=90, fast=120, custom
  customBpm: 100,
  rhythms: ["crotchet", "quaver"],
  numNotes: 5,
  maxJump: 7, // in semitones
  modes: ["major"], // ["major", "minor"]
  autoProceed: true,
  questionsPerSet: 10,
};

export const TEMPO_PRESETS = {
  slow: 60,
  medium: 90,
  fast: 120,
};

export const KEY_TO_PC = {
  C: 0,
  "Db": 1,
  D: 2,
  "Eb": 3,
  E: 4,
  F: 5,
  "Gb": 6,
  G: 7,
  "Ab": 8,
  A: 9,
  "Bb": 10,
  B: 11,
};

export const MODE_INTERVALS = {
  major: [0, 2, 4, 5, 7, 9, 11], // ionian
  minor: [0, 2, 3, 5, 7, 8, 10], // natural minor
};
