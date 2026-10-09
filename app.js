'use strict';

// Versión de la app (se ve en la pantalla de inicio). Arreglos y ajustes: 1.0.x; novedades: 1.x.0.
const APP_VERSION = '1.1.0';
const STORAGE_KEY = 'teletrabajo:v1';
const DISPLAY_KEY = 'teletrabajo:display';
const RATIO = 0.4;
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// tele: suma 1 al teletrabajo · half: suma 0,5 · other (baja, médico…): laborable sin teletrabajo
// off, vacation, vacprev, hours y holiday no cuentan como laborables (reducen los días permitidos)
// halfoff: medio día libre (cuenta medio laborable) · mix: medio teletrabajo + medio libre
// El orden es el de los botones; los de un mismo `group` comparten botón (menú emergente) y
// `combo` no tiene botón. Quedan 6 botones en 2 filas de 3.
const STATES = {
  tele: { label: 'Teletrabajo', name: 'teletrabajo', group: 'tele' },
  half: { label: 'Medio día teletrabajo', name: 'medio día de teletrabajo', group: 'tele' },
  off: { label: 'Libre disposición', name: 'libre disposición', group: 'off' },
  halfoff: { label: 'Medio día libre', name: 'medio día de libre disposición', group: 'off' },
  vacation: { label: 'Vacaciones', name: 'vacaciones', group: 'vacation' },
  vacprev: { label: 'Vacaciones año anterior', name: 'vacaciones del año anterior', group: 'vacation' },
  hours: { label: 'Días con horas', name: 'día con horas' },
  holiday: { label: 'Festivo', name: 'festivo' },
  // Grupo del botón «Otros» (se elige en un menú emergente)
  nonexp: { label: 'Días que no caducan', name: 'día que no caduca', group: 'other' },
  medical: { label: 'Médico', name: 'médico', group: 'other' },
  sick: { label: 'Bajas', name: 'baja', group: 'other' },
  other: { label: 'Otros', name: 'otros', group: 'other' },
  mix: { label: 'Medio día teletrabajo y medio día libre', name: 'medio día de teletrabajo y medio día libre', combo: true },
};
const NON_WORKING = ['off', 'vacation', 'vacprev', 'hours', 'nonexp', 'holiday'];
// Médico, Bajas y Otros: cuentan como laborables, sin teletrabajo
const WORKING_OTHER = ['medical', 'sick', 'other'];
const GROUPS = {};
for (const [k, s] of Object.entries(STATES)) if (s.group) (GROUPS[s.group] ??= []).push(k);

