'use strict';
/* =====================================================================
   PM Hub — app.js
   Web estática (GitHub Pages) + proxy Cloudflare Worker (Zendesk, Slack, IA)
   ===================================================================== */

/* ---------- utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const pad = n => String(n).padStart(2, '0');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const trunc = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const isoDay = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isoLocal = d => `${isoDay(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const parseDue = v => v ? new Date(v.length <= 10 ? v + 'T23:59:00' : v) : null;
const fmtDue = v => {
  if (!v) return '—';
  const d = new Date(v.length <= 10 ? v + 'T00:00:00' : v);
  return v.length <= 10 ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}` : `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fmtTS = v => {
  const d = new Date(v); if (isNaN(d)) return '';
  const hoy = isoDay(d) === isoDay(new Date());
  return (hoy ? 'hoy' : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`) + ` ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const ago = v => {
  const m = Math.round((Date.now() - new Date(v)) / 60000);
  if (isNaN(m)) return '';
  if (m < 1) return 'ahora'; if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60); if (h < 48) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
};
const clock = ms => { const s = Math.floor(ms / 1000); return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; };
const initials = n => String(n || '?').split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();

/* ---------- iconos ---------- */
const ICONS = {
  layout: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
  check: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  table: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>',
  archive: '<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  chev: '<polyline points="6 9 12 15 18 9"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  mic: '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>',
  spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  ext: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
  hash: '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1"/>',
  mail: '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><polyline points="22,6 12,13 2,6"/>',
  up: '<polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  down: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
};
const ic = (n, s = 16) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ''}</svg>`;

/* ---------- constantes ---------- */
const TYPES = { pry: 'Proyecto', evo: 'Evolutivo', dt: 'Deuda técnica' };
const STATUSES = ['En Inference', 'Esperando cliente', 'Esperando proveedor', 'En pruebas', 'En espera', 'Bloqueado', 'Cerrado'];
const OWN = { cliente: 'Cliente', inference: 'Inference' };
const TPL_VARS = ['ticket', 'asunto', 'cliente', 'contacto', 'estado', 'resumen', 'siguientes_pasos', 'pendientes_cliente', 'pendientes_inference', 'minuta', 'proxima_reunion', 'fecha', 'yo'];

function defaultTemplates() {
  return [
    { id: 'tp_update', name: 'Update de estado', body: 'Hola {{contacto}},\n\nTe comparto el estado del ticket #{{ticket}} – {{asunto}}:\n\nEstado actual: {{estado}}\n{{resumen}}\n\nPendientes de Inference:\n{{pendientes_inference}}\n\nPendientes del cliente:\n{{pendientes_cliente}}\n\nPróximos pasos:\n{{siguientes_pasos}}\n\nQuedo atento a tus comentarios.\n\nSaludos,\n{{yo}}' },
    { id: 'tp_next', name: 'Solicitar siguientes pasos / información', body: 'Hola {{contacto}},\n\nPara poder avanzar con el ticket #{{ticket}} – {{asunto}} necesitamos lo siguiente de tu parte:\n\n{{pendientes_cliente}}\n\nCon esa información podremos continuar con:\n{{siguientes_pasos}}\n\nQuedo atento a tus comentarios.\n\nSaludos,\n{{yo}}' },
    { id: 'tp_remind', name: 'Recordatorio de pendientes al cliente', body: 'Hola {{contacto}},\n\nTe escribo para dar seguimiento al ticket #{{ticket}} – {{asunto}}. Seguimos a la espera de:\n\n{{pendientes_cliente}}\n\nAvísame si necesitas apoyo o una reunión para destrabarlo.\n\nSaludos,\n{{yo}}' },
    { id: 'tp_minuta', name: 'Minuta de reunión', body: 'Hola {{contacto}},\n\nGracias por la reunión de hoy ({{fecha}}). Te comparto lo conversado sobre el ticket #{{ticket}} – {{asunto}}:\n\n{{minuta}}\n\nPendientes del cliente:\n{{pendientes_cliente}}\n\nPendientes de Inference:\n{{pendientes_inference}}\n\nPróxima reunión: {{proxima_reunion}}\n\nQuedo atento a tus comentarios.\n\nSaludos,\n{{yo}}' },
    { id: 'tp_close', name: 'Cierre de ticket', body: 'Hola {{contacto}},\n\nDamos por concluido el ticket #{{ticket}} – {{asunto}}.\n\nResumen:\n{{resumen}}\n\nSi detectas algo adicional, puedes responder a este correo y lo retomamos.\n\nSaludos,\n{{yo}}' },
  ];
}

/* ---------- estado persistente ---------- */
const LS = 'pm_state_v1', LC = 'pm_cache_v1';
function defaults() {
  return {
    settings: {
      workerUrl: '', appKey: '', pollSec: 60, slackPollSec: 120,
      keywords: 'evolutivo, deuda técnica, proyecto', internalDomains: 'inferencelabs9.com',
      myName: '', dailyTime: '17:30', staleDays: 2, leadMin: 60, replyHours: 4,
      notif: true, includeSolved: false, syncKV: false,
    },
    folders: [{ id: 'f1', name: 'Mis dashboards', open: true, dashboards: [{ id: 'd1', name: 'Pendientes de respuesta', filters: { types: [], q: '', status: '', client: '', owner: '', slack: '', attention: true } }] }],
    tickets: {}, archive: [], notifications: [], notified: {}, templates: defaultTemplates(), lastDaily: '', lastSync: 0,
  };
}
const loadJSON = (k, def) => { try { const v = JSON.parse(localStorage.getItem(k)); return v || def; } catch { return def; } };
let S = (() => { const d = defaults(), s = loadJSON(LS, null); return s ? { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}) } } : d; })();
let C = { forms: [], fields: [], users: {}, comments: {}, slack: {}, channels: [], workspaceUrl: '', base: '', health: null, ...loadJSON(LC, {}) };

let saveT = null;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) { console.warn(e); }
    try { localStorage.setItem(LC, JSON.stringify(C)); }
    catch (e) {
      for (const k in C.comments) C.comments[k] = C.comments[k].slice(-12);
      for (const k in C.slack) C.slack[k] = C.slack[k].slice(-25);
      try { localStorage.setItem(LC, JSON.stringify(C)); } catch { }
    }
    kvSoon();
  }, 300);
}

/* ---------- API (Worker) ---------- */
const configured = () => !!(S.settings.workerUrl && S.settings.appKey);
async function api(path, opts = {}) {
  const s = S.settings;
  if (!configured()) throw new Error('Configura la URL del Worker y la clave en Ajustes');
  const r = await fetch(s.workerUrl.replace(/\/+$/, '') + path, { ...opts, headers: { 'x-app-key': s.appKey, ...(opts.headers || {}) } });
  const txt = await r.text();
  let j; try { j = JSON.parse(txt); } catch { j = { raw: txt }; }
  if (!r.ok) { const e = new Error(j.error || j.msg || txt.slice(0, 200) || ('HTTP ' + r.status)); e.status = r.status; e.retry = j.retry_after; throw e; }
  return j;
}
async function ai(system, user, { json = true, tries = 3 } = {}) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await api('/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ system, user, json }) });
      return r.text;
    } catch (e) {
      if (e.status === 429 && i < tries - 1) { const w = Math.min(60, e.retry || 20); toast(`IA gratuita al límite, reintentando en ${w}s…`); await sleep(w * 1000); continue; }
      throw e;
    }
  }
}
function parseJSON(txt) {
  try { return JSON.parse(txt); } catch { }
  const m = String(txt).match(/\{[\s\S]*\}/);
  if (m) return JSON.parse(m[0]);
  throw new Error('La IA no devolvió JSON válido');
}

/* ---------- sincronización opcional con KV ---------- */
let kvT = null;
const KV_KEYS = ['folders', 'tickets', 'archive', 'templates', 'notified', 'lastDaily'];
function kvSoon() { if (!S.settings.syncKV || !configured()) return; clearTimeout(kvT); kvT = setTimeout(kvPush, 120000); }
async function kvPush(manual) {
  try {
    const o = {}; KV_KEYS.forEach(k => o[k] = S[k]);
    await api('/state', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(o) });
    if (manual) toast('Datos subidos a la nube (KV)');
  } catch (e) { toast('KV: ' + e.message, 'err'); }
}
async function kvPull() {
  try {
    const o = await api('/state');
    if (!o || !o.tickets) return toast('No hay datos guardados en KV', 'err');
    KV_KEYS.forEach(k => { if (o[k] !== undefined) S[k] = o[k]; });
    save(); render(); toast('Datos descargados de KV');
  } catch (e) { toast('KV: ' + e.message, 'err'); }
}

/* ---------- parsing de Zendesk ---------- */
function typeOf(form, subj) {
  const f = norm(form), s = norm(subj);
  if (f.includes('evolutiv')) return 'evo';
  if (f.includes('deuda')) return 'dt';
  if (f.includes('proyecto')) return 'pry';
  if (/^\s*\[evolutiv/.test(s)) return 'evo';
  if (/^\s*\[deuda/.test(s)) return 'dt';
  return 'pry';
}
function cleanBody(t) {
  t = String(t || '').replace(/\r/g, '');
  const cut = t.search(/\n\s*(El .{5,160}(escribi[oó]|wrote)\s*:|On .{5,160}wrote:|-{3,}\s*(Original|Mensaje original|Forwarded)|De:\s.+\n\s*(Enviado|Fecha|Sent):|_{8,})/i);
  if (cut > 20) t = t.slice(0, cut);
  t = t.split('\n').filter(l => !/^\s*>/.test(l)).join('\n');
  return t.replace(/\n{3,}/g, '\n\n').trim().slice(0, 3500);
}
function sideOf(u) {
  if (!u) return 'cliente';
  if (u.role && u.role !== 'end-user') return 'inference';
  const dom = String(u.email || '').split('@')[1] || '';
  const internos = S.settings.internalDomains.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return internos.includes(dom.toLowerCase()) ? 'inference' : 'cliente';
}
function mapComment(c, users) {
  const u = users[c.author_id];
  return { id: c.id, side: sideOf(u), author: (u && u.name) || 'Desconocido', public: c.public !== false, at: c.created_at, body: cleanBody(c.body), att: c.attachments || [] };
}
function fieldDef(id) { return C.fields.find(f => f.id === id); }
function fieldLabel(f, val) {
  if (!f) return String(val);
  const o = (f.options || []).find(o => o.value === val);
  return o ? o.name : String(val);
}
function clientFrom(z) {
  const f = C.fields.find(f => /^cliente\b/.test(norm(f.title)));
  if (!f) return '';
  const v = (z.custom_fields || []).find(c => c.id === f.id);
  return v && v.value ? fieldLabel(f, v.value) : '';
}
function zdFields(t) {
  return (t.fields || []).filter(c => c.value !== null && c.value !== '' && c.value !== false && !(Array.isArray(c.value) && !c.value.length))
    .map(c => { const f = fieldDef(c.id); return { title: f ? f.title : String(c.id), value: Array.isArray(c.value) ? c.value.join(', ') : fieldLabel(f, c.value) }; });
}

/* ---------- parsing de Slack ---------- */
function parseChan(name) {
  const m = String(name).match(/^(pry|evo|dt)-(?:(\d+)-)?([^-]+)(?:-(.*))?$/i);
  if (!m) return null;
  return { type: m[1].toLowerCase(), num: m[2] || '', client: m[3], desc: (m[4] || '').replace(/-/g, ' ') };
}
function slackText(txt, users) {
  return String(txt || '')
    .replace(/<@([UW][A-Z0-9]+)(?:\|[^>]*)?>/g, (_, id) => '@' + (users[id] || id))
    .replace(/<!(channel|here|everyone)>/g, '@$1').replace(/<!subteam\^[A-Z0-9]+\|?([^>]*)>/g, '@$1')
    .replace(/<#[A-Z0-9]+\|([^>]+)>/g, '#$1')
    .replace(/<(https?:[^|>]+)\|([^>]+)>/g, '$2 ($1)').replace(/<(https?:[^>]+)>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
function autoLink() {
  for (const t of Object.values(S.tickets)) {
    if (t.slackId || t.slackManualOff) continue;
    const ch = C.channels.find(c => { const p = parseChan(c.name); return p && p.num === t.id; });
    if (ch) { t.slackId = ch.id; t.slackName = ch.name; t.slackAuto = true; }
  }
}
function slackSuggestions(t) {
  const used = new Set(Object.values(S.tickets).filter(x => x.id !== t.id && x.slackId).map(x => x.slackId));
  const cn = norm(t.client);
  const sc = c => { const p = parseChan(c.name) || {}; let s = 0; if (p.type === t.type) s += 1; if (p.client && cn.includes(norm(p.client))) s += 3; if (p.num === t.id) s += 9; if (!c.archived) s += 1; return s; };
  return C.channels.filter(c => !used.has(c.id)).sort((a, b) => sc(b) - sc(a));
}

/* ---------- estado derivado ---------- */
function derivedStatus(t) {
  if (t.zdClosed) return 'Cerrado';
  if (t.zdStatus === 'hold') return 'En espera';
  if (t.zdStatus === 'pending') return 'Esperando cliente';
  const c = (C.comments[t.id] || []).filter(c => c.public);
  const last = c[c.length - 1];
  if (!last) return 'En Inference';
  return last.side === 'cliente' ? 'En Inference' : 'Esperando cliente';
}
const statusOf = t => t.internal || derivedStatus(t);
function openSteps(t) { return (t.steps || []).filter(s => !s.done); }
function nextStep(t) {
  const a = openSteps(t);
  if (!a.length) return null;
  return a.slice().sort((x, y) => {
    if (!!x.due !== !!y.due) return x.due ? -1 : 1;
    if (x.due !== y.due) return String(x.due).localeCompare(String(y.due));
    return (x.type === 'siguiente' ? 0 : 1) - (y.type === 'siguiente' ? 0 : 1);
  })[0];
}
function lastPublic(t) { const c = (C.comments[t.id] || []).filter(c => c.public); return c[c.length - 1]; }
function clientWaiting(t) {
  const l = lastPublic(t);
  return !!l && l.side === 'cliente' && !t.zdClosed && (Date.now() - new Date(l.at)) > S.settings.replyHours * 3600e3;
}
function overdueCount(t) {
  const now = new Date();
  return openSteps(t).filter(s => s.due && parseDue(s.due) < now).length + (t.reminders || []).filter(r => !r.done && parseDue(r.due) < now).length;
}
const needsAttention = t => clientWaiting(t) || overdueCount(t) > 0 || t.readyToClose;
function lastActivity(t) {
  const sl = (C.slack[t.id] || []).slice(-1)[0];
  return Math.max(new Date(t.updatedAt || 0).getTime(), sl ? new Date(sl.at).getTime() : 0);
}

/* ---------- fechas dentro de mensajes ---------- */
const MONTHS = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
const WDAYS = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };
function detectDates(text, baseISO) {
  text = String(text || '');
  const base = baseISO ? new Date(baseISO) : new Date();
  const out = [], seen = new Set();
  const snipAt = (i, l) => text.slice(Math.max(0, i - 55), Math.min(text.length, i + l + 60)).replace(/\s+/g, ' ').trim();
  const timeAfter = (end) => {
    const m = text.slice(end, end + 28).match(/^\s*(?:,|-)?\s*(?:(a\s+las?|las?)\s+)?(\d{1,2})(?::(\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)?/i);
    if (!m || !(m[1] || m[3] || m[4])) return '';
    let h = +m[2], mi = m[3] ? +m[3] : 0; const ap = (m[4] || '').toLowerCase();
    if (ap.startsWith('p') && h < 12) h += 12; if (ap.startsWith('a') && h === 12) h = 0;
    return h > 23 || mi > 59 ? '' : `${pad(h)}:${pad(mi)}`;
  };
  const mk = (y, mo, d) => { let Y = y ? (+y < 100 ? 2000 + +y : +y) : base.getFullYear(); let dt = new Date(Y, mo - 1, d); if (!y && (base - dt) > 150 * 864e5) dt = new Date(Y + 1, mo - 1, d); return dt; };
  const add = (dt, time, idx, len) => {
    if (isNaN(dt)) return; const date = isoDay(dt), snip = snipAt(idx, len), k = date + '|' + time + '|' + snip.slice(0, 24);
    if (seen.has(k)) return; seen.add(k); out.push({ date, time, snip });
  };
  let m;
  const r1 = /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/g;
  while ((m = r1.exec(text))) {
    const d = +m[1], mo = +m[2]; if (d < 1 || d > 31 || mo < 1 || mo > 12) continue;
    if (m[3] && m[3].length === 4 && +m[3] < 2020) continue; if (m[3] && m[3].length === 3) continue;
    add(mk(m[3], mo, d), timeAfter(m.index + m[0].length), m.index, m[0].length);
  }
  const r2 = /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+(?:de|del)\s+(\d{4}))?/gi;
  while ((m = r2.exec(text))) { const d = +m[1]; if (d < 1 || d > 31) continue; add(mk(m[3], MONTHS[norm(m[2])], d), timeAfter(m.index + m[0].length), m.index, m[0].length); }
  const r3 = /\b(?:el|este|pr[oó]ximo|para el)\s+(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/gi;
  while ((m = r3.exec(text))) {
    const target = WDAYS[norm(m[1])]; let dt = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    do { dt.setDate(dt.getDate() + 1); } while (dt.getDay() !== target);
    add(dt, timeAfter(m.index + m[0].length), m.index, m[0].length);
  }
  const r4 = /(?<!la\s)\bma[ñn]ana\b/gi;
  while ((m = r4.exec(text))) { const dt = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1); add(dt, timeAfter(m.index + m[0].length), m.index, m[0].length); }
  return out;
}
function detectedFor(t) {
  const today = new Date(); today.setDate(today.getDate() - 1); const lim = isoDay(today);
  const items = [];
  (C.comments[t.id] || []).slice(-15).forEach(c => detectDates(c.body, c.at).forEach(d => items.push({ ...d, src: 'Zendesk', who: c.author, at: c.at })));
  (C.slack[t.id] || []).slice(-40).forEach(m => detectDates(m.text, m.at).forEach(d => items.push({ ...d, src: 'Slack', who: m.user, at: m.at })));
  return items.filter(i => i.date >= lim).map(i => ({ ...i, key: `${i.date}|${i.time}|${i.snip.slice(0, 28)}` }))
    .filter(i => !(t.converted || {})[i.key]).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 14);
}

/* ---------- alertas y notificaciones ---------- */
function alertOnce(key, tid, kind, text) {
  if (S.notified[key]) return;
  S.notified[key] = Date.now();
  S.notifications.unshift({ id: uid(), ts: Date.now(), tid: tid || '', kind, text, read: false });
  S.notifications = S.notifications.slice(0, 200);
  toast(text);
  if (S.settings.notif && 'Notification' in window && Notification.permission === 'granted') {
    try { new Notification('PM Hub', { body: text }); } catch { }
  }
  for (const k of Object.keys(S.notified)) if (Date.now() - S.notified[k] > 40 * 864e5) delete S.notified[k];
  save(); updateBell();
}
function dueAlerts(t, text, due, key, label) {
  const diff = (parseDue(due) - new Date()) / 60000;
  const tag = `#${t.id}`;
  if (diff < 0) alertOnce(key + ':over', t.id, 'vence', `${tag} · ${label} vencido (${fmtDue(due)}): ${trunc(text, 80)}`);
  else if (diff <= S.settings.leadMin) alertOnce(key + ':soon', t.id, 'vence', `${tag} · ${label} vence pronto (${fmtDue(due)}): ${trunc(text, 80)}`);
  else if (diff <= 1440) alertOnce(key + ':d1', t.id, 'vence', `${tag} · ${label} vence en menos de 24 h (${fmtDue(due)}): ${trunc(text, 80)}`);
}
function tick() {
  const now = new Date();
  for (const t of Object.values(S.tickets)) {
    if (t.readyToClose) alertOnce(`close:${t.id}`, t.id, 'cierre', `#${t.id} terminó (${t.zdClosed ? 'Zendesk cerrado' : 'canal de Slack archivado'}). Genera el resumen final y archívalo.`);
    (t.reminders || []).filter(r => !r.done && r.due).forEach(r => dueAlerts(t, r.text, r.due, 'rem:' + r.id, 'Recordatorio'));
    openSteps(t).filter(s => s.due).forEach(s => dueAlerts(t, s.text, s.due, 'step:' + s.id, s.type === 'pendiente' ? 'Pendiente' : 'Siguiente paso'));
    if (t.zdClosed) continue;
    const l = lastPublic(t);
    if (l && l.side === 'cliente' && clientWaiting(t)) alertOnce(`reply:${t.id}:${l.id}`, t.id, 'responder', `#${t.id} · el cliente escribió (${l.author}) y aún no hay respuesta de Inference`);
    if (l && l.side === 'inference' && statusOf(t) === 'Esperando cliente') {
      const days = (Date.now() - new Date(l.at)) / 864e5;
      if (days >= S.settings.staleDays) alertOnce(`stale:${t.id}:${l.id}:${Math.floor(days / S.settings.staleDays)}`, t.id, 'seguimiento', `#${t.id} · sin respuesta del cliente hace ${Math.floor(days)} día(s). Toca hacer seguimiento.`);
    }
  }
  const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  if (S.lastDaily !== isoDay(now) && hhmm >= S.settings.dailyTime && Object.keys(S.tickets).length) {
    S.lastDaily = isoDay(now);
    alertOnce('daily:' + isoDay(now), '', 'daily', 'Tu update del día está listo (menú «Update del día»).');
  }
  updateBell();
}
function updateBell() {
  const n = S.notifications.filter(a => !a.read).length;
  const el = $('#bellCount'); if (el) { el.textContent = n; el.style.display = n ? '' : 'none'; }
}

