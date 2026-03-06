// ft-custos.js — v3.0  Custos adicionais: overhead + mão de obra
import { getReceitas } from './ft-receitas.js';
import { calcPrecoMarkup, calcPrecoMargem, calcLucro, calcMargemReal, calcMarkupImplicito, calcCustoComExtras } from './ft-calc.js';
import { formatCurrency, formatPercent, formatQtdUnid, parseNum } from './ft-format.js';
import { toast, renderTutorial } from './ft-ui.js';
import { carregarConfig, salvarConfig } from './ft-storage.js';
import { ico } from './ft-icons.js';

let _cfg  = { markup: 200, margem: 40, overhead: 15, maoDeObra: 20 };
let _modo = 'markup';

export async function initSimulador() {
  const c = await carregarConfig();
  if (c) _cfg = {
    markup:    c.markup_padrao   || 200,
    margem:    c.margem_desejada || 40,
    overhead:  c.overhead        ?? 15,
    maoDeObra: c.mao_de_obra     ?? 20,
  };
}

export function renderSimulador() {
  const recs = getReceitas();
  const wrap = document.getElementById('ft-simulador');
  if (!wrap) return;

  renderTutorial('ft-sec-sim', 'sim', ico.simulator, 'Como usar o Simulador', [
    'Selecione uma pizza cadastrada em <strong>Receitas</strong>.',
    '<strong>Overhead</strong>: gás, energia, embalagens — distribuídos como % sobre o custo dos ingredientes.',
    '<strong>Mão de obra</strong>: custo de produção distribuído como % sobre o custo dos ingredientes.',
    '<strong>Markup</strong>: percentual sobre o custo total (ex.: 200% = preço 3× o custo).',
    '<strong>Margem</strong>: percentual de lucro sobre o preço de venda (ex.: 40%).',
  ]);

  const opts = recs.length
    ? recs.slice().sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'))
        .map(r=>`<option value="${r.id}">${r.nome} (${r.tamanho})</option>`).join('')
    : '';

  wrap.innerHTML = `
    <!-- Bloco: seleção -->
    <div class="ft-sim-bloco">
      <div class="ft-sim-bh">${ico.recipes}<span>Selecionar pizza</span></div>
      ${recs.length
        ? `<select id="ft-sim-sel" class="ft-input ft-select">
             <option value="">— Selecione uma pizza —</option>${opts}
           </select>`
        : `<div class="ft-sim-empty">
             ${ico.warn}
             <span>Nenhuma receita cadastrada. Acesse <strong>Receitas</strong> e crie uma primeiro.</span>
           </div>`}
    </div>

    <!-- Bloco: custos adicionais -->
    <div class="ft-sim-bloco">
      <div class="ft-sim-bh">${ico.tag}<span>Custos adicionais</span></div>
      <div class="ft-tip-banner">${ico.info}
        <span>Percentuais aplicados <strong>sobre o custo dos ingredientes</strong>. Salvos automaticamente.</span>
      </div>

      <div class="ft-overhead-row">
        <div class="ft-overhead-lbl">
          <span>🔥 Overhead</span>
          <span class="ft-overhead-sub">gás, energia, embalagens</span>
        </div>
        <div class="ft-slider-val-row" style="gap:8px">
          <input type="range" id="ft-oh-r" class="ft-slider" min="0" max="100" step="1" value="${_cfg.overhead}" style="flex:1">
          <input id="ft-oh-i" class="ft-input ft-input-sm" type="number" value="${_cfg.overhead}" min="0" max="100" step="1" inputmode="decimal" style="width:52px">
          <span>%</span>
        </div>
      </div>

      <div class="ft-overhead-row" style="margin-top:12px">
        <div class="ft-overhead-lbl">
          <span>👷 Mão de obra</span>
          <span class="ft-overhead-sub">custo de produção</span>
        </div>
        <div class="ft-slider-val-row" style="gap:8px">
          <input type="range" id="ft-mob-r" class="ft-slider" min="0" max="100" step="1" value="${_cfg.maoDeObra}" style="flex:1">
          <input id="ft-mob-i" class="ft-input ft-input-sm" type="number" value="${_cfg.maoDeObra}" min="0" max="200" step="1" inputmode="decimal" style="width:52px">
          <span>%</span>
        </div>
      </div>
    </div>

    <!-- Bloco: método -->
    <div class="ft-sim-bloco">
      <div class="ft-sim-bh">${ico.simulator}<span>Método de precificação</span></div>
      <div class="ft-sim-tabs">
        <button class="ft-sim-tab${_modo==='markup'?' active':''}" data-m="markup" type="button">Markup</button>
        <button class="ft-sim-tab${_modo==='margem'?' active':''}" data-m="margem" type="button">Margem</button>
      </div>

      <div id="ft-sm-markup" class="${_modo!=='markup'?'hidden':''}">
        <div class="ft-tip-banner">${ico.info}
          <span>Markup de <strong>200%</strong> significa: preço = custo × 3.</span>
        </div>
        <div class="ft-slider-row">
          <input type="range" id="ft-mk-r" class="ft-slider" min="50" max="500" step="10" value="${_cfg.markup}">
        </div>
        <div class="ft-slider-val-row">
          <span>Markup:</span>
          <input id="ft-mk-i" class="ft-input ft-input-sm" type="number" value="${_cfg.markup}" min="0" step="10" inputmode="decimal">
          <span>%</span>
        </div>
      </div>

      <div id="ft-sm-margem" class="${_modo!=='margem'?'hidden':''}">
        <div class="ft-tip-banner">${ico.info}
          <span>Margem de <strong>40%</strong> = R$40 de lucro a cada R$100 vendido.</span>
        </div>
        <div class="ft-slider-row">
          <input type="range" id="ft-mg-r" class="ft-slider" min="5" max="90" step="5" value="${_cfg.margem}">
        </div>
        <div class="ft-slider-val-row">
          <span>Margem:</span>
          <input id="ft-mg-i" class="ft-input ft-input-sm" type="number" value="${_cfg.margem}" min="1" max="99" step="1" inputmode="decimal">
          <span>%</span>
        </div>
      </div>
    </div>

    <!-- Resultado (oculto até selecionar) -->
    <div id="ft-sim-res" class="hidden">
      <div class="ft-sim-bloco ft-sim-bloco-res">
        <div class="ft-sim-bh">${ico.money}<span>Resultado</span></div>

        <!-- Breakdown de custo -->
        <div class="ft-custo-breakdown" id="ft-sim-breakdown">
          <div class="ft-cb-row">
            <span class="ft-cb-lbl">🧀 Ingredientes</span>
            <span class="ft-cb-val" id="ft-sim-custo-ing">—</span>
          </div>
          <div class="ft-cb-row ft-cb-extra" id="ft-sim-oh-row">
            <span class="ft-cb-lbl" id="ft-sim-oh-lbl">🔥 Overhead (0%)</span>
            <span class="ft-cb-val" id="ft-sim-oh-val">—</span>
          </div>
          <div class="ft-cb-row ft-cb-extra" id="ft-sim-mob-row">
            <span class="ft-cb-lbl" id="ft-sim-mob-lbl">👷 Mão de obra (0%)</span>
            <span class="ft-cb-val" id="ft-sim-mob-val">—</span>
          </div>
          <div class="ft-cb-row ft-cb-total">
            <span class="ft-cb-lbl">💰 Custo total</span>
            <span class="ft-cb-val ft-cb-val-total" id="ft-sim-custo">—</span>
          </div>
        </div>

        <div class="ft-res-grid" id="ft-res-cards"></div>
      </div>
      <div class="ft-sim-bloco">
        <div class="ft-sim-bh">${ico.tag}<span>Composição do custo</span></div>
        <div id="ft-sim-comp"></div>
      </div>
    </div>`;

  // ── Eventos ──────────────────────────────────────────────────
  document.getElementById('ft-sim-sel')?.addEventListener('change', _calc);

  document.querySelectorAll('.ft-sim-tab').forEach(b => b.addEventListener('click', () => {
    _modo = b.dataset.m;
    document.querySelectorAll('.ft-sim-tab').forEach(x=>x.classList.toggle('active', x===b));
    document.getElementById('ft-sm-markup')?.classList.toggle('hidden', _modo!=='markup');
    document.getElementById('ft-sm-margem')?.classList.toggle('hidden', _modo!=='margem');
    _calc();
  }));

  _bindPair('ft-mk-r','ft-mk-i');
  _bindPair('ft-mg-r','ft-mg-i');
  _bindExtra('ft-oh-r','ft-oh-i');
  _bindExtra('ft-mob-r','ft-mob-i');

  // Trigger automático se só há uma receita
  if (recs.length===1) {
    const s = document.getElementById('ft-sim-sel');
    if (s) { s.value=recs[0].id; _calc(); }
  }
}