const ICONS = {
  // Tipos de día
  tele: '<path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
  half: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/>',
  off: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M9 15.5h6"/>',
  halfoff: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/>',
  mix: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" style="fill:var(--tele)" stroke="none"/><path d="M12 4a8 8 0 0 1 0 16z" style="fill:var(--off)" stroke="none"/>',
  vacation: '<circle cx="12" cy="12" r="3.8"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
  vacprev: '<path d="M3.5 18h17"/><path d="M7 18a5 5 0 0 1 10 0"/><path d="M12 7.5v2.5M5.8 10.3l1.6 1.6M18.2 10.3l-1.6 1.6M3.5 14.5h2.2M18.3 14.5h2.2"/><path d="M9.5 21h5"/>',
  hours: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
  nonexp: '<path d="M8.2 8.5a3.5 3.5 0 1 0 0 7c2.2 0 3.4-1.8 3.8-3.5.4-1.7 1.6-3.5 3.8-3.5a3.5 3.5 0 1 1 0 7c-2.2 0-3.4-1.8-3.8-3.5-.4-1.7-1.6-3.5-3.8-3.5z"/>',
  medical: '<path d="M6.5 3.5v4.5a3.5 3.5 0 0 0 7 0V3.5"/><path d="M10 11.5v2.5a4 4 0 0 0 8 0v-1.5"/><circle cx="18" cy="10.5" r="2"/><path d="M5.5 3.5h2M12.5 3.5h2"/>',
  sick: '<path d="M10 4.5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z"/><path d="M12 9v6.5"/><circle cx="12" cy="17" r="1.2" fill="currentColor"/>',
  chevron: '<path d="M7 10l5 5 5-5"/>',
  holiday: '<path d="M5.5 21V3.5"/><path d="M5.5 4.5h12l-2.5 4 2.5 4h-12"/>',
  other: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/>',
  // Menú
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.9 1.2-1.8-.5-1-.1-2.2 1.1-2.2H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
  today: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><circle cx="12" cy="15" r="1.6"/>',
  download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M4 17v1.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V17"/>',
  upload: '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5"/><path d="M4 17v1.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V17"/>',
  allow: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8.5 15h2M13.5 15h2"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  counter: '<circle cx="12" cy="12" r="8"/><path d="M12 4v8l5.5 3"/><path d="M8 20.5h8"/>',
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
document.getElementById('app-version').textContent = `Versión ${APP_VERSION}`;

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

// Días de vacaciones y de libre disposición: por defecto 21 y 4 al año; se pueden cambiar en años concretos.
const ALLOW_DEFAULTS = { vacation: 21, off: 4 };
function cleanAllowances(a) {
  const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : d);
  const years = {};
  for (const [y, v] of Object.entries(a?.years || {})) {
    if (/^\d{4}$/.test(y)) years[y] = { vacation: num(v?.vacation, ALLOW_DEFAULTS.vacation), off: num(v?.off, ALLOW_DEFAULTS.off) };
  }
  return { vacation: num(a?.vacation, ALLOW_DEFAULTS.vacation), off: num(a?.off, ALLOW_DEFAULTS.off), years };
}
const stored = load(STORAGE_KEY, {});
// nonexp: días que no caducan ganados (se suman con el + del menú; se gastan al marcarlos)
const cleanNonexp = (n) => (Number.isFinite(Number(n)) && Number(n) > 0 ? Number(n) : 0);
let data = { days: cleanDays(stored.days), allowances: cleanAllowances(stored.allowances), nonexp: cleanNonexp(stored.nonexp) };
const allowance = (year, kind) => data.allowances.years[year]?.[kind] ?? data.allowances[kind];
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
  const s = { working: 0, tele: 0, off: 0, vacation: 0, vacprev: 0, hours: 0, nonexp: 0, holiday: 0, other: 0 };
  const start = new Date(year, quarter * 3, 1);
  const end = new Date(year, quarter * 3 + 3, 1);
  for (const d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    if (isWeekend(d)) continue;
    const state = effectiveState(dateKey(d.getFullYear(), d.getMonth(), d.getDate()));
    if (NON_WORKING.includes(state)) { s[state]++; continue; }
    // Medio día libre: la otra mitad es laborable (y en «mix», esa mitad es de teletrabajo)
    if (state === 'halfoff' || state === 'mix') {
      s.working += 0.5;
      if (state === 'mix') s.tele += 0.5;
      continue;
    }
    s.working++;
    if (state === 'tele') s.tele += 1;
    else if (state === 'half') s.tele += 0.5;
    else if (WORKING_OTHER.includes(state)) s.other++;
  }
  s.allowedExact = s.working * RATIO;
  s.working = Math.round(s.working * 2) / 2;
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

  $('s-working').textContent = fmt(s.working);
  $('s-allowed').textContent = fmt(s.allowed);
  $('s-tele').textContent = fmt(s.tele);
  renderPending(view.year, view.quarter);
}