/* ---------- sincronización Zendesk ---------- */
const busy = { zd: false, sl: false };
async function pool(items, n, fn) {
  const q = [...items];
  await Promise.all(Array.from({ length: Math.min(n, q.length) }, async () => {
    while (q.length) { const it = q.shift(); try { await fn(it); } catch (e) { console.warn(e); } }
  }));
}
function setSync(msg, err) { UI.sync = msg || ''; UI.err = err || ''; const el = $('#syncMsg'); if (el) el.innerHTML = syncHTML(); }
async function loadHealth() { try { C.health = await api('/health'); if (C.health.base) C.base = C.health.base; } catch (e) { C.health = null; setSync('', e.message); } }

async function syncZendesk() {
  if (!configured() || busy.zd) return;
  busy.zd = true; setSync('Zendesk…');
  try {
    if (!C.health) await loadHealth();
    if (!C.forms.length || UI.forceMeta) { const f = await api('/zd/forms'); C.forms = f.forms; C.base = f.base; }
    if (!C.fields.length || UI.forceMeta) C.fields = (await api('/zd/fields')).fields;
    UI.forceMeta = false;
    const kws = S.settings.keywords.split(',').map(s => norm(s).trim()).filter(Boolean);
    const forms = C.forms.filter(f => kws.some(k => norm(f.name).includes(k)));
    if (!forms.length) throw new Error('Ningún formulario de Zendesk contiene: ' + S.settings.keywords);
    const res = await api(`/zd/tickets?forms=${forms.map(f => f.id).join(',')}&solved=${S.settings.includeSolved ? 1 : 0}`);
    Object.assign(C.users, res.users || {});
    const first = !Object.keys(S.tickets).length;
    const jobs = [], seen = new Set();
    for (const z of res.tickets) {
      const id = String(z.id); seen.add(id);
      const prev = S.tickets[id];
      const t = prev || { id, steps: [], reminders: [], meetings: [], notes: '', ai: null, slackId: '', internal: '', converted: {}, zdSeen: '', lastSlackTs: '0' };
      const formName = (C.forms.find(f => f.id === z.ticket_form_id) || {}).name || '';
      Object.assign(t, {
        subject: z.subject || '(sin asunto)', zdStatus: z.status, formId: z.ticket_form_id, formName, type: typeOf(formName, z.subject),
        requesterId: z.requester_id, assigneeId: z.assignee_id, createdAt: z.created_at, updatedAt: z.updated_at, tags: z.tags || [], fields: z.custom_fields || [],
        client: clientFrom(z) || t.client || '',
      });
      if (!prev) { S.tickets[id] = t; jobs.push([id, false]); if (!first) alertOnce('new:' + id, id, 'avance', `Nuevo ticket detectado: #${id} ${trunc(t.subject, 70)}`); }
      else if (t.zdSeen !== z.updated_at || !C.comments[id]) jobs.push([id, true]);
      if (t.zdClosed && ['open', 'new', 'pending', 'hold'].includes(z.status)) { t.zdClosed = false; t.readyToClose = !!t.slackArchived; }
    }
    for (const id of Object.keys(S.tickets)) if (!seen.has(id) && !S.tickets[id].readyToClose) jobs.push([id, true]);
    await pool(jobs, 3, ([id, notify]) => refreshTicket(id, notify));
    S.lastSync = Date.now(); setSync('', '');
  } catch (e) { setSync('', 'Zendesk: ' + e.message); }
  finally { busy.zd = false; save(); softRender(); }
}
async function refreshTicket(id, notify) {
  const t = S.tickets[id]; if (!t) return;
  const d = await api('/zd/ticket/' + id);
  if (d.deleted) { t.zdClosed = true; t.zdStatus = 'deleted'; t.readyToClose = true; return; }
  Object.assign(C.users, d.users || {});
  const old = C.comments[id] || [], oldIds = new Set(old.map(c => c.id));
  const list = d.comments.map(c => mapComment(c, C.users)).slice(-40);
  const fresh = list.filter(c => !oldIds.has(c.id));
  C.comments[id] = list;
  t.zdStatus = d.ticket.status; t.zdSeen = d.ticket.updated_at; t.updatedAt = d.ticket.updated_at;
  t.tags = d.ticket.tags || t.tags; t.fields = d.ticket.custom_fields || t.fields; t.subject = d.ticket.subject || t.subject;
  t.requesterId = d.ticket.requester_id; t.assigneeId = d.ticket.assignee_id;
  if (!t.client) t.client = clientFrom(d.ticket);
  t.zdClosed = ['solved', 'closed', 'deleted'].includes(d.ticket.status);
  t.readyToClose = t.zdClosed || !!t.slackArchived;
  if (notify && old.length && fresh.length) {
    const l = fresh[fresh.length - 1];
    alertOnce(`zd:${id}:${l.id}`, id, 'avance', `#${id} · ${l.side === 'cliente' ? 'Cliente' : 'Inference'} ${l.public ? 'respondió' : 'dejó nota interna'} (${l.author}): ${trunc(l.body, 90)}`);
  }
}

