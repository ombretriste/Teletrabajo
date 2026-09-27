'use strict';

const STORAGE_KEY = 'teletrabajo:v1';
const THEME_KEY = 'teletrabajo:theme';
const RATIO = 0.4;
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const STATES = ['tele', 'off', 'holiday'];
const STATE_ICONS = { tele: '🏠', off: '🌴', holiday: '🎉' };

// ---------- Fechas ----------

const pad = (n) => String(n).padStart(2, '0');
const dateKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6;

function todayKey() {
  const t = new Date();
  return dateKey(t.getFullYear(), t.getMonth(), t.getDate());
}

// Domingo de Pascua (algoritmo gregoriano anónimo)
function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

// Festivos nacionales comunes a toda España
const holidayCache = {};
function nationalHolidays(year) {
  if (holidayCache[year]) return holidayCache[year];
  const goodFriday = easterSunday(year);
  goodFriday.setDate(goodFriday.getDate() - 2);
  const list = {
    [dateKey(year, 0, 1)]: 'Año Nuevo',
    [dateKey(year, 0, 6)]: 'Epifanía del Señor (Reyes)',
    [dateKey(year, goodFriday.getMonth(), goodFriday.getDate())]: 'Viernes Santo',
    [dateKey(year, 4, 1)]: 'Fiesta del Trabajo',
    [dateKey(year, 7, 15)]: 'Asunción de la Virgen',
    [dateKey(year, 9, 12)]: 'Fiesta Nacional de España',
    [dateKey(year, 10, 1)]: 'Todos los Santos',
    [dateKey(year, 11, 6)]: 'Día de la Constitución',
    [dateKey(year, 11, 8)]: 'Inmaculada Concepción',
    [dateKey(year, 11, 25)]: 'Navidad',
  };
  holidayCache[year] = list;
  return list;
}

// ---------- Estado ----------

// Descarta estados que ya no existen (p. ej. el antiguo «oficina»)
function cleanDays(days) {
  const out = {};
  for (const [key, state] of Object.entries(days)) {
    if (STATES.includes(state)) out[key] = state;
  }
  return out;
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed.days === 'object') return { days: cleanDays(parsed.days) };
  } catch (_) { /* almacenamiento no disponible */ }
  return { days: {} };
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (_) {
    alert('No se han podido guardar los datos en este dispositivo.');
  }
}

let data = loadData();
let brush = 'tele';
const now = new Date();
let view = { year: now.getFullYear(), quarter: Math.floor(now.getMonth() / 3) };

function effectiveState(key) {
  if (data.days[key]) return data.days[key];
  const year = Number(key.slice(0, 4));
  return nationalHolidays(year)[key] ? 'holiday' : null;
}

// ---------- Cálculo ----------

function quarterStats(year, quarter) {
  const s = { working: 0, tele: 0, off: 0, holiday: 0 };
  const start = new Date(year, quarter * 3, 1);
  const end = new Date(year, quarter * 3 + 3, 1);
  for (const d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    if (isWeekend(d)) continue;
    const state = effectiveState(dateKey(d.getFullYear(), d.getMonth(), d.getDate()));
    if (state === 'holiday') { s.holiday++; continue; }
    if (state === 'off') { s.off++; continue; }
    s.working++;
    if (state === 'tele') s.tele++;
  }
  s.allowedExact = s.working * RATIO;
  s.allowed = Math.floor(s.allowedExact + 1e-9);
  s.remaining = s.allowed - s.tele;
  s.pct = s.working ? (s.tele / s.working) * 100 : 0;
  return s;
}

// ---------- Render ----------

const $ = (id) => document.getElementById(id);

function render() {
  const { year, quarter } = view;
  $('quarter-label').textContent = `Q${quarter + 1} ${year}`;
  $('quarter-range').textContent = `${MONTHS[quarter * 3]} – ${MONTHS[quarter * 3 + 2]}`;
  renderSummary(quarterStats(year, quarter));
  renderMonths(year, quarter);
  renderHolidayList(year, quarter);
}

function renderSummary(s) {
  const over = s.remaining < 0;
  $('remaining').textContent = over ? Math.abs(s.remaining) : s.remaining;
  $('remaining-label').textContent = over
    ? `día${Math.abs(s.remaining) === 1 ? '' : 's'} por encima del 40%`
    : `día${s.remaining === 1 ? '' : 's'} de teletrabajo disponible${s.remaining === 1 ? '' : 's'}`;
  document.querySelector('.summary').classList.toggle('over', over);

  const ratio = s.allowed ? Math.min(s.tele / s.allowed, 1) : (s.tele ? 1 : 0);
  $('progress-fill').style.width = `${ratio * 100}%`;
  $('progress').setAttribute('aria-valuemax', String(s.allowed));
  $('progress').setAttribute('aria-valuenow', String(s.tele));
  $('progress-text').textContent =
    `${s.tele} de ${s.allowed} días usados · 40% de ${s.working} laborables = ${s.allowedExact.toFixed(1).replace('.', ',')}`;

  $('s-working').textContent = s.working;
  $('s-allowed').textContent = s.allowed;
  $('s-tele').textContent = s.tele;
  $('s-off').textContent = s.off;
  $('s-holiday').textContent = s.holiday;
  $('s-pct').textContent = `${s.pct.toFixed(0)}%`;
}