// Días pendientes de consumir en el año del trimestre que se ve:
// · Vacaciones del año: allowance − vacaciones del año − «año anterior» usadas el año siguiente.
// · Vacaciones año anterior: lo que quedó del año pasado; se pueden gastar hasta el 30 de junio.
// · Libre disposición: allowance − libres (los medios días cuentan la mitad); caducan el 31 de diciembre.
function balances(year) {
  const used = { vacation: {}, vacprev: {}, off: {} };
  let nonexpUsed = 0;
  const add = (k, y, n) => { used[k][y] = (used[k][y] || 0) + n; };
  for (const [key, st] of Object.entries(data.days)) {
    const y = key.slice(0, 4);
    if (st === 'vacation') add('vacation', y, 1);
    else if (st === 'vacprev') add('vacprev', y, 1);
    else if (st === 'off') add('off', y, 1);
    else if (st === 'halfoff' || st === 'mix') add('off', y, 0.5);
    else if (st === 'nonexp') nonexpUsed++;
  }
  const vacLeft = (y) => allowance(y, 'vacation') - (used.vacation[y] || 0) - (used.vacprev[String(Number(y) + 1)] || 0);
  const y = String(year);
  return {
    vacation: vacLeft(y),
    prev: vacLeft(String(year - 1)),
    off: allowance(y, 'off') - (used.off[y] || 0),
    nonexp: data.nonexp - nonexpUsed, // no caducan: cuentan todos los años
    nonexpUsed,
  };
}

function renderPending(year, quarter) {
  const b = balances(year);
  $('pend-year').textContent = year;
  const put = (id, v, text) => {
    const el = $(id);
    el.textContent = text ?? fmt(v);
    el.classList.toggle('neg', v < 0);
  };
  put('p-vac', b.vacation);
  put('p-off', b.off);
  put('p-nonexp', b.nonexp);
  $('p-nonexp').title = `${fmt(data.nonexp)} ganados · ${fmt(b.nonexpUsed)} usados`;
  // Las del año anterior caducan el 30 de junio: en el 2.º semestre ya no se pueden usar
  if (quarter >= 2) put('p-prev', 0, b.prev > 0 ? 'Caducadas' : '0');
  else put('p-prev', b.prev);
  $('p-vac').title = `${allowance(String(year), 'vacation')} días al año`;
  $('p-off').title = `${allowance(String(year), 'off')} días al año`;
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
  const cur = effectiveState(key);
  let next;
  if ((brush === 'half' && cur === 'halfoff') || (brush === 'halfoff' && cur === 'half')) next = 'mix';
  else if (cur === 'mix' && (brush === 'half' || brush === 'halfoff')) next = brush === 'half' ? 'halfoff' : 'half'; // quita esa mitad
  else next = cur === brush ? null : brush; // tocar un día con el mismo tipo lo desmarca
  if (next) data.days[key] = next;
  else delete data.days[key];
  persist();
  render();
});

// Cada grupo muestra en su botón la opción elegida (por defecto, la que da nombre al grupo)
const groupChoice = Object.fromEntries(Object.entries(GROUPS).map(([g, ks]) => [g, ks.includes(g) ? g : ks[0]]));
const brushInner = (key) => `<span class="brush-icon">${icon(key, 18)}</span><span class="brush-label">${STATES[key].label}</span>`;
const groupBtnInner = (key) => `${brushInner(key)}<span class="brush-more">${icon('chevron', 14)}</span>`;
const seenGroups = new Set();
$('brushes').innerHTML = Object.entries(STATES).filter(([, s]) => !s.combo).map(([key, s]) => {
  if (!s.group) return `<button class="brush ${key}" type="button" data-brush="${key}">${brushInner(key)}</button>`;
  if (seenGroups.has(s.group)) return '';
  seenGroups.add(s.group);
  const show = groupChoice[s.group];
  return `<button class="brush group-btn ${show}" type="button" data-group="${s.group}" aria-haspopup="menu">${groupBtnInner(show)}</button>`;
}).join('');

function setBrush(key) {
  brush = key;
  const g = STATES[key].group;
  if (g) {
    groupChoice[g] = key;
    const btn = document.querySelector(`.group-btn[data-group="${g}"]`);
    btn.className = `brush group-btn ${key}`;
    btn.innerHTML = groupBtnInner(key);
  }
  document.querySelectorAll('.brush').forEach((b) => b.classList.toggle('active', b.dataset.brush === key || (!!g && b.dataset.group === g)));
}

