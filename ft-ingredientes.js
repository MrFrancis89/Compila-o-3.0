// ft-ingredientes.js — v2.0
// BUG CORRIGIDO: abrirModal() sem await — listeners adicionados imediatamente.
import { salvar, carregar, remover } from './ft-storage.js';
import { calcCustoUnitario } from './ft-calc.js';
import { formatCurrency, formatQtdUnid, generateId, parseNum, UNIDADE_LABEL } from './ft-format.js';
import { toast, abrirModal, fecharModal, confirmar, renderEmpty, renderTutorial, debounce } from './ft-ui.js';
import { ico } from './ft-icons.js';

const COL = 'ingredientes';
let _ings = [];

// ─── Estado ───────────────────────────────────────────────────────
export async function initIngredientes() { _ings = await carregar(COL); }
export function getIngredientes()        { return _ings; }
export function getIngredienteById(id)   { return _ings.find(i => i.id === id) || null; }

// ─── Tutorial ─────────────────────────────────────────────────────
function _tut() {
  renderTutorial('ft-sec-ing', 'ing', ico.ingredients, 'Cadastro de ingredientes', [
    'Toque em <strong>+</strong> para adicionar um ingrediente.',
    'Informe nome, unidade de medida, quantidade da embalagem e preço de compra.',
    'O <strong>custo unitário</strong> (ex.: R$/g) é calculado automaticamente.',
    'Toque em qualquer ingrediente para editar ou remover.',
  ]);
}

