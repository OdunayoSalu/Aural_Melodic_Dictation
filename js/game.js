// game.js
import { SOLFEGE } from './constants.js';
import { loadSettings, saveSettings, getEffectiveBpm } from './settingsStore.js';
import { generateQuestion, formatDegreeLabel } from './musicTheory.js';
import { initAudio, playCalibration, scheduleMelody, stopAll, suspendAudio, resumeAudio, isSuspended } from './audio.js';

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const qs = (s) => document.querySelector(s);
const qsa = (s) => Array.from(document.querySelectorAll(s));

const state = {
  settings: null,
  inSet: false,
  setParams: null, // { key, mode, tempoBpm }
  questionIndex: 0,
  questionsPerSet: 10,
  currentQuestion: null, // { degrees, midis, durations }
  currentAnswerIndex: 0,
  attemptedWrong: new Set(),
  lastSchedule: null,
  calibrationDuration: 0,
};

function chooseSetParams() {
  const s = state.settings;
  const key = pickRandom(s.keys);
  const mode = pickRandom(s.modes);
  const tempoBpm = getEffectiveBpm(s);
  return { key, mode, tempoBpm };
}

function setUpcomingParamsUI() {
  qs('#paramKey').textContent = state.setParams.key;
  qs('#paramMode').textContent = state.setParams.mode === 'major' ? 'Major' : 'Minor';
  qs('#paramTempo').textContent = `${state.setParams.tempoBpm} BPM`;
}

function initPreStart() {
  state.inSet = false;
  state.questionIndex = 0;
  state.currentQuestion = null;
  state.currentAnswerIndex = 0;
  state.attemptedWrong.clear();
  stopAll();
  qs('#preStartCard').style.display = '';
  qs('#inGameCard').style.display = 'none';
  // Hide degree buttons area and clear placeholders until the set starts
  const deg = qs('#degreeButtons');
  if (deg) deg.style.display = 'none';
  const ph = qs('#placeholders');
  if (ph) ph.innerHTML = '';
}

function updateProgress() {
  qs('#progressText').textContent = `Question ${state.questionIndex + 1} of ${state.questionsPerSet}`;
}

function buildPlaceholders(n) {
  const cont = qs('#placeholders');
  cont.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const div = document.createElement('div');
    div.className = 'placeholder';
    div.textContent = '？';
    cont.appendChild(div);
  }
}

function fillPlaceholderAt(i, text) {
  const nodes = qsa('#placeholders .placeholder');
  if (nodes[i]) {
    nodes[i].classList.add('filled');
    nodes[i].textContent = text;
  }
}

function buildDegreeButtons() {
  const s = state.settings;
  const cont = qs('#degreeButtons');
  cont.innerHTML = '';
  s.degrees.forEach((d) => {
    const btn = document.createElement('button');
    btn.className = 'degree-button';
    btn.dataset.degree = String(d);
    btn.textContent = `${d} (${SOLFEGE[d]})`;
    btn.addEventListener('click', () => onDegreePress(d, btn));
    cont.appendChild(btn);
  });
}

function resetDegreeButtonsState() {
  qsa('.degree-button').forEach((b) => b.classList.remove('wrong'));
  state.attemptedWrong.clear();
}

function onDegreePress(d, btnEl) {
  if (!state.inSet || !state.currentQuestion) return;
  const i = state.currentAnswerIndex;
  const target = state.currentQuestion.degrees[i];
  if (d === target) {
    fillPlaceholderAt(i, formatDegreeLabel(d, SOLFEGE));
    state.currentAnswerIndex++;
    resetDegreeButtonsState();

    if (state.currentAnswerIndex >= state.currentQuestion.degrees.length) {
      // Completed question
      const isLast = state.questionIndex + 1 >= state.questionsPerSet;
      if (isLast) {
        qs('#endOfSet').style.display = '';
      }
      if (state.settings.autoProceed && !isLast) {
        // slight delay for UX
        setTimeout(() => nextQuestion(), 400);
      }
    }
  } else {
    // mark wrong if not already
    if (!state.attemptedWrong.has(d)) {
      btnEl.classList.add('wrong');
      state.attemptedWrong.add(d);
    }
  }
}

