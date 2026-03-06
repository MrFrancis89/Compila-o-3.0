// ft-ingredientes.js — v2.1
// ══════════════════════════════════════════════════════════════════
// CORREÇÃO v2.1 — Formulário completamente reativo à unidade:
//
//   PROBLEMA v2.0:
//   • Placeholder fixo "Ex: 1000" independente da unidade → ao trocar
//     para kg o usuário via "1000 kg", para L via "1000 L", sem sentido.
//   • Tip banner estático → mesma mensagem para g, kg, uni, L…
//   • Label "Qtd. na embalagem" não dizia a unidade.
//   • Sem exemplo contextual por unidade.
//
//   SOLUÇÃO:
//   • UNI_CFG: mapa por unidade com label, placeholder, dica, exemplo,
//     prefixo do custo e tipo de grandeza.
//   • Bloco contextual dinâmico: ao mudar a unidade, atualiza dica +
//     exemplo + placeholder + label + sufixo da qty em tempo real.
//   • Preview calculado mostra custo na unidade certa + exemplo prático.
//   • Tutorial atualizado com instruções por etapa mais claras.
// ══════════════════════════════════════════════════════════════════

import { salvar, carregar, remover }                           from './ft-storage.js';
import { calcCustoUnitario }                                   from './ft-calc.js';
import { formatCurrency, formatQtdUnid, generateId, parseNum,
         UNIDADE_LABEL }                                       from './ft-format.js';
import { toast, abrirModal, fecharModal, confirmar,
         renderEmpty, renderTutorial, debounce }               from './ft-ui.js';
import { ico }                                                 from './ft-icons.js';

const COL = 'ingredientes';
let _ings = [];

// ─── Configuração por unidade ──────────────────────────────────────
// Cada entrada define o comportamento do formulário quando aquela
// unidade está selecionada. Mantém UX contextual sem código duplicado.
const UNI_CFG = {
  g: {
    grupo:      'peso',
    label:      'Gramas (g)',
    qtdLabel:   'Peso da embalagem (em gramas)',
    placeholder:'1000',
    sufixo:     'g',
    dica:       'Informe o peso total da embalagem <strong>em gramas</strong>.',
    exemplos: [
      { produto: 'Farinha 1 kg',   valor: '1000 g' },
      { produto: 'Queijo 500 g',   valor: '500 g'  },
      { produto: 'Açúcar 5 kg',    valor: '5000 g' },
    ],
  },
  kg: {
    grupo:      'peso',
    label:      'Quilogramas (kg)',
    qtdLabel:   'Peso da embalagem (em kg)',
    placeholder:'1',
    sufixo:     'kg',
    dica:       'Informe o peso total da embalagem <strong>em quilogramas</strong>.',
    exemplos: [
      { produto: 'Farinha 1 kg',   valor: '1 kg'   },
      { produto: 'Carne 5 kg',     valor: '5 kg'   },
      { produto: 'Sal 500 g',      valor: '0,5 kg' },
    ],
  },
  ml: {
    grupo:      'volume',
    label:      'Mililitros (ml)',
    qtdLabel:   'Volume da embalagem (em ml)',
    placeholder:'1000',
    sufixo:     'ml',
    dica:       'Informe o volume total da embalagem <strong>em mililitros</strong>.',
    exemplos: [
      { produto: 'Azeite 1 L',     valor: '1000 ml' },
      { produto: 'Creme 200 ml',   valor: '200 ml'  },
      { produto: 'Leite 1 L',      valor: '1000 ml' },
    ],
  },
  l: {
    grupo:      'volume',
    label:      'Litros (L)',
    qtdLabel:   'Volume da embalagem (em litros)',
    placeholder:'1',
    sufixo:     'L',
    dica:       'Informe o volume total da embalagem <strong>em litros</strong>.',
    exemplos: [
      { produto: 'Óleo 1 L',       valor: '1 L'    },
      { produto: 'Galão 5 L',      valor: '5 L'    },
      { produto: 'Molho 500 ml',   valor: '0,5 L'  },
    ],
  },
  uni: {
    grupo:      'contagem',
    label:      'Unidades (uni)',
    qtdLabel:   'Quantidade na embalagem (uni)',
    placeholder:'12',
    sufixo:     'uni',
    dica:       'Informe <strong>quantas unidades</strong> vêm na embalagem.',
    exemplos: [
      { produto: 'Dúzia de ovos',  valor: '12 uni' },
      { produto: 'Caixa 30 copos',valor: '30 uni'  },
      { produto: 'Lata avulsa',    valor: '1 uni'  },
    ],
  },
  pct: {
    grupo:      'contagem',
    label:      'Pacotes/porções (pct)',
    qtdLabel:   'Quantidade na embalagem (pct)',
    placeholder:'1',
    sufixo:     'pct',
    dica:       'Informe <strong>quantos pacotes ou porções</strong> vêm na embalagem.',
    exemplos: [
      { produto: 'Sachê de fermento', valor: '1 pct' },
      { produto: 'Caixa 20 sachês',   valor: '20 pct'},
      { produto: 'Envelope de molho', valor: '1 pct' },
    ],
  },
};