function openGroupMenu(btn) {
  closeGroupMenu();
  const pop = document.createElement('div');
  pop.className = 'menu group-menu';
  pop.setAttribute('role', 'menu');
  pop.innerHTML = GROUPS[btn.dataset.group].map((k) => `
    <button class="menu-item ${k} ${brush === k ? 'on' : ''}" role="menuitem" data-k="${k}">${icon(k, 20)}<span>${STATES[k].label}</span></button>`).join('');
  document.body.append(pop);
  // Bajo el botón y siempre dentro de la pantalla (los botones de la izquierda lo empujarían fuera)
  const r = btn.getBoundingClientRect();
  const w = pop.offsetWidth;
  const h = pop.offsetHeight;
  const left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
  const below = r.bottom + 6 + h <= window.innerHeight - 8;
  pop.style.left = `${Math.max(8, left)}px`;
  pop.style.right = 'auto';
  pop.style.top = `${below ? r.bottom + 6 : Math.max(8, r.top - h - 6)}px`;
  pop.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => {
    setBrush(b.dataset.k);
    closeGroupMenu();
  }));
}
const closeGroupMenu = () => document.querySelector('.group-menu')?.remove();

$('brushes').addEventListener('click', (e) => {
  const btn = e.target.closest('button.brush');
  if (!btn) return;
  if (btn.dataset.group) {
    e.stopPropagation();
    return document.querySelector('.group-menu') ? closeGroupMenu() : openGroupMenu(btn);
  }
  setBrush(btn.dataset.brush);
});
document.addEventListener('click', (e) => { if (!e.target.closest('.group-menu')) closeGroupMenu(); });
window.addEventListener('scroll', closeGroupMenu, { passive: true });
setBrush(brush);

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
  { label: 'Ir al trimestre actual', icon: 'today', run: () => goToday() },
  { label: 'Días de vacaciones y libre', icon: 'allow', run: () => openAllowanceSheet() },
  { label: 'Días que no caducan', icon: 'nonexp', run: () => openNonexpSheet() },
  { label: 'Opciones de visualización', icon: 'palette', run: () => openDisplaySheet() },
  { label: 'Exportar calendario', icon: 'download', run: () => exportCalendar() },
  { label: 'Importar calendario', icon: 'upload', run: () => $('import-input').click() },
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

// ---------- Exportar / importar calendario (texto plano) ----------
// Una línea por día marcado: «AAAA-MM-DD<tab>Tipo». Las líneas con # son comentarios.

function calendarText() {
  const keys = Object.keys(data.days).sort();
  const lines = [
    '# Up to 40% · calendario de teletrabajo',
    `# Exportado el ${new Date().toLocaleDateString('es-ES')}`,
    '# Formato: fecha (AAAA-MM-DD) y tipo, separados por un tabulador.',
    `# Tipos: ${Object.values(STATES).map((s) => s.label).join(', ')}.`,
    '# Los festivos nacionales se marcan solos y no hace falta incluirlos.',
    '',
    '# Días de vacaciones y libre disposición al año (por defecto y años concretos)',
    `DIAS\tdefecto\tvacaciones=${data.allowances.vacation}\tlibre=${data.allowances.off}`,
    ...Object.entries(data.allowances.years).sort().map(([y, v]) => `DIAS\t${y}\tvacaciones=${v.vacation}\tlibre=${v.off}`),
    '# Días que no caducan ganados',
    `NOCADUCAN\t${data.nonexp}`,
  ];
  let section = '';
  for (const key of keys) {
    const q = `Q${Math.floor((Number(key.slice(5, 7)) - 1) / 3) + 1} ${key.slice(0, 4)}`;
    if (q !== section) {
      section = q;
      lines.push('', `# ${q}`);
    }
    lines.push(`${key}\t${STATES[data.days[key]].label}`);
  }
  return lines.join('\n') + '\n';
}

