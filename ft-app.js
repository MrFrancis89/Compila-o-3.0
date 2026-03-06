// ft-app.js — v2.1
// v2.1: integração do módulo ft-preparo.js (Preparo Antecipado).
//
// CORREÇÕES APLICADAS
// ─────────────────────────────────────────────────────────────────
// BUG #1 — _setBadge usava dynamic import em cada chamada
//   PROBLEMA : import('./ft-icons.js') é disparado a cada clique/sync,
//              criando micro-promessas desnecessárias. Embora módulos ES
//              sejam cacheados no browser, a cada chamada há overhead de
//              microtask scheduling e lookup no module registry.
//   CORREÇÃO : ico é importado estaticamente no topo do arquivo,
//              eliminando o dynamic import dentro de _setBadge().
//
// BUG #2 — FAB só aparecia nas abas 'ing' e 'rec'
//   PROBLEMA : A aba 'pre' (Preparo Antecipado) também tem um FAB para
//              criar novos preparos, mas o array de abas com FAB não
//              incluía 'pre'.
//   CORREÇÃO : 'pre' adicionado ao array de abas com FAB visível.

import { initFirebase, fbIsAvailable }            from './ft-firebase.js';
import { sincronizarLocalParaFirebase }            from './ft-storage.js';
import { initModalOverlay, setLoading, toast, debounce } from './ft-ui.js';
import { initIngredientes, renderIngredientes, abrirFormIngrediente } from './ft-ingredientes.js';
import { initReceitas,     renderReceitas,     abrirFormReceita     } from './ft-receitas.js';
import { initSimulador,    renderSimulador                          } from './ft-custos.js';
import { renderDashboard                                            } from './ft-dashboard.js';
import { renderExportacao                                           } from './ft-exportacao.js';
import { initPreparo,      renderPreparo,      abrirFormPreparo     } from './ft-preparo.js';
// BUG FIX #1: import estático elimina dynamic import em _setBadge()
import { ico }                                                       from './ft-icons.js';

let _aba = 'ing';

// ─── Boot ─────────────────────────────────────────────────────────
async function init() {
  setLoading(true);
  const app = document.getElementById('ft-app');

  try {
    // Firebase com timeout de 4s para não bloquear o boot
    const fbOk = await Promise.race([
      initFirebase(),
      new Promise(r => setTimeout(() => r(false), 4000)),
    ]);
    if (fbOk) {
      await sincronizarLocalParaFirebase();
      _setBadge(true);
    } else {
      _setBadge(false);
    }

    // Inicializa todos os módulos em paralelo para reduzir tempo de boot
    await Promise.all([
      initIngredientes(),
      initReceitas(),
      initSimulador(),
      initPreparo(),        // v2.1: Preparo Antecipado
    ]);

    _navTo('ing');
  } catch (e) {
    console.error('[ft-app] init error:', e);
    toast('Erro ao inicializar. Modo offline ativo.', 'aviso');
    _navTo('ing');   // garante que o app aparece mesmo com erro
  }

  setLoading(false);
  app?.classList.remove('hidden');
}

// ─── Navegação ────────────────────────────────────────────────────
function _navTo(aba) {
  _aba = aba;

  document.querySelectorAll('.ft-section').forEach(s =>
    s.classList.toggle('active', s.id === `ft-sec-${aba}`));

  document.querySelectorAll('.ft-nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === aba));

  // BUG FIX #2: 'pre' adicionado — FAB visível no Preparo Antecipado também
  const fab = document.getElementById('ft-fab');
  if (fab) fab.style.display = ['ing', 'rec', 'pre'].includes(aba) ? 'flex' : 'none';

  switch (aba) {
    case 'ing':  renderIngredientes(); break;
    case 'rec':  renderReceitas();     break;
    case 'sim':  renderSimulador();    break;
    case 'dash': renderDashboard();    break;
    case 'exp':  renderExportacao();   break;
    case 'pre':  renderPreparo();      break;   // v2.1
  }
}

// ─── FAB ──────────────────────────────────────────────────────────
function _fab() {
  if (_aba === 'ing') abrirFormIngrediente();
  if (_aba === 'rec') abrirFormReceita();
  if (_aba === 'pre') abrirFormPreparo();        // v2.1
}

// ─── Badge Firebase ───────────────────────────────────────────────
// BUG FIX #1: usa ico importado estaticamente — sem dynamic import por chamada.
function _setBadge(online) {
  const b = document.getElementById('ft-sync-btn');
  if (!b) return;
  b.innerHTML = online ? ico.cloud : ico.cloudOff;
  b.title     = online
    ? 'Firebase conectado — clique para sincronizar'
    : 'Modo offline (localStorage)';
  b.classList.toggle('online', online);
}

// ─── Listeners ────────────────────────────────────────────────────
function _listeners() {
  document.querySelectorAll('.ft-nav-btn').forEach(b =>
    b.addEventListener('click', () => _navTo(b.dataset.tab)));

  document.getElementById('ft-fab')?.addEventListener('click', _fab);

  // Buscas com debounce para cada seção
  const busca1 = document.getElementById('ft-busca-ing');
  const busca2 = document.getElementById('ft-busca-rec');
  const busca3 = document.getElementById('ft-busca-pre');   // v2.1

  if (busca1) busca1.addEventListener('input', debounce(e => renderIngredientes(e.target.value)));
  if (busca2) busca2.addEventListener('input', debounce(e => renderReceitas(e.target.value)));
  if (busca3) busca3.addEventListener('input', debounce(e => renderPreparo(e.target.value)));  // v2.1

  document.getElementById('ft-sync-btn')?.addEventListener('click', async () => {
    if (!fbIsAvailable()) { toast('Firebase não configurado.', 'aviso'); return; }
    setLoading(true);
    await sincronizarLocalParaFirebase();
    setLoading(false);
    toast('Dados sincronizados!', 'sucesso');
  });

  // Re-render reativo quando receitas ou ingredientes mudarem
  document.addEventListener('ft:recs-changed', () => {
    if (_aba === 'sim')  renderSimulador();
    if (_aba === 'dash') renderDashboard();
  });
  document.addEventListener('ft:ings-changed', () => {
    if (_aba === 'dash') renderDashboard();
  });

  initModalOverlay();
}

document.addEventListener('DOMContentLoaded', () => { _listeners(); init(); });