function playCurrentQuestion(fromOffset = 0) {
  if (!state.currentQuestion) return;
  const { midis, durations } = state.currentQuestion;
  if (state.lastSchedule && state.lastSchedule.stopAll) state.lastSchedule.stopAll();
  state.lastSchedule = scheduleMelody(midis, durations, state.setParams.tempoBpm, fromOffset);
}

function startSet() {
  state.inSet = true;
  qs('#preStartCard').style.display = 'none';
  qs('#inGameCard').style.display = '';
  qs('#endOfSet').style.display = 'none';
  state.questionIndex = 0;
  updateProgress();
  resetDegreeButtonsState();
  // Show degree buttons now that the set has started
  const deg = qs('#degreeButtons');
  if (deg) deg.style.display = '';

  // Play calibration first, then question
  state.calibrationDuration = playCalibration(state.setParams.key, state.setParams.mode);

  // Generate question and schedule to start after calibration
  state.currentQuestion = generateQuestion(state.settings, state.setParams);
  state.currentAnswerIndex = 0;
  buildPlaceholders(state.currentQuestion.degrees.length);
  playCurrentQuestion(state.calibrationDuration);
}

function nextQuestion() {
  const lastIndex = state.questionsPerSet - 1;
  if (state.questionIndex >= lastIndex) {
    // End of set
    qs('#endOfSet').style.display = '';
    return;
  }
  state.questionIndex++;
  updateProgress();
  qs('#endOfSet').style.display = 'none';
  state.currentQuestion = generateQuestion(state.settings, state.setParams);
  state.currentAnswerIndex = 0;
  buildPlaceholders(state.currentQuestion.degrees.length);
  resetDegreeButtonsState();
  playCurrentQuestion(0);
}

function restartSet() {
  state.questionIndex = 0;
  updateProgress();
  qs('#endOfSet').style.display = 'none';
  state.calibrationDuration = playCalibration(state.setParams.key, state.setParams.mode);
  state.currentQuestion = generateQuestion(state.settings, state.setParams);
  state.currentAnswerIndex = 0;
  buildPlaceholders(state.currentQuestion.degrees.length);
  resetDegreeButtonsState();
  playCurrentQuestion(state.calibrationDuration);
}

function stopSet() {
  stopAll();
  initPreStart();
}

function togglePause() {
  const btn = qs('#btnPause');
  if (isSuspended()) {
    resumeAudio().then(() => { btn.textContent = 'Pause'; });
  } else {
    suspendAudio().then(() => { btn.textContent = 'Resume'; });
  }
}

function replayQuestion() {
  playCurrentQuestion(0);
}

function replayCalibration() {
  playCalibration(state.setParams.key, state.setParams.mode);
}