async function exportCalendar() {
  const name = `up-to-40-calendario-${todayKey()}.txt`;
  const file = new File([calendarText()], name, { type: 'text/plain' });
  // En el móvil, el menú Compartir permite «Guardar en Archivos» o enviarlo
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Calendario Up to 40%' });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Acepta la etiqueta («Medio día teletrabajo») o la clave interna («half»), sin distinguir mayúsculas ni tildes
const normalize = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
const STATE_BY_NAME = {
  ...Object.fromEntries(Object.entries(STATES).flatMap(([k, s]) => [[normalize(s.label), k], [k, k]])),
  libre: 'off', // copias anteriores a «Libre disposición»
};

function parseCalendar(text) {
  // Copias antiguas en JSON
  if (text.trim().startsWith('{')) {
    const obj = JSON.parse(text);
    return { days: cleanDays(obj.days), allowances: obj.allowances ? cleanAllowances(obj.allowances) : null, nonexp: obj.nonexp != null ? cleanNonexp(obj.nonexp) : null };
  }
  const days = {};
  let allowances = null;
  let nonexp = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const n = line.match(/^NOCADUCAN\s+([\d.,]+)/i);
    if (n) { nonexp = cleanNonexp(n[1].replace(',', '.')); continue; }
    const a = line.match(/^DIAS\s+(defecto|\d{4})\s+vacaciones=([\d.,]+)\s+libre=([\d.,]+)/i);
    if (a) {
      allowances ??= { years: {} };
      const v = { vacation: Number(a[2].replace(',', '.')), off: Number(a[3].replace(',', '.')) };
      if (a[1].toLowerCase() === 'defecto') Object.assign(allowances, v);
      else allowances.years[a[1]] = v;
      continue;
    }
    const m = line.match(/^(\d{4}-\d{2}-\d{2})[\s\t;,|·-]+(.+)$/);
    const state = m && STATE_BY_NAME[normalize(m[2])];
    if (state) days[m[1]] = state;
  }
  return { days, allowances: allowances ? cleanAllowances(allowances) : null, nonexp };
}

$('import-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const { days, allowances, nonexp } = parseCalendar(await file.text());
    const count = Object.keys(days).length;
    if (!count) throw new Error('vacío');
    if (!confirm(`Se importarán ${count} días y se sustituirá el calendario actual de este dispositivo. ¿Continuar?`)) return;
    data = { days, allowances: allowances ?? data.allowances, nonexp: nonexp ?? data.nonexp };
    persist();
    render();
    toast(`Calendario importado (${count} días)`);
  } catch (_) {
    alert('El archivo no contiene un calendario válido.');
  } finally {
    e.target.value = '';
  }
});

// ---------- Opciones de visualización (modo y fondo) ----------

const WALLS = {
  glaciar: { name: 'Glaciar', c: ['96 165 250', '186 230 253', '56 189 248', '37 99 235'] },
  coral: { name: 'Coral', c: ['248 113 113', '253 164 175', '251 146 60', '244 63 94'] },
  menta: { name: 'Menta', c: ['52 211 153', '134 239 172', '45 212 191', '22 163 74'] },
  ambar: { name: 'Ámbar', c: ['251 191 36', '253 224 71', '251 146 60', '217 119 6'] },
};
const lightQuery = matchMedia('(prefers-color-scheme: light)');
let display = { theme: 'auto', wall: 'glaciar', ...load(DISPLAY_KEY, {}) };
if (!WALLS[display.wall]) display.wall = 'glaciar'; // fondos que ya no existen

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

// ---------- Días de vacaciones y libre disposición por año (menú ⋯) ----------