/* ---------- sincronización Slack ---------- */
async function syncSlack() {
  if (!configured() || busy.sl) return;
  if (C.health && !C.health.slack) return;
  busy.sl = true; setSync('Slack…');
  try {
    const ch = await api('/slack/channels');
    C.channels = ch.channels; C.workspaceUrl = ch.workspaceUrl || ''; C.teamId = ch.teamId || '';
    autoLink();
    const linked = Object.values(S.tickets).filter(t => t.slackId);
    await pool(linked, 2, refreshSlack);
    setSync('', '');
  } catch (e) { setSync('', 'Slack: ' + e.message); }
  finally { busy.sl = false; save(); softRender(); }
}
async function refreshSlack(t) {
  const d = await api('/slack/history?channel=' + encodeURIComponent(t.slackId));
  const cobj = C.channels.find(c => c.id === t.slackId);
  t.slackArchived = !!(cobj && cobj.archived);
  if (d.missing) { t.slackArchived = true; t.readyToClose = true; return; }
  const users = d.users || {};
  const msgs = d.messages.filter(m => !/channel_join|channel_leave/.test(m.subtype)).map(m => ({
    ts: m.ts, at: new Date(parseFloat(m.ts) * 1000).toISOString(), user: users[m.user] || m.user || 'bot', text: slackText(m.text, users), thread: !!m.thread_ts && m.thread_ts !== m.ts,
  }));
  const newest = msgs.length ? msgs[msgs.length - 1].ts : '0';
  const fresh = msgs.filter(m => parseFloat(m.ts) > parseFloat(t.lastSlackTs || '0'));
  if (t.lastSlackTs !== '0' && fresh.length) {
    const l = fresh[fresh.length - 1];
    alertOnce(`slack:${t.id}:${newest}`, t.id, 'avance', `Slack #${t.id} · ${fresh.length} mensaje(s) nuevo(s). ${l.user}: ${trunc(l.text, 90)}`);
  }
  t.lastSlackTs = newest; C.slack[t.id] = msgs.slice(-60);
  if (t.slackArchived) t.readyToClose = true;
}
async function syncAll() { await syncZendesk(); await syncSlack(); tick(); }
let TM = {};
function startTimers() {
  Object.values(TM).forEach(clearInterval);
  TM.zd = setInterval(syncZendesk, Math.max(30, +S.settings.pollSec || 60) * 1000);
  TM.sl = setInterval(syncSlack, Math.max(60, +S.settings.slackPollSec || 120) * 1000);
  TM.tk = setInterval(tick, 60000);
}

/* ---------- IA: contexto y prompts ---------- */
const SYS = `Eres el asistente de un Project Manager de Inference Labs9, equipo que implementa proyectos, evolutivos y deuda técnica de contact center (Five9 y otras plataformas) para clientes. Escribes en español profesional y claro (Perú). No inventes datos: si algo no aparece en el contexto, déjalo vacío. En "responsable" usa solo "cliente" o "inference". Las fechas van en formato YYYY-MM-DD; resuelve expresiones como "mañana" o "el viernes" usando la fecha de hoy y la fecha de cada mensaje. Responde SOLO con un objeto JSON válido, sin texto adicional.`;
const todayStr = () => new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + ` (${isoDay(new Date())})`;

function ctxTicket(t, maxZ = 7000, maxS = 5000) {
  let z = '';
  for (const c of (C.comments[t.id] || []).slice().reverse()) {
    const line = `[${fmtTS(c.at)}] ${c.side === 'cliente' ? 'CLIENTE' : 'INFERENCE'}${c.public ? '' : ' (nota interna)'} — ${c.author}: ${c.body.slice(0, 1200)}\n`;
    if ((z + line).length > maxZ) break; z = line + z;
  }
  let s = '';
  for (const m of (C.slack[t.id] || []).slice().reverse()) {
    const line = `[${fmtTS(m.at)}] ${m.user}: ${m.text.slice(0, 700)}\n`;
    if ((s + line).length > maxS) break; s = line + s;
  }
  const reg = openSteps(t).map(x => `- (${x.type}, ${x.owner}${x.due ? ', vence ' + fmtDue(x.due) : ''}) ${x.text}`).join('\n') || '(ninguno)';
  return `TICKET #${t.id} (${TYPES[t.type]}) — ${t.subject}\nCliente: ${t.client || '?'} | Estado Zendesk: ${t.zdStatus} | Estado interno: ${statusOf(t)}\nPendientes ya registrados:\n${reg}\n\n=== ZENDESK (comentarios recientes; CLIENTE = lado del cliente, INFERENCE = nuestro equipo) ===\n${z || '(sin datos)'}\n=== SLACK interno del equipo (canal ${t.slackName || 'no vinculado'}) ===\n${s || '(sin datos)'}`;
}
const ITEM = '{"texto":"","responsable":"cliente|inference","vence":"YYYY-MM-DD o null"}';
const SCHEMA_TICKET = `Esquema JSON: {"estado":"En Inference|Esperando cliente|Esperando proveedor|En pruebas|En espera|Bloqueado|Cerrado","resumen":"en qué estamos, máx 4 líneas","ultimo_avance":"qué cambió lo último","siguientes_pasos":[${ITEM}],"pendientes":[${ITEM}],"fechas":[{"fecha":"YYYY-MM-DD","hora":"HH:MM o null","texto":"qué ocurre ese día","fuente":"zendesk|slack"}],"alertas":["riesgos o cosas que requieren mi atención"],"respuestas":[{"titulo":"Breve","texto":"borrador de respuesta al cliente, sin firma"},{"titulo":"Formal","texto":""},{"titulo":"Pidiendo siguientes pasos","texto":""}]}. "siguientes_pasos" = acciones que vienen; "pendientes" = cosas abiertas que alguien debe entregar o resolver. Indica siempre quién es el responsable.`;
const SCHEMA_MEET = `Esquema JSON: {"resumen":"resumen en 4-6 líneas","temas":["..."],"decisiones":["..."],"pendientes":[${ITEM}],"siguientes_pasos":[${ITEM}],"proxima_reunion":"fecha/hora si se mencionó, si no vacío","correo":"correo en texto plano para el cliente con saludo, resumen de lo visto, acuerdos, pendientes con responsable y fecha, próximos pasos y despedida, sin firma"}.`;

async function analyzeTicket(t, instruction) {
  UI.busy['ai' + t.id] = true; render();
  try {
    const extra = (UI.extra[t.id] || '').trim();
    const user = `Hoy es ${todayStr()}.\n\n${ctxTicket(t)}${extra ? '\n\n=== INFORMACIÓN EXTRA que pegó el PM ===\n' + extra.slice(0, 4000) : ''}\n\n${instruction ? 'Instrucción adicional del PM para las respuestas: ' + instruction + '\n\n' : ''}${SCHEMA_TICKET}`;
    const d = parseJSON(await ai(SYS, user));
    t.ai = { ts: Date.now(), data: d };
    save();
  } catch (e) { toast('IA: ' + e.message, 'err'); }
  finally { UI.busy['ai' + t.id] = false; render(); }
}

/* ---------- reuniones (estilo Read.ai) ---------- */
const findMeeting = (tid, mid) => (S.tickets[tid]?.meetings || []).find(m => m.id === mid);
function chunkText(s, n) { const out = []; for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n)); return out; }
async function summarizeMeeting(tid, mid) {
  const t = S.tickets[tid], m = findMeeting(tid, mid);
  if (!m || !m.transcript.trim()) return toast('Primero graba, sube audio o pega la transcripción', 'err');
  m.busy = 'Resumiendo…'; render();
  try {
    let notes = m.transcript.trim();
    if (notes.length > 12000) {
      const parts = chunkText(notes, 10000), outs = [];
      for (let i = 0; i < parts.length; i++) {
        m.busy = `Procesando parte ${i + 1} de ${parts.length}…`; render();
        outs.push(await ai('Resume en viñetas detalladas, en español, este fragmento de una reunión: temas, decisiones, pendientes con responsable, fechas y nombres. No inventes nada.', parts[i], { json: false }));
        if (i < parts.length - 1) await sleep(9000);
      }
      notes = outs.join('\n\n');
    }
    m.busy = 'Generando resumen…'; render();
    const user = `Hoy es ${todayStr()}. La reunión fue el ${m.date}.\n\nContexto del ticket:\n${ctxTicket(t, 3000, 2000)}\n\n=== TRANSCRIPCIÓN / NOTAS DE LA REUNIÓN ===\n${notes}\n\n${SCHEMA_MEET}`;
    m.summary = parseJSON(await ai(SYS, user));
  } catch (e) { toast('IA: ' + e.message, 'err'); }
  finally { m.busy = ''; save(); render(); }
}
const REC = { on: false, mr: null, streams: [], ctx: null, chunks: [], tid: null, mid: null, t0: 0, timer: null, mime: '' };
async function recStart(tid, mid, withTab) {
  if (REC.on) return toast('Ya hay una grabación en curso', 'err');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') return toast('Este navegador no permite grabar. Usa Chrome o Edge.', 'err');
  try {
    const streams = [await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })];
    if (withTab) {
      const d = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      streams.push(d);
      if (!d.getAudioTracks().length) toast('No marcaste «Compartir audio de la pestaña»: solo se grabará tu micrófono', 'err');
      d.getVideoTracks().forEach(v => v.addEventListener('ended', recStop));
    }
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const dest = ctx.createMediaStreamDestination();
    streams.forEach(s => { const a = s.getAudioTracks(); if (a.length) ctx.createMediaStreamSource(new MediaStream(a)).connect(dest); });
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(x => MediaRecorder.isTypeSupported(x)) || '';
    const mr = new MediaRecorder(dest.stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 24000 });
    Object.assign(REC, { on: true, mr, streams, ctx, chunks: [], tid, mid, t0: Date.now(), mime: mr.mimeType });
    mr.ondataavailable = e => { if (e.data && e.data.size) REC.chunks.push(e.data); };
    mr.onstop = recFinish;
    mr.start(10000);
    REC.timer = setInterval(() => { const el = $('#recClock'); if (el) el.textContent = clock(Date.now() - REC.t0); }, 1000);
    render();
  } catch (e) { toast('No se pudo iniciar la grabación: ' + e.message, 'err'); recCleanup(); }
}
function recStop() { if (REC.on && REC.mr && REC.mr.state !== 'inactive') REC.mr.stop(); }
async function recFinish() {
  const blob = new Blob(REC.chunks, { type: REC.mime || 'audio/webm' }), { tid, mid } = REC;
  recCleanup(); render();
  await transcribeBlob(tid, mid, blob, 'reunion.webm');
}
function recCleanup() {
  clearInterval(REC.timer);
  REC.streams.forEach(s => s.getTracks().forEach(t => t.stop()));
  try { REC.ctx && REC.ctx.close(); } catch { }
  Object.assign(REC, { on: false, mr: null, streams: [], ctx: null, chunks: [] });
}
async function transcribeBlob(tid, mid, blob, name) {
  const m = findMeeting(tid, mid); if (!m) return;
  if (blob.size > 24 * 1024 * 1024) return toast('El audio pesa más de 25 MB (límite gratuito). Divídelo o pega la transcripción.', 'err');
  m.busy = 'Transcribiendo audio…'; render();
  try {
    const fd = new FormData(); fd.append('file', blob, name);
    const r = await api('/transcribe', { method: 'POST', body: fd });
    m.transcript = ((m.transcript ? m.transcript + '\n\n' : '') + r.text).trim();
    toast('Transcripción lista. Ahora pulsa «Resumir con IA».');
  } catch (e) { toast('Error al transcribir: ' + e.message, 'err'); }
  finally { m.busy = ''; save(); render(); }
}

/* ---------- plantillas ---------- */
function bullets(a) { return a.length ? a.map(s => `- ${s.text}${s.due ? ` (${fmtDue(s.due)})` : ''}`).join('\n') : '- (sin pendientes)'; }
function tplVars(t) {
  const open = openSteps(t);
  const mt = (t.meetings || []).filter(m => m.summary).slice(-1)[0];
  const sm = mt && mt.summary;
  const minuta = sm ? [sm.resumen || '', (sm.decisiones || []).length ? '\nAcuerdos:\n' + sm.decisiones.map(x => '- ' + x).join('\n') : ''].join('').trim() : '(agrega aquí lo conversado)';
  const u = C.users[t.requesterId];
  return {
    ticket: t.id, asunto: t.subject.replace(/^\s*\[[^\]]+\]\s*/, '').replace(/^Ticket\s*#?\d+\s*-\s*/i, ''), cliente: t.client || '', contacto: ((u && u.name) || '').split(' ')[0] || '',
    estado: statusOf(t), resumen: (t.ai && t.ai.data.resumen) || '',
    siguientes_pasos: bullets(open.filter(s => s.type === 'siguiente').map(s => ({ ...s, text: `${s.text} [${OWN[s.owner]}]` }))),
    pendientes_cliente: bullets(open.filter(s => s.owner === 'cliente')), pendientes_inference: bullets(open.filter(s => s.owner === 'inference')),
    minuta, proxima_reunion: (sm && sm.proxima_reunion) || 'por coordinar', fecha: new Date().toLocaleDateString('es-PE'), yo: S.settings.myName || '',
  };
}
const renderTpl = (body, t) => { const v = tplVars(t); return body.replace(/\{\{(\w+)\}\}/g, (_, k) => v[k] ?? ''); };

