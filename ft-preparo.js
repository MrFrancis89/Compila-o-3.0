// ft-preparo.js — Ficha Técnica v1.0  Preparo Antecipado
// ══════════════════════════════════════════════════════════════════
// Gerencia receitas de preparo antecipado em lote (ex: massa de pizza).
// Estrutura: nome, ingredientes (nome + peso_g + valor_kg), peso_depois_pronto.
// Todos os valores monetários são calculados em tempo real.
// ══════════════════════════════════════════════════════════════════

import { salvar, carregar, remover } from './ft-storage.js';
import { formatCurrency, formatNum, generateId } from './ft-format.js';
import { toast, abrirModal, fecharModal, confirmar, renderEmpty, renderTutorial } from './ft-ui.js';
import { ico } from './ft-icons.js';

const COL    = 'preparos';
let _preps   = [];
let _editIng = [];           // ingredientes em edição (estado temporário do formulário)

// ─── Injeção de estilos ───────────────────────────────────────────
// CSS específico do módulo injeta via JS para manter o módulo auto-contido
// sem exigir modificação de ft-style.css.
function _injectStyles() {
  if (document.getElementById('ft-preparo-styles')) return;
  const s = document.createElement('style');
  s.id = 'ft-preparo-styles';
  s.textContent = `
/* ── Ícone de preparo na lista ──────────────────────────────────── */
.ft-ico-pre { background: rgba(255,214,10,.14); color: #ffd60a; }

/* ── Tabela de ingredientes (edição inline) ─────────────────────── */
.ft-pre-table-wrap {
  border-radius: var(--ft-r-sm);
  border: 1px solid var(--ft-border);
  overflow: hidden;
  background: var(--ft-s2);
}
.ft-pre-thead {
  display: grid;
  grid-template-columns: 1fr 80px 88px 76px 32px;
  gap: 0;
  padding: 8px 10px 6px;
  font-size: 10px;
  font-weight: 700;
  color: var(--ft-txt3);
  text-transform: uppercase;
  letter-spacing: .5px;
  border-bottom: 1px solid var(--ft-border);
  background: var(--ft-s3);
}
.ft-pre-tbody { display: flex; flex-direction: column; gap: 1px; }
.ft-pre-trow {
  display: grid;
  grid-template-columns: 1fr 80px 88px 76px 32px;
  align-items: center;
  gap: 0;
  padding: 5px 6px;
  border-bottom: 1px solid var(--ft-border2);
}
.ft-pre-trow:last-child { border-bottom: none; }
.ft-pre-cell { padding: 0 4px; }
.ft-pre-cell .ft-input {
  padding: 7px 8px;
  /* Mínimo 16px: Safari iOS faz zoom automático em inputs < 16px */
  font-size: 16px;
  width: 100%;
  border-radius: 6px;
  background: var(--ft-s1);
  border: 1px solid var(--ft-border2);
  color: var(--ft-txt);
  -webkit-appearance: none; appearance: none;
}
.ft-pre-cell .ft-input:focus {
  border-color: var(--ft-acc);
  outline: none;
}
/* Campos numéricos: alinhados à direita */
.ft-pre-cell.num .ft-input { text-align: right; }
/* Valor calculado: apenas leitura */
.ft-pre-valor-calc {
  font-size: 13px;
  font-weight: 700;
  color: var(--ft-acc);
  text-align: right;
  padding-right: 6px;
  white-space: nowrap;
}
/* Botão remover linha */
.ft-pre-rm {
  display: flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 50%;
  background: none; border: none;
  color: var(--ft-txt3);
  transition: background .15s, color .15s;
}
.ft-pre-rm svg { width: 12px; height: 12px; }
.ft-pre-rm:active { background: var(--ft-red2); color: var(--ft-red); }

/* ── Empty state da tabela ──────────────────────────────────────── */
.ft-pre-empty-row {
  display: flex; align-items: center; gap: 8px;
  padding: 14px 12px;
  font-size: 13px; color: var(--ft-txt3);
}
.ft-pre-empty-row svg { width: 16px; height: 16px; flex-shrink: 0; }

/* ── Painel de resultado em tempo real ──────────────────────────── */
.ft-pre-result {
  border-radius: var(--ft-r-sm);
  border: 1px solid var(--ft-border);
  overflow: hidden;
  margin-top: 4px;
}
.ft-pre-res-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 11px 14px;
  border-bottom: 1px solid var(--ft-border2);
  font-size: 14px;
}
.ft-pre-res-row:last-child { border-bottom: none; }
.ft-pre-res-lbl { color: var(--ft-txt2); font-size: 13px; }
.ft-pre-res-val { font-weight: 700; color: var(--ft-txt); }
.ft-pre-res-row.hi  { background: var(--ft-s2); }
.ft-pre-res-row.acc { background: var(--ft-acc2); }
.ft-pre-res-row.acc .ft-pre-res-lbl { color: var(--ft-acc); display:flex; align-items:center; gap:5px; }
.ft-pre-res-row.acc .ft-pre-res-lbl svg { width:14px; height:14px; }
.ft-pre-res-row.acc .ft-pre-res-val { color: var(--ft-acc); font-size: 17px; }

/* ── Summary card na lista ──────────────────────────────────────── */
.ft-pre-summary {
  display: flex; gap: 12px; flex-wrap: wrap;
  margin: 0 14px 14px;
}
.ft-pre-sum-card {
  flex: 1; min-width: 120px;
  background: var(--ft-s1); border: 1px solid var(--ft-border);
  border-radius: var(--ft-r-sm); padding: 12px;
  display: flex; flex-direction: column; gap: 4px;
}
.ft-pre-sum-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: .5px; color: var(--ft-txt3); font-weight: 700; }
.ft-pre-sum-val { font-size: 18px; font-weight: 800; color: var(--ft-txt); }
.ft-pre-sum-val.acc { color: var(--ft-acc); }
.ft-pre-sum-val.green { color: var(--ft-green); }

/* ── Detalhes da receita (expand view) ──────────────────────────── */
.ft-pre-detail {
  margin: 0 14px 14px;
  background: var(--ft-s1); border: 1px solid var(--ft-border);
  border-radius: var(--ft-r);
}
.ft-pre-detail-hd {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 14px; border-bottom: 1px solid var(--ft-border);
  font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--ft-txt2);
}
.ft-pre-detail-row {
  display: grid; grid-template-columns: 1fr 70px 80px 76px;
  padding: 9px 14px; border-bottom: 1px solid var(--ft-border2);
  font-size: 13px; align-items: center; gap: 4px;
}
.ft-pre-detail-row:last-child { border-bottom: none; }
.ft-pre-dr-nome { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ft-pre-dr-num  { text-align: right; color: var(--ft-txt2); font-size: 12px; }
.ft-pre-dr-val  { text-align: right; font-weight: 700; color: var(--ft-acc); font-size: 12px; }
.ft-pre-detail-ft {
  padding: 10px 14px; background: var(--ft-s2);
  border-top: 1px solid var(--ft-border);
  display: flex; justify-content: space-between; align-items: center;
  font-size: 12px; color: var(--ft-txt2);
}
.ft-pre-detail-ft strong { color: var(--ft-txt); }
`;
  document.head.appendChild(s);
}