// ─── Tabela de conversão entre unidades ──────────────────────────
// Todas as 6 unidades são sempre exibidas no picker.
// Pares COMPATÍVEIS: conversão automática + custo correto.
// Pares INCOMPATÍVEIS: salva na unidade digitada sem conversão
//   (ex.: o usuário escolheu "uni" para um ingrediente em kg porque
//    quer registrar por peça — o custo fica estimado).
//
// Grupos compatíveis:
//   peso:   g ↔ kg
//   volume: ml ↔ L
//   contagem: uni, pct (sem conversão entre si)

const _TODAS_UNIDADES = ['g', 'kg', 'ml', 'l', 'uni', 'pct'];

// Fatores de conversão entre pares compatíveis
const _FATOR = {
  'g->kg':  1 / 1000,
  'kg->g':  1000,
  'ml->l':  1 / 1000,
  'l->ml':  1000,
};

// Retorna true se `de` e `para` têm conversão definida
function _ehCompativel(de, para) {
  return de === para || (`${de}->${para}` in _FATOR);
}

/**
 * Converte `qtd` da unidade `de` para a unidade `para`.
 * Se incompatível, retorna a qtd sem conversão (1:1) — o custo
 * ficará estimado e uma dica aparece na UI.
 */
function _converter(qtd, de, para) {
  if (de === para) return qtd;
  const fator = _FATOR[`${de}->${para}`];
  return fator != null ? qtd * fator : qtd;
}