/* ---------- cierre y archivo ---------- */
async function closeAndArchive(tid) {
  const t = S.tickets[tid]; if (!t) return;
  UI.busy['close' + tid] = true; render();
  let sum = '';
  try {
    const user = `Hoy es ${todayStr()}. El ticket terminó. Genera el RESUMEN FINAL para archivo.\n\n${ctxTicket(t, 6000, 4000)}\n\nReuniones: ${(t.meetings || []).map(m => m.date + ': ' + ((m.summary && m.summary.resumen) || '')).join(' | ') || 'ninguna'}\n\nEsquema JSON: {"resumen_final":"qué se pidió, qué se hizo y cómo terminó (máx 8 líneas)","hitos":["..."],"pendientes_residuales":["lo que quedó abierto, si hubo"],"aprendizajes":["..."]}`;
    const d = parseJSON(await ai(SYS, user));
    sum = `# #${t.id} — ${t.subject}\nCliente: ${t.client || '-'} · Tipo: ${TYPES[t.type]} · Creado: ${(t.createdAt || '').slice(0, 10)} · Cerrado: ${isoDay(new Date())}\n\n## Resumen final\n${d.resumen_final || ''}\n\n## Hitos\n${(d.hitos || []).map(x => '- ' + x).join('\n') || '-'}\n\n## Pendientes residuales\n${(d.pendientes_residuales || []).map(x => '- ' + x).join('\n') || '-'}\n\n## Aprendizajes\n${(d.aprendizajes || []).map(x => '- ' + x).join('\n') || '-'}\n`;
  } catch (e) {
    UI.busy['close' + tid] = false; render();
    return toast('No se pudo generar el resumen: ' + e.message, 'err');
  }
  UI.busy['close' + tid] = false;
  openModal(`<h2>Resumen final · #${esc(t.id)}</h2><p class="muted">Al guardar se archiva solo este resumen y se borran del navegador los pendientes, reuniones, notas y mensajes del ticket.</p><textarea id="sumText" style="min-height:300px">${esc(sum)}</textarea><div class="row sp" style="margin-top:12px"><button class="btn" data-act="closeModal">Cancelar</button><div class="row"><button class="btn" data-act="copyEl" data-el="sumText">${ic('copy')} Copiar</button><button class="btn pri" data-act="confirmArchive" data-id="${esc(tid)}">Guardar resumen y borrar datos</button></div></div>`);
}
function confirmArchive(tid) {
  const t = S.tickets[tid]; const text = $('#sumText').value;
  S.archive.unshift({ id: tid, subject: t.subject, client: t.client, type: t.type, closedAt: new Date().toISOString(), summary: text });
  delete S.tickets[tid]; delete C.comments[tid]; delete C.slack[tid];
  UI.tabs = UI.tabs.filter(x => x !== tid); UI.route = { v: 'dash', id: 'all' };
  closeModal(); save(); render(); toast(`#${tid} archivado`);
}

/* =====================================================================
   VISTAS
   ===================================================================== */
const UI = {
  route: { v: 'dash', id: 'all' }, tabs: [], tab: {}, tpl: {}, extra: {}, busy: {}, sync: '', err: '', bell: false,
  fAll: { types: [], q: '', status: '', client: '', owner: '', slack: '', attention: false },
  daily: { scope: 'all' }, pend: { owner: '', type: '', overdue: false }, tplEdit: null, forceMeta: false,
};

function go(v, id) {
  UI.route = { v, id }; UI.bell = false;
  if (v === 'ticket' && !UI.tabs.includes(id)) UI.tabs.push(id);
  render();
}
let pendingRender = false;
function softRender() {
  const a = document.activeElement;
  if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && $('#app').contains(a)) { pendingRender = true; return; }
  if ($('#modal').innerHTML) { pendingRender = true; return; }
  render();
}
function render() {
  pendingRender = false;
  const sc = $('.view') ? $('.view').scrollTop : 0, tb = $('.tk-body') ? $('.tk-body').scrollTop : 0;
  $('#app').innerHTML = railHTML() + `<div class="main">${tabsHTML()}<div class="view">${viewHTML()}</div></div>` + (UI.bell ? bellHTML() : '');
  const v = $('.view'); if (v) v.scrollTop = sc; const b = $('.tk-body'); if (b) b.scrollTop = tb;
  updateBell();
}

/* ---------- marco: rail + pestañas ---------- */
function railHTML() {
  const r = UI.route.v;
  const b = (v, icon, title) => `<button class="${r === v ? 'on' : ''}" data-act="nav" data-v="${v}" title="${title}">${ic(icon, 20)}</button>`;
  return `<nav class="rail"><div class="logo">PM</div>
    ${b('dash', 'layout', 'Dashboards')}${b('pending', 'check', 'Pendientes y siguientes pasos')}${b('daily', 'table', 'Update del día')}${b('templates', 'file', 'Plantillas')}${b('archive', 'archive', 'Archivo de cierres')}
    <div class="sp"></div>
    <button data-act="bell" title="Notificaciones">${ic('bell', 20)}<span class="dot" id="bellCount" style="display:none">0</span></button>
    ${b('settings', 'settings', 'Ajustes')}</nav>`;
}
function syncHTML() {
  return UI.err ? `<span class="err" title="${esc(UI.err)}">${esc(UI.err)}</span>` : UI.sync ? `<span>${esc(UI.sync)}</span>` : S.lastSync ? `<span>Actualizado ${ago(S.lastSync)}</span>` : '';
}
function tabsHTML() {
  const home = `<div class="tab ${UI.route.v !== 'ticket' ? 'on' : ''}" data-act="nav" data-v="dash">${ic('home', 14)}<span class="t">Hub</span></div>`;
  const tks = UI.tabs.map(id => {
    const t = S.tickets[id]; if (!t) return '';
    return `<div class="tab ${UI.route.v === 'ticket' && UI.route.id === id ? 'on' : ''}" data-act="openTicket" data-id="${id}"><span class="t">${esc(t.subject)} #${id}</span><span class="x" data-act="closeTab" data-id="${id}">${ic('x', 12)}</span></div>`;
  }).join('');
  return `<div class="tabs">${home}${tks}<div class="grow"></div><div class="sync"><span id="syncMsg">${syncHTML()}</span><button data-act="refresh" title="Actualizar ahora">${ic('refresh', 14)}<span>Actualizar</span></button></div></div>`;
}
function bellHTML() {
  const items = S.notifications.slice(0, 40).map(a => `<div class="al ${a.read ? '' : 'un'}" data-act="alertGo" data-id="${a.tid}" data-aid="${a.id}"><div>${ic(a.kind === 'vence' ? 'clock' : a.kind === 'avance' ? 'refresh' : 'bell', 16)}</div><div><div>${esc(a.text)}</div><div class="muted sm">${ago(a.ts)}</div></div></div>`).join('');
  return `<div class="bellmenu"><div class="row sp" style="padding:10px 12px;border-bottom:1px solid var(--line)"><b>Notificaciones</b><button class="btn sm" data-act="alertsRead">Marcar leídas</button></div>${items || '<div class="empty">Sin notificaciones</div>'}</div>`;
}
function viewHTML() {
  if (!configured() && UI.route.v !== 'settings') return `<div class="page"><h1>Bienvenido</h1><p class="lead">Conecta primero el Worker (Zendesk, Slack e IA). Toma 10 minutos y es gratis.</p><button class="btn pri" data-act="nav" data-v="settings">Ir a Ajustes</button></div>`;
  switch (UI.route.v) {
    case 'ticket': return S.tickets[UI.route.id] ? ticketView(S.tickets[UI.route.id]) : '<div class="empty">Ticket no encontrado</div>';
    case 'pending': return pendingView();
    case 'daily': return dailyView();
    case 'templates': return templatesView();
    case 'archive': return archiveView();
    case 'settings': return settingsView();
    default: return dashView();
  }
}

/* ---------- piezas reutilizables ---------- */
const tagT = t => `<span class="tag t-${t}">${t.toUpperCase()}</span>`;
const ownP = o => `<span class="pill p-${o}">${OWN[o] || o}</span>`;
function flagsHTML(t) {
  const f = [];
  if (t.readyToClose) f.push('<span class="pill p-grey">Cerrar</span>');
  if (clientWaiting(t)) f.push('<span class="pill p-red">Responder</span>');
  if (overdueCount(t)) f.push('<span class="pill p-red">Vencido</span>');
  return f.join(' ');
}
const stDot = s => `<span class="status-dot" style="background:${({ new: '#f5a623', open: '#cc3340', pending: '#1f73b7', hold: '#2f3941', solved: '#87929d', closed: '#c2c8cc', deleted: '#c2c8cc' })[s] || '#87929d'}"></span>`;
const zdLink = t => C.base ? `${C.base}/agent/tickets/${t.id}` : '';
const slLink = t => t.slackId && C.workspaceUrl ? `${C.workspaceUrl}archives/${t.slackId}` : '';