function openAllowanceSheet() {
  closeSheet();
  const back = document.createElement('div');
  back.className = 'sheet-backdrop';
  document.body.append(back);
  back.addEventListener('click', (e) => { if (e.target === back) closeSheet(); });
  const changed = () => { persist(); render(); };

  const draw = () => {
    const a = data.allowances;
    const years = Object.keys(a.years).sort();
    back.innerHTML = `
      <div class="sheet alw-sheet" role="dialog" aria-modal="true" aria-label="Días de vacaciones y libre">
        <h2 class="sheet-title">Días de vacaciones y libre</h2>
        <p class="muted small">Las vacaciones se gastan hasta el 30 de junio del año siguiente; los días de libre disposición caducan el 31 de diciembre.</p>
        <p class="opt-label">Cada año</p>
        <div class="alw-grid">
          <label class="alw-field"><span>Vacaciones</span><input class="a-vac" type="text" inputmode="decimal" value="${fmt(a.vacation)}"></label>
          <label class="alw-field"><span>Libre disposición</span><input class="a-off" type="text" inputmode="decimal" value="${fmt(a.off)}"></label>
        </div>
        <p class="opt-label">Años con otros días</p>
        ${years.length ? `<div class="alw-years">${years.map((y) => `
          <div class="alw-year" data-y="${y}">
            <span class="alw-y">${y}</span>
            <label class="alw-field"><span>Vacaciones</span><input class="y-vac" type="text" inputmode="decimal" value="${fmt(a.years[y].vacation)}"></label>
            <label class="alw-field"><span>Libre</span><input class="y-off" type="text" inputmode="decimal" value="${fmt(a.years[y].off)}"></label>
            <button class="alw-del" type="button" aria-label="Quitar ${y}">${icon('other', 18).replace('M12 8v8M8 12h8', 'M8 12h8')}</button>
          </div>`).join('')}</div>` : '<p class="muted small">Ninguno: todos los años usan los días de arriba.</p>'}
        <div class="alw-add">
          <input class="a-year" type="text" inputmode="numeric" maxlength="4" placeholder="Año" value="${String(view.year)}" aria-label="Año">
          <button class="text-btn a-add" type="button">${icon('allow', 16)} Añadir año</button>
        </div>
        <div class="body-actions"><button class="done-btn" type="button">Listo</button></div>
      </div>`;
    const num = (v) => { const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) && n >= 0 ? n : null; };
    back.querySelector('.a-vac').addEventListener('input', (e) => { const n = num(e.target.value); if (n != null) { a.vacation = n; changed(); } });
    back.querySelector('.a-off').addEventListener('input', (e) => { const n = num(e.target.value); if (n != null) { a.off = n; changed(); } });
    back.querySelectorAll('.alw-year').forEach((row) => {
      const y = row.dataset.y;
      row.querySelector('.y-vac').addEventListener('input', (e) => { const n = num(e.target.value); if (n != null) { a.years[y].vacation = n; changed(); } });
      row.querySelector('.y-off').addEventListener('input', (e) => { const n = num(e.target.value); if (n != null) { a.years[y].off = n; changed(); } });
      row.querySelector('.alw-del').addEventListener('click', () => { delete a.years[y]; changed(); draw(); });
    });
    back.querySelector('.a-add').addEventListener('click', () => {
      const y = back.querySelector('.a-year').value.trim();
      if (!/^\d{4}$/.test(y)) return toast('Escribe un año de cuatro cifras.');
      if (!a.years[y]) a.years[y] = { vacation: a.vacation, off: a.off };
      changed();
      draw();
      back.querySelector(`.alw-year[data-y="${y}"] .y-vac`)?.focus();
    });
    back.querySelectorAll('input').forEach((i) => i.addEventListener('focus', () => i.select()));
    back.querySelector('.done-btn').addEventListener('click', closeSheet);
  };
  draw();
}

