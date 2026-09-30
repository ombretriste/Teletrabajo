'use strict';

const STORAGE_KEY = 'teletrabajo:v1';
const DISPLAY_KEY = 'teletrabajo:display';
const RATIO = 0.4;
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// tele: suma 1 al teletrabajo · half: suma 0,5 · other (baja, médico…): laborable sin teletrabajo
// off, vacation y holiday no cuentan como laborables
const STATES = {
  tele: { label: 'Teletrabajo', name: 'teletrabajo' },
  half: { label: 'Medio día teletrabajo', name: 'medio día de teletrabajo' },
  off: { label: 'Libre', name: 'día libre' },
  vacation: { label: 'Vacaciones', name: 'vacaciones' },
  holiday: { label: 'Festivo', name: 'festivo' },
  other: { label: 'Otros', name: 'otros (baja, médico…)' },
};
const NON_WORKING = ['off', 'vacation', 'holiday'];

const ICONS = {
  // Tipos de día
  tele: '<path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
  half: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/>',
  off: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M9 15.5h6"/>',
  vacation: '<circle cx="12" cy="12" r="3.8"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
  holiday: '<path d="M5.5 21V3.5"/><path d="M5.5 4.5h12l-2.5 4 2.5 4h-12"/>',
  other: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/>',
  // Menú
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.9 1.2-1.8-.5-1-.1-2.2 1.1-2.2H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
  today: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><circle cx="12" cy="15" r="1.6"/>',
  download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M4 17v1.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V17"/>',
  upload: '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5"/><path d="M4 17v1.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V17"/>',
};
const icon = (name, size = 22) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

// Logo de Up to 40%: anillo fino, anillo discontinuo, arco del 40 % y casa de líneas finas
let logoCount = 0;
function logoSVG(size) {
  const id = `u40-g${logoCount++}`;
  return `
    <svg class="logo-mark" viewBox="0 0 120 120" width="${size}" height="${size}" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <defs>
        <linearGradient id="${id}" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stop-color="#3b7bff"/><stop offset=".55" stop-color="#5aa9ff"/><stop offset="1" stop-color="#a5dcff"/>
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="52" stroke="url(#${id})" stroke-width="1.2" opacity=".55"/>
      <circle cx="60" cy="60" r="42" stroke="url(#${id})" stroke-width=".8" stroke-dasharray="2 5" opacity=".6"/>
      <path d="M60 8 A52 52 0 0 1 90.56 102.07" stroke="url(#${id})" stroke-width="3"/>
      <circle cx="90.56" cy="102.07" r="3" fill="#5aa9ff" stroke="none"/>
      <path d="M38 62 L60 42 L82 62" stroke="url(#${id})" stroke-width="1.8"/>
      <path d="M44 57 V80 H76 V57" stroke="url(#${id})" stroke-width="1.8"/>
      <path d="M55 80 V69 H65 V80" stroke="url(#${id})" stroke-width="1.8"/>
    </svg>`;
}
document.querySelectorAll('[data-logo]').forEach((el) => { el.innerHTML = logoSVG(Number(el.dataset.logo)); });

// ---------- Fechas ----------

const pad = (n) => String(n).padStart(2, '0');
const dateKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6;
const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','));

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

// ---------- Datos ----------

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (_) {
    return false;
  }
}

// Descarta estados que ya no existen (p. ej. el antiguo «oficina»)
function cleanDays(days) {
  const out = {};
  for (const [key, state] of Object.entries(days || {})) {
    if (STATES[state]) out[key] = state;
  }
  return out;
}

let data = { days: cleanDays(load(STORAGE_KEY, {}).days) };
let brush = 'tele';
const now = new Date();
let view = { year: now.getFullYear(), quarter: Math.floor(now.getMonth() / 3) };

function persist() {
  if (!save(STORAGE_KEY, data)) toast('No se han podido guardar los datos en este dispositivo.');
}

function effectiveState(key) {
  if (data.days[key]) return data.days[key];
  const year = Number(key.slice(0, 4));
  return nationalHolidays(year)[key] ? 'holiday' : null;
}

// ---------- Cálculo ----------