/* ---------- dashboards ---------- */
function findDash(id) { for (const f of S.folders) for (const d of f.dashboards) if (d.id === id) return d; return null; }
function filterTickets(f) {
  return Object.values(S.tickets).filter(t => {
    if (f.types && f.types.length && !f.types.includes(t.type)) return false;
    if (f.status && statusOf(t) !== f.status) return false;
    if (f.client && norm(t.client) !== norm(f.client)) return false;
    const ns = nextStep(t); if (f.owner && (!ns || ns.owner !== f.owner)) return false;
    if (f.slack === 'linked' && !t.slackId) return false; if (f.slack === 'unlinked' && t.slackId) return false;
    if (f.q && !norm(`${t.id} ${t.subject} ${t.client}`).includes(norm(f.q))) return false;
    if (f.attention && !needsAttention(t)) return false;
    return true;
  }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}
function dashView() {
  const id = UI.route.id, d = id === 'all' ? null : findDash(id), f = d ? d.filters : UI.fAll;
  const list = filterTickets(f);
  const clients = [...new Set(Object.values(S.tickets).map(t => t.client).filter(Boolean))].sort();
  const tree = `<aside class="tree"><h3><span>Dashboards</span><button class="ibtn" data-act="newFolder" title="Nueva carpeta">${ic('plus', 15)}</button></h3>
    <div class="tn ${id === 'all' ? 'on' : ''}" data-act="selectDash" data-id="all">${ic('layout', 15)}<span>Todos los tickets</span><span class="c">${Object.keys(S.tickets).length}</span></div>
    ${S.folders.map(fo => `<div class="tn f" data-act="toggleFolder" data-id="${fo.id}"><span class="chev ${fo.open ? '' : 'closed'}">${ic('chev', 14)}</span>${ic('folder', 15)}<span>${esc(fo.name)}</span><span class="acts">
        <button class="ibtn" data-act="newDash" data-id="${fo.id}" title="Nuevo dashboard">${ic('plus', 14)}</button><button class="ibtn" data-act="renFolder" data-id="${fo.id}" title="Renombrar">${ic('edit', 14)}</button><button class="ibtn" data-act="delFolder" data-id="${fo.id}" title="Eliminar">${ic('trash', 14)}</button></span></div>
      ${fo.open ? fo.dashboards.map(da => `<div class="tn d ${id === da.id ? 'on' : ''}" data-act="selectDash" data-id="${da.id}"><span>${esc(da.name)}</span><span class="c">${filterTickets(da.filters).length}</span><span class="acts"><button class="ibtn" data-act="renDash" data-id="${da.id}" title="Renombrar">${ic('edit', 14)}</button><button class="ibtn" data-act="delDash" data-id="${da.id}" title="Eliminar">${ic('trash', 14)}</button></span></div>`).join('') : ''}`).join('')}
    </aside>`;
  const chips = ['pry', 'evo', 'dt'].map(k => `<button class="chip ${(f.types || []).includes(k) ? 'on' : ''}" data-act="dfType" data-t="${k}">${TYPES[k]}</button>`).join('');
  const sel = (k, opts, ph) => `<select data-ch="dfilter" data-k="${k}"><option value="">${ph}</option>${opts.map(o => `<option value="${esc(o[0])}" ${f[k] === o[0] ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
  const bar = `<div class="fbar">${chips}
    ${sel('status', STATUSES.map(s => [s, s]), 'Estado interno')}${sel('client', clients.map(c => [c, c]), 'Cliente')}
    ${sel('owner', [['cliente', 'Siguiente paso: Cliente'], ['inference', 'Siguiente paso: Inference']], 'Responsable')}${sel('slack', [['linked', 'Con Slack'], ['unlinked', 'Sin Slack']], 'Slack')}
    <label class="row sm"><input type="checkbox" data-ch="dfilter" data-k="attention" ${f.attention ? 'checked' : ''}> Requieren atención</label>
    <input type="text" data-ch="dfilter" data-k="q" placeholder="Buscar #, asunto, cliente…" value="${esc(f.q || '')}"></div>`;
  const rows = list.map(t => {
    const ns = nextStep(t), st = statusOf(t);
    return `<tr class="click" data-act="openTicket" data-id="${t.id}"><td>${tagT(t.type)}</td><td class="num"><b>#${t.id}</b></td><td style="max-width:340px">${esc(t.subject)}</td><td>${esc(t.client || '—')}</td><td>${stDot(t.zdStatus)}${esc(t.zdStatus)}</td>
      <td><span class="pill ${st === 'Esperando cliente' ? 'p-cliente' : st === 'Cerrado' ? 'p-grey' : 'p-inference'}">${esc(st)}</span></td>
      <td style="max-width:300px">${ns ? esc(trunc(ns.text, 90)) : '<span class="muted">—</span>'}</td><td>${ns ? ownP(ns.owner) : ''}</td><td class="num">${ns ? fmtDue(ns.due) : ''}</td>
      <td>${t.slackId ? '<span class="muted" title="' + esc(t.slackName) + '">' + ic('hash', 14) + '</span>' : '<span class="muted" title="Sin canal vinculado">—</span>'}</td><td>${flagsHTML(t)}</td><td class="muted sm">${ago(lastActivity(t))}</td></tr>`;
  }).join('');
  return `<div class="split">${tree}<section class="content"><div class="dhead"><h2>${d ? esc(d.name) : 'Todos los tickets'} <span class="muted" style="font-weight:400;font-size:13px">· ${list.length} ticket(s)</span></h2>${bar}</div>
    ${list.length ? `<table class="tb"><thead><tr><th>Tipo</th><th>#</th><th>Asunto</th><th>Cliente</th><th>Zendesk</th><th>Estado interno</th><th>Siguiente paso</th><th>Resp.</th><th>Vence</th><th>Slack</th><th></th><th>Actividad</th></tr></thead><tbody>${rows}</tbody></table>` :
      `<div class="empty">${Object.keys(S.tickets).length ? 'Ningún ticket coincide con este dashboard.' : 'Aún no hay tickets. Pulsa «Actualizar» para traerlos de Zendesk.'}</div>`}</section></div>`;
}

/* ---------- ticket ---------- */
function ticketView(t) {
  const tab = UI.tab[t.id] || 'seg';
  const T = (k, icon, label) => `<button class="${tab === k ? 'on' : ''}" data-act="ttab" data-id="${t.id}" data-k="${k}">${ic(icon, 15)}${label}</button>`;
  const ru = C.users[t.requesterId], ag = C.users[t.assigneeId];
  const body = ({ conv: convTab, slack: slackTab, seg: segTab, meet: meetTab, tpl: tplTab })[tab](t);
  return `<div class="crumbs"><span>${esc(t.client || 'Sin cliente')}</span><span>${esc(ru ? ru.name : 'Solicitante')}</span><span>${tagT(t.type)} <b>Ticket #${t.id}</b></span><span class="grow" style="flex:1"></span>
      ${zdLink(t) ? `<a href="${zdLink(t)}" target="_blank" rel="noopener">${ic('ext', 14)} Abrir en Zendesk</a>` : ''}${slLink(t) ? `<a href="${slLink(t)}" target="_blank" rel="noopener">${ic('hash', 14)} Abrir canal de Slack</a>` : ''}</div>
    <div class="tk"><aside class="tk-left">${propsHTML(t, ru, ag)}</aside>
    <section class="tk-center"><div class="tk-head"><div><h2>${esc(t.subject)}</h2><div class="muted sm">${esc(t.formName || TYPES[t.type])} · creado ${fmtTS(t.createdAt)} · actividad ${ago(lastActivity(t))}</div></div>
      <div class="row"><button class="btn" data-act="refreshOne" data-id="${t.id}" title="Actualizar este ticket">${ic('refresh', 14)}</button>${t.readyToClose ? `<button class="btn pri" data-act="closeTicket" data-id="${t.id}" ${UI.busy['close' + t.id] ? 'disabled' : ''}>${ic('archive', 14)} ${UI.busy['close' + t.id] ? 'Generando…' : 'Resumen final y archivar'}</button>` : `<button class="btn" data-act="closeTicket" data-id="${t.id}" title="Cerrar y archivar manualmente">${ic('archive', 14)} Archivar</button>`}</div></div>
      <div class="tk-tabs">${T('seg', 'check', 'Seguimiento')}${T('conv', 'mail', 'Zendesk')}${T('slack', 'hash', 'Slack')}${T('meet', 'mic', 'Reuniones')}${T('tpl', 'file', 'Plantillas')}</div>
      <div class="tk-body">${body}</div></section>
    <aside class="tk-right">${aiPanel(t)}</aside></div>`;
}
function propsHTML(t, ru, ag) {
  const ns = nextStep(t);
  const sug = slackSuggestions(t).slice(0, 60);
  const slackBlock = t.slackId
    ? `<div class="field row sp"><span>${ic('hash', 14)} ${esc(t.slackName)}${t.slackAuto ? ' <span class="muted sm">(auto)</span>' : ''}</span><button class="ibtn" data-act="unlinkSlack" data-id="${t.id}" title="Desvincular">${ic('x', 14)}</button></div>${t.slackArchived ? '<div class="sm" style="color:var(--amber);margin-top:4px">Canal archivado</div>' : ''}`
    : (C.channels.length ? `<select data-ch="linkSlack" data-id="${t.id}"><option value="">Vincular canal…</option>${sug.map(c => `<option value="${c.id}">#${esc(c.name)}${c.archived ? ' (archivado)' : ''}</option>`).join('')}</select>` : `<div class="field ro muted">${C.health && !C.health.slack ? 'Slack no configurado' : 'Sin canales (aún)'}</div>`);
  const zf = zdFields(t);
  return `<div class="fgrid"><label class="lb">Solicitante</label><div class="field ro">${esc(ru ? ru.name : '—')}<div class="muted sm">${esc(ru ? ru.email : '')}</div></div>
    <label class="lb">Agente asignado</label><div class="field ro">${esc(ag ? ag.name : '—')}</div>
    <label class="lb">Estado en Zendesk</label><div class="field ro">${stDot(t.zdStatus)}${esc(t.zdStatus)}</div>
    <label class="lb">Estado interno</label><select data-ch="internal" data-id="${t.id}"><option value="">Automático (${esc(derivedStatus(t))})</option>${STATUSES.map(s => `<option ${t.internal === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
    <label class="lb">Tipo</label><div class="field ro">${tagT(t.type)} ${esc(t.formName)}</div>
    <label class="lb">Cliente</label><div class="field ro">${esc(t.client || '—')}</div>
    <label class="lb">Canal de Slack</label>${slackBlock}
    <label class="lb">Etiquetas</label><div class="field ro ztags">${(t.tags || []).map(x => `<span class="ztag">${esc(x)}</span>`).join('') || '—'}</div>
    <label class="lb">Siguiente paso</label><div class="field ro">${ns ? `${esc(ns.text)}<div style="margin-top:6px">${ownP(ns.owner)} <span class="muted sm">${ns.due ? 'vence ' + fmtDue(ns.due) : ''}</span></div>` : '<span class="muted">Sin pasos pendientes</span>'}</div>
    ${zf.length ? `<details style="margin-top:14px"><summary>Campos de Zendesk (${zf.length})</summary>${zf.map(x => `<label class="lb">${esc(x.title)}</label><div class="field ro">${esc(x.value)}</div>`).join('')}</details>` : ''}</div>`;
}
function convTab(t) {
  const cs = C.comments[t.id] || [];
  if (!cs.length) return '<div class="empty">Sin comentarios cargados. Pulsa actualizar.</div>';
  return cs.map(c => `<div class="msg"><div class="av ${c.side === 'inference' ? 'inf' : ''}">${esc(initials(c.author))}</div><div style="min-width:0"><div class="mh"><b>${esc(c.author)}</b> <span class="muted">· ${fmtTS(c.at)}</span> ${ownP(c.side)}${c.public ? '' : ' <span class="pill p-grey">nota interna</span>'}</div><div class="bub ${c.public ? (c.side === 'cliente' ? '' : 'inf') : 'note'}">${esc(c.body) || '<span class="muted">(sin texto)</span>'}${c.att.length ? `<div class="muted sm" style="margin-top:8px">Adjuntos: ${esc(c.att.join(', '))}</div>` : ''}</div></div></div>`).join('');
}
function slackTab(t) {
  if (!t.slackId) return '<div class="empty">Este ticket no tiene canal de Slack vinculado.<br>Se vincula solo si el canal se llama <b>pry-/evo-/dt-&lt;n.º de ticket&gt;-cliente-descripción</b>; si no, elige uno en el panel izquierdo.</div>';
  const ms = C.slack[t.id] || [];
  if (!ms.length) return '<div class="empty">Sin mensajes cargados todavía.</div>';
  return `<div class="sl">${ms.map(m => `<div class="msg"><div class="av inf">${esc(initials(m.user))}</div><div style="min-width:0"><div class="mh"><b>${esc(m.user)}</b> <span class="muted">· ${fmtTS(m.at)}${m.thread ? ' · en hilo' : ''}</span></div><div class="bub">${esc(m.text)}</div></div></div>`).join('')}</div>`;
}

/* --- seguimiento --- */
function segTab(t) {
  const steps = (t.steps || []).slice().sort((a, b) => (a.done - b.done) || (a.due ? (b.due ? a.due.localeCompare(b.due) : -1) : (b.due ? 1 : 0)));
  const rows = steps.map(s => `<tr class="${s.done ? 'done' : ''}"><td><input type="checkbox" data-ch="stepDone" data-id="${t.id}" data-sid="${s.id}" ${s.done ? 'checked' : ''}></td><td>${s.type === 'pendiente' ? 'Pendiente' : 'Siguiente paso'}</td><td>${esc(s.text)}</td><td>${ownP(s.owner)}</td><td class="num ${!s.done && s.due && parseDue(s.due) < new Date() ? '' : ''}" ${!s.done && s.due && parseDue(s.due) < new Date() ? 'style="color:var(--red);font-weight:600"' : ''}>${fmtDue(s.due)}</td><td><button class="ibtn" data-act="delStep" data-id="${t.id}" data-sid="${s.id}">${ic('trash', 14)}</button></td></tr>`).join('');
  const rem = (t.reminders || []).slice().sort((a, b) => (a.done - b.done) || String(a.due).localeCompare(String(b.due)));
  const rrows = rem.map(r => `<tr class="${r.done ? 'done' : ''}"><td><input type="checkbox" data-ch="remDone" data-id="${t.id}" data-rid="${r.id}" ${r.done ? 'checked' : ''}></td><td>${esc(r.text)}</td><td class="num" ${!r.done && parseDue(r.due) < new Date() ? 'style="color:var(--red);font-weight:600"' : ''}>${fmtDue(r.due)}</td><td class="muted sm">${esc(r.source || '')}</td><td><button class="ibtn" data-act="delRem" data-id="${t.id}" data-rid="${r.id}">${ic('trash', 14)}</button></td></tr>`).join('');
  const det = detectedFor(t);
  return `<div class="sec"><h3>Siguientes pasos y pendientes</h3>
    ${steps.length ? `<table class="tb"><thead><tr><th></th><th>Tipo</th><th>Descripción</th><th>Responsable</th><th>Vence</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="muted">Nada registrado. Usa la IA (panel derecho) o agrega manualmente.</div>'}
    <div class="addrow"><select id="ns_type"><option value="siguiente">Siguiente paso</option><option value="pendiente">Pendiente</option></select><input type="text" id="ns_text" placeholder="Descripción"><select id="ns_owner"><option value="cliente">Cliente</option><option value="inference">Inference</option></select><input type="date" id="ns_date"><input type="time" id="ns_time"><button class="btn pri" data-act="addStep" data-id="${t.id}">${ic('plus', 14)} Agregar</button></div></div>
  <div class="sec"><h3>Recordatorios</h3>
    ${rem.length ? `<table class="tb"><thead><tr><th></th><th>Recordatorio</th><th>Fecha</th><th>Origen</th><th></th></tr></thead><tbody>${rrows}</tbody></table>` : '<div class="muted">Sin recordatorios.</div>'}
    <div class="addrow2"><input type="text" id="rm_text" placeholder="Qué debo recordar"><input type="date" id="rm_date"><input type="time" id="rm_time"><button class="btn pri" data-act="addRem" data-id="${t.id}">${ic('plus', 14)} Agregar</button></div></div>
  <div class="sec"><h3>Fechas detectadas en Zendesk y Slack</h3>
    ${det.length ? `<table class="tb"><tbody>${det.map((d, i) => `<tr><td class="num" style="white-space:nowrap"><b>${fmtDue(d.date)}</b> ${esc(d.time)}</td><td>${esc(d.snip)}<div class="muted sm">${d.src} · ${esc(d.who)} · ${fmtTS(d.at)}</div></td><td><button class="btn sm" data-act="remFromDate" data-id="${t.id}" data-i="${i}">${ic('bell', 13)} Recordar</button></td></tr>`).join('')}</tbody></table>` : '<div class="muted">No se detectaron fechas próximas en los mensajes.</div>'}</div>
  <div class="sec"><h3>Notas personales</h3><textarea data-ch="notes" data-id="${t.id}" placeholder="Solo para ti: contexto, acuerdos informales, ideas…" style="min-height:110px">${esc(t.notes || '')}</textarea></div>`;
}

/* --- reuniones --- */
function meetTab(t) {
  const ms = (t.meetings || []).slice().reverse();
  return `<div class="row sp" style="margin-bottom:14px"><div class="muted">Graba o sube el audio de la reunión, transcribe gratis y la IA te deja resumen, pendientes, siguientes pasos y un correo listo.</div><button class="btn pri" data-act="newMeeting" data-id="${t.id}">${ic('plus', 14)} Nueva reunión</button></div>
    ${ms.length ? ms.map(m => meetCard(t, m)).join('') : '<div class="empty">Aún no hay reuniones para este ticket.</div>'}`;
}
function meetCard(t, m) {
  const rec = REC.on && REC.mid === m.id;
  const s = m.summary;
  const list = (a, f) => (a && a.length) ? `<ul class="clean">${a.map(f).join('')}</ul>` : '<div class="muted">—</div>';
  const it = x => `<li>${esc(x.texto)} ${x.responsable ? ownP(x.responsable) : ''} ${x.vence && x.vence !== 'null' ? `<span class="muted sm">· ${fmtDue(x.vence)}</span>` : ''}</li>`;
  return `<div class="meet"><div class="row sp"><input type="text" style="max-width:340px;font-weight:600" data-ch="meetTitle" data-id="${t.id}" data-mid="${m.id}" value="${esc(m.title)}"><div class="row"><span class="muted sm">${esc(m.date)}</span><button class="ibtn" data-act="delMeeting" data-id="${t.id}" data-mid="${m.id}">${ic('trash', 15)}</button></div></div>
    <div class="row wrap" style="margin:12px 0">${rec ? `<span class="rec"><span class="recdot"></span><b id="recClock">${clock(Date.now() - REC.t0)}</b><button class="btn danger" data-act="recStop">${ic('stop', 14)} Detener y transcribir</button></span>` :
      `<button class="btn" data-act="recStart" data-id="${t.id}" data-mid="${m.id}" data-tab="0" ${REC.on || m.busy ? 'disabled' : ''}>${ic('mic', 14)} Grabar micrófono</button>
       <button class="btn" data-act="recStart" data-id="${t.id}" data-mid="${m.id}" data-tab="1" ${REC.on || m.busy ? 'disabled' : ''} title="Elige la pestaña de Meet/Teams/Zoom web y marca «Compartir audio»">${ic('mic', 14)} Grabar pestaña + micrófono</button>
       <label class="btn ${m.busy ? '' : ''}">${ic('up', 14)} Subir audio<input type="file" accept="audio/*,video/*,.webm,.mp3,.m4a,.wav,.mp4" style="display:none" data-ch="audioFile" data-id="${t.id}" data-mid="${m.id}"></label>`}
      ${m.busy ? `<span class="muted"><span class="spin" style="display:inline-block">${ic('refresh', 14)}</span> ${esc(m.busy)}</span>` : ''}</div>
    <details ${m.summary ? '' : 'open'}><summary>Transcripción / notas (${m.transcript.length} caracteres)</summary><textarea data-ch="meetText" data-id="${t.id}" data-mid="${m.id}" placeholder="Pega aquí la transcripción o tus apuntes de la reunión (también sirve el texto de Meet/Teams)." style="min-height:140px;margin-top:8px">${esc(m.transcript)}</textarea></details>
    <div class="row" style="margin-top:10px"><button class="btn pri" data-act="summarize" data-id="${t.id}" data-mid="${m.id}" ${m.busy ? 'disabled' : ''}>${ic('spark', 14)} ${s ? 'Resumir de nuevo' : 'Resumir con IA'}</button></div>
    ${s ? `<div class="stack" style="margin-top:14px"><div class="aibox"><h4>Resumen</h4><p>${esc(s.resumen)}</p></div>
      <div class="aibox"><h4>Decisiones</h4>${list(s.decisiones, x => `<li>${esc(x)}</li>`)}</div>
      <div class="aibox"><h4>Pendientes</h4>${list(s.pendientes, it)}</div>
      <div class="aibox"><h4>Siguientes pasos</h4>${list(s.siguientes_pasos, it)}${s.proxima_reunion ? `<div class="muted sm" style="margin-top:6px">Próxima reunión: ${esc(s.proxima_reunion)}</div>` : ''}</div>
      <div class="aibox"><h4>Correo para el cliente</h4><pre class="pre" id="mail_${m.id}">${esc(s.correo || '')}</pre><div class="row" style="margin-top:8px"><button class="btn sm" data-act="copyEl" data-el="mail_${m.id}">${ic('copy', 13)} Copiar</button><button class="btn sm" data-act="meetToSteps" data-id="${t.id}" data-mid="${m.id}">${ic('check', 13)} Pasar pendientes y pasos a Seguimiento</button></div></div></div>` : ''}</div>`;
}

/* --- plantillas del ticket --- */
function tplTab(t) {
  const cur = UI.tpl[t.id] || (UI.tpl[t.id] = { id: S.templates[0] && S.templates[0].id, text: null, edited: false });
  if (cur.text === null || !cur.edited) { const tp = S.templates.find(x => x.id === cur.id); cur.text = tp ? renderTpl(tp.body, t) : ''; }
  return `<div class="row" style="margin-bottom:10px"><select style="max-width:340px" data-ch="tplPick" data-id="${t.id}">${S.templates.map(x => `<option value="${x.id}" ${x.id === cur.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select><button class="btn" data-act="tplRegen" data-id="${t.id}" title="Volver a rellenar con los datos actuales">${ic('refresh', 14)} Rellenar de nuevo</button></div>
    <textarea id="tplText" data-ch="tplText" data-id="${t.id}" style="min-height:360px">${esc(cur.text)}</textarea>
    <div class="row" style="margin-top:10px"><button class="btn pri" data-act="copyEl" data-el="tplText">${ic('copy', 14)} Copiar</button><button class="btn" data-act="tplMail" data-id="${t.id}">${ic('mail', 14)} Abrir en correo</button><button class="btn" data-act="tplPolish" data-id="${t.id}" ${UI.busy['pol' + t.id] ? 'disabled' : ''}>${ic('spark', 14)} ${UI.busy['pol' + t.id] ? 'Puliendo…' : 'Pulir redacción con IA'}</button></div>
    <p class="muted sm">Se rellena con tus pendientes, siguientes pasos, estado, resumen y minuta de la última reunión. Edita el texto antes de enviarlo.</p>`;
}

/* --- panel IA --- */
function aiPanel(t) {
  const a = t.ai && t.ai.data, b = UI.busy['ai' + t.id];
  const items = (arr, kind) => (arr || []).map((x, i) => `<div class="aiitem"><div class="tx">${esc(x.texto)}<div>${x.responsable ? ownP(x.responsable) : ''} <span class="muted sm">${x.vence && x.vence !== 'null' ? 'vence ' + fmtDue(x.vence) : ''}</span></div></div><button class="btn sm" data-act="aiAdd" data-id="${t.id}" data-kind="${kind}" data-i="${i}" title="Agregar a Seguimiento">${ic('plus', 13)}</button></div>`).join('');
  return `<div class="row sp" style="margin-bottom:10px"><h3>${ic('spark', 16)} Asistente IA</h3><span class="muted sm">${t.ai ? ago(t.ai.ts) : ''}</span></div>
    <button class="btn pri" style="width:100%;justify-content:center" data-act="analyze" data-id="${t.id}" ${b ? 'disabled' : ''}>${b ? '<span class="spin" style="display:inline-block">' + ic('refresh', 14) + '</span> Analizando…' : ic('spark', 14) + ' Analizar ticket (Zendesk + Slack)'}</button>
    <details style="margin:10px 0"><summary>Agregar contexto o instrucción</summary><textarea data-ch="extra" data-id="${t.id}" placeholder="Pega correos, notas de llamada, algo que no esté en Zendesk/Slack…" style="margin-top:8px">${esc(UI.extra[t.id] || '')}</textarea><input type="text" id="aiInstr" placeholder="Instrucción para las respuestas (ej: tono más firme)" style="margin-top:6px"><button class="btn sm" style="margin-top:6px" data-act="analyze" data-id="${t.id}" data-instr="1">Regenerar con instrucción</button></details>
    ${a ? `<div class="aibox"><h4>En qué estamos</h4><p>${esc(a.resumen || '—')}</p>${a.ultimo_avance ? `<h4 style="margin-top:8px">Último avance</h4><p>${esc(a.ultimo_avance)}</p>` : ''}${a.estado ? `<div class="row" style="margin-top:8px"><span class="muted sm">Estado sugerido:</span><span class="pill p-inference">${esc(a.estado)}</span>${STATUSES.includes(a.estado) && statusOf(t) !== a.estado ? `<button class="btn sm" data-act="aiState" data-id="${t.id}">Aplicar</button>` : ''}</div>` : ''}</div>
      ${(a.alertas || []).length ? `<div class="aibox" style="border-color:#f1b9bf;background:var(--red-bg)"><h4 style="color:var(--red)">Atención</h4><ul class="clean">${a.alertas.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      <div class="aibox"><div class="row sp"><h4>Siguientes pasos</h4>${((a.siguientes_pasos || []).length + (a.pendientes || []).length) ? `<button class="btn sm" data-act="aiAddAll" data-id="${t.id}">Agregar todo</button>` : ''}</div>${items(a.siguientes_pasos, 'siguiente') || '<div class="muted">—</div>'}</div>
      <div class="aibox"><h4>Pendientes</h4>${items(a.pendientes, 'pendiente') || '<div class="muted">—</div>'}</div>
      ${(a.fechas || []).length ? `<div class="aibox"><h4>Fechas detectadas por IA</h4>${a.fechas.map((f, i) => `<div class="aiitem"><div class="tx"><b>${fmtDue(f.fecha)}</b> ${esc(f.hora && f.hora !== 'null' ? f.hora : '')} — ${esc(f.texto)}</div><button class="btn sm" data-act="aiRemind" data-id="${t.id}" data-i="${i}" title="Crear recordatorio">${ic('bell', 13)}</button></div>`).join('')}</div>` : ''}
      ${(a.respuestas || []).length ? `<div class="aibox"><h4>Respuestas sugeridas</h4>${a.respuestas.map((r, i) => `<div class="reply"><b>${esc(r.titulo)}</b><pre id="rp_${t.id}_${i}">${esc(r.texto)}</pre><div class="row"><button class="btn sm" data-act="copyEl" data-el="rp_${t.id}_${i}">${ic('copy', 13)} Copiar</button><button class="btn sm" data-act="aiToTpl" data-id="${t.id}" data-i="${i}">Llevar a Plantillas</button></div></div>`).join('')}</div>` : ''}` :
    '<div class="empty" style="padding:24px 4px">Pulsa «Analizar» para obtener el resumen, siguientes pasos, pendientes con responsable, fechas y respuestas sugeridas.</div>'}`;
}

/* ---------- pendientes globales ---------- */
function allSteps() {
  const out = [];
  for (const t of Object.values(S.tickets)) for (const s of (t.steps || [])) if (!s.done) out.push({ t, s });
  return out.sort((a, b) => (a.s.due ? (b.s.due ? a.s.due.localeCompare(b.s.due) : -1) : (b.s.due ? 1 : 0)));
}
function pendingView() {
  const f = UI.pend;
  const list = allSteps().filter(({ t, s }) => (!f.owner || s.owner === f.owner) && (!f.type || s.type === f.type) && (!f.overdue || (s.due && parseDue(s.due) < new Date())));
  const ch = (k, v, l) => `<button class="chip ${f[k] === v ? 'on' : ''}" data-act="pendF" data-k="${k}" data-v="${v}">${l}</button>`;
  return `<div class="page"><h1>Pendientes y siguientes pasos</h1><p class="lead">Todo lo abierto en tus tickets, con responsable (cliente o Inference).</p>
    <div class="fbar" style="margin-bottom:14px">${ch('owner', '', 'Todos')}${ch('owner', 'cliente', 'Del cliente')}${ch('owner', 'inference', 'De Inference')}<span class="muted">|</span>${ch('type', '', 'Todo tipo')}${ch('type', 'siguiente', 'Siguientes pasos')}${ch('type', 'pendiente', 'Pendientes')}<span class="muted">|</span><label class="row sm"><input type="checkbox" data-ch="pendOver" ${f.overdue ? 'checked' : ''}> Solo vencidos</label></div>
    ${list.length ? `<table class="tb"><thead><tr><th></th><th>Ticket</th><th>Cliente</th><th>Tipo</th><th>Descripción</th><th>Resp.</th><th>Vence</th></tr></thead><tbody>${list.map(({ t, s }) => `<tr><td><input type="checkbox" data-ch="stepDone" data-id="${t.id}" data-sid="${s.id}"></td><td style="white-space:nowrap">${tagT(t.type)} <a href="#" data-act="openTicket" data-id="${t.id}"><b>#${t.id}</b></a></td><td>${esc(t.client || '—')}</td><td>${s.type === 'pendiente' ? 'Pendiente' : 'Siguiente paso'}</td><td>${esc(s.text)}</td><td>${ownP(s.owner)}</td><td class="num" ${s.due && parseDue(s.due) < new Date() ? 'style="color:var(--red);font-weight:600"' : ''}>${fmtDue(s.due)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">No hay pendientes con estos filtros.</div>'}</div>`;
}

/* ---------- update del día ---------- */
function dailyRows() {
  let list = Object.values(S.tickets).filter(t => !t.zdClosed);
  if (UI.daily.scope !== 'all') { const d = findDash(UI.daily.scope); if (d) { const ids = new Set(filterTickets(d.filters).map(t => t.id)); list = list.filter(t => ids.has(t.id)); } }
  return list.sort((a, b) => a.client.localeCompare(b.client) || a.id - b.id).map(t => {
    const ns = nextStep(t), o = openSteps(t);
    return { t, st: statusOf(t), ns, nc: o.filter(s => s.owner === 'cliente').length, ni: o.filter(s => s.owner === 'inference').length };
  });
}
const dailyLine = r => `Ticket #${r.t.id} | ${r.t.type.toUpperCase()} | ${r.t.client || '-'} | Estado: ${r.st} | Siguiente: ${r.ns ? r.ns.text + ' (' + OWN[r.ns.owner] + ')' : 'sin definir'}${r.ns && r.ns.due ? ' | Vence: ' + fmtDue(r.ns.due) : ''}`;
function dailyView() {
  const rows = dailyRows();
  const scopes = [['all', 'Todos los tickets abiertos'], ...S.folders.flatMap(f => f.dashboards.map(d => [d.id, f.name + ' / ' + d.name]))];
  return `<div class="page"><h1>Update del día</h1><p class="lead">Una línea por ticket: estado, siguiente paso y de quién es. Se avisa a la hora configurada (${esc(S.settings.dailyTime)}) o cuando tú quieras.</p>
    <div class="row wrap" style="margin-bottom:14px"><select style="max-width:360px" data-ch="dailyScope">${scopes.map(s => `<option value="${esc(s[0])}" ${UI.daily.scope === s[0] ? 'selected' : ''}>${esc(s[1])}</option>`).join('')}</select>
      <button class="btn pri" data-act="dailyCopy">${ic('copy', 14)} Copiar texto</button><button class="btn" data-act="dailyCopyHTML">${ic('copy', 14)} Copiar tabla</button><button class="btn" data-act="dailyAI" ${UI.busy.daily ? 'disabled' : ''}>${ic('spark', 14)} ${UI.busy.daily ? 'Redactando…' : 'Resumen con IA'}</button></div>
    ${UI.dailyText ? `<div class="aibox"><h4>Resumen del día (IA)</h4><pre class="pre" id="dailyAI">${esc(UI.dailyText)}</pre><button class="btn sm" style="margin-top:8px" data-act="copyEl" data-el="dailyAI">${ic('copy', 13)} Copiar</button></div>` : ''}
    ${rows.length ? `<table class="tb"><thead><tr><th>Ticket</th><th>Tipo</th><th>Cliente</th><th>Estado</th><th>Siguiente paso</th><th>Resp.</th><th>Vence</th><th>Abiertos (cliente / Inference)</th></tr></thead><tbody>${rows.map(r => `<tr class="click" data-act="openTicket" data-id="${r.t.id}"><td class="num"><b>#${r.t.id}</b></td><td>${tagT(r.t.type)}</td><td>${esc(r.t.client || '—')}</td><td><span class="pill ${r.st === 'Esperando cliente' ? 'p-cliente' : 'p-inference'}">${esc(r.st)}</span></td><td>${r.ns ? esc(r.ns.text) : '<span class="muted">sin definir</span>'}</td><td>${r.ns ? ownP(r.ns.owner) : ''}</td><td class="num">${r.ns ? fmtDue(r.ns.due) : ''}</td><td class="num">${r.nc} / ${r.ni}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">No hay tickets abiertos.</div>'}</div>`;
}

/* ---------- plantillas globales ---------- */
function templatesView() {
  const cur = S.templates.find(t => t.id === UI.tplEdit) || S.templates[0];
  return `<div class="page"><h1>Plantillas</h1><p class="lead">Se rellenan solas con los datos de cada ticket. Variables disponibles: ${TPL_VARS.map(v => `<code>{{${v}}}</code>`).join(' ')}</p>
    <div class="split" style="height:auto;gap:18px"><div style="width:260px;flex:none">${S.templates.map(t => `<div class="tn ${cur && cur.id === t.id ? 'on' : ''}" data-act="tplSel" data-id="${t.id}"><span>${esc(t.name)}</span></div>`).join('')}<button class="btn sm" style="margin-top:10px" data-act="tplNew">${ic('plus', 13)} Nueva plantilla</button></div>
    ${cur ? `<div style="flex:1;min-width:0"><label class="lb" style="margin-top:0">Nombre</label><input type="text" data-ch="tplName" data-id="${cur.id}" value="${esc(cur.name)}"><label class="lb">Contenido</label><textarea data-ch="tplBody" data-id="${cur.id}" style="min-height:360px">${esc(cur.body)}</textarea><div class="row" style="margin-top:10px"><button class="btn danger" data-act="tplDel" data-id="${cur.id}">${ic('trash', 14)} Eliminar</button><button class="btn" data-act="tplReset">Restaurar las de fábrica</button></div></div>` : ''}</div></div>`;
}

/* ---------- archivo ---------- */
function archiveView() {
  return `<div class="page"><h1>Archivo de cierres</h1><p class="lead">Solo se conserva el resumen final; el resto de la información del ticket se borra al archivar.</p>
    ${S.archive.length ? S.archive.map((a, i) => `<div class="card" style="margin-bottom:12px"><div class="row sp"><div>${tagT(a.type || 'pry')} <b>#${esc(a.id)}</b> ${esc(a.subject)} <span class="muted sm">· ${esc(a.client || '')} · cerrado ${esc((a.closedAt || '').slice(0, 10))}</span></div><div class="row"><button class="btn sm" data-act="archCopy" data-i="${i}">${ic('copy', 13)}</button><button class="btn sm" data-act="archDl" data-i="${i}">${ic('down', 13)} .md</button><button class="btn sm danger" data-act="archDel" data-i="${i}">${ic('trash', 13)}</button></div></div><details><summary>Ver resumen</summary><pre class="pre" style="margin-top:8px">${esc(a.summary)}</pre></details></div>`).join('') : '<div class="empty">Aún no has archivado tickets.</div>'}</div>`;
}

/* ---------- ajustes ---------- */
function settingsView() {
  const s = S.settings, h = C.health;
  const inp = (k, label, type = 'text', hint = '') => `<label class="lb">${label}</label><input type="${type}" data-ch="set" data-k="${k}" ${type === 'number' ? 'data-n="1"' : ''} value="${esc(s[k])}">${hint ? `<div class="muted sm" style="margin-top:3px">${hint}</div>` : ''}`;
  const chk = (k, label) => `<label class="row" style="margin-top:10px"><input type="checkbox" data-ch="setChk" data-k="${k}" ${s[k] ? 'checked' : ''}> ${label}</label>`;
  const unl = C.channels.filter(c => !Object.values(S.tickets).some(t => t.slackId === c.id));
  return `<div class="page"><h1>Ajustes</h1><p class="lead">Todo se guarda solo en tu navegador. Las llaves de Zendesk, Slack e IA viven en el Worker, no aquí.</p>
    <div class="card stack" style="margin-bottom:16px"><h3>Conexión</h3>${inp('workerUrl', 'URL del Worker', 'url', 'Ej: https://pm-hub-proxy.tu-usuario.workers.dev')}${inp('appKey', 'Clave de acceso (APP_KEY)', 'password')}
      <div class="row"><button class="btn pri" data-act="testConn">Probar conexión</button>${h ? `<span class="pill ${h.zendesk ? 'p-green' : 'p-red'}">Zendesk</span><span class="pill ${h.slack ? 'p-green' : 'p-red'}">Slack</span><span class="pill ${h.ai ? 'p-green' : 'p-red'}">IA</span><span class="pill ${h.kv ? 'p-green' : 'p-grey'}">KV</span><span class="muted sm">${esc(h.model || '')}</span>` : ''}</div></div>
    <div class="card" style="margin-bottom:16px"><h3>Qué tickets entran</h3>${inp('keywords', 'Palabras clave del Formulario de Zendesk', 'text', 'Entran los tickets cuyo «Formulario» contenga alguna (separadas por coma): evolutivo, deuda técnica, proyecto.')}
      ${inp('internalDomains', 'Dominios del equipo Inference', 'text', 'Sirve para distinguir quién escribió: cliente o Inference.')}${chk('includeSolved', 'Incluir tickets resueltos al sincronizar')}
      <div class="muted sm" style="margin-top:10px">Formularios detectados: ${C.forms.length ? C.forms.map(f => `<span class="ztag">${esc(f.name)}</span>`).join(' ') : '—'}</div></div>
    <div class="card" style="margin-bottom:16px"><h3>Frecuencia y alertas</h3><div class="row wrap" style="gap:18px;align-items:flex-start"><div style="width:180px">${inp('pollSec', 'Zendesk cada (seg)', 'number')}</div><div style="width:180px">${inp('slackPollSec', 'Slack cada (seg)', 'number')}</div><div style="width:180px">${inp('leadMin', 'Avisar antes (min)', 'number')}</div><div style="width:180px">${inp('staleDays', 'Seguimiento tras (días)', 'number', 'Sin respuesta del cliente')}</div><div style="width:180px">${inp('replyHours', 'Responder en (horas)', 'number', 'Cliente esperando')}</div><div style="width:180px">${inp('dailyTime', 'Update del día a las', 'time')}</div></div>
      <div class="row" style="margin-top:12px"><button class="btn" data-act="askNotif">Activar avisos del navegador</button><span class="muted sm">Estado: ${'Notification' in window ? Notification.permission : 'no disponible'}. Los avisos funcionan mientras la pestaña esté abierta (fíjala).</span></div>${inp('myName', 'Tu nombre (firma de plantillas)')}</div>
    <div class="card" style="margin-bottom:16px"><h3>Datos</h3><div class="row wrap"><button class="btn" data-act="exportData">${ic('down', 14)} Exportar copia</button><label class="btn">${ic('up', 14)} Importar copia<input type="file" accept=".json" style="display:none" data-ch="importData"></label>
      ${chk('syncKV', 'Sincronizar con la nube gratuita (KV)')}<button class="btn" data-act="kvPush">Subir ahora</button><button class="btn" data-act="kvPull">Descargar</button></div></div>
    <div class="card"><h3>Canales de Slack detectados sin ticket (${unl.length})</h3><div class="muted sm" style="margin:6px 0 10px">Nombres válidos: pry-… / evo-… / dt-…  Si no tienen número de ticket, vincúlalos a mano desde el ticket.</div><div class="ztags">${unl.slice(0, 80).map(c => `<span class="ztag">#${esc(c.name)}${c.archived ? ' ✓' : ''}</span>`).join('') || '<span class="muted">—</span>'}</div></div></div>`;
}

/* ---------- toasts y modal ---------- */
function toast(msg, type) {
  const el = document.createElement('div'); el.className = 'toast ' + (type === 'err' ? 'err' : ''); el.textContent = msg;
  el.onclick = () => el.remove(); $('#toasts').appendChild(el); setTimeout(() => el.remove(), type === 'err' ? 9000 : 6000);
}
function openModal(html) { $('#modal').innerHTML = `<div class="mbox">${html}</div>`; }
function closeModal() { $('#modal').innerHTML = ''; if (pendingRender) render(); }

/* =====================================================================
   ACCIONES
   ===================================================================== */
async function copy(text) {
  try { await navigator.clipboard.writeText(text); }
  catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch { } ta.remove(); }
  toast('Copiado');
}
function download(name, text, type = 'text/plain') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const T_ = id => S.tickets[id];
const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? s : '';
function pushStep(t, type, x, src) {
  const text = String(x.texto || '').trim(); if (!text) return false;
  if ((t.steps || []).some(s => !s.done && norm(s.text) === norm(text))) return false;
  t.steps.push({ id: uid(), type, text, owner: x.responsable === 'cliente' ? 'cliente' : 'inference', due: validDate(x.vence), done: false, src });
  return true;
}

const ACT = {
  nav: d => go(d.v, d.id),
  bell: () => { UI.bell = !UI.bell; render(); },
  alertGo: d => { const a = S.notifications.find(x => x.id === d.aid); if (a) a.read = true; save(); UI.bell = false; d.id && S.tickets[d.id] ? go('ticket', d.id) : go('daily'); },
  alertsRead: () => { S.notifications.forEach(a => a.read = true); save(); render(); },
  openTicket: d => go('ticket', d.id),
  closeTab: d => { UI.tabs = UI.tabs.filter(x => x !== d.id); if (UI.route.v === 'ticket' && UI.route.id === d.id) UI.route = { v: 'dash', id: 'all' }; render(); },
  refresh: () => { UI.forceMeta = true; syncAll(); },
  refreshOne: async d => { const t = T_(d.id); try { await refreshTicket(d.id, true); if (t.slackId) await refreshSlack(t); } catch (e) { toast(e.message, 'err'); } save(); render(); },
  /* dashboards */
  newFolder: () => { const n = prompt('Nombre de la carpeta (ej: Autónoma, Proyectos 2026)'); if (n && n.trim()) { S.folders.push({ id: uid(), name: n.trim(), open: true, dashboards: [] }); save(); render(); } },
  renFolder: d => { const f = S.folders.find(x => x.id === d.id), n = prompt('Nuevo nombre', f.name); if (n && n.trim()) { f.name = n.trim(); save(); render(); } },
  delFolder: d => { const f = S.folders.find(x => x.id === d.id); if (confirm(`¿Eliminar la carpeta «${f.name}» y sus ${f.dashboards.length} dashboard(s)? Los tickets no se borran.`)) { S.folders = S.folders.filter(x => x !== f); if (!findDash(UI.route.id)) UI.route.id = 'all'; save(); render(); } },
  newDash: d => { const f = S.folders.find(x => x.id === d.id), n = prompt('Nombre del dashboard'); if (n && n.trim()) { const nd = { id: uid(), name: n.trim(), filters: { types: [], q: '', status: '', client: '', owner: '', slack: '', attention: false } }; f.dashboards.push(nd); f.open = true; UI.route = { v: 'dash', id: nd.id }; save(); render(); } },
  renDash: d => { const x = findDash(d.id), n = prompt('Nuevo nombre', x.name); if (n && n.trim()) { x.name = n.trim(); save(); render(); } },
  delDash: d => { const x = findDash(d.id); if (confirm(`¿Eliminar el dashboard «${x.name}»?`)) { S.folders.forEach(f => f.dashboards = f.dashboards.filter(y => y.id !== d.id)); if (UI.route.id === d.id) UI.route.id = 'all'; save(); render(); } },
  toggleFolder: d => { const f = S.folders.find(x => x.id === d.id); f.open = !f.open; save(); render(); },
  selectDash: d => { UI.route = { v: 'dash', id: d.id }; render(); },
  dfType: d => { const dd = UI.route.id === 'all' ? null : findDash(UI.route.id), f = dd ? dd.filters : UI.fAll; f.types = f.types || []; f.types = f.types.includes(d.t) ? f.types.filter(x => x !== d.t) : [...f.types, d.t]; save(); render(); },
  /* ticket */
  ttab: d => { UI.tab[d.id] = d.k; render(); },
  unlinkSlack: d => { const t = T_(d.id); t.slackId = ''; t.slackName = ''; t.slackManualOff = true; t.lastSlackTs = '0'; delete C.slack[d.id]; save(); render(); },
  closeTicket: d => { const t = T_(d.id); if (t.readyToClose || confirm('Este ticket no figura como cerrado. ¿Generar resumen final y archivarlo de todas formas?')) closeAndArchive(d.id); },
  confirmArchive: d => confirmArchive(d.id),
  closeModal: () => closeModal(),
  addStep: d => {
    const t = T_(d.id), text = $('#ns_text').value.trim(); if (!text) return toast('Escribe la descripción', 'err');
    const date = $('#ns_date').value, time = $('#ns_time').value;
    t.steps.push({ id: uid(), type: $('#ns_type').value, text, owner: $('#ns_owner').value, due: date ? (time ? `${date}T${time}` : date) : '', done: false, src: 'manual' });
    save(); render();
  },
  delStep: d => { const t = T_(d.id); t.steps = t.steps.filter(s => s.id !== d.sid); save(); render(); },
  addRem: d => {
    const t = T_(d.id), text = $('#rm_text').value.trim(), date = $('#rm_date').value, time = $('#rm_time').value || '09:00';
    if (!text || !date) return toast('Escribe qué recordar y la fecha', 'err');
    t.reminders.push({ id: uid(), text, due: `${date}T${time}`, done: false, source: 'manual' }); save(); render();
  },
  delRem: d => { const t = T_(d.id); t.reminders = t.reminders.filter(r => r.id !== d.rid); save(); render(); },
  remFromDate: d => {
    const t = T_(d.id), x = detectedFor(t)[+d.i]; if (!x) return;
    t.reminders.push({ id: uid(), text: trunc(x.snip, 130), due: `${x.date}T${x.time || '09:00'}`, done: false, source: x.src });
    t.converted[x.key] = 1; save(); render(); toast('Recordatorio creado');
  },
  /* reuniones */
  newMeeting: d => { const t = T_(d.id), m = { id: uid(), title: 'Reunión ' + new Date().toLocaleDateString('es-PE'), date: isoDay(new Date()), transcript: '', summary: null, busy: '' }; t.meetings.push(m); save(); render(); },
  delMeeting: d => { if (confirm('¿Eliminar esta reunión?')) { const t = T_(d.id); t.meetings = t.meetings.filter(m => m.id !== d.mid); save(); render(); } },
  recStart: d => recStart(d.id, d.mid, d.tab === '1'),
  recStop: () => recStop(),
  summarize: d => summarizeMeeting(d.id, d.mid),
  meetToSteps: d => {
    const t = T_(d.id), m = findMeeting(d.id, d.mid); let n = 0;
    (m.summary.pendientes || []).forEach(x => { if (pushStep(t, 'pendiente', x, 'reunión')) n++; });
    (m.summary.siguientes_pasos || []).forEach(x => { if (pushStep(t, 'siguiente', x, 'reunión')) n++; });
    save(); render(); toast(n ? `${n} elemento(s) agregados a Seguimiento` : 'Ya estaban agregados');
  },
  copyEl: d => { const el = document.getElementById(d.el); if (el) copy(el.value !== undefined && el.tagName === 'TEXTAREA' ? el.value : el.textContent); },
  /* plantillas del ticket */
  tplRegen: d => { UI.tpl[d.id].text = null; UI.tpl[d.id].edited = false; render(); },
  tplMail: d => {
    const t = T_(d.id), text = ($('#tplText') || {}).value || '';
    const subj = `Ticket #${t.id} – ${tplVars(t).asunto}`;
    if (text.length > 1800) { copy(text); toast('El texto es largo: se copió al portapapeles, pégalo en tu correo'); return; }
    location.href = `mailto:?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(text)}`;
  },
  tplPolish: async d => {
    const cur = UI.tpl[d.id]; UI.busy['pol' + d.id] = true; render();
    try { cur.edited = true; cur.text = (await ai('Eres un redactor de correos profesionales en español (Perú). Mejora la redacción del texto: claro, cordial y breve. Conserva todos los datos, listas, fechas y responsables. Devuelve solo el correo, sin comentarios.', ($('#tplText') || {}).value || cur.text, { json: false })).trim(); }
    catch (e) { toast('IA: ' + e.message, 'err'); }
    UI.busy['pol' + d.id] = false; render();
  },
  /* IA */
  analyze: d => analyzeTicket(T_(d.id), d.instr ? ($('#aiInstr') || {}).value : ''),
  aiState: d => { const t = T_(d.id); t.internal = t.ai.data.estado; save(); render(); },
  aiAdd: d => { const t = T_(d.id), a = t.ai.data, x = (d.kind === 'siguiente' ? a.siguientes_pasos : a.pendientes)[+d.i]; toast(pushStep(t, d.kind, x, 'IA') ? 'Agregado a Seguimiento' : 'Ya estaba agregado'); save(); render(); },
  aiAddAll: d => { const t = T_(d.id), a = t.ai.data; let n = 0; (a.siguientes_pasos || []).forEach(x => pushStep(t, 'siguiente', x, 'IA') && n++); (a.pendientes || []).forEach(x => pushStep(t, 'pendiente', x, 'IA') && n++); save(); render(); toast(`${n} elemento(s) agregados`); },
  aiRemind: d => { const t = T_(d.id), f = t.ai.data.fechas[+d.i]; if (!validDate(f.fecha)) return toast('La IA no dio una fecha válida', 'err'); t.reminders.push({ id: uid(), text: f.texto, due: `${f.fecha}T${f.hora && /^\d{2}:\d{2}$/.test(f.hora) ? f.hora : '09:00'}`, done: false, source: 'IA' }); save(); render(); toast('Recordatorio creado'); },
  aiToTpl: d => { const t = T_(d.id); UI.tpl[d.id] = { id: (S.templates[0] || {}).id, text: t.ai.data.respuestas[+d.i].texto, edited: true }; UI.tab[d.id] = 'tpl'; render(); },
  /* pendientes y daily */
  pendF: d => { UI.pend[d.k] = d.v; render(); },
  dailyCopy: () => copy(dailyRows().map(dailyLine).join('\n')),
  dailyCopyHTML: async () => {
    const rows = dailyRows(), th = ['Ticket', 'Tipo', 'Cliente', 'Estado', 'Siguiente paso', 'Resp.', 'Vence'];
    const html = `<table border="1" cellpadding="4" style="border-collapse:collapse;font-family:Arial;font-size:12px"><tr>${th.map(x => `<th>${x}</th>`).join('')}</tr>${rows.map(r => `<tr><td>#${r.t.id}</td><td>${r.t.type.toUpperCase()}</td><td>${esc(r.t.client)}</td><td>${esc(r.st)}</td><td>${esc(r.ns ? r.ns.text : 'sin definir')}</td><td>${r.ns ? OWN[r.ns.owner] : ''}</td><td>${r.ns ? fmtDue(r.ns.due) : ''}</td></tr>`).join('')}</table>`;
    try { await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([rows.map(dailyLine).join('\n')], { type: 'text/plain' }) })]); toast('Tabla copiada'); }
    catch { copy(rows.map(dailyLine).join('\n')); }
  },
  dailyAI: async () => {
    UI.busy.daily = true; render();
    try { UI.dailyText = (await ai('Eres el asistente de un Project Manager. Con las líneas de estado de sus tickets redacta un update de cierre de día breve en español: primero 2-3 frases con lo más importante, luego una línea por ticket en el formato «#ticket – estado – siguiente paso (responsable cliente/Inference) – fecha». Marca con ⚠ lo vencido o que requiere acción hoy. No inventes datos.', `Hoy es ${todayStr()}.\n` + dailyRows().map(dailyLine).join('\n'), { json: false })).trim(); }
    catch (e) { toast('IA: ' + e.message, 'err'); }
    UI.busy.daily = false; render();
  },
  /* plantillas globales */
  tplSel: d => { UI.tplEdit = d.id; render(); },
  tplNew: () => { const t = { id: uid(), name: 'Nueva plantilla', body: 'Hola {{contacto}},\n\n\n\nSaludos,\n{{yo}}' }; S.templates.push(t); UI.tplEdit = t.id; save(); render(); },
  tplDel: d => { if (confirm('¿Eliminar esta plantilla?')) { S.templates = S.templates.filter(t => t.id !== d.id); UI.tplEdit = null; save(); render(); } },
  tplReset: () => { if (confirm('¿Restaurar las plantillas de fábrica? Se pierden tus cambios.')) { S.templates = defaultTemplates(); UI.tplEdit = null; save(); render(); } },
  /* archivo */
  archCopy: d => copy(S.archive[+d.i].summary),
  archDl: d => { const a = S.archive[+d.i]; download(`ticket-${a.id}.md`, a.summary, 'text/markdown'); },
  archDel: d => { if (confirm('¿Eliminar este resumen del archivo?')) { S.archive.splice(+d.i, 1); save(); render(); } },
  /* ajustes */
  testConn: async () => { await loadHealth(); render(); C.health ? toast('Conexión correcta') : toast(UI.err || 'No se pudo conectar', 'err'); },
  askNotif: async () => { if ('Notification' in window) await Notification.requestPermission(); render(); },
  exportData: () => { const o = { settings: { ...S.settings, appKey: '' } }; KV_KEYS.forEach(k => o[k] = S[k]); download(`pm-hub-${isoDay(new Date())}.json`, JSON.stringify(o, null, 1), 'application/json'); },
  kvPush: () => kvPush(true),
  kvPull: () => kvPull(),
};

const CH = {
  dfilter: el => { const d = UI.route.id === 'all' ? null : findDash(UI.route.id), f = d ? d.filters : UI.fAll; f[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; save(); render(); },
  linkSlack: el => { const t = T_(el.dataset.id), c = C.channels.find(x => x.id === el.value); if (!c) return; Object.assign(t, { slackId: c.id, slackName: c.name, slackAuto: false, slackManualOff: false, lastSlackTs: '0' }); save(); render(); refreshSlack(t).then(() => { save(); render(); }).catch(e => toast(e.message, 'err')); },
  internal: el => { T_(el.dataset.id).internal = el.value; save(); render(); },
  stepDone: el => { const s = T_(el.dataset.id).steps.find(x => x.id === el.dataset.sid); s.done = el.checked; save(); render(); },
  remDone: el => { const r = T_(el.dataset.id).reminders.find(x => x.id === el.dataset.rid); r.done = el.checked; save(); render(); },
  notes: el => { T_(el.dataset.id).notes = el.value; save(); },
  meetTitle: el => { findMeeting(el.dataset.id, el.dataset.mid).title = el.value; save(); },
  meetText: el => { findMeeting(el.dataset.id, el.dataset.mid).transcript = el.value; save(); },
  audioFile: el => { const f = el.files[0]; el.value = ''; if (f) transcribeBlob(el.dataset.id, el.dataset.mid, f, f.name); },
  tplPick: el => { UI.tpl[el.dataset.id] = { id: el.value, text: null, edited: false }; render(); },
  tplText: el => { const c = UI.tpl[el.dataset.id]; if (c) { c.text = el.value; c.edited = true; } },
  extra: el => { UI.extra[el.dataset.id] = el.value; },
  pendOver: el => { UI.pend.overdue = el.checked; render(); },
  dailyScope: el => { UI.daily.scope = el.value; UI.dailyText = ''; render(); },
  tplName: el => { const t = S.templates.find(x => x.id === el.dataset.id); t.name = el.value; save(); },
  tplBody: el => { const t = S.templates.find(x => x.id === el.dataset.id); t.body = el.value; save(); },
  set: el => { S.settings[el.dataset.k] = el.dataset.n ? (+el.value || 0) : el.value.trim(); if (['workerUrl', 'appKey'].includes(el.dataset.k)) { C.health = null; } save(); startTimers(); },
  setChk: el => { S.settings[el.dataset.k] = el.checked; save(); },
  importData: el => {
    const f = el.files[0]; if (!f) return; const r = new FileReader();
    r.onload = () => { try { const o = JSON.parse(r.result); KV_KEYS.forEach(k => { if (o[k] !== undefined) S[k] = o[k]; }); if (o.settings) { const { appKey, workerUrl, ...rest } = o.settings; Object.assign(S.settings, rest); } save(); render(); toast('Copia importada'); } catch (e) { toast('Archivo inválido', 'err'); } };
    r.readAsText(f);
  },
};

document.addEventListener('click', e => {
  if (UI.bell && !e.target.closest('.bellmenu') && !e.target.closest('[data-act="bell"]')) { UI.bell = false; render(); }
  const el = e.target.closest('[data-act]'); if (!el) return;
  if (el.tagName === 'A') e.preventDefault();
  const fn = ACT[el.dataset.act]; if (fn) fn(el.dataset, el, e);
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-ch]'); if (!el) return;
  const fn = CH[el.dataset.ch]; if (fn) fn(el);
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.dataset.ch === 'dfilter') e.target.blur(); });
document.addEventListener('focusout', () => setTimeout(() => {
  if (!pendingRender) return; const a = document.activeElement;
  if (!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) && !$('#modal').innerHTML) render();
}, 200));
window.addEventListener('beforeunload', e => { if (REC.on) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- arranque ---------- */
(async function init() {
  render(); startTimers();
  if (configured()) { await loadHealth(); await syncAll(); }
  tick();
})();
