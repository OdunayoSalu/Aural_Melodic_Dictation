// settings.js
import { SOLFEGE, RHYTHMS } from './constants.js';
import { loadSettings, saveSettings } from './settingsStore.js';

function el(tag, opts = {}, children = []) {
  const e = document.createElement(tag);
  if (opts.class) e.className = opts.class;
  if (opts.html) e.innerHTML = opts.html;
  if (opts.text) e.textContent = opts.text;
  if (opts.attrs) Object.entries(opts.attrs).forEach(([k, v]) => e.setAttribute(k, v));
  children.forEach((c) => e.appendChild(c));
  return e;
}

function populateDegrees(container, settings) {
  container.innerHTML = '';
  for (let d = 1; d <= 7; d++) {
    const id = `deg-${d}`;
    const input = el('input', { attrs: { type: 'checkbox', id, value: String(d) } });
    if (settings.degrees.includes(d)) input.checked = true;
    const lbl = el('label', { class: 'checkbox', attrs: { for: id } });
    lbl.appendChild(input);
    lbl.appendChild(el('span', { text: `${d} (${SOLFEGE[d]})` }));
    container.appendChild(lbl);
  }
}

function noteIconSpan(id, fallback) {
  const span = document.createElement('span');
  span.style.display = 'inline-flex';
  span.style.alignItems = 'center';
  span.style.gap = '6px';
  const svgSize = 16;
  let svg = '';
  if (id === 'semibreve') {
    // Simple open oval
    svg = `<svg width="${svgSize}" height="${svgSize}" viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="12" rx="7" ry="5" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
  } else if (id === 'minim') {
    // Open oval + stem
    svg = `<svg width="${svgSize}" height="${svgSize}" viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="9" cy="15" rx="5" ry="3.6" fill="none" stroke="currentColor" stroke-width="2"/><line x1="14" y1="5" x2="14" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  } else {
    span.textContent = fallback;
    return span;
  }
  span.innerHTML = svg;
  const text = document.createElement('span');
  text.textContent = fallback;
  span.appendChild(text);
  return span;
}

function populateRhythms(container, settings) {
  container.innerHTML = '';
  RHYTHMS.forEach((r) => {
    const id = `rh-${r.id}`;
    const input = el('input', { attrs: { type: 'checkbox', id, value: r.id } });
    if (settings.rhythms.includes(r.id)) input.checked = true;
    const lbl = el('label', { class: 'checkbox', attrs: { for: id } });
    lbl.appendChild(input);
    const right = document.createElement('span');
    right.style.display = 'inline-flex';
    right.style.alignItems = 'center';
    right.style.gap = '6px';
    const name = document.createElement('span');
    name.textContent = r.label;
    const icon = (r.id === 'semibreve' || r.id === 'minim') ? noteIconSpan(r.id, r.symbol) : el('span', { text: r.symbol });
    const frac = document.createElement('span');
    frac.style.color = '#9ca3af';
    frac.textContent = `(${r.fraction})`;
    right.appendChild(name);
    right.appendChild(icon);
    right.appendChild(frac);
    lbl.appendChild(right);
    container.appendChild(lbl);
  });
}

function bindTempo(settings) {
  const tempoRadios = Array.from(document.querySelectorAll('input[name="tempoChoice"]'));
  const customBpm = document.getElementById('customBpm');
  tempoRadios.forEach((r) => {
    r.checked = r.value === settings.tempoChoice;
    r.addEventListener('change', () => {
      if (r.value === 'custom') customBpm.disabled = false; else customBpm.disabled = true;
    });
  });
  customBpm.value = settings.customBpm;
  customBpm.disabled = settings.tempoChoice !== 'custom';
}

function bindModes(settings) {
  const modeBoxes = Array.from(document.querySelectorAll('.mode-checkbox'));
  modeBoxes.forEach((b) => {
    b.checked = settings.modes.includes(b.value);
  });
}

function bindNumerics(settings) {
  document.getElementById('numNotes').value = settings.numNotes;
  document.getElementById('maxJump').value = settings.maxJump;
  document.getElementById('autoProceed').checked = !!settings.autoProceed;
  const qpsEl = document.getElementById('questionsPerSet');
  if (qpsEl) qpsEl.value = settings.questionsPerSet;
  const calEl = document.getElementById('calibrationBpm');
  if (calEl) calEl.value = settings.calibrationBpm;
  const fxEl = document.getElementById('fixedKey');
  if (fxEl) fxEl.checked = !!settings.fixedKey;
}

function collectSettingsFromForm() {
  const degrees = Array.from(document.querySelectorAll('#degrees-container input[type="checkbox"]:checked')).map(i => Number(i.value));
  const rhythms = Array.from(document.querySelectorAll('#rhythms-container input[type="checkbox"]:checked')).map(i => i.value);
  const tempoChoice = (document.querySelector('input[name="tempoChoice"]:checked')?.value) || 'medium';
  const customBpm = Number(document.getElementById('customBpm').value) || 100;
  const numNotes = Number(document.getElementById('numNotes').value) || 5;
  const maxJump = Number(document.getElementById('maxJump').value) || 7;
  const modes = Array.from(document.querySelectorAll('.mode-checkbox:checked')).map(i => i.value);
  const autoProceed = document.getElementById('autoProceed').checked;
  const questionsPerSet = Number(document.getElementById('questionsPerSet')?.value ?? 10);
  const calibrationBpm = Number(document.getElementById('calibrationBpm')?.value ?? 90);
  const fixedKey = !!document.getElementById('fixedKey')?.checked;

  return { degrees, rhythms, tempoChoice, customBpm, numNotes, maxJump, modes, autoProceed, questionsPerSet, calibrationBpm, fixedKey };
}

function validateSettings(s) {
  const errors = [];
  if (!s.degrees.length) errors.push('Select at least one scale degree');
  if (!s.rhythms.length) errors.push('Select at least one rhythm value');
  if (!s.modes.length) errors.push('Select at least one mode (major/minor)');
  if (s.tempoChoice === 'custom' && (s.customBpm < 30 || s.customBpm > 240)) errors.push('Custom BPM must be between 30 and 240');
  if (s.numNotes < 1) errors.push('Number of notes must be at least 1');
  if (s.maxJump < 1) errors.push('Largest jump must be at least 1 semitone');
  if (s.calibrationBpm < 20 || s.calibrationBpm > 300) errors.push('Calibration BPM must be between 20 and 300');
  if (s.questionsPerSet < 0) errors.push('Questions per set cannot be negative');
  return errors;
}

function showNotice(msg, type = 'info') {
  let elMsg = document.querySelector('.notice');
  if (!elMsg) {
    elMsg = document.createElement('p');
    elMsg.className = 'notice';
    document.querySelector('.actions').prepend(elMsg);
  }
  elMsg.textContent = msg;
  elMsg.style.color = type === 'error' ? '#ffb4c2' : '#9ca3af';
}

window.addEventListener('DOMContentLoaded', () => {
  const settings = loadSettings();
  populateDegrees(document.getElementById('degrees-container'), settings);
  populateRhythms(document.getElementById('rhythms-container'), settings);
  bindTempo(settings);
  bindModes(settings);
  bindNumerics(settings);

  document.getElementById('saveSettings').addEventListener('click', () => {
    const s = collectSettingsFromForm();
    const errors = validateSettings(s);
    if (errors.length) {
      showNotice(errors.join(' • '), 'error');
      return;
    }
    saveSettings(s);
    showNotice('Settings saved.');
  });
});