function quarterStats(year, quarter) {
  const s = { working: 0, tele: 0, off: 0, vacation: 0, holiday: 0, other: 0 };
  const start = new Date(year, quarter * 3, 1);
  const end = new Date(year, quarter * 3 + 3, 1);
  for (const d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    if (isWeekend(d)) continue;
    const state = effectiveState(dateKey(d.getFullYear(), d.getMonth(), d.getDate()));
    if (NON_WORKING.includes(state)) { s[state]++; continue; }
    s.working++;
    if (state === 'tele') s.tele += 1;
    else if (state === 'half') s.tele += 0.5;
    else if (state === 'other') s.other++;
  }
  s.allowedExact = s.working * RATIO;
  // Con medios días, el máximo se redondea hacia abajo al medio día más cercano
  s.allowed = Math.floor(s.allowedExact * 2 + 1e-9) / 2;
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
  const n = Math.abs(s.remaining);
  const plural = n === 1 ? '' : 's';
  $('remaining').textContent = fmt(n);
  $('remaining-label').textContent = over ? `día${plural} por encima del 40%` : `día${plural} de teletrabajo`;
  document.querySelector('.summary').classList.toggle('over', over);

  const ratio = s.allowed ? Math.min(s.tele / s.allowed, 1) : (s.tele ? 1 : 0);
  $('progress-fill').style.width = `${ratio * 100}%`;
  $('progress').setAttribute('aria-valuemax', String(s.allowed));
  $('progress').setAttribute('aria-valuenow', String(s.tele));
  $('progress-text').textContent =
    `${fmt(s.tele)} de ${fmt(s.allowed)} días usados (${s.pct.toFixed(0)}% actual) · 40% de ${s.working} laborables = ${s.allowedExact.toFixed(1).replace('.', ',')}`;

  $('s-working').textContent = s.working;
  $('s-allowed').textContent = fmt(s.allowed);
  $('s-tele').textContent = fmt(s.tele);
  $('s-off').textContent = s.off;
  $('s-vacation').textContent = s.vacation;
  $('s-holiday').textContent = s.holiday;
  $('s-other').textContent = s.other;
}

function renderMonths(year, quarter) {
  const container = $('months');
  container.innerHTML = '';
  const today = todayKey();
  const holidays = nationalHolidays(year);

  for (let m = quarter * 3; m < quarter * 3 + 3; m++) {
    const card = document.createElement('div');
    card.className = 'card month';
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
          cell.insertAdjacentHTML('beforeend', `<span class="icon">${icon(state, 13)}</span>`);
        }
        cell.setAttribute('aria-label', `${d} de ${MONTHS[m]}${state ? ': ' + STATES[state].name : ''}${holidays[key] ? ' (' + holidays[key] + ')' : ''}`);
      }
      grid.appendChild(cell);
    }
    card.appendChild(grid);
    container.appendChild(card);
  }
}

function renderHolidayList(year, quarter) {
  const ul = $('holiday-list');
  ul.innerHTML = '';
  const entries = Object.entries(nationalHolidays(year))
    .filter(([key]) => Math.floor((Number(key.slice(5, 7)) - 1) / 3) === quarter)
    .sort(([a], [b]) => a.localeCompare(b));

  if (!entries.length) {
    ul.innerHTML = '<li>No hay festivos nacionales en este trimestre.</li>';
    return;
  }
  for (const [key, name] of entries) {
    const [y, mo, d] = key.split('-').map(Number);
    const weekday = new Date(y, mo - 1, d).toLocaleDateString('es-ES', { weekday: 'long' });
    const li = document.createElement('li');
    li.innerHTML = `<strong>${d} de ${MONTHS[mo - 1]}</strong> · ${name} <span class="muted">(${weekday})</span>`;
    ul.appendChild(li);
  }
}

function toast(text) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = text;
  document.body.append(el);
  setTimeout(() => el.remove(), 2600);
}

// ---------- Calendario y tipos de día ----------