// ---------- Días que no caducan (menú ⋯) ----------
// Se ganan de forma puntual: aquí se suman con +; se gastan al marcarlos en el calendario.
function openNonexpSheet() {
  closeSheet();
  const back = document.createElement('div');
  back.className = 'sheet-backdrop';
  document.body.append(back);
  back.addEventListener('click', (e) => { if (e.target === back) closeSheet(); });
  const draw = () => {
    const b = balances(view.year);
    back.innerHTML = `
      <div class="sheet nx-sheet" role="dialog" aria-modal="true" aria-label="Días que no caducan">
        <h2 class="sheet-title">Días que no caducan</h2>
        <p class="muted small">Súmalos cada vez que te den uno. Se gastan al marcarlos en el calendario con «Otros» → «Días que no caducan», y no caducan nunca.</p>
        <div class="nx-counter">
          <button class="nx-btn nx-minus" type="button" aria-label="Quitar uno" ${data.nonexp <= 0 ? 'disabled' : ''}>−</button>
          <div class="nx-value"><span class="nx-num">${fmt(data.nonexp)}</span><span class="nx-cap">días ganados</span></div>
          <button class="nx-btn nx-plus" type="button" aria-label="Añadir uno">+</button>
        </div>
        <dl class="nx-stats">
          <div><dt>Usados</dt><dd>${fmt(b.nonexpUsed)}</dd></div>
          <div><dt>Disponibles</dt><dd class="${b.nonexp < 0 ? 'neg' : ''}">${fmt(b.nonexp)}</dd></div>
        </dl>
        <div class="body-actions"><button class="done-btn" type="button">Listo</button></div>
      </div>`;
    const change = (d) => { data.nonexp = Math.max(0, data.nonexp + d); persist(); render(); draw(); };
    back.querySelector('.nx-plus').addEventListener('click', () => change(1));
    back.querySelector('.nx-minus').addEventListener('click', () => change(-1));
    back.querySelector('.done-btn').addEventListener('click', closeSheet);
  };
  draw();
}

// ---------- Aviso de novedades (al abrir la app tras una actualización) ----------
// Sale en cada apertura hasta que se marca «No volver a mostrar»; la siguiente versión vuelve a avisar.
const SEEN_KEY = 'teletrabajo:seenVersion';
const CHANGELOG = {
  '1.1.0': [
    ['halfoff', 'Medio día libre', 'Consume medio día de libre disposición y medio laborable. Se puede combinar con medio día de teletrabajo en el mismo día.'],
    ['vacprev', 'Vacaciones año anterior', 'Para gastar, hasta el 30 de junio, las vacaciones que te quedaron del año pasado.'],
    ['hours', 'Días con horas', 'No cuentan como laborables, igual que las vacaciones.'],
    ['nonexp', 'Días que no caducan', 'Los días que ganas se suman con el + del menú ⋯ y se gastan al marcarlos. No cuentan como laborables y nunca caducan.'],
    ['other', 'Botón «Otros» ampliado', 'Al pulsarlo eliges entre Días que no caducan, Médico, Bajas u Otros. Médico, Bajas y Otros cuentan como laborables.'],
    ['half', 'Seis botones agrupados', 'Teletrabajo, Libre disposición, Vacaciones y Otros abren un menú con sus variantes (medio día, año anterior…). El botón muestra la que tengas elegida.'],
    ['off', '«Libre» pasa a «Libre disposición»', 'Es el mismo día libre de antes, con un nombre más preciso.'],
    ['counter', 'Días pendientes', 'El resumen muestra los días que te quedan de vacaciones, del año anterior, de libre disposición y los que no caducan.'],
    ['allow', 'Días por año', 'En el menú ⋯ puedes cambiar los días de vacaciones (21) y de libre disposición (4), también para años concretos.'],
  ],
};

function maybeShowUpdates(next = () => {}) {
  const notes = CHANGELOG[APP_VERSION];
  const seen = load(SEEN_KEY, null);
  if (!notes || seen === APP_VERSION) return next();
  // Instalación nueva (sin nada apuntado): no hay novedades que contar
  if (seen == null && !Object.keys(data.days).length) {
    save(SEEN_KEY, APP_VERSION);
    return next();
  }
  const back = document.createElement('div');
  back.className = 'whatsnew-backdrop';
  back.innerHTML = `
    <div class="whatsnew" role="dialog" aria-modal="true" aria-labelledby="wn-title">
      <div class="wn-hero">
        <span class="wn-spark">${icon('sparkle', 40)}</span>
        <h2 id="wn-title">¡Nueva versión!</h2>
        <span class="wn-pill">Versión ${APP_VERSION}</span>
      </div>
      <ul class="wn-list">${notes.map(([ic, title, text]) => `
        <li class="${ic}"><span class="wn-icon">${icon(ic, 20)}</span><span><b>${title}</b><span>${text}</span></span></li>`).join('')}
      </ul>
      <div class="wn-footer">
        <label class="no-more"><input type="checkbox" id="wn-no-more"> No volver a mostrar</label>
        <button class="done-btn" type="button" id="wn-ok">Aceptar</button>
      </div>
    </div>`;
  document.body.append(back);
  back.querySelector('#wn-ok').addEventListener('click', () => {
    if (back.querySelector('#wn-no-more').checked) save(SEEN_KEY, APP_VERSION);
    back.classList.add('closing');
    setTimeout(() => { back.remove(); next(); }, 220);
  });
}