// ─── Estado ───────────────────────────────────────────────────────
/** Ordena _ings in-place alfabeticamente pelo nome (pt-BR). */
function _sortIngs() {
  _ings.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export async function initIngredientes() {
  _ings = await carregar(COL);
  _sortIngs(); // garante ordem alfabética ao carregar do storage
}
export function getIngredientes()        { return _ings; }
export function getIngredienteById(id)   { return _ings.find(i => i.id === id) || null; }

// ─── Tutorial (atualizado v2.1) ────────────────────────────────────
function _tut() {
  renderTutorial('ft-sec-ing', 'ing', ico.ingredients, 'Cadastro de ingredientes', [
    'Toque em <strong>+</strong> para cadastrar um ingrediente.',
    'Escolha a <strong>unidade</strong> (g, kg, ml, L, uni, pct) — o formulário ajusta exemplos e dicas automaticamente.',
    'Informe a <strong>quantidade da embalagem</strong> conforme a unidade escolhida.<br>'
    + '<em>Ex: saco 1 kg de farinha → unidade kg, qty 1 · pacote 500 g → unidade g, qty 500.</em>',
    'O <strong>custo por unidade</strong> é calculado: preço ÷ quantidade.<br>'
    + '<em>Ex: R$ 12,00 ÷ 1 kg = R$ 12,00/kg.</em>',
    'Nas receitas, use a mesma unidade. <em>Ex: 0,12 kg de mussarela por pizza.</em>',
  ]);
}

// ─── Render lista ──────────────────────────────────────────────────
export function renderIngredientes(busca = '') {
  const wrap = document.getElementById('ft-lista-ing');
  if (!wrap) return;
  _tut();

  const q = busca.trim().toLowerCase();
  const lista = [..._ings]
    .filter(i => !q || i.nome.toLowerCase().includes(q))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  if (!lista.length) {
    renderEmpty(wrap, ico.ingredients,
      q ? 'Nenhum resultado' : 'Nenhum ingrediente cadastrado',
      q ? 'Tente outro termo.' : 'Adicione seu primeiro ingrediente.',
      q ? null : { label: 'Novo ingrediente', fn: () => abrirFormIngrediente() }
    );
    return;
  }

  wrap.innerHTML = `
    <div class="ft-list-header">${lista.length} ingrediente${lista.length !== 1 ? 's' : ''}</div>
    <div class="ft-list">
      ${lista.map(i => `
      <button class="ft-list-item" data-id="${i.id}" type="button">
        <span class="ft-item-ico ft-ico-ing">${ico.ingredients}</span>
        <span class="ft-item-body">
          <span class="ft-item-name">${_esc(i.nome)}</span>
          <span class="ft-item-sub">${formatQtdUnid(i.quantidade_embalagem, i.unidade)} · ${formatCurrency(i.preco_compra)}</span>
        </span>
        <span class="ft-item-end">
          <span class="ft-pill ft-pill-acc">
            ${formatCurrency(i.custo_unitario)}<span class="ft-pill-unit">/${i.unidade}</span>
          </span>
          <span class="ft-item-chev">${ico.chevR}</span>
        </span>
      </button>`).join('')}
    </div>`;

  wrap.querySelectorAll('.ft-list-item').forEach(b =>
    b.addEventListener('click', () => abrirFormIngrediente(b.dataset.id)));
}

// ─── Helpers de formatação/máscara para os inputs do formulário ───
//
// _fmtPreco: converte número float para string BR (35.5 → "35,50")
// _fmtQtd:   converte número float para string BR (2.5 → "2,5"; 1000 → "1000")
// _moneyMask: aplica máscara monetária enquanto o usuário digita
//   Digita: 3  5  5  0  →  "0,03" "0,35" "3,55" "35,50"
//   Assim .value SEMPRE contém vírgula → parseNum() funciona corretamente
// _qtyMask: normaliza qty (substitui ponto por vírgula, remove duplicatas)

function _fmtPreco(v) {
  if (v == null || isNaN(v)) return '';
  return Number(v).toFixed(2).replace('.', ',');
}

function _fmtQtd(v) {
  if (v == null || isNaN(v)) return '';
  // Remove trailing zeros desnecessários: 2.500 → "2,5"; 1000.0 → "1000"
  const s = Number(v).toString().replace('.', ',');
  return s;
}

function _moneyMask(input) {
  // Extrai apenas dígitos
  const digits = input.value.replace(/\D/g, '');
  if (!digits) { input.value = ''; return; }
  // Divide por 100 para obter o valor em reais
  const cents = parseInt(digits, 10);
  const formatted = (cents / 100).toFixed(2).replace('.', ',');
  input.value = formatted;
}

function _qtyMask(input) {
  // Permite apenas dígitos + vírgula + ponto (substitui ponto por vírgula)
  let v = input.value.replace(/[^\d,.]/g, '').replace('.', ',');
  // Permite apenas uma vírgula
  const parts = v.split(',');
  if (parts.length > 2) v = parts[0] + ',' + parts.slice(1).join('');
  input.value = v;
}

// ─── Formulário — completamente reativo à unidade ─────────────────
export function abrirFormIngrediente(id = null) {
  const ing = id ? getIngredienteById(id) : null;
  const unAtual = ing?.unidade || 'g';

  // Opções do select com label completo
  const unOpts = Object.entries(UNI_CFG)
    .map(([u, c]) =>
      `<option value="${u}"${unAtual === u ? ' selected' : ''}>${c.label}</option>`)
    .join('');

  const html = `
    <div class="ft-mhd">
      <button class="ft-mhd-close" id="_iClose" aria-label="Fechar">${ico.close}</button>
      <span class="ft-mhd-title">${ing ? 'Editar ingrediente' : 'Novo ingrediente'}</span>
      ${ing
        ? `<button class="ft-mhd-del" id="_iDel" aria-label="Apagar">${ico.trash}</button>`
        : `<span style="width:32px"></span>`}
    </div>

    <div class="ft-mbody">

      <!-- 1. Nome -->
      <div class="ft-field">
        <label for="ft-ing-nome">Nome do ingrediente</label>
        <input id="ft-ing-nome" class="ft-input" type="text"
          placeholder="Ex: Mussarela, Farinha de trigo, Azeite…"
          value="${_esc(ing?.nome || '')}"
          autocomplete="off" autocorrect="off" autocapitalize="words">
      </div>

      <!-- 2. Unidade de medida -->
      <div class="ft-field">
        <label for="ft-ing-unid">Unidade de medida</label>
        <select id="ft-ing-unid" class="ft-input ft-select">${unOpts}</select>
      </div>

      <!-- 3. Bloco contextual — atualiza ao mudar unidade -->
      <div class="ft-ctx-card" id="ft-ing-ctx"></div>

      <!-- 4. Qtd embalagem + preço em linha -->
      <div class="ft-field-row">
        <div class="ft-field" style="flex:1.2">
          <label id="ft-ing-qtd-lbl" for="ft-ing-qtd">Qtd. da embalagem</label>
          <div class="ft-input-suf-wrap">
            <input id="ft-ing-qtd" class="ft-input has-suf" type="text"
              placeholder="1000" value="${ing ? _fmtQtd(ing.quantidade_embalagem) : ''}"
              inputmode="decimal" autocomplete="off">
            <span class="ft-input-suf" id="ft-ing-suf">g</span>
          </div>
        </div>
        <div class="ft-field" style="flex:1">
          <label for="ft-ing-preco">Preço de compra</label>
          <div class="ft-input-pre-wrap">
            <span class="ft-input-pre">R$</span>
            <input id="ft-ing-preco" class="ft-input has-pre" type="text"
              placeholder="0,00" value="${ing ? _fmtPreco(ing.preco_compra) : ''}"
              inputmode="decimal" autocomplete="off">
          </div>
        </div>
      </div>

      <!-- 5. Preview calculado em tempo real -->
      <div class="ft-calc-preview" id="ft-ing-prev">
        <span class="ft-calc-label">${ico.tag} Custo por unidade calculado</span>
        <span class="ft-calc-val" id="ft-ing-prev-val">—</span>
      </div>

    </div>

    <div class="ft-mft">
      <button class="ft-btn ft-btn-primary ft-btn-full" id="_iSave" type="button">
        <span class="ft-bico">${ico.save}</span><span>Salvar ingrediente</span>
      </button>
    </div>`;

  // ── SÍNCRONO: sem await ────────────────────────────────────────
  const done = abrirModal(html);

  const nEl = document.getElementById('ft-ing-nome');
  const uEl = document.getElementById('ft-ing-unid');
  const qEl = document.getElementById('ft-ing-qtd');
  const pEl = document.getElementById('ft-ing-preco');

  // ── Renderiza o bloco contextual para a unidade atual ──────────
  function _atualizarContexto(u) {
    const cfg = UNI_CFG[u] || UNI_CFG.g;

    // Label + placeholder + sufixo reativos
    const lblEl = document.getElementById('ft-ing-qtd-lbl');
    const sufEl = document.getElementById('ft-ing-suf');
    if (lblEl) lblEl.textContent = cfg.qtdLabel;
    if (sufEl) sufEl.textContent = cfg.sufixo;
    if (qEl) {
      qEl.placeholder = cfg.placeholder;
      qEl.setAttribute('placeholder', cfg.placeholder);
    }

    // Bloco contextual com dica + exemplos visuais
    const ctx = document.getElementById('ft-ing-ctx');
    if (!ctx) return;
    ctx.innerHTML = `
      <div class="ft-ctx-dica">
        ${ico.info}
        <span>${cfg.dica}</span>
      </div>
      <div class="ft-ctx-exs">
        ${cfg.exemplos.map(e => `
        <div class="ft-ctx-ex">
          <span class="ft-ctx-ex-prod">${e.produto}</span>
          <span class="ft-ctx-ex-arr">→</span>
          <span class="ft-ctx-ex-val">${e.valor}</span>
        </div>`).join('')}
      </div>`;
  }

  // ── Preview de custo calculado ─────────────────────────────────
  function _preview() {
    const p  = parseNum(pEl?.value);
    const q  = parseNum(qEl?.value);
    const u  = uEl?.value || 'g';
    const pv = document.getElementById('ft-ing-prev-val');
    const bx = document.getElementById('ft-ing-prev');
    if (p > 0 && q > 0) {
      const cu = calcCustoUnitario(p, q);
      if (pv) {
        pv.textContent = `${formatCurrency(cu)} / ${u}`;
        pv.classList.add('has');
      }
      bx?.classList.add('active');
    } else {
      if (pv) { pv.textContent = '—'; pv.classList.remove('has'); }
      bx?.classList.remove('active');
    }
  }

  // ── Init: contexto inicial ─────────────────────────────────────
  _atualizarContexto(unAtual);
  _preview();

  // ── Unidade muda → atualiza TUDO contextual + preview ─────────
  uEl?.addEventListener('change', () => {
    _atualizarContexto(uEl.value);
    _preview();
  });

  // ── Money mask no preço (digita 3550 → mostra 35,50) ──────────
  pEl?.addEventListener('input', () => {
    _moneyMask(pEl);
    _preview();
  });

  // ── Qty: aceita vírgula como separador decimal ─────────────────
  qEl?.addEventListener('input', () => {
    _qtyMask(qEl);
    _preview();
  });

  // ── Ações ──────────────────────────────────────────────────────
  document.getElementById('_iClose')?.addEventListener('click', () => fecharModal(null), { once: true });
  document.getElementById('_iSave' )?.addEventListener('click', () => _save(id));
  document.getElementById('_iDel'  )?.addEventListener('click', async () => {
    fecharModal(null);
    await _del(id);
  });

  // Foco automático no nome (novo ingrediente) ou qty (edição)
  requestAnimationFrame(() => {
    if (!ing) nEl?.focus();
    else      qEl?.focus();
  });

  return done;
}

// ─── Salvar ────────────────────────────────────────────────────────
async function _save(id) {
  const nome  = document.getElementById('ft-ing-nome' )?.value.trim();
  const unid  = document.getElementById('ft-ing-unid' )?.value;
  const qtd   = parseNum(document.getElementById('ft-ing-qtd'  )?.value);
  const preco = parseNum(document.getElementById('ft-ing-preco')?.value);

  if (!nome)    { _markErr('ft-ing-nome',  'Informe o nome do ingrediente.'); return; }
  if (qtd  <=0) { _markErr('ft-ing-qtd',   `Informe a quantidade em ${UNI_CFG[unid]?.sufixo || unid}.`); return; }
  if (preco<=0) { _markErr('ft-ing-preco', 'Informe o preço de compra.'); return; }

  if (!id) {
    const dup = _ings.find(i => i.nome.toLowerCase() === nome.toLowerCase());
    if (dup) { toast(`"${nome}" já está cadastrado.`, 'aviso'); return; }
  }

  const obj = {
    id: id || generateId(),
    nome,
    unidade:              unid,
    quantidade_embalagem: qtd,
    preco_compra:         preco,
    custo_unitario:       calcCustoUnitario(preco, qtd),
    criadoEm:             Date.now(),
  };

  const btn = document.getElementById('_iSave');
  if (btn) { btn.disabled = true; btn.lastElementChild.textContent = 'Salvando…'; }

  try {
    await salvar(COL, obj.id, obj);
    if (id) {
      const i = _ings.findIndex(x => x.id === id);
      if (i >= 0) _ings[i] = obj; else _ings.push(obj);
    } else {
      _ings.push(obj);
    }
    _sortIngs(); // mantém _ings sempre em ordem alfabética após qualquer alteração
    fecharModal('saved');
    toast(id ? 'Ingrediente atualizado!' : 'Ingrediente adicionado!', 'sucesso');
    renderIngredientes(document.getElementById('ft-busca-ing')?.value || '');
    document.dispatchEvent(new CustomEvent('ft:ings-changed'));
  } catch (e) {
    toast('Erro ao salvar.', 'erro');
    if (btn) { btn.disabled = false; btn.lastElementChild.textContent = 'Salvar ingrediente'; }
    console.error(e);
  }
}

// ─── Deletar ──────────────────────────────────────────────────────
async function _del(id) {
  const ing = getIngredienteById(id);
  if (!ing) return;
  const ok = await confirmar(
    `Remover <strong>${_esc(ing.nome)}</strong>?<br>Esta ação não pode ser desfeita.`,
    { labelOK: 'Remover', perigo: true }
  );
  if (!ok) return;
  await remover(COL, id);
  _ings = _ings.filter(i => i.id !== id);
  toast('Ingrediente removido.', 'info');
  renderIngredientes(document.getElementById('ft-busca-ing')?.value || '');
  document.dispatchEvent(new CustomEvent('ft:ings-changed'));
}

// ─── Picker de ingrediente (modal-2) ──────────────────────────────
export function abrirPickerIngrediente(jaAdicionados = []) {
  const disp = [..._ings]
    .filter(i => !jaAdicionados.includes(i.id))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  if (!disp.length) {
    toast('Todos os ingredientes já foram adicionados ou nenhum cadastrado.', 'aviso');
    return Promise.resolve(null);
  }

  const opts = disp.map(i =>
    `<option value="${i.id}">${_esc(i.nome)} · ${formatCurrency(i.custo_unitario)}/${i.unidade}</option>`
  ).join('');

  const html = `
    <div class="ft-mhd">
      <button class="ft-mhd-close" id="_pkClose" aria-label="Fechar">${ico.close}</button>
      <span class="ft-mhd-title">Adicionar ingrediente</span>
      <span style="width:32px"></span>
    </div>
    <div class="ft-mbody">
      <div class="ft-field">
        <label for="ft-pk-ing">Ingrediente</label>
        <select id="ft-pk-ing" class="ft-input ft-select">
          <option value="">— Selecione —</option>${opts}
        </select>
      </div>
      <div class="ft-field" id="ft-pk-qtd-field" style="display:none">
        <label for="ft-pk-qtd" id="ft-pk-qtd-lbl">Quantidade por pizza</label>
        <div class="ft-input-suf-wrap">
          <input id="ft-pk-qtd" class="ft-input has-suf" type="text"
            placeholder="—" inputmode="decimal" autocomplete="off">
          <!-- SELECT de unidades compatíveis -->
          <select id="ft-pk-unid" class="ft-input-suf ft-suf-select"
            style="min-width:52px;border-left:1px solid rgba(255,255,255,0.12);
                   background:transparent;color:inherit;font-size:inherit;
                   padding:0 6px;cursor:pointer;border-radius:0 10px 10px 0"></select>
        </div>
        <span class="ft-field-hint" id="ft-pk-hint"></span>
      </div>
      <div class="ft-calc-preview" id="ft-pk-prev">
        <span class="ft-calc-label">${ico.tag} Custo desta quantidade</span>
        <span class="ft-calc-val" id="ft-pk-val">—</span>
      </div>
    </div>
    <div class="ft-mft">
      <button class="ft-btn ft-btn-ghost"   id="_pkCancel">Cancelar</button>
      <button class="ft-btn ft-btn-primary" id="_pkOk">
        <span class="ft-bico">${ico.plus}</span><span>Adicionar</span>
      </button>
    </div>`;

  const ov2 = document.getElementById('ft-modal-2');
  const bx2 = document.getElementById('ft-modal-2-box');
  if (!ov2 || !bx2) return Promise.resolve(null);
  bx2.innerHTML = html;
  ov2.classList.add('open');
  requestAnimationFrame(() => document.getElementById('ft-pk-ing')?.focus());

  const selEl    = document.getElementById('ft-pk-ing');
  const qtdEl    = document.getElementById('ft-pk-qtd');
  const unidEl   = document.getElementById('ft-pk-unid');
  const hintEl   = document.getElementById('ft-pk-hint');
  const valEl    = document.getElementById('ft-pk-val');
  const prevBx   = document.getElementById('ft-pk-prev');
  const lblEl    = document.getElementById('ft-pk-qtd-lbl');
  const qtdField = document.getElementById('ft-pk-qtd-field');

  // ── Popula select com TODAS as unidades; pré-seleciona a do ingrediente
  function _popularUnidades(unidadeBase) {
    if (!unidEl) return;
    unidEl.innerHTML = _TODAS_UNIDADES
      .map(u => `<option value="${u}"${u === unidadeBase ? ' selected' : ''}>${u}</option>`)
      .join('');
  }

  // ── Atualiza preview de custo ─────────────────────────────────
  function _upd() {
    const ing = disp.find(i => i.id === selEl?.value);

    // Mostra/oculta campo qty
    if (qtdField) qtdField.style.display = ing ? '' : 'none';

    if (!ing) {
      if (valEl) { valEl.textContent = '—'; valEl.classList.remove('has'); }
      prevBx?.classList.remove('active');
      return;
    }

    // Unidade selecionada no picker (pode diferir da base do ingrediente)
    const unidSel = unidEl?.value || ing.unidade;
    const compativel = _ehCompativel(unidSel, ing.unidade);

    // Atualiza label e dica contextual
    if (lblEl) lblEl.textContent = `Quantidade por pizza`;
    if (hintEl) {
      if (unidSel === ing.unidade) {
        // Mesma unidade — exemplo simples
        const cfg = UNI_CFG[ing.unidade];
        const ex  = cfg?.exemplos?.[0];
        hintEl.textContent = ex ? `Ex: ${ex.produto} = ${ex.valor}` : `Informe em ${unidSel}`;
        hintEl.style.color = '';
      } else if (compativel) {
        // Unidade diferente mas conversão automática disponível
        hintEl.textContent = `↺ Convertido para ${ing.unidade} automaticamente`;
        hintEl.style.color = 'var(--accent, #FF8C00)';
      } else {
        // Sem conversão — custo estimado
        hintEl.textContent = `⚠️ Sem conversão ${unidSel}→${ing.unidade}. Custo estimado.`;
        hintEl.style.color = 'var(--warn, #f59e0b)';
      }
    }

    // Calcula custo com conversão quando compatível
    const qtdDigitada = parseNum(qtdEl?.value);
    if (qtdDigitada > 0) {
      const qtdBase = _converter(qtdDigitada, unidSel, ing.unidade);
      const custo   = qtdBase * ing.custo_unitario;
      if (valEl) {
        valEl.textContent = formatCurrency(custo);
        valEl.classList.add('has');
      }
      prevBx?.classList.add('active');
    } else {
      if (valEl) { valEl.textContent = '—'; valEl.classList.remove('has'); }
      prevBx?.classList.remove('active');
    }
  }

  // ── Quando ingrediente muda: repopula unidades + reseta qty ──
  selEl?.addEventListener('change', () => {
    const ing = disp.find(i => i.id === selEl.value);
    if (ing) {
      _popularUnidades(ing.unidade);
      if (qtdEl) { qtdEl.value = ''; qtdEl.placeholder = UNI_CFG[ing.unidade]?.placeholder || '—'; }
    }
    _upd();
  });

  // ── Máscara qty + preview ao digitar ─────────────────────────
  qtdEl?.addEventListener('input', () => { _qtyMask(qtdEl); _upd(); });

  // ── Mudança de unidade → recalcula preview ────────────────────
  unidEl?.addEventListener('change', _upd);

  return new Promise(resolve => {
    const _close = res => { ov2.classList.remove('open'); resolve(res); };

    document.getElementById('_pkClose' )?.addEventListener('click', () => _close(null), { once: true });
    document.getElementById('_pkCancel')?.addEventListener('click', () => _close(null), { once: true });
    ov2.addEventListener('click', e => { if (e.target === ov2) _close(null); }, { once: true });

    document.getElementById('_pkOk')?.addEventListener('click', () => {
      const ing      = disp.find(i => i.id === selEl?.value);
      const qtdDigit = parseNum(qtdEl?.value);
      const unidSel  = unidEl?.value || ing?.unidade;

      if (!ing)        { toast('Selecione um ingrediente.', 'erro'); return; }
      if (qtdDigit<=0) { toast('Informe a quantidade.', 'erro');     return; }

      // Converte para a unidade base antes de salvar na receita
      const qtdBase = _converter(qtdDigit, unidSel, ing.unidade);
      _close({ ing, qtd: qtdBase });
    });
  });
}

// ─── Helpers ──────────────────────────────────────────────────────
function _markErr(elId, msg) {
  const el = document.getElementById(elId);
  if (el) {
    el.classList.add('err');
    el.focus();
    el.addEventListener('input', () => el.classList.remove('err'), { once: true });
  }
  toast(msg, 'erro');
}

function _esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