$('months').addEventListener('click', (e) => {
  const cell = e.target.closest('button.day');
  if (!cell || cell.disabled) return;
  const key = cell.dataset.key;
  // Tocar un día con el mismo tipo lo desmarca
  if (effectiveState(key) === brush) delete data.days[key];
  else data.days[key] = brush;
  persist();
  render();
});

$('brushes').innerHTML = Object.entries(STATES).map(([key, s]) =>
  `<button class="brush ${key}" type="button" data-brush="${key}"><span class="brush-icon">${icon(key, 22)}</span><span class="brush-label">${s.label}</span></button>`).join('');

$('brushes').addEventListener('click', (e) => {
  const btn = e.target.closest('button.brush');
  if (!btn) return;
  brush = btn.dataset.brush;
  document.querySelectorAll('.brush').forEach((b) => b.classList.toggle('active', b === btn));
});
document.querySelector(`.brush[data-brush="${brush}"]`).classList.add('active');

// ---------- Trimestres (barra inferior) ----------

function shiftQuarter(delta) {
  let q = view.quarter + delta;
  let y = view.year;
  if (q < 0) { q = 3; y--; }
  if (q > 3) { q = 0; y++; }
  view = { year: y, quarter: q };
  render();
}

function goToday() {
  const t = new Date();
  view = { year: t.getFullYear(), quarter: Math.floor(t.getMonth() / 3) };
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$('prev').addEventListener('click', () => shiftQuarter(-1));
$('next').addEventListener('click', () => shiftQuarter(1));
$('quarter-current').addEventListener('click', goToday);

// ---------- Menú ⋯ ----------

const MENU = [
  { label: 'Opciones de visualización', icon: 'palette', run: () => openDisplaySheet() },
  { label: 'Ir al trimestre actual', icon: 'today', run: () => goToday() },
  { label: 'Exportar copia', icon: 'download', run: () => exportData() },
  { label: 'Importar copia', icon: 'upload', run: () => $('import-input').click() },
];

function openMenu() {
  const menu = $('menu');
  menu.innerHTML = MENU.map((m, i) =>
    `<button class="menu-item" role="menuitem" data-i="${i}">${icon(m.icon, 20)}<span>${m.label}</span></button>`).join('');
  menu.querySelectorAll('.menu-item').forEach((b) => b.addEventListener('click', () => {
    closeMenu();
    MENU[b.dataset.i].run();
  }));
  const r = $('menu-btn').getBoundingClientRect();
  menu.style.top = `${r.bottom + 6}px`;
  menu.style.right = `${Math.max(8, window.innerWidth - r.right)}px`;
  menu.hidden = false;
  $('menu-btn').setAttribute('aria-expanded', 'true');
}

function closeMenu() {
  $('menu').hidden = true;
  $('menu-btn').setAttribute('aria-expanded', 'false');
}

$('menu-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  if ($('menu').hidden) openMenu();
  else closeMenu();
});
document.addEventListener('click', (e) => {
  if (!$('menu').hidden && !e.target.closest('#menu')) closeMenu();
});
window.addEventListener('resize', closeMenu);

