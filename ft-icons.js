// ft-icons.js — v2.1  Apple SF Symbols style (stroke, no fill)
// v2.1: adicionado ico.prep (Preparo Antecipado — ícone de camadas/lote)
const S = (d) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
   stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"
   aria-hidden="true">${d}</svg>`;

export const ico = {
  ingredients: S('<path d="M12 2C9 2 7 4.2 7 7c0 2 1.1 3.7 2.7 4.5V19a2.3 2.3 0 004.6 0v-7.5C15.9 10.7 17 9 17 7c0-2.8-2.2-5-5-5z"/><line x1="9.5" y1="11" x2="14.5" y2="11"/>'),
  recipes:     S('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>'),
  simulator:   S('<circle cx="8" cy="8" r="3.5"/><circle cx="16" cy="16" r="3.5"/><line x1="10.5" y1="10.5" x2="13.5" y2="13.5"/>'),
  dashboard:   S('<rect x="3" y="3" width="7" height="8" rx="1.5"/><rect x="14" y="3" width="7" height="4" rx="1.5"/><rect x="14" y="11" width="7" height="10" rx="1.5"/><rect x="3" y="15" width="7" height="6" rx="1.5"/>'),
  exportIcon:  S('<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>'),
  // ── v2.1 — Preparo Antecipado: ícone de camadas empilhadas (batch/lote) ──
  // Representa ingredientes em lote, receita de preparo antecipado.
  prep:        S('<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>'),
  plus:    S('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'),
  edit:    S('<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>'),
  trash:   S('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/>'),
  close:   S('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'),
  check:   S('<polyline points="20 6 9 17 4 12"/>'),
  save:    S('<path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13"/><polyline points="7 3 7 8 15 8"/>'),
  search:  S('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'),
  chevR:   S('<polyline points="9 18 15 12 9 6"/>'),
  chevD:   S('<polyline points="6 9 12 15 18 9"/>'),
  cloud:   S('<path d="M18 10h-1.3A8 8 0 109 20h9a5 5 0 000-10z"/>'),
  cloudOff:S('<path d="M22.6 17A5 5 0 0018 10h-1.3A8 8 0 005 3.3"/><path d="M22 17.2V19a2 2 0 01-2 2H7a5 5 0 01-.1-10h.1"/><line x1="1" y1="1" x2="23" y2="23"/>'),
  sync:    S('<polyline points="23 4 23 10 17 10"/><path d="M20.5 15a9 9 0 11-2.1-9.4L23 10"/>'),
  info:    S('<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'),
  warn:    S('<path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h16.9a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'),
  tip:     S('<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r=".5" fill="currentColor"/>'),
  tag:     S('<path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L2 12V2h10l8.6 8.6a2 2 0 010 2.8z"/><line x1="7" y1="7" x2="7.01" y2="7"/>'),
  money:   S('<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/>'),
  trophy:  S('<path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0012 0V2z"/>'),
  star:    S('<polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2"/>'),
  csv:     S('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>'),
  pdf:     S('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>'),
  json:    S('<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>'),
  upload:  S('<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>'),
  download:S('<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'),
  spark:   S('<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>'),
};