// ─── Cálculos ─────────────────────────────────────────────────────
function _calcValor(peso_g, valor_kg) {
  return (peso_g / 1000) * valor_kg;
}

function _calcTotais(ings, peso_depois_pronto) {
  const peso_total  = ings.reduce((s, i) => s + (i.peso_g  || 0), 0);
  const custo_total = ings.reduce((s, i) => s + (i.valor   || 0), 0);
  const pdp         = peso_depois_pronto > 0 ? peso_depois_pronto : peso_total;
  const preco_kg    = pdp > 0 ? custo_total / (pdp / 1000) : 0;
  return { peso_total, custo_total, preco_kg };
}

// ─── Estado ───────────────────────────────────────────────────────
export async function initPreparo() {
  _injectStyles();
  _preps = await carregar(COL);
}

export function getPreparos() { return _preps; }

// ─── Render lista ─────────────────────────────────────────────────
export function renderPreparo(busca = '') {
  const wrap = document.getElementById('ft-preparo');
  if (!wrap) return;

  renderTutorial('ft-sec-pre', 'pre', ico.prep, 'Como usar o Preparo Antecipado', [
    'Cadastre receitas de preparo em lote, como <strong>Massa de Pizza</strong>.',
    'Informe o nome, o <strong>peso em gramas</strong> e o <strong>valor por kg</strong> de cada ingrediente.',
    'O custo total e o <strong>preço por kg</strong> do produto final são calculados automaticamente.',
    '"Peso depois de pronto" permite calcular o custo real após perdas de cocção ou fermentação.',
  ]);

  const q     = busca.trim().toLowerCase();
  const lista = [..._preps]
    .filter(p => !q || p.nome.toLowerCase().includes(q))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  if (!lista.length) {
    renderEmpty(
      wrap,
      ico.prep,
      q ? 'Nenhum preparo encontrado' : 'Nenhum preparo cadastrado',
      q ? 'Tente outro termo.' : 'Cadastre sua primeira receita de preparo antecipado.',
      q ? null : { label: 'Novo preparo', fn: () => abrirFormPreparo() }
    );
    return;
  }

  wrap.innerHTML = `
    <div class="ft-list-header">${lista.length} preparo${lista.length !== 1 ? 's' : ''} antecipado${lista.length !== 1 ? 's' : ''}</div>
    <div class="ft-list">
      ${lista.map(p => {
        const { peso_total, custo_total, preco_kg } = _calcTotais(p.ingredientes || [], p.peso_depois_pronto || 0);
        const nIng = (p.ingredientes || []).length;
        return `
        <button class="ft-list-item" data-id="${p.id}" type="button">
          <span class="ft-item-ico ft-ico-pre">${ico.prep}</span>
          <span class="ft-item-body">
            <span class="ft-item-name">${_esc(p.nome)}</span>
            <span class="ft-item-sub">${nIng} ingrediente${nIng !== 1 ? 's' : ''} · ${formatNum(peso_total, 0)} g total</span>
          </span>
          <span class="ft-item-end">
            <span class="ft-pill ft-pill-acc">${formatCurrency(preco_kg)}/kg</span>
            <span class="ft-item-chev">${ico.chevR}</span>
          </span>
        </button>`;
      }).join('')}
    </div>`;

  wrap.querySelectorAll('.ft-list-item').forEach(b =>
    b.addEventListener('click', () => abrirFormPreparo(b.dataset.id)));
}