function renderMonths(year, quarter) {
  const container = $('months');
  container.innerHTML = '';
  const today = todayKey();
  const holidays = nationalHolidays(year);

  for (let m = quarter * 3; m < quarter * 3 + 3; m++) {
    const card = document.createElement('div');
    card.className = 'month';
    const title = document.createElement('h2');
    title.textContent = `${MONTHS[m]} ${year}`;
    card.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'grid';
    WEEKDAYS.forEach((w) => {
      const h = document.createElement('span');
      h.className = 'wd';
      h.textContent = w;
      grid.appendChild(h);
    });

    const first = new Date(year, m, 1);
    const offset = (first.getDay() + 6) % 7; // lunes = 0
    for (let i = 0; i < offset; i++) grid.appendChild(document.createElement('span'));

    const daysInMonth = new Date(year, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, m, d);
      const key = dateKey(year, m, d);
      const cell = document.createElement('button');
      cell.className = 'day';
      cell.dataset.key = key;
      if (key === today) cell.classList.add('today');
      if (holidays[key]) {
        cell.classList.add('national');
        cell.title = holidays[key];
      }

      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = d;
      cell.appendChild(num);

      if (isWeekend(date)) {
        cell.classList.add('weekend');
        cell.disabled = true;
      } else {
        const state = effectiveState(key);
        if (state) {
          cell.classList.add(state);
          const icon = document.createElement('span');
          icon.className = 'icon';
          icon.textContent = STATE_ICONS[state];
          cell.appendChild(icon);
        }
        cell.setAttribute('aria-label', `${d} de ${MONTHS[m]}${state ? ': ' + stateName(state) : ''}${holidays[key] ? ' (' + holidays[key] + ')' : ''}`);
      }
      grid.appendChild(cell);
    }
    card.appendChild(grid);
    container.appendChild(card);
  }
}

function stateName(state) {
  return { tele: 'teletrabajo', off: 'día libre', holiday: 'festivo' }[state];
}

function renderHolidayList(year, quarter) {
  const ul = $('holiday-list');
  ul.innerHTML = '';
  const entries = Object.entries(nationalHolidays(year))
    .filter(([key]) => {
      const month = Number(key.slice(5, 7)) - 1;
      return Math.floor(month / 3) === quarter;
    })
    .sort(([a], [b]) => a.localeCompare(b));

  if (!entries.length) {
    ul.innerHTML = '<li>No hay festivos nacionales en este trimestre.</li>';
    return;
  }
  for (const [key, name] of entries) {
    const [y, mo, d] = key.split('-').map(Number);
    const date = new Date(y, mo - 1, d);
    const li = document.createElement('li');
    const weekday = date.toLocaleDateString('es-ES', { weekday: 'long' });
    li.innerHTML = `<strong>${d} de ${MONTHS[mo - 1]}</strong> · ${name} <span class="muted">(${weekday})</span>`;
    ul.appendChild(li);
  }
}

// ---------- Interacción ----------

$('months').addEventListener('click', (e) => {
  const cell = e.target.closest('button.day');
  if (!cell || cell.disabled) return;
  const key = cell.dataset.key;
  if (brush === 'clear' || effectiveState(key) === brush) {
    delete data.days[key];
  } else {
    data.days[key] = brush;
  }
  saveData();
  render();
});

$('brushes').addEventListener('click', (e) => {
  const btn = e.target.closest('button.brush');
  if (!btn) return;
  brush = btn.dataset.brush;
  document.querySelectorAll('.brush').forEach((b) => b.classList.toggle('active', b === btn));
});
document.querySelector(`.brush[data-brush="${brush}"]`).classList.add('active');

function shiftQuarter(delta) {
  let q = view.quarter + delta;
  let y = view.year;
  if (q < 0) { q = 3; y--; }
  if (q > 3) { q = 0; y++; }
  view = { year: y, quarter: q };
  render();
}

$('prev').addEventListener('click', () => shiftQuarter(-1));
$('next').addEventListener('click', () => shiftQuarter(1));
$('today-btn').addEventListener('click', () => {
  const t = new Date();
  view = { year: t.getFullYear(), quarter: Math.floor(t.getMonth() / 3) };
  render();
});

$('export-btn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `teletrabajo-${todayKey()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$('import-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!parsed || typeof parsed.days !== 'object') throw new Error('formato');
    if (!confirm('Esto sustituirá los datos actuales de este dispositivo. ¿Continuar?')) return;
    data = { days: cleanDays(parsed.days) };
    saveData();
    render();
  } catch (_) {
    alert('El archivo no es una copia válida.');
  } finally {
    e.target.value = '';
  }
});

// ---------- Tema (automático / claro / oscuro) ----------

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function getThemePref() {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === 'light' || t === 'dark' ? t : 'auto';
  } catch (_) {
    return 'auto';
  }
}

function applyTheme(pref) {
  if (pref === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = pref;
  const dark = pref === 'dark' || (pref === 'auto' && darkQuery.matches);
  $('theme-color').setAttribute('content', dark ? '#0a1630' : '#00205b');
  document.querySelectorAll('#theme-picker button').forEach((b) => {
    const active = b.dataset.theme === pref;
    b.classList.toggle('active', active);
    b.setAttribute('aria-checked', String(active));
  });
}

$('theme-picker').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-theme]');
  if (!btn) return;
  const pref = btn.dataset.theme;
  try {
    if (pref === 'auto') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch (_) { /* sin almacenamiento: se aplica solo en esta sesión */ }
  applyTheme(pref);
});
darkQuery.addEventListener('change', () => applyTheme(getThemePref()));
applyTheme(getThemePref());

// ---------- Sin zoom (Safari en iOS ignora user-scalable=no) ----------

document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