function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `up-to-40-${todayKey()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

$('import-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!parsed || typeof parsed.days !== 'object') throw new Error('formato');
    if (!confirm('Esto sustituirá los datos actuales de este dispositivo. ¿Continuar?')) return;
    data = { days: cleanDays(parsed.days) };
    persist();
    render();
    toast('Copia importada');
  } catch (_) {
    alert('El archivo no es una copia válida.');
  } finally {
    e.target.value = '';
  }
});

// ---------- Opciones de visualización (modo y fondo) ----------

const WALLS = {
  glaciar: { name: 'Glaciar', c: ['96 165 250', '186 230 253', '56 189 248', '37 99 235'] },
  cielo: { name: 'Cielo', c: ['14 165 233', '125 211 252', '34 211 238', '59 130 246'] },
  marino: { name: 'Marino', c: ['30 64 175', '37 99 235', '8 145 178', '67 56 202'] },
  lavanda: { name: 'Lavanda', c: ['99 102 241', '147 197 253', '167 139 250', '56 189 248'] },
};
const lightQuery = matchMedia('(prefers-color-scheme: light)');
let display = { theme: 'auto', wall: 'glaciar', ...load(DISPLAY_KEY, {}) };

function applyDisplay() {
  const light = display.theme === 'light' || (display.theme === 'auto' && lightQuery.matches);
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
  document.documentElement.dataset.wall = WALLS[display.wall] ? display.wall : 'glaciar';
  document.querySelector('meta[name="theme-color"]').setAttribute('content', light ? '#eef4fc' : '#07101f');
}
lightQuery.addEventListener('change', () => { if (display.theme === 'auto') applyDisplay(); });

// Miniatura de un fondo con los mismos degradados que el real
function wallPreview(key) {
  const [c1, c2, c3, c4] = WALLS[key].c;
  const light = document.documentElement.dataset.theme === 'light';
  const a = light ? 0.4 : 0.5;
  const base = light ? '#eef4fc' : '#07101f';
  return `radial-gradient(70% 60% at 15% 10%, rgb(${c1} / ${a}), transparent 70%), radial-gradient(60% 55% at 90% 25%, rgb(${c2} / ${a * 0.8}), transparent 72%),
    radial-gradient(70% 60% at 75% 95%, rgb(${c3} / ${a * 0.85}), transparent 70%), radial-gradient(60% 55% at 5% 85%, rgb(${c4} / ${a * 0.8}), transparent 72%), ${base}`;
}

function closeSheet() {
  document.querySelector('.sheet-backdrop')?.remove();
}

function openDisplaySheet() {
  closeSheet();
  const back = document.createElement('div');
  back.className = 'sheet-backdrop';
  document.body.append(back);
  back.addEventListener('click', (e) => { if (e.target === back) closeSheet(); });

  const draw = () => {
    back.innerHTML = `
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Opciones de visualización">
        <h2 class="sheet-title">Opciones de visualización</h2>
        <p class="opt-label">Modo</p>
        <div class="seg" role="group" aria-label="Modo">
          ${[['dark', 'Oscuro'], ['light', 'Claro'], ['auto', 'Automático']].map(([v, l]) =>
            `<button type="button" data-theme-opt="${v}" class="${display.theme === v ? 'on' : ''}" aria-pressed="${display.theme === v}">${l}</button>`).join('')}
        </div>
        <p class="muted small">${display.theme === 'auto' ? 'Sigue el modo claro u oscuro del sistema.' : '&nbsp;'}</p>
        <p class="opt-label">Fondo</p>
        <div class="walls">
          ${Object.entries(WALLS).map(([k, w]) =>
            `<button type="button" class="wall ${display.wall === k ? 'on' : ''}" data-wall-opt="${k}" style="background:${wallPreview(k)}" aria-pressed="${display.wall === k}">${w.name}</button>`).join('')}
        </div>
        <div class="body-actions"><button class="done-btn" type="button">Listo</button></div>
      </div>`;
    back.querySelectorAll('[data-theme-opt]').forEach((b) => b.addEventListener('click', () => {
      display.theme = b.dataset.themeOpt;
      save(DISPLAY_KEY, display);
      applyDisplay();
      draw();
    }));
    back.querySelectorAll('[data-wall-opt]').forEach((b) => b.addEventListener('click', () => {
      display.wall = b.dataset.wallOpt;
      save(DISPLAY_KEY, display);
      applyDisplay();
      draw();
    }));
    back.querySelector('.done-btn').addEventListener('click', closeSheet);
  };
  draw();
}

// ---------- Pantalla de inicio ----------

$('enter-btn').addEventListener('click', () => {
  const body = document.body;
  if (body.classList.contains('entering')) return;
  body.classList.add('entering');
  setTimeout(() => {
    $('splash').remove();
    body.classList.remove('booting', 'entering');
  }, 820);
});

// ---------- Siempre en vertical ----------
// Android (app instalada) respeta la orientación del manifiesto y este bloqueo;
// iOS no permite bloquearla, así que en horizontal se muestra un aviso para girar el móvil.
try { screen.orientation?.lock?.('portrait').catch(() => {}); } catch (_) { /* no compatible */ }

// ---------- Sin zoom (Safari en iOS ignora user-scalable=no) ----------

document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

applyDisplay();
render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