function _bindPair(rid, iid) {
  const r=document.getElementById(rid), i=document.getElementById(iid);
  if(!r||!i) return;
  r.addEventListener('input',()=>{ i.value=r.value; _calc(); });
  i.addEventListener('input',()=>{ r.value=i.value; _calc(); });
}

/** Persiste só overhead + mão de obra (sem precisar de receita selecionada). */
function _salvarExtras() {
  const oh  = Math.max(0, parseNum(document.getElementById('ft-oh-i')?.value)  || 0);
  const mob = Math.max(0, parseNum(document.getElementById('ft-mob-i')?.value) || 0);
  _cfg.overhead  = oh;
  _cfg.maoDeObra = mob;
  salvarConfig({
    markup_padrao:   _cfg.markup,
    margem_desejada: _cfg.margem,
    overhead:        _cfg.overhead,
    mao_de_obra:     _cfg.maoDeObra,
  }).catch(()=>{});
}

function _bindExtra(rid, iid) {
  const r=document.getElementById(rid), i=document.getElementById(iid);
  if(!r||!i) return;
  r.addEventListener('input',()=>{ i.value=r.value; _salvarExtras(); _calc(); });
  i.addEventListener('input',()=>{ r.value=i.value; _salvarExtras(); _calc(); });
}

function _calc() {
  const selEl = document.getElementById('ft-sim-sel');
  const rec   = selEl?.value ? getReceitas().find(r=>r.id===selEl.value) : null;
  const resEl = document.getElementById('ft-sim-res');
  if (!rec) { resEl?.classList.add('hidden'); return; }
  resEl?.classList.remove('hidden');

  // ── Lê overhead e mão de obra atuais ─────────────────────────
  const oh  = Math.max(0, parseNum(document.getElementById('ft-oh-i')?.value)  || 0);
  const mob = Math.max(0, parseNum(document.getElementById('ft-mob-i')?.value) || 0);
  _cfg.overhead   = oh;
  _cfg.maoDeObra  = mob;

  // ── Calcula custo total com extras ────────────────────────────
  const custoIng = rec.custo_total || 0;
  const { total: custoTotal, valorOverhead, valorMaoDeObra } = calcCustoComExtras(custoIng, oh, mob);

  // ── Atualiza breakdown ────────────────────────────────────────
  const setEl = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };

  setEl('ft-sim-custo-ing', formatCurrency(custoIng));
  setEl('ft-sim-custo',     formatCurrency(custoTotal));

  // Overhead row — oculta se 0%
  const ohRow = document.getElementById('ft-sim-oh-row');
  if (ohRow) ohRow.style.display = oh > 0 ? '' : 'none';
  setEl('ft-sim-oh-lbl', `🔥 Overhead (${oh}%)`);
  setEl('ft-sim-oh-val', `+ ${formatCurrency(valorOverhead)}`);

  // Mão de obra row — oculta se 0%
  const mobRow = document.getElementById('ft-sim-mob-row');
  if (mobRow) mobRow.style.display = mob > 0 ? '' : 'none';
  setEl('ft-sim-mob-lbl', `👷 Mão de obra (${mob}%)`);
  setEl('ft-sim-mob-val', `+ ${formatCurrency(valorMaoDeObra)}`);

  // ── Precificação sobre o custo TOTAL ──────────────────────────
  let preco = 0;
  if (_modo==='markup') {
    const mk = parseNum(document.getElementById('ft-mk-i')?.value);
    preco = calcPrecoMarkup(custoTotal, mk);
    _cfg.markup = mk;
  } else {
    const mg = parseNum(document.getElementById('ft-mg-i')?.value);
    if (mg>=100) { toast('Margem deve ser menor que 100%.','aviso'); return; }
    preco = calcPrecoMargem(custoTotal, mg);
    _cfg.margem = mg;
  }

  const lucro = calcLucro(preco, custoTotal);
  const marR  = calcMargemReal(preco, custoTotal);
  const mkImp = calcMarkupImplicito(preco, custoTotal);

  const cards = document.getElementById('ft-res-cards');
  if (cards) cards.innerHTML = `
    <div class="ft-rcard ft-rcard-preco">
      <div class="ft-rcard-lbl">Preço sugerido</div>
      <div class="ft-rcard-val">${formatCurrency(preco)}</div>
    </div>
    <div class="ft-rcard ft-rcard-lucro">
      <div class="ft-rcard-lbl">Lucro</div>
      <div class="ft-rcard-val">${formatCurrency(lucro)}</div>
    </div>
    <div class="ft-rcard">
      <div class="ft-rcard-lbl">Margem real</div>
      <div class="ft-rcard-val">${formatPercent(marR)}</div>
    </div>
    <div class="ft-rcard">
      <div class="ft-rcard-lbl">Markup impl.</div>
      <div class="ft-rcard-val">${formatPercent(mkImp)}</div>
    </div>`;

  const comp = document.getElementById('ft-sim-comp');
  if (comp) {
    const ings = rec.ingredientes||[];
    if (!ings.length) {
      comp.innerHTML='<div class="ft-sim-empty" style="padding:12px 0">Sem ingredientes nesta receita.</div>';
    } else {
      comp.innerHTML = ings.map(ing => {
        // % sobre custo dos ingredientes (soma 100%) — overhead/mob mostrados separadamente
        const pct = custoIng>0 ? (ing.custo/custoIng*100) : 0;
        return `
          <div class="ft-comp-row">
            <span class="ft-comp-nome">${ing.nome}</span>
            <span class="ft-comp-qtd">${formatQtdUnid(ing.quantidade,ing.unidade)}</span>
            <span class="ft-comp-bar-wrap"><span class="ft-comp-bar" style="width:${Math.min(pct,100).toFixed(1)}%"></span></span>
            <span class="ft-comp-cost">${formatCurrency(ing.custo)}</span>
            <span class="ft-comp-pct">${pct.toFixed(0)}%</span>
          </div>`;
      }).join('');
    }
  }

  salvarConfig({
    markup_padrao:   _cfg.markup,
    margem_desejada: _cfg.margem,
    overhead:        _cfg.overhead,
    mao_de_obra:     _cfg.maoDeObra,
  }).catch(()=>{});
}