// Sidebar (in-game settings)
function buildSidebarForm(container, s) {
  container.innerHTML = '';

  const section = (title) => {
    const card = document.createElement('section');
    card.className = 'card';
    const h2 = document.createElement('h2');
    h2.textContent = title;
    card.appendChild(h2);
    container.appendChild(card);
    return card;
  };

  // Keys
  const secKeys = section('Key Signatures');
  const gridKeys = document.createElement('div');
  gridKeys.className = 'grid grid-6';
  secKeys.appendChild(gridKeys);
  const KEYS = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
  KEYS.forEach((k) => {
    const label = document.createElement('label');
    label.className = 'checkbox';
    const input = document.createElement('input');
    input.type = 'checkbox'; input.value = k; input.checked = s.keys.includes(k);
    label.appendChild(input);
    const span = document.createElement('span'); span.textContent = k; label.appendChild(span);
    gridKeys.appendChild(label);
  });

  // Degrees
  const secDeg = section('Scale Degrees');
  const gridDeg = document.createElement('div'); gridDeg.className = 'grid grid-7'; secDeg.appendChild(gridDeg);
  for (let d = 1; d <= 7; d++) {
    const label = document.createElement('label'); label.className = 'checkbox';
    const input = document.createElement('input'); input.type = 'checkbox'; input.value = String(d); input.checked = s.degrees.includes(d);
    label.appendChild(input);
    const span = document.createElement('span'); span.textContent = `${d} (${SOLFEGE[d]})`; label.appendChild(span);
    gridDeg.appendChild(label);
  }

  // Tempo
  const secTempo = section('Tempo');
  const tempoDiv = document.createElement('div'); tempoDiv.className = 'tempo-options'; secTempo.appendChild(tempoDiv);
  const radios = [
    { v: 'slow', txt: 'Slow (60 BPM)' },
    { v: 'medium', txt: 'Medium (90 BPM)' },
    { v: 'fast', txt: 'Fast (120 BPM)' },
    { v: 'custom', txt: 'Custom' },
  ];
  radios.forEach(({ v, txt }) => {
    const lbl = document.createElement('label'); lbl.className = 'radio';
    const input = document.createElement('input'); input.type = 'radio'; input.name = 'tempoChoice'; input.value = v; input.checked = s.tempoChoice === v;
    lbl.appendChild(input); lbl.appendChild(document.createElement('span')).textContent = txt; tempoDiv.appendChild(lbl);
  });
  const inline = document.createElement('label'); inline.className = 'inline-number';
  inline.appendChild(document.createElement('span')).textContent = 'BPM:';
  const num = document.createElement('input'); num.type = 'number'; num.id = 'sidebarCustomBpm'; num.min = '30'; num.max = '240'; num.step = '1'; num.value = s.customBpm;
  inline.appendChild(num); tempoDiv.appendChild(inline);

  // Rhythms
  const secRh = section('Rhythm Values');
  const gridRh = document.createElement('div'); gridRh.className = 'grid grid-3'; secRh.appendChild(gridRh);
  const RH = [
    { id: 'semibreve', label: 'Semibreve', symbol: '𝅝', fraction: 1 },
    { id: 'minim', label: 'Minim', symbol: '𝅗𝅥', fraction: 1 / 2 },
    { id: 'crotchet', label: 'Crotchet', symbol: '♩', fraction: 1 / 4 },
    { id: 'quaver', label: 'Quaver', symbol: '♪', fraction: 1 / 8 },
    { id: 'semiquaver', label: 'Semiquaver', symbol: '♬', fraction: 1 / 16 },
  ];
  RH.forEach((r) => {
    const lbl = document.createElement('label'); lbl.className = 'checkbox';
    const input = document.createElement('input'); input.type = 'checkbox'; input.value = r.id; input.checked = s.rhythms.includes(r.id);
    lbl.appendChild(input);
    const span = document.createElement('span'); span.textContent = `${r.label} (${r.symbol}) — ${r.fraction}`; lbl.appendChild(span);
    gridRh.appendChild(lbl);
  });

  // Question settings
  const secQ = section('Question Settings');
  const row1 = document.createElement('div'); row1.className = 'form-row';
  row1.appendChild(document.createElement('label')).textContent = 'Number of notes per question';
  const numNotes = document.createElement('input'); numNotes.type = 'number'; numNotes.min = '1'; numNotes.max = '64'; numNotes.step = '1'; numNotes.id = 'sidebarNumNotes'; numNotes.value = s.numNotes; row1.appendChild(numNotes);
  secQ.appendChild(row1);
  const row2 = document.createElement('div'); row2.className = 'form-row';
  row2.appendChild(document.createElement('label')).textContent = 'Largest jump allowed (in semitones)';
  const maxJump = document.createElement('input'); maxJump.type = 'number'; maxJump.min = '1'; maxJump.max = '24'; maxJump.step = '1'; maxJump.id = 'sidebarMaxJump'; maxJump.value = s.maxJump; row2.appendChild(maxJump);
  secQ.appendChild(row2);

  // Mode
  const secM = section('Mode');
  const gridM = document.createElement('div'); gridM.className = 'grid grid-2'; secM.appendChild(gridM);
  ['major','minor'].forEach((m) => {
    const lbl = document.createElement('label'); lbl.className = 'checkbox';
    const input = document.createElement('input'); input.type = 'checkbox'; input.value = m; input.className = 'mode-checkbox'; input.checked = s.modes.includes(m);
    lbl.appendChild(input);
    lbl.appendChild(document.createElement('span')).textContent = m === 'major' ? 'Major' : 'Minor';
    gridM.appendChild(lbl);
  });

  // Auto proceed
  const secAP = section('Auto-Proceed');
  const sw = document.createElement('label'); sw.className = 'switch';
  const ap = document.createElement('input'); ap.type = 'checkbox'; ap.id = 'sidebarAutoProceed'; ap.checked = !!s.autoProceed; sw.appendChild(ap);
  const span = document.createElement('span'); span.className = 'slider'; sw.appendChild(span);
  secAP.appendChild(sw);
}