// ---------- Pantalla de inicio ----------

$('enter-btn').addEventListener('click', () => {
  const body = document.body;
  if (body.classList.contains('entering')) return;
  body.classList.add('entering');
  setTimeout(() => {
    $('splash').remove();
    body.classList.remove('booting', 'entering');
    maybeShowUpdates(maybeShowInstallHint);
  }, 820);
});

// ---------- Aviso: añadir a la pantalla de inicio (solo móvil y tablet) ----------

const INSTALL_HINT_KEY = 'teletrabajo:installHint';
const ua = navigator.userAgent;
// El iPad con iPadOS se identifica como Mac, pero tiene pantalla táctil
const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
const isAndroid = /Android/.test(ua);
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

const HINT_ICONS = {
  share: '<path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M7 10.5H6a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5h-1"/>',
  more: '<circle cx="12" cy="5.5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="18.5" r="1.5" fill="currentColor"/>',
  add: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M12 8.5v7M8.5 12h7"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
};
const hintIcon = (name) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${HINT_ICONS[name]}</svg>`;

function maybeShowInstallHint() {
  // Escritorio, app ya abierta desde la pantalla de inicio o «No mostrar más» marcado: no se muestra
  if (!(isIOS || isAndroid) || isStandalone()) return;
  if (load(INSTALL_HINT_KEY, null) === 'off') return;

  const steps = isIOS
    ? [
        ['share', 'Pulsa el botón <b>Compartir</b> de Safari (abajo en el iPhone, arriba en el iPad).'],
        ['add', 'Desliza hacia abajo y elige <b>Añadir a pantalla de inicio</b>.'],
        ['check', 'Pulsa <b>Añadir</b>. El icono de Up to 40% aparecerá junto a tus apps.'],
      ]
    : [
        ['more', 'Pulsa el menú <b>⋮</b> de Chrome, arriba a la derecha.'],
        ['add', 'Elige <b>Añadir a pantalla de inicio</b> o <b>Instalar aplicación</b>.'],
        ['check', 'Confirma con <b>Instalar</b>. El icono de Up to 40% aparecerá junto a tus apps.'],
      ];

  closeSheet();
  const back = document.createElement('div');
  back.className = 'sheet-backdrop center';
  back.innerHTML = `
    <div class="sheet install-sheet" role="dialog" aria-modal="true" aria-labelledby="install-title">
      <span class="install-logo">${logoSVG(56)}</span>
      <h2 class="sheet-title" id="install-title">Añade Up to 40% a tu pantalla de inicio</h2>
      <p class="muted small">Así la abrirás como una app más, a pantalla completa y con un solo toque.</p>
      <ol class="install-steps">
        ${steps.map(([ic, text]) => `<li><span class="step-icon">${hintIcon(ic)}</span><span>${text}</span></li>`).join('')}
      </ol>
      <div class="install-footer">
        <label class="no-more"><input type="checkbox" id="install-no-more" /> No mostrar más</label>
        <button class="done-btn" type="button" id="install-ok">Aceptar</button>
      </div>
    </div>`;
  document.body.append(back);
  back.querySelector('#install-ok').addEventListener('click', () => {
    if (back.querySelector('#install-no-more').checked) save(INSTALL_HINT_KEY, 'off');
    closeSheet();
  });
}

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