// ─── Render lista ─────────────────────────────────────────────────
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
    <div class="ft-list-header">${lista.length} ingrediente${lista.length!==1?'s':''}</div>
    <div class="ft-list">
      ${lista.map(i => `
      <button class="ft-list-item" data-id="${i.id}" type="button">
        <span class="ft-item-ico ft-ico-ing">${ico.ingredients}</span>
        <span class="ft-item-body">
          <span class="ft-item-name">${_esc(i.nome)}</span>
          <span class="ft-item-sub">${formatQtdUnid(i.quantidade_embalagem, i.unidade)} · ${formatCurrency(i.preco_compra)}</span>
        </span>
        <span class="ft-item-end">
          <span class="ft-pill ft-pill-acc">${formatCurrency(i.custo_unitario)}<span class="ft-pill-unit">/${i.unidade}</span></span>
          <span class="ft-item-chev">${ico.chevR}</span>
        </span>
      </button>`).join('')}
    </div>`;

  wrap.querySelectorAll('.ft-list-item').forEach(b =>
    b.addEventListener('click', () => abrirFormIngrediente(b.dataset.id)));
}

// ─── Formulário (sem await!) ──────────────────────────────────────
export function abrirFormIngrediente(id = null) {
  const ing = id ? getIngredienteById(id) : null;
  const unOpts = ['g','kg','ml','l','uni','pct'].map(u =>
    `<option value="${u}"${ing?.unidade===u?' selected':''}>${UNIDADE_LABEL[u]}</option>`
  ).join('');

  const html = `
    <div class="ft-mhd">
      <button class="ft-mhd-close" id="_iClose" aria-label="Fechar">${ico.close}</button>
      <span class="ft-mhd-title">${ing ? 'Editar ingrediente' : 'Novo ingrediente'}</span>
      ${ing
        ? `<button class="ft-mhd-del" id="_iDel" aria-label="Apagar">${ico.trash}</button>`
        : `<span style="width:32px"></span>`}
    </div>
    <div class="ft-mbody">
      <div class="ft-tip-banner">
        ${ico.tip}
        <span>Informe os dados da embalagem como você a compra (ex.: pacote 1 kg = 1000 g, R$ 18,90).</span>
      </div>
      <div class="ft-field">
        <label for="ft-ing-nome">Nome do ingrediente</label>
        <input id="ft-ing-nome" class="ft-input" type="text"
          placeholder="Ex: Mussarela, Molho de tomate…"
          value="${_esc(ing?.nome||'')}" autocomplete="off" autocorrect="off">
      </div>
      <div class="ft-field-row">
        <div class="ft-field">
          <label for="ft-ing-unid">Unidade</label>
          <select id="ft-ing-unid" class="ft-input ft-select">${unOpts}</select>
        </div>
        <div class="ft-field">
          <label for="ft-ing-qtd">Qtd. na embalagem</label>
          <input id="ft-ing-qtd" class="ft-input" type="number"
            placeholder="Ex: 1000" value="${ing?.quantidade_embalagem||''}"
            min="0.001" step="any" inputmode="decimal">
        </div>
      </div>
      <div class="ft-field">
        <label for="ft-ing-preco">Preço de compra</label>
        <div class="ft-input-pre-wrap">
          <span class="ft-input-pre">R$</span>
          <input id="ft-ing-preco" class="ft-input has-pre" type="number"
            placeholder="0,00" value="${ing?.preco_compra||''}"
            min="0" step="0.01" inputmode="decimal">
        </div>
      </div>
      <div class="ft-calc-preview" id="ft-ing-prev">
        <span class="ft-calc-label">${ico.tag} Custo unitário calculado</span>
        <span class="ft-calc-val" id="ft-ing-prev-val">—</span>
      </div>
    </div>
    <div class="ft-mft">
      <button class="ft-btn ft-btn-primary ft-btn-full" id="_iSave">
        <span class="ft-bico">${ico.save}</span><span>Salvar ingrediente</span>
      </button>
    </div>`;

  // ── SÍNCRONO: sem await ───────────────────────────────────────
  const done = abrirModal(html);

  // Elementos já existem no DOM agora
  const nEl = document.getElementById('ft-ing-nome');
  const uEl = document.getElementById('ft-ing-unid');
  const qEl = document.getElementById('ft-ing-qtd');
  const pEl = document.getElementById('ft-ing-preco');

  function _prev() {
    const p = parseNum(pEl?.value), q = parseNum(qEl?.value), u = uEl?.value||'g';
    const pv = document.getElementById('ft-ing-prev-val');
    const bx = document.getElementById('ft-ing-prev');
    if (p>0 && q>0) {
      const cu = calcCustoUnitario(p,q);
      if(pv) { pv.textContent = `${formatCurrency(cu)} / ${u}`; pv.classList.add('has'); }
      bx?.classList.add('active');
    } else {
      if(pv) { pv.textContent = '—'; pv.classList.remove('has'); }
      bx?.classList.remove('active');
    }
  }

  [pEl, qEl, uEl].forEach(e => e?.addEventListener('input', _prev));
  _prev();

  document.getElementById('_iClose')?.addEventListener('click', () => fecharModal(null), { once: true });
  document.getElementById('_iSave' )?.addEventListener('click', () => _save(id));
  document.getElementById('_iDel'  )?.addEventListener('click', async () => {
    fecharModal(null);
    await _del(id);
  });

  return done;
}

async function _save(id) {
  const nome  = document.getElementById('ft-ing-nome' )?.value.trim();
  const unid  = document.getElementById('ft-ing-unid' )?.value;
  const qtd   = parseNum(document.getElementById('ft-ing-qtd'  )?.value);
  const preco = parseNum(document.getElementById('ft-ing-preco')?.value);

  if (!nome)    { _markErr('ft-ing-nome',  'Informe o nome.'); return; }
  if (qtd  <=0) { _markErr('ft-ing-qtd',   'Informe a quantidade da embalagem.'); return; }
  if (preco<=0) { _markErr('ft-ing-preco', 'Informe o preço de compra.'); return; }
  if (!id) {
    const dup = _ings.find(i => i.nome.toLowerCase()===nome.toLowerCase());
    if (dup) { toast(`"${nome}" já está cadastrado.`, 'aviso'); return; }
  }

  const obj = { id: id||generateId(), nome, unidade: unid,
    quantidade_embalagem: qtd, preco_compra: preco,
    custo_unitario: calcCustoUnitario(preco,qtd), criadoEm: Date.now() };

  const btn = document.getElementById('_iSave');
  if (btn) { btn.disabled=true; btn.lastElementChild.textContent='Salvando…'; }

  try {
    await salvar(COL, obj.id, obj);
    if (id) { const i=_ings.findIndex(x=>x.id===id); if(i>=0) _ings[i]=obj; else _ings.push(obj); }
    else _ings.push(obj);
    fecharModal('saved');
    toast(id?'Ingrediente atualizado!':'Ingrediente adicionado!','sucesso');
    renderIngredientes(document.getElementById('ft-busca-ing')?.value||'');
    document.dispatchEvent(new CustomEvent('ft:ings-changed'));
  } catch(e) {
    toast('Erro ao salvar.','erro');
    if (btn) { btn.disabled=false; btn.lastElementChild.textContent='Salvar ingrediente'; }
    console.error(e);
  }
}

async function _del(id) {
  const ing = getIngredienteById(id);
  if (!ing) return;
  const ok = await confirmar(
    `Remover <strong>${_esc(ing.nome)}</strong>?<br>Esta ação não pode ser desfeita.`,
    { labelOK: 'Remover', perigo: true }
  );
  if (!ok) return;
  await remover(COL, id);
  _ings = _ings.filter(i=>i.id!==id);
  toast('Ingrediente removido.','info');
  renderIngredientes(document.getElementById('ft-busca-ing')?.value||'');
  document.dispatchEvent(new CustomEvent('ft:ings-changed'));
}

function _markErr(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('err'); el.focus(); el.addEventListener('input',()=>el.classList.remove('err'),{once:true}); }
  toast(msg,'erro');
}

// ─── Picker de ingrediente (modal-2, sem sobrescrever receita) ────
export function abrirPickerIngrediente(jaAdicionados = []) {
  const disp = [..._ings]
    .filter(i => !jaAdicionados.includes(i.id))
    .sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR'));

  if (!disp.length) {
    toast('Todos os ingredientes já foram adicionados ou não há ingredientes cadastrados.','aviso');
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
      <div class="ft-field">
        <label for="ft-pk-qtd">Quantidade por pizza</label>
        <div class="ft-input-suf-wrap">
          <input id="ft-pk-qtd" class="ft-input has-suf" type="number"
            placeholder="Ex: 120" min="0.001" step="any" inputmode="decimal">
          <span class="ft-input-suf" id="ft-pk-unid">—</span>
        </div>
        <span class="ft-field-hint">Ex: 120 (g), 0.05 (kg), 2 (uni)</span>
      </div>
      <div class="ft-calc-preview" id="ft-pk-prev">
        <span class="ft-calc-label">${ico.tag} Custo desta quantidade</span>
        <span class="ft-calc-val" id="ft-pk-val">—</span>
      </div>
    </div>
    <div class="ft-mft">
      <button class="ft-btn ft-btn-ghost" id="_pkCancel">Cancelar</button>
      <button class="ft-btn ft-btn-primary" id="_pkOk">
        <span class="ft-bico">${ico.plus}</span><span>Adicionar</span>
      </button>
    </div>`;

  // Injetar no modal-2 de forma síncrona
  const ov2 = document.getElementById('ft-modal-2');
  const bx2 = document.getElementById('ft-modal-2-box');
  if (!ov2||!bx2) return Promise.resolve(null);
  bx2.innerHTML = html;
  ov2.classList.add('open');
  requestAnimationFrame(() => document.getElementById('ft-pk-ing')?.focus());

  const selEl  = document.getElementById('ft-pk-ing');
  const qtdEl  = document.getElementById('ft-pk-qtd');
  const unidEl = document.getElementById('ft-pk-unid');
  const valEl  = document.getElementById('ft-pk-val');
  const prevBx = document.getElementById('ft-pk-prev');

  function _upd() {
    const ing = disp.find(i=>i.id===selEl?.value);
    if (unidEl) unidEl.textContent = ing?.unidade||'—';
    const qtd = parseNum(qtdEl?.value);
    if (ing && qtd>0 && valEl) {
      valEl.textContent = formatCurrency(qtd*ing.custo_unitario);
      valEl.classList.add('has'); prevBx?.classList.add('active');
    } else if (valEl) {
      valEl.textContent = '—'; valEl.classList.remove('has'); prevBx?.classList.remove('active');
    }
  }
  selEl?.addEventListener('change', _upd);
  qtdEl?.addEventListener('input', _upd);

  return new Promise(resolve => {
    const _close = (res) => { ov2.classList.remove('open'); resolve(res); };

    document.getElementById('_pkClose' )?.addEventListener('click', ()=>_close(null), {once:true});
    document.getElementById('_pkCancel')?.addEventListener('click', ()=>_close(null), {once:true});
    ov2.addEventListener('click', e => { if(e.target===ov2) _close(null); }, {once:true});

    document.getElementById('_pkOk')?.addEventListener('click', () => {
      const ing = disp.find(i=>i.id===selEl?.value);
      const qtd = parseNum(qtdEl?.value);
      if (!ing)    { toast('Selecione um ingrediente.','erro'); return; }
      if (qtd<=0) { toast('Informe a quantidade.','erro'); return; }
      _close({ ing, qtd });
    });
  });
}

function _esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
