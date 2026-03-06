// ft-custos.js — v2.0  Simulador de preço com tutorial e trigger inicial
import { getReceitas } from './ft-receitas.js';
import { calcPrecoMarkup, calcPrecoMargem, calcLucro, calcMargemReal, calcMarkupImplicito } from './ft-calc.js';
import { formatCurrency, formatPercent, formatQtdUnid, parseNum } from './ft-format.js';
import { toast, renderTutorial } from './ft-ui.js';
import { carregarConfig, salvarConfig } from './ft-storage.js';
import { ico } from './ft-icons.js';

let _cfg  = { markup: 200, margem: 40 };
let _modo = 'markup';

export async function initSimulador() {
  const c = await carregarConfig();
  if (c) _cfg = { markup: c.markup_padrao||200, margem: c.margem_desejada||40 };
}

export function renderSimulador() {
  const recs = getReceitas();
  const wrap = document.getElementById('ft-simulador');
  if (!wrap) return;

  renderTutorial('ft-sec-sim', 'sim', ico.simulator, 'Como usar o Simulador', [
    'Selecione uma pizza cadastrada em <strong>Receitas</strong>.',
    '<strong>Markup</strong>: percentual sobre o custo (ex.: 200% = preço 3× o custo).',
    '<strong>Margem</strong>: percentual de lucro sobre o preço de venda (ex.: 40%).',
    'Ajuste o slider e veja o preço sugerido, lucro e margem em tempo real.',
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
        <div class="ft-sim-custo-row">
          <span class="ft-sim-custo-lbl">Custo de produção</span>
          <span class="ft-sim-custo-val" id="ft-sim-custo">—</span>
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

function _calc() {
  const selEl = document.getElementById('ft-sim-sel');
  const rec   = selEl?.value ? getReceitas().find(r=>r.id===selEl.value) : null;
  const resEl = document.getElementById('ft-sim-res');
  if (!rec) { resEl?.classList.add('hidden'); return; }
  resEl?.classList.remove('hidden');

  const custo = rec.custo_total||0;
  const custEl = document.getElementById('ft-sim-custo');
  if (custEl) custEl.textContent = formatCurrency(custo);

  let preco = 0;
  if (_modo==='markup') {
    const mk = parseNum(document.getElementById('ft-mk-i')?.value);
    preco = calcPrecoMarkup(custo, mk);
    _cfg.markup = mk;
  } else {
    const mg = parseNum(document.getElementById('ft-mg-i')?.value);
    if (mg>=100) { toast('Margem deve ser menor que 100%.','aviso'); return; }
    preco = calcPrecoMargem(custo, mg);
    _cfg.margem = mg;
  }

  const lucro = calcLucro(preco, custo);
  const marR  = calcMargemReal(preco, custo);
  const mkImp = calcMarkupImplicito(preco, custo);

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
        const pct = custo>0 ? (ing.custo/custo*100) : 0;
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

  salvarConfig({ markup_padrao: _cfg.markup, margem_desejada: _cfg.margem }).catch(()=>{});
}