// ─── Formulário (síncrono — sem await!) ──────────────────────────
export function abrirFormPreparo(id = null) {
  const prep    = id ? _preps.find(p => p.id === id) : null;
  _editIng = prep ? (prep.ingredientes || []).map(i => ({ ...i })) : [];

  const html = `
    <div class="ft-mhd">
      <button class="ft-mhd-close" id="_prClose" aria-label="Fechar">${ico.close}</button>
      <span class="ft-mhd-title">${prep ? 'Editar preparo' : 'Novo preparo antecipado'}</span>
      ${prep
        ? `<button class="ft-mhd-del" id="_prDel" aria-label="Apagar">${ico.trash}</button>`
        : `<span style="width:32px"></span>`}
    </div>

    <div class="ft-mbody">

      <!-- Nome do preparo -->
      <div class="ft-field">
        <label for="ft-pr-nome">Nome do preparo</label>
        <input id="ft-pr-nome" class="ft-input" type="text"
          placeholder="Ex: Massa de Pizza, Molho de Tomate…"
          value="${_esc(prep?.nome || '')}"
          autocomplete="off" autocorrect="off">
      </div>

      <!-- Tabela de ingredientes -->
      <div class="ft-field">
        <div class="ft-label-row">
          <label>Ingredientes</label>
          <button class="ft-btn ft-btn-sm ft-btn-ghost" id="_prAddIng" type="button">
            <span class="ft-bico">${ico.plus}</span><span>Adicionar linha</span>
          </button>
        </div>
        <div id="ft-pr-table"></div>
      </div>

      <!-- Peso depois de pronto -->
      <div class="ft-field">
        <label for="ft-pr-pdp">Peso depois de pronto (g)</label>
        <div class="ft-tip-banner">
          ${ico.info}
          <span>Pese o produto final após assar ou fermentar. Deixe em branco se igual ao peso total dos ingredientes.</span>
        </div>
        <input id="ft-pr-pdp" class="ft-input" type="number"
          placeholder="Ex: 8000" min="0.1" step="1" inputmode="decimal"
          value="${prep?.peso_depois_pronto || ''}">
      </div>

      <!-- Resultado em tempo real -->
      <div class="ft-field">
        <label>Resultado</label>
        <div class="ft-pre-result">
          <div class="ft-pre-res-row">
            <span class="ft-pre-res-lbl">Peso total ingredientes</span>
            <span class="ft-pre-res-val" id="ft-pr-r-ptotal">—</span>
          </div>
          <div class="ft-pre-res-row hi">
            <span class="ft-pre-res-lbl">Custo total do lote</span>
            <span class="ft-pre-res-val" id="ft-pr-r-custo">—</span>
          </div>
          <div class="ft-pre-res-row acc">
            <span class="ft-pre-res-lbl">${ico.tag} Preço/kg do produto</span>
            <span class="ft-pre-res-val" id="ft-pr-r-pkg">—</span>
          </div>
        </div>
      </div>

    </div><!-- /ft-mbody -->

    <div class="ft-mft">
      <button class="ft-btn ft-btn-primary ft-btn-full" id="_prSave" type="button">
        <span class="ft-bico">${ico.save}</span><span>Salvar preparo</span>
      </button>
    </div>`;

  // ── SÍNCRONO: listeners registrados imediatamente após abrirModal ──
  const done = abrirModal(html, { largo: true });

  _renderTable();
  _calcResult();

  document.getElementById('_prClose')
    ?.addEventListener('click', () => fecharModal(null), { once: true });

  document.getElementById('_prSave')
    ?.addEventListener('click',  () => _save(id));

  document.getElementById('_prDel')
    ?.addEventListener('click', async () => { fecharModal(null); await _del(id); });

  document.getElementById('_prAddIng')
    ?.addEventListener('click', () => {
      _editIng.push({ nome: '', peso_g: 0, valor_kg: 0, valor: 0 });
      _renderTable();
      _calcResult();
      // Foca no campo nome da última linha adicionada
      const inputs = document.querySelectorAll('.ft-pr-ing-nome');
      inputs[inputs.length - 1]?.focus();
    });

  document.getElementById('ft-pr-pdp')
    ?.addEventListener('input', _calcResult);

  return done;
}