function collectSidebarSettings() {
  const keys = qsa('#sidebar .grid.grid-6 input[type="checkbox"]:checked').map(i => i.value);
  const degrees = qsa('#sidebar .grid.grid-7 input[type="checkbox"]:checked').map(i => Number(i.value));
  const rhythms = qsa('#sidebar .grid.grid-3 input[type="checkbox"]:checked').map(i => i.value);
  const tempoChoice = (qs('#sidebar input[name="tempoChoice"]:checked')?.value) || 'medium';
  const customBpm = Number(qs('#sidebarCustomBpm').value) || 100;
  const numNotes = Number(qs('#sidebarNumNotes').value) || 5;
  const maxJump = Number(qs('#sidebarMaxJump').value) || 7;
  const modes = qsa('#sidebar .mode-checkbox:checked').map(i => i.value);
  const autoProceed = qs('#sidebarAutoProceed').checked;
  return { keys, degrees, rhythms, tempoChoice, customBpm, numNotes, maxJump, modes, autoProceed };
}

function validateSettings(s) {
  const errors = [];
  if (!s.keys.length) errors.push('Select at least one key');
  if (!s.degrees.length) errors.push('Select at least one scale degree');
  if (!s.rhythms.length) errors.push('Select at least one rhythm value');
  if (!s.modes.length) errors.push('Select at least one mode');
  if (s.tempoChoice === 'custom' && (s.customBpm < 30 || s.customBpm > 240)) errors.push('Custom BPM must be between 30 and 240');
  if (s.numNotes < 1) errors.push('Number of notes must be at least 1');
  if (s.maxJump < 1) errors.push('Largest jump must be at least 1 semitone');
  return errors;
}

function openSidebar() {
  const sb = qs('#sidebar');
  buildSidebarForm(qs('#sidebarContent'), state.settings);
  sb.classList.add('open');
  sb.setAttribute('aria-hidden', 'false');
}

function closeSidebar() {
  const sb = qs('#sidebar');
  sb.classList.remove('open');
  sb.setAttribute('aria-hidden', 'true');
}

function reshuffleParams() {
  state.setParams = chooseSetParams();
  setUpcomingParamsUI();
}

window.addEventListener('DOMContentLoaded', async () => {
  state.settings = loadSettings();
  state.questionsPerSet = state.settings.questionsPerSet || 10;
  state.setParams = chooseSetParams();
  setUpcomingParamsUI();
  buildDegreeButtons();

  // Prepare audio on first interaction
  const startBtn = qs('#btnStartSet');
  startBtn.addEventListener('click', async () => {
    await initAudio();
    startSet();
  });

  qs('#btnReshuffle').addEventListener('click', reshuffleParams);

  qs('#btnOpenSettingsPre').addEventListener('click', openSidebar);
  qs('#btnOpenSettings').addEventListener('click', openSidebar);
  qs('#btnCloseSidebar').addEventListener('click', closeSidebar);

  qs('#btnSaveSidebar').addEventListener('click', () => {
    const s = collectSidebarSettings();
    const errs = validateSettings(s);
    if (errs.length) {
      alert(errs.join('\n'));
      return;
    }
    state.settings = s;
    saveSettings(s);
    // update dependent UI
    buildDegreeButtons();
    state.setParams.tempoBpm = getEffectiveBpm(s);
    setUpcomingParamsUI();
    closeSidebar();
  });

  qs('#btnPause').addEventListener('click', togglePause);
  qs('#btnReplayQuestion').addEventListener('click', replayQuestion);
  qs('#btnReplayCalibration').addEventListener('click', replayCalibration);
  qs('#btnNext').addEventListener('click', nextQuestion);
  qs('#btnRestart').addEventListener('click', restartSet);
  qs('#btnStop').addEventListener('click', stopSet);
});