// ─── Tabela de ingredientes (edição inline) ───────────────────────
function _renderTable() {
  const wrap = document.getElementById('ft-pr-table');
  if (!wrap) return;

  if (!_editIng.length) {
    wrap.innerHTML = `
      <div class="ft-pre-table-wrap">
        <div class="ft-pre-empty-row">
          ${ico.ingredients}
          <span>Nenhum ingrediente. Toque em <strong>+ Adicionar linha</strong>.</span>
        </div>
      </div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="ft-pre-table-wrap">
      <div class="ft-pre-thead">
        <span>Ingrediente</span>
        <span style="text-align:right">Peso (g)</span>
        <span style="text-align:right">R$/kg</span>
        <span style="text-align:right">Valor</span>
        <span></span>
      </div>
      <div class="ft-pre-tbody" id="ft-pr-tbody">
        ${_editIng.map((ing, idx) => `
        <div class="ft-pre-trow" data-idx="${idx}">
          <div class="ft-pre-cell">
            <input class="ft-input ft-pr-ing-nome" type="text"
              placeholder="Nome" value="${_esc(ing.nome || '')}"
              autocomplete="off" autocorrect="off"
              data-idx="${idx}" data-field="nome">
          </div>
          <div class="ft-pre-cell num">
            <input class="ft-input ft-pr-ing-peso" type="number"
              placeholder="0" min="0" step="1" inputmode="decimal"
              value="${ing.peso_g || ''}"
              data-idx="${idx}" data-field="peso_g">
          </div>
          <div class="ft-pre-cell num">
            <input class="ft-input ft-pr-ing-vkg" type="number"
              placeholder="0.00" min="0" step="0.01" inputmode="decimal"
              value="${ing.valor_kg || ''}"
              data-idx="${idx}" data-field="valor_kg">
          </div>
          <div class="ft-pre-cell">
            <span class="ft-pre-valor-calc" id="ft-pr-vc-${idx}">${
              ing.valor > 0 ? formatCurrency(ing.valor) : '—'
            }</span>
          </div>
          <div class="ft-pre-cell">
            <button class="ft-pre-rm" data-rm="${idx}" aria-label="Remover linha">${ico.close}</button>
          </div>
        </div>`).join('')}
      </div>
    </div>`;

  // ── Listeners nos inputs de cada linha ──────────────────────────
  wrap.querySelectorAll('input[data-field]').forEach(input => {
    input.addEventListener('input', () => {
      const idx   = parseInt(input.dataset.idx, 10);
      const field = input.dataset.field;
      if (field === 'nome') {
        _editIng[idx].nome = input.value;
      } else {
        // type=number → .value usa ponto como decimal (padrão do browser)
        const v = parseFloat(input.value) || 0;
        _editIng[idx][field] = v;
        // Recalcula o valor desta linha em tempo real
        _editIng[idx].valor = _calcValor(
          _editIng[idx].peso_g  || 0,
          _editIng[idx].valor_kg || 0
        );
        const vc = document.getElementById(`ft-pr-vc-${idx}`);
        if (vc) {
          vc.textContent = _editIng[idx].valor > 0
            ? formatCurrency(_editIng[idx].valor)
            : '—';
        }
      }
      _calcResult();
    });
  });

  // ── Listeners de remoção ─────────────────────────────────────────
  wrap.querySelectorAll('[data-rm]').forEach(btn => {
    btn.addEventListener('click', () => {
      _editIng.splice(parseInt(btn.dataset.rm, 10), 1);
      _renderTable();
      _calcResult();
    });
  });
}

// ─── Painel de resultado em tempo real ───────────────────────────
function _calcResult() {
  const pdpEl = document.getElementById('ft-pr-pdp');
  const pdp   = parseFloat(pdpEl?.value) || 0;
  const { peso_total, custo_total, preco_kg } = _calcTotais(_editIng, pdp);

  const rPtotal = document.getElementById('ft-pr-r-ptotal');
  const rCusto  = document.getElementById('ft-pr-r-custo');
  const rPkg    = document.getElementById('ft-pr-r-pkg');

  if (rPtotal) rPtotal.textContent = peso_total > 0 ? `${formatNum(peso_total, 0)} g` : '—';
  if (rCusto)  rCusto.textContent  = custo_total > 0 ? formatCurrency(custo_total) : '—';
  if (rPkg)    rPkg.textContent    = preco_kg   > 0 ? `${formatCurrency(preco_kg)}/kg` : '—';
}

// ─── Salvar ───────────────────────────────────────────────────────
async function _save(id) {
  const nome = document.getElementById('ft-pr-nome')?.value.trim();
  const pdp  = parseFloat(document.getElementById('ft-pr-pdp')?.value) || 0;

  // Validações
  if (!nome) {
    const el = document.getElementById('ft-pr-nome');
    if (el) {
      el.classList.add('err');
      el.addEventListener('input', () => el.classList.remove('err'), { once: true });
    }
    toast('Informe o nome do preparo.', 'erro');
    return;
  }
  if (!_editIng.length) {
    toast('Adicione ao menos um ingrediente.', 'aviso');
    return;
  }
  const semNome = _editIng.find(i => !i.nome?.trim());
  if (semNome) {
    toast('Preencha o nome de todos os ingredientes.', 'aviso');
    return;
  }

  // Recalcula todos os valores antes de persistir
  const ings = _editIng.map(i => ({
    nome:     i.nome.trim(),
    peso_g:   i.peso_g   || 0,
    valor_kg: i.valor_kg || 0,
    valor:    _calcValor(i.peso_g || 0, i.valor_kg || 0),
  }));
  const { peso_total, custo_total, preco_kg } = _calcTotais(ings, pdp);

  const obj = {
    id:                id || generateId(),
    nome,
    ingredientes:      ings,
    peso_depois_pronto: pdp > 0 ? pdp : peso_total,   // fallback = peso_total
    peso_total,
    custo_total,
    preco_kg,
    criadoEm:          Date.now(),
  };

  const btn = document.getElementById('_prSave');
  if (btn) { btn.disabled = true; btn.lastElementChild.textContent = 'Salvando…'; }

  try {
    await salvar(COL, obj.id, obj);
    if (id) {
      const i = _preps.findIndex(p => p.id === id);
      if (i >= 0) _preps[i] = obj; else _preps.push(obj);
    } else {
      _preps.push(obj);
    }
    fecharModal('saved');
    toast(id ? 'Preparo atualizado!' : 'Preparo salvo!', 'sucesso');
    renderPreparo(document.getElementById('ft-busca-pre')?.value || '');
  } catch (e) {
    toast('Erro ao salvar. Tente novamente.', 'erro');
    if (btn) { btn.disabled = false; btn.lastElementChild.textContent = 'Salvar preparo'; }
    console.error('[ft-preparo] save error:', e);
  }
}

// ─── Deletar ──────────────────────────────────────────────────────
async function _del(id) {
  const prep = _preps.find(p => p.id === id);
  if (!prep) return;
  const ok = await confirmar(
    `Remover <strong>${_esc(prep.nome)}</strong>?<br>Esta ação não pode ser desfeita.`,
    { labelOK: 'Remover', perigo: true }
  );
  if (!ok) return;
  await remover(COL, id);
  _preps = _preps.filter(p => p.id !== id);
  toast('Preparo removido.', 'info');
  renderPreparo(document.getElementById('ft-busca-pre')?.value || '');
}

// ─── Helper: escape HTML ──────────────────────────────────────────
function _esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
